"""
AI Bouncer - FastAPI Inference Server
Loads the REAL trained model artifacts and runs the full detection pipeline.
Signals: Blacklist, Zero-Day FAISS, XGBoost ML, Whitelist
"""

import os
import re
import sys
import math
import base64
import numpy as np
import joblib
import faiss
import xgboost as xgb
from collections import Counter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# Fix Windows encoding for emoji/unicode
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# -- Paths -----------------------------------------------------------------
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bouncer_model")

# -- App -------------------------------------------------------------------
app = FastAPI(title="AI Bouncer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Global model objects (loaded once at startup) --------------------------
embedder = None
bouncer_model = None
scaler = None
zeroday_index = None
zeroday_texts = None
ppl_threshold = None

ZERODAY_THRESHOLD = 0.85


@app.on_event("startup")
def load_models():
    global embedder, bouncer_model, scaler, zeroday_index, zeroday_texts, ppl_threshold

    print("[LOAD] Loading sentence-transformers embedder...")
    embedder = SentenceTransformer("all-MiniLM-L6-v2")

    print("[LOAD] Loading XGBoost model...")
    bouncer_model = xgb.XGBClassifier()
    bouncer_model.load_model(os.path.join(MODEL_DIR, "xgb_model.json"))

    print("[LOAD] Loading scaler...")
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))

    print("[LOAD] Loading FAISS zero-day index...")
    zeroday_index = faiss.read_index(os.path.join(MODEL_DIR, "zeroday.faiss"))

    print("[LOAD] Loading zero-day texts...")
    zeroday_texts = joblib.load(os.path.join(MODEL_DIR, "zeroday_texts.pkl"))

    ppl_path = os.path.join(MODEL_DIR, "ppl_threshold.pkl")
    if os.path.exists(ppl_path):
        ppl_threshold = joblib.load(ppl_path)
        print(f"[LOAD] Perplexity threshold loaded: {ppl_threshold}")
    else:
        ppl_threshold = None

    print(f"[OK] All models loaded! FAISS index has {zeroday_index.ntotal} vectors.")


# -- Feature Engineering (from notebook Cell 2) ----------------------------
def text_entropy(text: str) -> float:
    """Shannon entropy - high value suggests obfuscated/encoded payload."""
    if not text:
        return 0
    counts = Counter(text)
    probs = [count / len(text) for count in counts.values()]
    return -sum(p * math.log2(p) for p in probs)


def is_base64_like(text: str) -> bool:
    """Attempts to decode text and checks for hidden alphabetic content."""
    if not re.search(r"[A-Za-z0-9+/]{4,}", text):
        return False
    try:
        decoded = base64.b64decode(text + "===").decode("utf-8", errors="ignore")
        return len(decoded) > 3 and any(c.isalpha() for c in decoded)
    except Exception:
        return False


def has_persona_override(text: str) -> bool:
    """Detects jailbreak skeleton phrases via regex."""
    patterns = [
        r"ignore .* instructions",
        r"disregard .* rules",
        r"act as .*",
        r"you are now .*",
        r"developer mode",
        r"dan mode",
        r"stay in character",
    ]
    return any(re.search(p, text.lower()) for p in patterns)


def extract_features(text: str) -> np.ndarray:
    embedding = embedder.encode(text)
    length = len(text)
    b64_flag = int(is_base64_like(text))
    persona = int(has_persona_override(text))
    entropy = text_entropy(text)

    # Additional hand-crafted features to match training (scaler expects 392 = 384 + 8)
    words = text.split()
    word_count = len(words)
    special_char_ratio = sum(1 for c in text if not c.isalnum() and not c.isspace()) / max(len(text), 1)
    uppercase_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    avg_word_length = np.mean([len(w) for w in words]) if words else 0

    return np.concatenate([embedding, np.array([
        length, b64_flag, persona, entropy,
        word_count, special_char_ratio, uppercase_ratio, avg_word_length
    ])])


# -- Zero-Day Check (from notebook Cell 8) ---------------------------------
def zeroday_check(prompt: str, threshold: float = ZERODAY_THRESHOLD):
    vec = embedder.encode([prompt]).astype("float32")
    faiss.normalize_L2(vec)
    similarities, indices = zeroday_index.search(vec, k=1)
    sim = float(similarities[0][0])
    idx = int(indices[0][0])
    match = zeroday_texts[idx] if 0 <= idx < len(zeroday_texts) else ""
    return sim >= threshold, sim, match


# -- Full Bouncer Pipeline (from notebook Cell 11) -------------------------
def full_bouncer(prompt: str):
    """
    Master adversarial classifier - all signals combined.
    Returns: (verdict, ml_score, reason_chain, reasons_list, signals_dict)
    """
    reasons = []
    signals = {}

    # -- Signal 1: Hard blacklist + context-aware payload ------------------
    b64_chunks = re.findall(r"[A-Za-z0-9+/]{8,}", prompt)
    decoded_content = ""
    for chunk in b64_chunks:
        try:
            decoded_content += " " + base64.b64decode(chunk + "==").decode(
                "utf-8", errors="ignore"
            ).lower()
        except Exception:
            continue
    full_scan = (prompt + " " + decoded_content).lower()

    hard_triggers = [
        "bypass",
        "ignore all rules",
        "ignore all previous",
        "bomb",
        "password",
    ]
    blacklist_hit = any(re.search(re.escape(w), full_scan) for w in hard_triggers)
    if re.search(
        r"payload.{0,60}(execute|shellcode|overflow|exploit|inject|hex string)",
        full_scan,
    ):
        blacklist_hit = True

    if blacklist_hit:
        reasons.append("Blacklist keyword")
    signals["blacklist"] = blacklist_hit
    signals["decoded_b64"] = decoded_content.strip() if decoded_content.strip() else None

    # -- Signal 2: Zero-day FAISS ------------------------------------------
    zd_hit, zd_sim, zd_match = zeroday_check(prompt)
    if zd_hit:
        reasons.append(f"ZeroDay match (sim={zd_sim:.2f})")
    signals["zeroday_hit"] = zd_hit
    signals["zeroday_sim"] = round(zd_sim, 4)
    signals["zeroday_match"] = zd_match[:80] if zd_match else None

    # -- Signal 3: Perplexity (skipped - no GPT-2 in server) ---------------
    signals["perplexity_skipped"] = True

    # -- Signal 4: XGBoost ML score ----------------------------------------
    feats = extract_features(prompt).reshape(1, -1)
    scaled = scaler.transform(feats)
    ml_prob = float(bouncer_model.predict_proba(scaled)[0][1])
    signals["ml_prob"] = round(ml_prob, 4)

    # -- Signal 5: Contextual whitelist ------------------------------------
    safe_signals = ["sourdough", "recipe", "homework", "poem"]
    is_whitelisted = any(w in prompt.lower() for w in safe_signals)
    signals["is_whitelisted"] = is_whitelisted

    # -- Decision logic ----------------------------------------------------
    if reasons:  # any hard signal fired
        verdict = "ADVERSARIAL"
    elif is_whitelisted and ml_prob < 0.80:
        verdict = "SAFE"
        reasons.append("Context whitelist")
    elif ml_prob > 0.90:
        verdict = "ADVERSARIAL"
        reasons.append(f"ML high confidence ({ml_prob:.2f})")
    elif ml_prob > 0.50:
        verdict = "ADVERSARIAL"
        reasons.append(f"ML confidence ({ml_prob:.2f})")
    else:
        verdict = "SAFE"

    # -- Feature details for explainability --------------------------------
    signals["persona_override"] = has_persona_override(prompt)
    signals["base64_detected"] = is_base64_like(prompt)
    signals["text_entropy"] = round(text_entropy(prompt), 4)
    signals["text_length"] = len(prompt)

    reason_str = " | ".join(reasons) if reasons else "None"
    return verdict, ml_prob, reason_str, reasons, signals


# -- Request / Response Models ---------------------------------------------
class ScanRequest(BaseModel):
    prompt: str


class ZeroDayRequest(BaseModel):
    attack_text: str


# -- Endpoints -------------------------------------------------------------
@app.post("/predict")
async def predict(req: ScanRequest):
    verdict, ml_score, reason_str, reasons, signals = full_bouncer(req.prompt)

    # Determine grey zone for vibe-check routing
    is_grey_zone = 0.40 <= ml_score <= 0.60 and not signals.get("blacklist") and not signals.get("zeroday_hit")

    return {
        "verdict": verdict,
        "ml_score": round(ml_score, 4),
        "reason_str": reason_str,
        "reasons": reasons,
        "signals": signals,
        "is_grey_zone": is_grey_zone,
    }


@app.post("/add-zeroday")
async def add_zeroday(req: ZeroDayRequest):
    """Patch the live FAISS index with a new confirmed attack - no retraining needed."""
    vec = embedder.encode([req.attack_text]).astype("float32")
    faiss.normalize_L2(vec)
    zeroday_index.add(vec)
    zeroday_texts.append(req.attack_text)
    return {
        "message": "Zero-day patched",
        "total_vectors": int(zeroday_index.ntotal),
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": bouncer_model is not None,
        "faiss_vectors": int(zeroday_index.ntotal) if zeroday_index else 0,
        "embedder": "all-MiniLM-L6-v2",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

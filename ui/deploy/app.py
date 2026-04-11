import os
import gradio as gr
import xgboost as xgb
import numpy as np
import pandas as pd
import pickle
import math
import re
from sentence_transformers import SentenceTransformer

# ── LOAD MODELS ─────────────────────────────────────────────────────────────────
print("🚀 Loading AI Bouncer Model & Embedder...")
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# Load files
model_path = "xgb_model.json"
scaler_path = "scaler.pkl"

if not os.path.exists(model_path) or not os.path.exists(scaler_path):
    # Try alternate path just in case
    print("⚠️  Warning: Model or Scaler not found in current directory. Checking assets/...")
    model_path = os.path.join("assets", model_path)
    scaler_path = os.path.join("assets", scaler_path)

# Load XGBoost
bouncer_model = xgb.XGBClassifier()
bouncer_model.load_model(model_path)

# Load Scaler
with open(scaler_path, 'rb') as f:
    scaler = pickle.load(f)

# ── FEATURE ENGINEERING ──────────────────────────────────────────────────────────

def calculate_entropy(text):
    if not text: return 0
    counts = {}
    for char in text:
        counts[char] = counts.get(char, 0) + 1
    probs = [c/len(text) for c in counts.values()]
    return -sum(p * math.log2(p) for p in probs)

def is_base64_like(text):
    p = r'^[A-Za-z0-9+/=]+$'
    if len(text) > 8 and re.match(p, text):
        return 1
    return 0

def has_persona_override(text):
    targs = ["you are ", "act as ", "imagine you ", "pretend to ", "ignore all ", "assistant:"]
    t = text.lower()
    return 1 if any(x in t for x in targs) else 0

def extract_features(text):
    embedding = embedder.encode(text)
    length = len(text)
    b64 = is_base64_like(text)
    persona = has_persona_override(text)
    entropy = calculate_entropy(text)
    
    raw = np.concatenate([embedding, [length, b64, persona, entropy]])
    scaled = scaler.transform(raw.reshape(1, -1))
    return scaled

# ── PREDICTION LOGIC ────────────────────────────────────────────────────────────

def scan_text(text):
    if not text.strip():
        return {"status": "empty", "score": 0, "decision": "SAFE"}
        
    features = extract_features(text)
    
    # Get Probability
    probs = bouncer_model.predict_proba(features)[0]
    score = float(probs[1]) # Prob of class 1 (ADVERSARIAL)
    
    # Simple Threshold (can be adjusted)
    # The notebook suggests FPR < 0.01 is target, so threshold might be higher.
    decision = "ADVERSARIAL" if score > 0.5 else "SAFE"
    
    return {
        "text_preview": text[:100] + "...",
        "score": round(score, 4),
        "decision": decision,
        "metadata": {
            "length": len(text),
            "entropy": round(calculate_entropy(text), 2)
        }
    }

# ── GRADIO INTERFACE ────────────────────────────────────────────────────────────

interface = gr.Interface(
    fn=scan_text,
    inputs=gr.Textbox(lines=5, placeholder="Paste prompt here..."),
    outputs=gr.JSON(),
    title="AI Bouncer 🛡️",
    description="Detect adversarial prompts, jailbreaks, and injection attempts."
)

if __name__ == "__main__":
    interface.launch()

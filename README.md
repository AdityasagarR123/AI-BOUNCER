# AI Bouncer

AI Bouncer is a robust security application designed for **prompt safety and jailbreak defense**. It uses an ensemble pipeline of traditional and machine-learning based signals to detect adversarial prompts, blacklisted content, and zero-day attacks before they interact with language models.

## Features
- **Dynamic Frontend**: Modern interface built with Next.js and Tailwind CSS (in the `ui/` directory).
- **Signal Breakdown & Explainability**: A real-time inference pipeline that dissects prompt entropy, base64 encodings, payload presence, and LLM persona deviations.
- **Machine Learning Inference Engine**: A Python Fast-API backend (in the `backend/` directory) that leverages:
    - **Sentence-Transformers** for generating prompt embeddings.
    - **XGBoost** for machine learning classification.
    - **FAISS Vectors** for fast, scalable zero-day attack matching.

## Local Development

### 1. Backend (FastAPI / Machine Learning)
1. Navigate to the `backend/` directory.
2. Install the required dependencies: `pip install -r requirements.txt`
3. Spin up the server on port 8000:
   ```bash
   python -m uvicorn app:app --port 8000
   ```

*(Note: The first time it boots up, it may take 1-2 minutes to download `sentence-transformers` and load the XGBoost trees.)*

### 2. Frontend (Next.js)
1. Navigate to the `ui/` directory.
2. Install dependencies via npm: `npm install`
3. Spin up the development server:
   ```bash
   npm run dev
   ```
4. Access the frontend locally at [http://localhost:3000](http://localhost:3000).

## Deployment

### Backend (Render natively)
- **Language**: Python 3
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`
- **Env Variable**: Set `PYTHON_VERSION` to `3.11.0` if required by dependencies.

### Frontend
- Point the Next.js frontend to the deployed backend by modifying `BOUNCER_API_URL` to point to the live server URL inside `ui/src/app/api/scan/route.ts`.

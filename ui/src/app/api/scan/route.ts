import { NextResponse } from 'next/server';

const BOUNCER_API_URL = process.env.BOUNCER_API_URL || 'https://d4crush-ai-bouncer-api.hf.space';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Call the REAL Python AI Bouncer backend
    const response = await fetch(`${BOUNCER_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Map backend response to frontend shape
    const label = data.verdict === 'ADVERSARIAL' ? 'MALICIOUS' :
      data.is_grey_zone ? 'GREY_ZONE' : 'SAFE';

    return NextResponse.json({
      label,
      confidence: data.ml_score,
      details: data.reason_str,
      reasons: data.reasons,
      signals: data.signals,
      vibeCheckNeeded: data.is_grey_zone,
    });

  } catch (error: any) {
    console.error('API Error:', error);

    // If the Python backend is not running, show a clear error
    if (error.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json({
        label: 'ERROR',
        confidence: 0,
        details: 'AI Bouncer backend is not running. Start it with: cd backend && py -m uvicorn app:app --port 8000',
        reasons: [],
        signals: {},
      }, { status: 503 });
    }

    return NextResponse.json({
      label: 'ERROR',
      confidence: 0,
      details: error.message || 'Internal Server Error',
      reasons: [],
      signals: {},
    }, { status: 500 });
  }
}

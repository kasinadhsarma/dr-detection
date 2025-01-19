import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
    
    const pythonFormData = new FormData();
    pythonFormData.append('file', file);

    const response = await fetch(`${pythonApiUrl}/predict`, {
      method: 'POST',
      body: pythonFormData,
    });

    const result = await response.json();

    // Handle successful response but with error details
    if (result.error || !result.severity) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid response format' },
        { status: 400 }
      );
    }

    // Return successful response with prediction data
    return NextResponse.json({
      success: true,
      data: {
        severity: result.severity,
        confidence: result.confidence,
        severity_scores: result.severity_scores,
        processing_time: result.processing_time
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

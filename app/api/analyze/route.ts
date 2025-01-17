import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const pythonFormData = new FormData();
    pythonFormData.append('file', file);

    const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL;
    if (!pythonApiUrl) {
      console.error('NEXT_PUBLIC_PYTHON_API_URL is not configured');
      return NextResponse.json(
        { success: false, error: 'API configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(pythonApiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: pythonFormData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Python API error:', data);
      return NextResponse.json(
        { success: false, error: data.detail || 'API Error' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

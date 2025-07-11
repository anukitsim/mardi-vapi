import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasCalId = !!process.env.CAL_ID;
    const hasVapiKey = !!process.env.VAPI_PRIVATE_KEY;
    const hasAssistantId = !!process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    
    return NextResponse.json({
      ok: true,
      environment: process.env.NODE_ENV || 'unknown',
      variables: {
        GOOGLE_SERVICE_ACCOUNT_KEY: hasServiceAccount ? 'SET' : 'MISSING',
        CAL_ID: hasCalId ? 'SET' : 'MISSING',
        VAPI_PRIVATE_KEY: hasVapiKey ? 'SET' : 'MISSING',
        NEXT_PUBLIC_VAPI_ASSISTANT_ID: hasAssistantId ? 'SET' : 'MISSING'
      },
      serviceAccountLength: hasServiceAccount ? process.env.GOOGLE_SERVICE_ACCOUNT_KEY.length : 0
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
} 
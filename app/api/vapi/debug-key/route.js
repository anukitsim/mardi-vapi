import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json({
        ok: false,
        error: 'No service account key found'
      });
    }
    
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    return NextResponse.json({
      ok: true,
      debug: {
        hasPrivateKey: !!serviceAccountKey.private_key,
        privateKeyLength: serviceAccountKey.private_key ? serviceAccountKey.private_key.length : 0,
        privateKeyStart: serviceAccountKey.private_key ? serviceAccountKey.private_key.substring(0, 50) : '',
        privateKeyEnd: serviceAccountKey.private_key ? serviceAccountKey.private_key.substring(serviceAccountKey.private_key.length - 50) : '',
        hasEscapedNewlines: serviceAccountKey.private_key ? serviceAccountKey.private_key.includes('\\n') : false,
        hasRealNewlines: serviceAccountKey.private_key ? serviceAccountKey.private_key.includes('\n') : false,
        projectId: serviceAccountKey.project_id,
        clientEmail: serviceAccountKey.client_email
      }
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message
    });
  }
} 
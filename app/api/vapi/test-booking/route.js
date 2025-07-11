import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email } = body;
    
    // Check environment variables
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const hasCalId = !!process.env.CAL_ID;
    
    if (!hasServiceAccount) {
      return NextResponse.json({
        ok: false,
        error: 'Service account key missing',
        debug: {
          hasServiceAccount,
          hasCalId,
          serviceAccountLength: 0
        }
      }, { status: 500 });
    }
    
    if (!hasCalId) {
      return NextResponse.json({
        ok: false,
        error: 'Calendar ID missing',
        debug: {
          hasServiceAccount,
          hasCalId
        }
      }, { status: 500 });
    }
    
    // Try to parse service account
    let serviceAccountKey;
    try {
      serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid service account JSON',
        debug: {
          parseError: error.message,
          serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.length
        }
      }, { status: 500 });
    }
    
    // Try to create auth
    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: 'Auth creation failed',
        debug: {
          authError: error.message
        }
      }, { status: 500 });
    }
    
    // Try to create calendar client
    let calendar;
    try {
      calendar = google.calendar({ version: 'v3', auth });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: 'Calendar client creation failed',
        debug: {
          calendarError: error.message
        }
      }, { status: 500 });
    }
    
    // Try to create a simple test event
    const event = {
      summary: `Test booking - ${name}`,
      description: `Test booking for ${name} (${email})`,
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
        timeZone: 'UTC'
      }
    };
    
    try {
      const response = await calendar.events.insert({
        calendarId: process.env.CAL_ID,
        resource: event
      });
      
      return NextResponse.json({
        ok: true,
        message: 'Test booking created successfully',
        eventId: response.data.id,
        debug: {
          hasServiceAccount: true,
          hasCalId: true,
          serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.length
        }
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: 'Calendar API call failed',
        debug: {
          calendarApiError: error.message,
          calendarApiCode: error.code,
          calendarApiStatus: error.status
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Unexpected error',
      debug: {
        unexpectedError: error.message
      }
    }, { status: 500 });
  }
} 
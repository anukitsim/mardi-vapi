import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Parse the incoming JSON from Vapi
    const { name, email, phone, preferred_time } = await request.json();

    console.log('📅 Booking request received:', {
      name,
      email, 
      phone,
      preferred_time
    });

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({
        ok: false,
        error: 'Name and email are required'
      }, { status: 400 });
    }

    // Load environment variables
    const calendarId = process.env.CAL_ID;

    if (!calendarId) {
      console.error('❌ Missing CAL_ID environment variable');
      return NextResponse.json({
        ok: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    // Load service account key from environment variables or file
    let serviceAccountKey;
    try {
      // Try loading from environment variable first (for production)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.log('🔍 Loading service account from environment variable');
        serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        console.log('✅ Service account loaded from environment variable');
      } else {
        console.error('❌ Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
        return NextResponse.json({
          ok: false,
          error: 'Service account configuration missing'
        }, { status: 500 });
      }
      
    } catch (error) {
      console.error('❌ Failed to load service account:', error);
      return NextResponse.json({
        ok: false,
        error: 'Invalid service account configuration'
      }, { status: 500 });
    }

    // Set up Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Parse preferred time or default to next business day at 10 AM
    let startTime;
    if (preferred_time) {
      startTime = new Date(preferred_time);
    } else {
      // Default to next business day at 10 AM
      startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(10, 0, 0, 0);
      
      // If it's weekend, move to Monday
      if (startTime.getDay() === 0) startTime.setDate(startTime.getDate() + 1); // Sunday -> Monday
      if (startTime.getDay() === 6) startTime.setDate(startTime.getDate() + 2); // Saturday -> Monday
    }

    // Calculate end time (30 minutes later)
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    // Create the calendar event
    const event = {
      summary: `Mardi consultation – ${name}`,
      description: `
Consultation with ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Scheduled via Mardi Voice Assistant
      `.trim(),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Tbilisi', // Adjust timezone as needed
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Tbilisi',
      },
      attendees: [
        {
          email: email,
          displayName: name,
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 15 },      // 15 minutes before
        ],
      },
    };

    // Insert the event into Google Calendar
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: 'all', // Send invites to attendees
    });

    console.log('✅ Calendar event created:', response.data.id);

    // Format the booking confirmation for Vapi
    const formattedDate = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const formattedTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return NextResponse.json({
      ok: true,
      booking_details: {
        date: formattedDate,
        time: formattedTime,
        duration: '30 minutes',
        calendar_event_id: response.data.id,
        confirmation_message: `You're booked for ${formattedDate} at ${formattedTime}. A calendar invite has been sent to ${email}.`
      }
    });

  } catch (error) {
    console.error('❌ Booking error:', error);
    
    return NextResponse.json({
      ok: false,
      error: 'Failed to create booking. Please try again.'
    }, { status: 500 });
  }
} 
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Parse the incoming JSON from Vapi
    const { name, email, phone, preferred_time, client_type } = await request.json();

    console.log('📅 Booking request received:', {
      name,
      email, 
      phone,
      preferred_time,
      client_type
    });

    // Strict validation - ALL fields are required
    const missingFields = [];
    if (!name || name.trim() === '') missingFields.push('name');
    if (!email || email.trim() === '') missingFields.push('email');
    if (!phone || phone.trim() === '') missingFields.push('phone');
    if (!preferred_time || preferred_time.trim() === '') missingFields.push('preferred_time');
    if (!client_type || client_type.trim() === '') missingFields.push('client_type');

    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return NextResponse.json({
        ok: false,
        error: `Missing required information: ${missingFields.join(', ')}. Please provide all details before booking.`,
        missing_fields: missingFields
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        ok: false,
        error: 'Please provide a valid email address'
      }, { status: 400 });
    }

    // Block test data
    const testPatterns = [
      /test.*user/i,
      /john.*doe/i,
      /jane.*doe/i,
      /example/i,
      /@test\./i,
      /@example\./i,
      /debug/i,
      /placeholder/i
    ];

    const isTestData = testPatterns.some(pattern => 
      pattern.test(name) || pattern.test(email)
    );

    if (isTestData) {
      console.log('🚫 Test data detected, rejecting booking');
      return NextResponse.json({
        ok: false,
        error: 'Test data is not allowed. Please provide real information.'
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
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.log('🔍 Loading service account from environment variable');
      try {
        // Fix escaped newlines in private key
        let serviceAccountData = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        serviceAccountKey = JSON.parse(serviceAccountData);
        
        // Fix the private key format if it has escaped newlines
        if (serviceAccountKey.private_key && serviceAccountKey.private_key.includes('\\n')) {
          serviceAccountKey.private_key = serviceAccountKey.private_key.replace(/\\n/g, '\n');
        }
        
        console.log('✅ Service account parsed from environment variable');
      } catch (error) {
        console.error('❌ Failed to parse service account from environment variable:', error);
        return NextResponse.json({
          ok: false,
          error: 'Invalid service account configuration'
        }, { status: 500 });
      }
    } else {
      // Fallback to file for local development (add fs import at top)
      try {
        const fs = require('fs/promises');
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                                 process.cwd() + '/service-account.json';
        
        console.log('🔍 Attempting to load service account from:', serviceAccountPath);
        
        const serviceAccountData = await fs.readFile(serviceAccountPath, 'utf8');
        console.log('✅ Service account file read successfully, length:', serviceAccountData.length);
        
        serviceAccountKey = JSON.parse(serviceAccountData);
        console.log('✅ Service account JSON parsed successfully');
        
      } catch (error) {
        console.error('❌ Failed to load service account file:', error);
        return NextResponse.json({
          ok: false,
          error: 'Service account configuration missing'
        }, { status: 500 });
      }
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
      // Try to parse the preferred time
      try {
        // Simple parsing for common formats
        const now = new Date();
        const timeStr = preferred_time.toLowerCase();
        
        if (timeStr.includes('tomorrow')) {
          startTime = new Date(now);
          startTime.setDate(now.getDate() + 1);
          
          // Extract time if specified
          const timeMatch = timeStr.match(/(\d{1,2})(:\d{2})?\s*(am|pm)/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2].substring(1)) : 0;
            const period = timeMatch[3].toLowerCase();
            
            if (period === 'pm' && hour !== 12) hour += 12;
            if (period === 'am' && hour === 12) hour = 0;
            
            startTime.setHours(hour, minutes, 0, 0);
          } else {
            startTime.setHours(14, 0, 0, 0); // Default to 2 PM
          }
        } else if (timeStr.includes('next')) {
          startTime = new Date(now);
          startTime.setDate(now.getDate() + 7); // Next week
          startTime.setHours(10, 0, 0, 0); // Default to 10 AM
        } else {
          // Try to parse as a date
          startTime = new Date(preferred_time);
          if (isNaN(startTime.getTime())) {
            // If parsing fails, use next business day
            startTime = new Date(now);
            startTime.setDate(now.getDate() + 1);
            startTime.setHours(10, 0, 0, 0);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not parse preferred time, using default');
        startTime = new Date();
        startTime.setDate(startTime.getDate() + 1);
        startTime.setHours(10, 0, 0, 0);
      }
    } else {
      // Default to next business day at 10 AM
      startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(10, 0, 0, 0);
    }

    // Ensure it's a business day
    if (startTime.getDay() === 0) startTime.setDate(startTime.getDate() + 1); // Sunday -> Monday
    if (startTime.getDay() === 6) startTime.setDate(startTime.getDate() + 2); // Saturday -> Monday

    console.log('⏰ Using appointment time:', startTime.toISOString());

    // Calculate end time (45 minutes later)
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);

    // Create the calendar event
    const event = {
      summary: `Mardi Consultation – ${name} (${client_type})`,
      description: `
MARDI HOLDING - REAL ESTATE CONSULTATION

📋 CLIENT INFORMATION:
• Name: ${name}
• Email: ${email}
• Phone: ${phone}
• Client Type: ${client_type}
• Requested Time: ${preferred_time}

🏢 CONSULTATION AGENDA:
• Property portfolio overview
• Investment opportunities discussion
• Market analysis and trends
• Financial planning and payment options
• Legal and documentation process
• Next steps and follow-up

📞 CONTACT INFORMATION:
• Email: info@mardi.ge
• Website: mardi.ge

⏰ Scheduled via Mardi Voice Assistant
📅 Event created: ${new Date().toISOString()}
      `.trim(),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Tbilisi',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Tbilisi',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 },      // 30 minutes before
        ],
      },
      creator: {
        email: 'mardi-calendar-bot@mardi-435620.iam.gserviceaccount.com',
        displayName: 'Mardi Calendar Bot'
      }
    };

    // Insert the event into Google Calendar (without attendees to avoid permission issues)
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: 'none', // Don't send invites (requires domain delegation for service accounts)
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
        name: name,
        email: email,
        phone: phone,
        client_type: client_type,
        date: formattedDate,
        time: formattedTime,
        duration: '45 minutes',
        calendar_event_id: response.data.id,
        confirmation_message: `Perfect! Your consultation is confirmed for ${formattedDate} at ${formattedTime}. The appointment details have been added to our calendar. We'll contact you at ${phone} or ${email} if needed.`
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
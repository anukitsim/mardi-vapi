import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const vapiPrivateKey = process.env.VAPI_PRIVATE_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    
    if (!vapiPrivateKey || !assistantId) {
      return NextResponse.json({
        ok: false,
        error: 'Missing Vapi credentials'
      }, { status: 500 });
    }
    
    console.log('🔑 Vapi credentials check:', {
      hasPrivateKey: !!vapiPrivateKey,
      hasAssistantId: !!assistantId,
      assistantId: assistantId
    });
    
    // Get the current production URL from request or use default
    const body = await request.json();
    const webhookUrl = body.webhookUrl || 'https://mardi-vapi-2c52wxg76-anukitsims-projects.vercel.app/api/vapi/book';
    
    console.log('🚀 Updating Vapi assistant with webhook URL:', webhookUrl);
    
    // Updated assistant configuration with strict data collection
    const assistantConfig = {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are a professional real estate consultation booking assistant for Mardi Holding. Your ONLY job is to collect complete booking information and schedule appointments.

CRITICAL RULES:
1. NEVER call the booking function until you have ALL required information
2. Collect information step by step, one piece at a time
3. Be conversational and friendly, not robotic
4. Always confirm all details before booking

REQUIRED INFORMATION (collect in this order):
1. Full name (first and last name)
2. Email address (validate format)
3. Phone number (international format preferred)
4. Preferred appointment time (be specific about date and time)
5. Client type (Individual or Corporate)

CONVERSATION FLOW:
- Start: "Hello! I'm here to help you schedule a consultation with Mardi Holding. May I have your full name please?"
- After name: "Thank you [name]. What's the best email address to reach you?"
- After email: "Great! And your phone number?"
- After phone: "Perfect. When would you like to schedule your consultation? Please be specific about the date and time you prefer."
- After time: "Are you booking as an individual or representing a company?"
- After all info: "Let me confirm your booking details: [repeat all information]. Is this correct?"
- Only after confirmation: Call the booking function

VALIDATION:
- Names must be real (not "Test User", "John Doe", etc.)
- Emails must be valid (not @example.com, @test.com, etc.)
- Times must be specific (not just "tomorrow" - get exact date/time)

DO NOT:
- Call booking function with incomplete information
- Accept test data or placeholder information
- Rush through the process
- List all requirements at once (collect step by step)

Remember: Quality over speed. Better to take time collecting proper information than create failed bookings.`
          }
        ]
      },
      voice: {
        provider: "playht",
        voiceId: "s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
        speed: 1.0,
        temperature: 0.7
      },
      serverUrl: webhookUrl,
      serverUrlSecret: 'mardi-webhook-secret-2024',
      functions: [
        {
          name: "book_consultation",
          description: "Books a real estate consultation appointment. ONLY call this function when you have collected and confirmed ALL required information from the user.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Full name of the client (first and last name)"
              },
              email: {
                type: "string",
                description: "Valid email address of the client"
              },
              phone: {
                type: "string",
                description: "Phone number of the client"
              },
              preferred_time: {
                type: "string",
                description: "Specific preferred appointment time (e.g., 'tomorrow at 2pm', 'next Monday at 10am')"
              },
              client_type: {
                type: "string",
                enum: ["Individual", "Corporate"],
                description: "Type of client - Individual or Corporate"
              }
            },
            required: ["name", "email", "phone", "preferred_time", "client_type"]
          }
        }
      ],
      firstMessage: "Hello! I'm here to help you schedule a consultation with Mardi Holding. May I have your full name please?",
      endCallMessage: "Thank you for booking with Mardi Holding. You'll receive a confirmation email shortly. Have a great day!",
      endCallPhrases: ["goodbye", "thank you", "that's all", "end call"],
      recordingEnabled: true,
      hipaaEnabled: false,
      clientMessages: ["transcript", "hang", "function-call"],
      serverMessages: ["end-of-call-report", "status-update", "hang", "function-call"],
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 600,
      backgroundSound: "office"
    };

    // Make the API call to update the assistant
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vapiPrivateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assistantConfig),
    });

    console.log('📡 Vapi response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Vapi API error:', errorData);
      return NextResponse.json({
        ok: false,
        error: `Failed to update assistant: ${response.status} ${errorData}`
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('✅ Assistant updated successfully');

    return NextResponse.json({
      ok: true,
      message: 'Assistant updated successfully',
      webhookUrl: webhookUrl,
      assistantId: assistantId
    });

  } catch (error) {
    console.error('❌ Error updating assistant:', error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
} 
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
    const webhookUrl = body.webhookUrl || 'https://mardi-vapi-nyb5zg7g7-anukitsims-projects.vercel.app/api/vapi/book';
    
    console.log('🚀 Updating Vapi assistant with webhook URL:', webhookUrl);
    
    // Update the assistant configuration
    const updateData = {
      serverUrl: webhookUrl,
      serverUrlSecret: 'mardi-webhook-secret-2024',
      functions: [
        {
          name: 'bookConsultation',
          description: 'Book a consultation appointment with Mardi Holding. ONLY call this function when you have collected ALL required information from the user AND the user has confirmed they want to book the appointment.',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Full name of the client'
              },
              email: {
                type: 'string',
                description: 'Email address of the client'
              },
              phone: {
                type: 'string',
                description: 'Phone number of the client (optional)'
              },
              preferred_time: {
                type: 'string',
                description: 'Preferred appointment time (e.g., "tomorrow at 2pm", "next Monday at 10am")'
              },
              client_type: {
                type: 'string',
                description: 'Type of client: Individual or Corporate',
                enum: ['Individual', 'Corporate']
              },
              project_interest: {
                type: 'string',
                description: 'Specific project or property type they are interested in (optional)'
              },
              investment_amount: {
                type: 'string',
                description: 'Investment budget range (optional)'
              },
              additional_notes: {
                type: 'string',
                description: 'Any additional notes or special requirements (optional)'
              }
            },
            required: ['name', 'email', 'client_type']
          }
        }
      ]
    };
    
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vapiPrivateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📡 Vapi response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Vapi update failed:', errorData);
      return NextResponse.json({
        ok: false,
        error: 'Failed to update assistant',
        details: errorData
      }, { status: response.status });
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
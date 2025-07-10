# 📅 Mardi Voice Assistant - Booking Integration

Your voice assistant can now book appointments directly to Google Calendar! Here's how to complete the setup.

## 🏗️ What's Built

✅ **API Endpoint**: `/api/vapi/book` - Handles booking requests from Vapi  
✅ **Google Calendar Integration**: Creates 30-minute consultation events  
✅ **Email Invites**: Automatically sends calendar invites to customers  
✅ **Smart Scheduling**: Defaults to next business day if no time specified  

## 🔧 Setup Steps

### 1. Google Calendar Setup

**Create a Service Account:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Go to "IAM & Admin" → "Service Accounts"
5. Click "Create Service Account"
6. Name it "mardi-booking" and create
7. Click on the service account → "Keys" tab → "Add Key" → "JSON"
8. Download the JSON file

**Share Your Calendar:**
1. Open Google Calendar
2. Click the 3 dots next to your calendar → "Settings and sharing"
3. Scroll to "Share with specific people" 
4. Add the service account email (from the JSON file) with "Make changes to events" permission
5. Copy your Calendar ID from "Calendar ID" section

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Google Calendar Integration
GCP_SERVICE_KEY={"type":"service_account","project_id":"your-project"...}
CAL_ID=your-calendar-id@group.calendar.google.com
```

**Important:** 
- `GCP_SERVICE_KEY` should be the entire JSON content as a single line (no line breaks)
- `CAL_ID` is your Google Calendar ID from the sharing settings

### 3. Vapi Dashboard Configuration

#### A. Create a Custom Function

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai) → **Tools** → **Custom Functions**
2. Click **"Create Function"**
3. Fill in:
   - **Name**: `createCalendarEvent`
   - **Description**: `Books a consultation appointment in Google Calendar`
   - **URL**: `https://your-domain.com/api/vapi/book` (use ngrok URL for testing)
   - **Method**: `POST`

4. **JSON Schema** (copy this exactly):
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Customer's full name"
    },
    "email": {
      "type": "string",
      "description": "Customer's email address"
    },
    "phone": {
      "type": "string",
      "description": "Customer's phone number (optional)"
    },
    "preferred_time": {
      "type": "string",
      "description": "Preferred appointment date and time in ISO format"
    }
  },
  "required": ["name", "email"]
}
```

#### B. Update Assistant Prompt

Add this to your assistant's system prompt:

```
When a caller wants to book a meeting, consultation, or appointment:

1. Collect their information:
   - Full name (required)
   - Email address (required) 
   - Phone number (optional)
   - Preferred date and time (optional - if not provided, default to next business day)

2. Once you have name and email, call the createCalendarEvent function with the collected information.

3. After the booking is successful, confirm the appointment details to the caller using the information returned from the function.

Example: "Perfect! I've booked your consultation for [date] at [time]. You'll receive a calendar invite at [email] shortly. Is there anything else I can help you with?"
```

#### C. Add Function to Assistant

1. Go to **Assistants** → Select your assistant → **Edit**
2. Scroll to **"Tools"** section
3. Click **"Add Tool"** → **"Function"**
4. Select `createCalendarEvent` from the dropdown
5. **Save** your assistant

## 🧪 Testing

### Local Testing
```bash
# Test the API endpoint directly
curl -X POST http://localhost:3001/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com", 
    "phone": "+1234567890",
    "preferred_time": "2024-01-15T14:00:00Z"
  }'
```

### Voice Testing
1. Use your voice assistant
2. Say: "I'd like to book a meeting"
3. Provide your details when prompted
4. Check Google Calendar for the new event

## 🎯 How It Works

1. **Customer Request**: "I want to book a consultation"
2. **Assistant Collects**: Name, email, phone (optional), preferred time (optional)  
3. **Function Call**: Vapi calls `/api/vapi/book` with the data
4. **Calendar Event**: API creates Google Calendar event with:
   - Title: "Mardi consultation – [Name]"
   - Duration: 30 minutes
   - Attendees: Customer email
   - Description: Contact details + "Scheduled via Mardi Voice Assistant"
5. **Confirmation**: Assistant tells customer they're booked and when

## 📋 Event Details

**Default Scheduling:**
- Duration: 30 minutes
- Timezone: Europe/Tbilisi (adjust in code if needed)
- If no time specified: Next business day at 10:00 AM
- Reminders: Email 24h before, popup 15min before

**Event Information:**
- Summary: "Mardi consultation – [Customer Name]"
- Description includes customer contact details
- Calendar invite sent automatically
- Meeting shows in both your calendar and customer's

## 🐛 Troubleshooting

**Common Issues:**

1. **"Missing environment variables"**
   - Check `.env.local` has `GCP_SERVICE_KEY` and `CAL_ID`
   - Restart your Next.js server after adding variables

2. **"Invalid service account configuration"**
   - Ensure `GCP_SERVICE_KEY` is valid JSON on a single line
   - Remove any line breaks from the JSON

3. **Calendar access denied**
   - Make sure you shared your calendar with the service account email
   - Grant "Make changes to events" permission

4. **Vapi function not triggering**
   - Check the function URL is correct (use ngrok for local testing)
   - Verify the JSON schema matches exactly
   - Ensure the function is added to your assistant

**Logs:**
- Check browser developer console for API errors
- Check Next.js terminal for server logs
- Look for "📅 Booking request received" in logs

## 🚀 Production Deployment

When deploying to production:

1. **Update Vapi Function URL**: Change from ngrok to your production domain
2. **Environment Variables**: Add `GCP_SERVICE_KEY` and `CAL_ID` to your hosting platform
3. **Test Thoroughly**: Verify booking flow works with real calendar
4. **Monitor Logs**: Watch for any booking errors in production

## 🔐 Security Notes

- Service account has minimal permissions (calendar only)
- API validates required fields before processing
- Errors are logged without exposing sensitive data
- Uses Google's secure OAuth2 flow for calendar access

---

Your voice assistant is now ready to book appointments! 🎉 
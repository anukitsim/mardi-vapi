# Getting the Vapi Widget to Connect

Your code is now correct – if you still get the "Vapi connection blocked" hint, fix the three items **inside the Vapi dashboard**:

| Where | Setting | Value |
|-------|---------|-------|
| **API Keys → 1dc3cbb4-…** | **Allowed Origins** | *Either leave empty (no restriction) **or** add:*<br>`https://e9cdfef0170d.ngrok-free.app` and your production URL |
| | **Allowed Assistants** | *Set to* **All Assistants** **or** paste the ID:*<br>`f8a0cc45-14c6-459e-87e0-0e4eb6153765` |
| **Assistants → Mardi voice assistant** | **Publish / Deploy** | Press the button so the assistant is live |

After changing any of the above, click **Save / Publish**, then reload your site.  
When you click the mic the assistant should greet me 
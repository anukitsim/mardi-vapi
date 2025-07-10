'use client';

import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

/**
 * VoiceAssistant – simple floating mic button (Vapi Web SDK)
 */
export default function VoiceAssistant() {
  const ORANGE = '#E5703A';

  const [isListening, setIsListening] = useState(false);
  const [debugInfo, setDebugInfo]   = useState('');
  const vapiRef = useRef(null);

  /* ---------- initialise Vapi on mount ---------- */
  useEffect(() => {
    const vapiKey     = process.env.NEXT_PUBLIC_VAPI_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    console.log('🔧 Vapi init', {
      vapiKey: vapiKey ? vapiKey.slice(0, 8) + '…' : 'MISSING',
      assistantId: assistantId ? assistantId.slice(0, 8) + '…' : 'MISSING'
    });

    if (!vapiKey || !assistantId) {
      const msg = 'Missing Vapi env vars';
      console.error(msg);
      setDebugInfo(msg);
      return;
    }

    let vapi;
    try {
      vapi = new Vapi(vapiKey);
      console.log('✅ Vapi instance created successfully:', vapi);
      vapiRef.current = vapi;
    } catch (error) {
      console.error('❌ Failed to create Vapi instance:', error);
      setDebugInfo(`Failed to create Vapi: ${error.message}`);
      return;
    }

    vapi.on('call-start', () => { setIsListening(true);  setDebugInfo('Call started'); });
    vapi.on('call-end',   () => { setIsListening(false); setDebugInfo('Call ended');   });
    vapi.on('speech-start', () => setDebugInfo('You are speaking…'));
    vapi.on('speech-end',   () => setDebugInfo('Processing…'));
    vapi.on('message',      m  => setDebugInfo(`Message: ${m.type}`));
    vapi.on('error', e => {
      console.error('🛑 Vapi SDK error →', e);
      console.error('🔍 Error details:', {
        type: typeof e,
        keys: Object.keys(e || {}),
        string: String(e),
        message: e?.message,
        stack: e?.stack,
        name: e?.name
      });
      setIsListening(false);

      // When Vapi rejects with an empty object it's almost always a
      // dashboard-scope problem: origin or assistant not allowed, or not published.
      const friendly = (e && Object.keys(e).length === 0)
        ? 'Vapi connection blocked. 1) Check "Allowed Origins" → add https://e9cdfef0170d.ngrok-free.app. ' +
          '2) Check "Allowed Assistants" → include this assistant or set to All. ' +
          '3) Make sure the assistant is Published.'
        : (e?.message || 'Vapi error');

      setDebugInfo(friendly);
    });

    return () => vapi.stop();          // clean-up on unmount
  }, []);

  /* ---------- helpers ---------- */
  const startListening = () => {
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    console.log('🚀 Starting call with:', { assistantId });
    console.log('🔍 Vapi instance:', vapiRef.current);
    
    if (!vapiRef.current) {
      console.error('❌ No Vapi instance available');
      setDebugInfo('No Vapi instance');
      return;
    }
    
    // SDK expects string assistantId
    console.log('📞 Calling vapi.start(assistantId)...');
    vapiRef.current.start(assistantId).catch(e => {
      console.error('💥 Start call failed:', e);
      console.error('Error type:', typeof e);
      console.error('Error keys:', Object.keys(e));
      console.error('Error string:', String(e));
      setDebugInfo(e?.message || 'Vapi start failed');
    });
  };

  const stopListening = () => vapiRef.current?.stop();

  /* ---------- UI ---------- */
  return (
    <>
      {/* pulse / wave animations */}
      <style jsx>{`
        @keyframes wave    {0%{transform:scale(1);opacity:.35}100%{transform:scale(2);opacity:0}}
        @keyframes bounce  {0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .wave    {animation:wave 1.8s ease-out infinite}
        .bounce  {animation:bounce 2.4s ease-in-out infinite}
      `}</style>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[99999]">
        <div className="relative">
          {/* background waves */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[0,1,2].map(i => (
              <span key={i} className="wave absolute w-20 h-20 rounded-full border"
                    style={{borderColor:ORANGE, animationDelay:`${i*0.6}s`}}/>
            ))}
          </div>

          {/* active waves when listening */}
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0,1,2].map(i => (
                <span key={i} className="wave absolute w-20 h-20 rounded-full border-2"
                      style={{borderColor:ORANGE, animationDelay:`${i*0.3}s`}}/>
              ))}
            </div>
          )}

          {/* mic button */}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-transform
                        ${isListening ? 'scale-105 shadow-lg' : 'hover:scale-105 bounce'}`}
            style={{background:ORANGE}}
            aria-label={isListening ? 'Stop voice assistant' : 'Start voice assistant'}
          >
            {isListening ? (
              <svg className="w-8 h-8 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 14a4 4 0 004-4V5a4 4 0 10-8 0v5a4 4 0 004 4zm6-4v1a6 6 0 01-12 0v-1m6 6v4m-4 0h8" />
              </svg>
            )}
          </button>

          {/* tiny “×” button while listening */}
          {isListening && (
            <button aria-label="Stop listening"
                    onClick={stopListening}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center shadow">
              ×
            </button>
          )}


        </div>
      </div>
    </>
  );
}

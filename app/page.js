import VoiceAssistant from './components/VoiceAssistant';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">

      {/* Voice Assistant Component - positioned at bottom center */}
      <VoiceAssistant />
    </div>
  );
}

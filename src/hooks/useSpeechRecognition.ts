import { useState, useCallback, useRef } from "react";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResult[];
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

interface UseSpeechRecognitionResult {
  start: (lang: string, onFinal: (transcript: string) => void) => void;
  stop: () => void;
  recording: boolean;
  liveTranscript: string;
  supported: boolean;
}

function getSR(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  const supported = getSR() !== null;

  const start = useCallback(
    (lang: string, onFinal: (transcript: string) => void) => {
      const SR = getSR();
      if (!SR) return;

      const recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const parts = event.results.map((r) => r[0]?.transcript ?? "");
        const full = parts.join("");
        setLiveTranscript(full);
        const last = event.results[event.results.length - 1];
        if (last?.isFinal) onFinal(full);
      };

      recognition.onend = () => setRecording(false);
      recognition.onerror = (e) => {
        console.warn("SpeechRecognition error:", e.error);
        setRecording(false);
      };

      recRef.current = recognition;
      recognition.start();
      setRecording(true);
      setLiveTranscript("");
    },
    [],
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
    setRecording(false);
  }, []);

  return { start, stop, recording, liveTranscript, supported };
}

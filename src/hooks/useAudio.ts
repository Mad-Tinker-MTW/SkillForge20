import { useState, useCallback, useRef } from "react";

interface UseAudioResult {
  play: (text: string, lang: string, rate?: number) => void;
  stop: () => void;
  playing: boolean;
  supported: boolean;
}

export function useAudio(): UseAudioResult {
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const getVoice = useCallback(
    (lang: string): SpeechSynthesisVoice | undefined => {
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang.split("-")[0]!;
      // Prefer exact match, fall back to language prefix
      return (
        voices.find((v) => v.lang === lang) ??
        voices.find((v) => v.lang.startsWith(langPrefix))
      );
    },
    [],
  );

  const play = useCallback(
    (text: string, lang: string, rate = 0.85) => {
      if (!supported) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;

      // Voices may not be loaded yet — try immediately, retry after load
      const voice = getVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setPlaying(true);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // If voices weren't loaded, retry once they are
      if (!voice) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.cancel();
          const v = getVoice(lang);
          if (v) utterance.voice = v;
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    },
    [supported, getVoice],
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setPlaying(false);
  }, [supported]);

  return { play, stop, playing, supported };
}

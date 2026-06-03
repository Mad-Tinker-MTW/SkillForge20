import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";

interface Props {
  lang: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function RecordButton({ lang, onTranscript, disabled = false }: Props) {
  const { start, stop, recording, liveTranscript, supported } =
    useSpeechRecognition();

  if (!supported) {
    return (
      <p className="text-xs text-zinc-600 italic">
        Speech recognition requires Chrome or Edge.
      </p>
    );
  }

  function toggle() {
    if (recording) {
      stop();
    } else {
      start(lang, onTranscript);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
          recording
            ? "bg-red-700 text-white hover:bg-red-600"
            : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white"
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            recording ? "bg-white animate-pulse" : "bg-zinc-400"
          }`}
        />
        {recording ? "Stop recording" : "Record attempt"}
      </button>

      {liveTranscript && (
        <p className="text-xs text-zinc-400 italic pl-1">
          {liveTranscript}
        </p>
      )}
    </div>
  );
}

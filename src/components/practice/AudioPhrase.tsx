import { useAudio } from "../../hooks/useAudio";
import type { TargetPhrase } from "../../types";

interface Props {
  phrase: TargetPhrase;
  lang: string;
  index: number;
}

export function AudioPhrase({ phrase, lang, index }: Props) {
  const { play, stop, playing, supported } = useAudio();

  function handlePlay() {
    if (playing) {
      stop();
    } else {
      play(phrase.foreign, lang);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 shrink-0">{index + 1}.</span>
            <span className="font-medium text-white text-sm">{phrase.foreign}</span>
          </div>
          <div className="text-zinc-400 mt-0.5">{phrase.romanized}</div>
          {phrase.stressPattern && (
            <div className="font-mono text-zinc-500 text-[10px]">{phrase.stressPattern}</div>
          )}
        </div>

        {supported && (
          <button
            type="button"
            onClick={handlePlay}
            className={`shrink-0 rounded-full p-2 transition-colors ${
              playing
                ? "bg-blue-600 text-white animate-pulse"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white"
            }`}
            title={playing ? "Stop" : "Play phrase"}
          >
            {playing ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <rect x="3" y="3" width="4" height="10" rx="1" />
                <rect x="9" y="3" width="4" height="10" rx="1" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4 3l10 5-10 5V3z" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="text-zinc-300 border-t border-zinc-700 pt-1 mt-1">
        {phrase.native}
      </div>
      <div className="text-zinc-500 italic">{phrase.context}</div>
    </div>
  );
}

import type { SessionLogRow } from "../../types";
import { SessionLogEntry } from "./SessionLogEntry";

interface Props {
  logs: SessionLogRow[];
  onChanged: () => void;
}

export function SessionHistory({ logs, onChanged }: Props) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center text-xs text-zinc-600">
        No sessions logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <SessionLogEntry key={log.id} log={log} onChanged={onChanged} />
      ))}
    </div>
  );
}

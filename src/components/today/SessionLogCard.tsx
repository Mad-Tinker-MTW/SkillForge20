import { useEffect, useState } from "react";
import type { SessionLogRow, PracticeOutput } from "../../types";
import { Card, CardHeader, CardBody } from "../shared/Card";

interface Props {
  skillId: string;
  hoursLogged: number;
  refreshTick: number;
}

export function SessionLogCard({ skillId, hoursLogged, refreshTick }: Props) {
  const [logs, setLogs] = useState<SessionLogRow[]>([]);

  useEffect(() => {
    fetch(`/api/sessions/skill/${skillId}?limit=5`)
      .then((r) => r.json())
      .then((data: SessionLogRow[]) => setLogs(data))
      .catch(() => {/* silent */});
  }, [skillId, refreshTick]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Session Log
          </span>
          <span className="text-xs text-zinc-400">
            <span className="text-white font-medium">{hoursLogged.toFixed(1)}</span>/20h
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-2 overflow-y-auto max-h-72">
        {logs.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">No sessions logged yet.</p>
        ) : (
          logs.map((log) => {
            const output = log.practice_output
              ? (JSON.parse(log.practice_output) as PracticeOutput)
              : null;
            return (
              <div
                key={log.id}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">
                    S{log.session_number} — {log.subskill}
                  </span>
                  {output && (
                    <span
                      className={`font-medium ${
                        output.selfRating === "hit"
                          ? "text-green-400"
                          : output.selfRating === "partial"
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {output.selfRating}
                    </span>
                  )}
                </div>
                {log.minutes_logged !== null && (
                  <span className="text-zinc-500">{log.minutes_logged}m logged</span>
                )}
                {log.ready_to_advance === 1 && (
                  <span className="ml-2 text-green-400">↑ advance</span>
                )}
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

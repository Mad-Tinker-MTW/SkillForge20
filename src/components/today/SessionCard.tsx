import type { SessionToken } from "../../types";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { PhaseBadge, PriorityBadge } from "../shared/Badge";
import { ProgressBar } from "../shared/ProgressBar";

interface Props {
  token: SessionToken;
}

export function SessionCard({ token }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Current Session
          </span>
          <PhaseBadge phase={token.weekPhase} />
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">{token.subskill}</span>
            <PriorityBadge priority={token.subskillPriority as 1 | 2 | 3} />
          </div>
          <p className="text-xs text-zinc-400">{token.subskillTarget}</p>
        </div>

        <ProgressBar
          value={token.hoursLogged}
          max={20}
          label="Hours toward 20"
        />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-zinc-800 px-3 py-2">
            <div className="text-zinc-500 mb-0.5">Session</div>
            <div className="font-medium text-white">
              {token.sessionNumber} / 28
            </div>
          </div>
          <div className="rounded-lg bg-zinc-800 px-3 py-2">
            <div className="text-zinc-500 mb-0.5">Budget</div>
            <div className="font-medium text-white">{token.sessionBudgetMinutes} min</div>
          </div>
        </div>

        <div className="flex gap-3 text-xs">
          <span className={`font-medium ${token.floorCleared ? "text-green-400" : "text-zinc-500"}`}>
            {token.floorCleared ? "✓ Floor cleared" : "✗ Floor pending"}
          </span>
          <span className={`font-medium ${token.ceilingCleared ? "text-green-400" : "text-zinc-500"}`}>
            {token.ceilingCleared ? "✓ Ceiling cleared" : "✗ Ceiling pending"}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

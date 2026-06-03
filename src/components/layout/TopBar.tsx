import type { SessionToken } from "../../types";
import { SkillBadge, PhaseBadge } from "../shared/Badge";
import { useSkill } from "../../context/SkillContext";

interface TopBarProps {
  token: SessionToken;
}

export function TopBar({ token }: TopBarProps) {
  const { skill } = useSkill();
  const hoursLogged = skill?.hours_logged ?? token.hoursLogged;

  return (
    <header className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-5 py-2.5 text-sm">
      <span className="font-semibold text-white truncate max-w-48">{token.skillName}</span>
      <SkillBadge type={token.skillType} />
      <PhaseBadge phase={token.weekPhase} />
      <span className="text-zinc-400">
        Session <span className="text-white font-medium">{token.sessionNumber}</span>/28
      </span>
      <span className="text-zinc-400">
        Week <span className="text-white font-medium">{token.weekNumber}</span>
      </span>
      <span className="text-zinc-400">
        <span className="text-white font-medium">{hoursLogged.toFixed(1)}</span>/20h
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className={token.floorCleared ? "text-green-400" : "text-zinc-600"}>
          {token.floorCleared ? "✓" : "✗"} Floor
        </span>
        <span className={token.ceilingCleared ? "text-green-400" : "text-zinc-600"}>
          {token.ceilingCleared ? "✓" : "✗"} Ceiling
        </span>
      </div>
    </header>
  );
}

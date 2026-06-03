import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { SkillRow } from "../types";

interface SkillContextValue {
  skill: SkillRow | null;
  refreshSkill: () => Promise<void>;
}

const SkillContext = createContext<SkillContextValue>({
  skill: null,
  refreshSkill: async () => {},
});

export function SkillProvider({
  skillId,
  children,
}: {
  skillId: string | null;
  children: React.ReactNode;
}) {
  const [skill, setSkill] = useState<SkillRow | null>(null);

  const refreshSkill = useCallback(async () => {
    if (!skillId) return;
    const res = await fetch(`/api/skills/${skillId}`);
    const data = await res.json() as { skill: SkillRow };
    setSkill(data.skill);
  }, [skillId]);

  // Re-fetch when skillId changes or on explicit refresh
  useEffect(() => {
    setSkill(null); // clear stale data on skill switch
    refreshSkill();
  }, [refreshSkill]);

  return (
    <SkillContext.Provider value={{ skill, refreshSkill }}>
      {children}
    </SkillContext.Provider>
  );
}

export const useSkill = () => useContext(SkillContext);

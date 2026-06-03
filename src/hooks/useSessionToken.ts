import { useState, useEffect, useCallback } from "react";
import type { SessionToken } from "../types";

interface UseSessionTokenResult {
  token: SessionToken | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSessionToken(skillId: string | null): UseSessionTokenResult {
  const [token, setToken] = useState<SessionToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!skillId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/skills/${skillId}/token`)
      .then((r) => r.json())
      .then((data: SessionToken & { error?: string }) => {
        if (data.error) throw new Error(data.error);
        setToken(data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [skillId, tick]);

  return { token, loading, error, refresh };
}

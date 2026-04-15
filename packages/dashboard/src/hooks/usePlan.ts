import { useState, useEffect } from 'react';

/** Plan step representation. */
interface PlanStep {
  readonly order: number;
  readonly description: string;
}

/**
 * Hook to fetch a plan for a given issue key.
 */
export const usePlan = (issueKey: string): { steps: ReadonlyArray<PlanStep>; loading: boolean } => {
  const [steps, setSteps] = useState<ReadonlyArray<PlanStep>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/plans/${issueKey}`);
        const data = (await response.json()) as { plan: { steps: PlanStep[] } | null };
        setSteps(data.plan?.steps ?? []);
      } finally {
        setLoading(false);
      }
    };
    void fetchPlan();
  }, [issueKey]);

  return { steps, loading };
};


import { useState, useEffect } from 'react';

/** Represents an issue in the queue. */
interface IssueItem {
  readonly key: string;
  readonly summary: string;
  readonly status: string;
}

/**
 * Hook to fetch and manage the list of issues.
 */
export const useIssues = (): { issues: ReadonlyArray<IssueItem>; loading: boolean } => {
  const [issues, setIssues] = useState<ReadonlyArray<IssueItem>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async (): Promise<void> => {
      try {
        const response = await fetch('/api/issues');
        const data = (await response.json()) as { issues: IssueItem[] };
        setIssues(data.issues);
      } finally {
        setLoading(false);
      }
    };
    void fetchIssues();
  }, []);

  return { issues, loading };
};


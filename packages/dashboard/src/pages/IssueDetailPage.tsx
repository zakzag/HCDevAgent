import { PlanViewer } from '../components/PlanViewer.js';
import { ImplementationProgress } from '../components/ImplementationProgress.js';

/**
 * IssueDetailPage — shows details of a specific issue.
 */
export const IssueDetailPage = (): JSX.Element => {
  return (
    <div className="issue-detail-page">
      <h1>Issue Detail</h1>
      <PlanViewer />
      <ImplementationProgress />
    </div>
  );
};


import { IssueQueue } from '../components/IssueQueue.js';
import { RealTimeStatus } from '../components/RealTimeStatus.js';

/**
 * HomePage — main landing page of the dashboard.
 */
export const HomePage = (): JSX.Element => {
  return (
    <div className="home-page">
      <h1>HCDevAgent Dashboard</h1>
      <RealTimeStatus />
      <IssueQueue />
    </div>
  );
};


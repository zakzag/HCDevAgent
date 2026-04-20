import type { Issue } from '@hcdevagent/shared';
import { JIRA_CUSTOM_FIELDS } from '@hcdevagent/shared';

/**
 * Test fixture for a sample Issue.
 */
export const testIssue: Issue = {
  id: '10001',
  key: 'TEST-1',
  summary: 'Test issue summary',
  description: 'Test issue description with details',
  status: 'Selected for Triage',
  assignee: 'Test User',
  labels: ['bug', 'priority-high'],
  comments: [
    {
      id: 'comment-1',
      author: 'Test Author',
      body: 'This is a test comment',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  customFields: {
    [JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI]: null,
    [JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN]: null,
    [JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN_FOR_AI]: null,
    [JIRA_CUSTOM_FIELDS.BRANCH_NAME]: null,
    [JIRA_CUSTOM_FIELDS.PR_URL]: null,
    [JIRA_CUSTOM_FIELDS.FAILURE_REASON]: null,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

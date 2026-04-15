import type { Issue } from '@hcdevagent/shared';

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
    description_for_ai: null,
    implementation_plan: null,
    implementation_plan_for_ai: null,
    branch_name: null,
    pr_url: null,
    failure_reason: null,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

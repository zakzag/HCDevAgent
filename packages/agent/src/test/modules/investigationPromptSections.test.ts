import { describe, expect, it } from 'vitest';
import type { Issue } from '@hcdevagent/shared';
import {
    buildCommentsSection,
    buildRelatedIssuesSection,
} from '../../modules/investigation/investigationPromptSections.js';

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '1',
    key: 'TEST-1',
    summary: 'Add authentication',
    description: 'Implement authentication flow.',
    status: 'Selected for Triage',
    assignee: null,
    labels: [],
    comments: [],
    customFields: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

describe('investigationPromptSections', () => {
    describe('buildCommentsSection', () => {
        it('returns an empty string when the issue has no comments', () => {
            expect(buildCommentsSection(makeIssue())).toBe('');
        });

        it('renders all comments in prompt-friendly form', () => {
            const result = buildCommentsSection(makeIssue({
                comments: [
                    { id: 'c1', author: 'Alice', body: 'Please clarify the provider.', createdAt: '2026-01-01' },
                    { id: 'c2', author: 'Bob', body: 'GitHub should be enough.', createdAt: '2026-01-02' },
                ],
            }));

            expect(result).toContain('Comments:');
            expect(result).toContain('[Alice]: Please clarify the provider.');
            expect(result).toContain('[Bob]: GitHub should be enough.');
        });
    });

    describe('buildRelatedIssuesSection', () => {
        it('returns an empty string when there are no related issues', () => {
            expect(buildRelatedIssuesSection()).toBe('');
            expect(buildRelatedIssuesSection([])).toBe('');
        });

        it('renders all related issues in prompt-friendly form', () => {
            const result = buildRelatedIssuesSection([
                makeIssue({ key: 'TEST-2', summary: 'Add session management' }),
                makeIssue({ key: 'TEST-3', summary: 'Add logout flow' }),
            ]);

            expect(result).toContain('Related Issues:');
            expect(result).toContain('TEST-2: Add session management');
            expect(result).toContain('TEST-3: Add logout flow');
        });
    });
});


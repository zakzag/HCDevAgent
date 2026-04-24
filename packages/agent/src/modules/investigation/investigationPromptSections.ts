import type { Issue } from '@hcdevagent/shared';

/** Builds the pre-formatted comments section for the investigation user prompt. */
export const buildCommentsSection = (issue: Issue): string => {
    if (issue.comments.length === 0) {
        return '';
    }

    const lines = ['\n\nComments:'];
    for (const comment of issue.comments) {
        lines.push(`  [${comment.author}]: ${comment.body}`);
    }

    return lines.join('\n');
};

/** Builds the pre-formatted related issues section for the investigation user prompt. */
export const buildRelatedIssuesSection = (relatedIssues?: ReadonlyArray<Issue>): string => {
    if (!relatedIssues || relatedIssues.length === 0) {
        return '';
    }

    const lines = ['\n\nRelated Issues:'];
    for (const relatedIssue of relatedIssues) {
        lines.push(`  ${relatedIssue.key}: ${relatedIssue.summary}`);
    }

    return lines.join('\n');
};


/**
 * Domain types for the HCDevAgent system.
 * Represents core business entities.
 */

/** Represents a comment on an issue. */
export interface Comment {
    readonly id: string;
    readonly author: string;
    readonly body: string;
    readonly createdAt: string;
}

/** Represents code changes associated with an implementation. */
export interface CodeChanges {
    readonly filePath: string;
    readonly diff: string;
    readonly language: string;
}

/** Pull request creation options. */
export interface PrOptions {
    readonly title: string;
    readonly body: string;
    readonly sourceBranch: string;
    readonly targetBranch: string;
    readonly issueKey: string;
}

/** Pull request status information. */
export interface PrStatus {
    readonly state: 'open' | 'merged' | 'changesRequested';
    readonly reviewComments: ReadonlyArray<string>;
    readonly mergeSha: string | null;
}

/** Represents a pull request in version control. */
export interface PullRequest {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly url: string;
    readonly branch: string;
    readonly status: string;
}

/** Represents an issue from the issue tracker. */
export interface Issue {
    readonly id: string;
    readonly key: string;
    readonly summary: string;
    readonly description: string;
    readonly status: string;
    readonly assignee: string | null;
    readonly labels: ReadonlyArray<string>;
    readonly comments: ReadonlyArray<Comment>;
    readonly customFields: Record<string, string | null>;
    readonly createdAt: string;
    readonly updatedAt: string;
}

/** Context of relevant codebase files for AI analysis. */
export interface CodebaseContext {
    readonly files: ReadonlyArray<{
        readonly path: string;
        readonly content: string;
    }>;
    readonly structure: string;
}

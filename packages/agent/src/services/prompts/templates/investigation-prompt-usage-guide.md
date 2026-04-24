# How to Use Investigation Prompts

## Overview

The **investigation prompts** are used during **Phase 1** of the agent workflow to evaluate whether a Jira issue is ready for AI implementation. They consist of two prompts that work together:

1. **`investigation.system`** - System prompt (defines AI's role and instructions)
2. **`investigation.user`** - User prompt (provides the issue data to analyze)

## When Are They Used?

**Workflow Phase:** Issue Investigation  
**Jira Status:** `SELECTED FOR TRIAGE` → `ISSUE INVESTIGATION`  
**Module:** `CopilotIssueInvestigator`  
**Purpose:** Determine if an issue has enough quality and detail for the AI to plan and implement

## Step-by-Step Usage

### 1. Get the PromptRegistry from InversifyJS Container

```typescript
import { Container } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import type { PromptRegistry } from '@hcdevagent/shared';

// In your module/class constructor
public constructor(
    @inject(SYMBOLS.PromptRegistry) private readonly prompts: PromptRegistry,
) {}
```

### 2. Prepare Your Data

You need to gather the following information from the Jira issue:

```typescript
import type { Issue } from '@hcdevagent/shared';

// Example Jira issue object
const issue: Issue = {
    key: 'PROJ-123',
    summary: 'Add user authentication to API',
    description: 'We need to implement JWT-based authentication...',
    status: 'Selected for Triage',
    labels: ['backend', 'security', 'high-priority'],
    comments: [
        {
            author: 'john.doe',
            body: 'Should we use OAuth2 or JWT?',
            created: new Date('2026-04-20')
        }
    ],
    // ... other fields
};

// Optional: related issues
const relatedIssues: Issue[] = [
    {
        key: 'PROJ-122',
        summary: 'Setup authentication middleware',
        // ... other fields
    }
];
```

### 3. Format Optional Sections

Build the formatted sections for comments and related issues:

```typescript
// Helper function to format comments
const buildCommentsSection = (issue: Issue): string => {
    if (issue.comments.length === 0) return '';
    
    const lines = ['\n\nComments:'];
    for (const comment of issue.comments) {
        lines.push(`  [${comment.author}]: ${comment.body}`);
    }
    return lines.join('\n');
};

// Helper function to format related issues
const buildRelatedIssuesSection = (relatedIssues?: ReadonlyArray<Issue>): string => {
    if (!relatedIssues || relatedIssues.length === 0) return '';
    
    const lines = ['\n\nRelated Issues:'];
    for (const related of relatedIssues) {
        lines.push(`  ${related.key}: ${related.summary}`);
    }
    return lines.join('\n');
};
```

### 4. Get the System Prompt

```typescript
// System prompt has no variables (empty object)
const systemPrompt = this.prompts.getPrompt('investigation.system', {});

// Result: Full system prompt instructing AI to evaluate quality dimensions
// This tells the AI:
// - Its role (senior software engineering analyst)
// - What to evaluate (6 quality dimensions)
// - Output format (JSON with specific schema)
// - What to return when ready vs. not ready
```

### 5. Get the User Prompt with Variables

```typescript
const userPrompt = this.prompts.getPrompt('investigation.user', {
    issueKey: issue.key,                                      // "PROJ-123"
    summary: issue.summary,                                   // "Add user authentication..."
    description: issue.description || '(no description)',     // Full description or fallback
    status: issue.status,                                     // "Selected for Triage"
    labels: issue.labels.join(', ') || 'none',               // "backend, security, high-priority"
    commentsSection: buildCommentsSection(issue),             // Formatted comments or ""
    relatedIssuesSection: buildRelatedIssuesSection(relatedIssues), // Formatted issues or ""
});

// Result: A filled prompt like:
// "Issue Key: PROJ-123
// Summary: Add user authentication to API
// Description:
// We need to implement JWT-based authentication...
// Status: Selected for Triage
// Labels: backend, security, high-priority
// 
// Comments:
//   [john.doe]: Should we use OAuth2 or JWT?
// 
// Related Issues:
//   PROJ-122: Setup authentication middleware"
```

### 6. Send to AI and Parse Response

```typescript
import type { AiClient } from '@hcdevagent/shared';

// Send both prompts to AI
const aiResponse = await this.aiClient.complete(systemPrompt, userPrompt);

// AI returns JSON (might be wrapped in markdown code fences)
const cleaned = stripCodeFences(aiResponse); // Remove ```json ... ``` if present

// Parse JSON
const parsed = JSON.parse(cleaned);
```

### 7. Validate and Use the Response

```typescript
// Expected response structure:
interface InvestigationAiResponse {
    ready: boolean;                           // true if all quality checks pass
    descriptionForAi: string | null;         // Structured description if ready
    clarificationQuestions: string[] | null; // Questions if not ready
    qualityReport: {
        clarity: { passed: boolean; summary: string };
        completeness: { passed: boolean; summary: string };
        ambiguity: { passed: boolean; summary: string };
        specificity: { passed: boolean; summary: string };
        conflictDetection: { passed: boolean; summary: string };
        scope: { passed: boolean; summary: string };
    };
}

// Runtime note:
// The canonical contract is still a markdown string in descriptionForAi.
// The parser also tolerates a fallback object shape with sections
// (summary, goal, requirements, acceptanceCriteria, constraints, context)
// and normalizes it back into the markdown string above.

// Example ready response:
{
    "ready": true,
    "descriptionForAi": "## Summary\nImplement JWT-based authentication...",
    "clarificationQuestions": null,
    "qualityReport": {
        "clarity": { "passed": true, "summary": "Requirements are clear" },
        "completeness": { "passed": true, "summary": "All necessary info provided" },
        // ... other dimensions
    }
}

// Tolerated fallback ready response (normalized at runtime):
{
    "ready": true,
    "descriptionForAi": {
        "summary": "Implement JWT-based authentication...",
        "goal": "Allow users to authenticate securely...",
        "requirements": ["Add login endpoint", "Validate tokens"],
        "acceptanceCriteria": ["Login succeeds with valid credentials"],
        "constraints": "Use the existing auth middleware.",
        "context": "The API package already contains user models."
    },
    "clarificationQuestions": null,
    "qualityReport": {
        "clarity": { "passed": true, "summary": "Requirements are clear" },
        "completeness": { "passed": true, "summary": "All necessary info provided" }
    }
}

// Example not-ready response:
{
    "ready": false,
    "descriptionForAi": null,
    "clarificationQuestions": [
        "Which JWT library should be used?",
        "What is the token expiration policy?",
        "Should refresh tokens be implemented?"
    ],
    "qualityReport": {
        "clarity": { "passed": true, "summary": "Goal is clear" },
        "completeness": { "passed": false, "summary": "Missing implementation details" },
        // ... other dimensions
    }
}
```

## What Happens After?

### If `ready === true`:
1. The `descriptionForAi` is written to Jira custom field `customfield_10164`
2. Issue status transitions from `ISSUE INVESTIGATION` → `PLAN`
3. The planning phase begins using this structured description

### If `ready === false`:
1. Issue status transitions to `BLOCKED FOR PLAN CLARIFICATION`
2. `clarificationQuestions` are posted as Jira comments
3. Human must answer the questions
4. When human replies and changes status back to `ISSUE INVESTIGATION`, the agent re-runs investigation

## Complete Example from CopilotIssueInvestigator

```typescript
import { injectable, inject } from 'inversify';
import type {
    AiClient,
    IssueInvestigator,
    Issue,
    InvestigationResult,
    Logger,
    PromptRegistry,
} from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

@injectable()
export class CopilotIssueInvestigator implements IssueInvestigator {
    public constructor(
        @inject(SYMBOLS.AiClient) private readonly aiClient: AiClient,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.PromptRegistry) private readonly prompts: PromptRegistry,
    ) {}

    public async investigate(
        issue: Issue,
        relatedIssues?: ReadonlyArray<Issue>
    ): Promise<InvestigationResult> {
        this.logger.debug('Investigating issue', { issueKey: issue.key });

        // Step 1: Get system prompt (no variables)
        const systemPrompt = this.prompts.getPrompt('investigation.system', {});
        
        // Step 2: Get user prompt (with all required variables)
        const userPrompt = this.prompts.getPrompt('investigation.user', {
            issueKey: issue.key,
            summary: issue.summary,
            description: issue.description || '(no description)',
            status: issue.status,
            labels: issue.labels.join(', ') || 'none',
            commentsSection: buildCommentsSection(issue),
            relatedIssuesSection: buildRelatedIssuesSection(relatedIssues),
        });

        // Step 3: Send to AI
        const raw = await this.aiClient.complete(systemPrompt, userPrompt);
        
        // Step 4: Clean and parse response
        const cleaned = stripCodeFences(raw);
        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            throw new IntegrationError('AI returned invalid JSON during investigation', {
                issueKey: issue.key,
                raw: cleaned.slice(0, 500),
            });
        }

        // Step 5: Validate response structure
        if (!isValidAiResponse(parsed)) {
            throw new IntegrationError('AI investigation response has unexpected shape', {
                issueKey: issue.key,
            });
        }

        // Step 6: Return structured result
        return {
            ready: parsed.ready,
            descriptionForAi: parsed.descriptionForAi ?? null,
            clarificationQuestions: parsed.clarificationQuestions ?? null,
            qualityReport: parsed.qualityReport,
        };
    }
}
```

## Parameter Details

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `issueKey` | `string` | ✅ Yes | Jira issue identifier | `"PROJ-123"` |
| `summary` | `string` | ✅ Yes | Issue title | `"Add user authentication"` |
| `description` | `string` | ✅ Yes | Full issue description | Multi-line markdown |
| `status` | `string` | ✅ Yes | Current Jira status | `"Selected for Triage"` |
| `labels` | `string` | ✅ Yes | Comma-separated labels | `"backend, security"` or `"none"` |
| `commentsSection` | `string` | ✅ Yes | Formatted comments block | Pre-formatted or `""` |
| `relatedIssuesSection` | `string` | ✅ Yes | Formatted related issues | Pre-formatted or `""` |

**Note:** All parameters are required by TypeScript, but `commentsSection` and `relatedIssuesSection` can be empty strings (`""`) when there are no comments or related issues.

## Common Mistakes to Avoid

### ❌ Wrong: Passing raw arrays
```typescript
const userPrompt = this.prompts.getPrompt('investigation.user', {
    labels: issue.labels, // WRONG: array, not string
    commentsSection: issue.comments, // WRONG: array, not formatted string
});
```

### ✅ Right: Format the data first
```typescript
const userPrompt = this.prompts.getPrompt('investigation.user', {
    labels: issue.labels.join(', ') || 'none',
    commentsSection: buildCommentsSection(issue),
});
```

### ❌ Wrong: Forgetting empty string for optional sections
```typescript
const userPrompt = this.prompts.getPrompt('investigation.user', {
    commentsSection: issue.comments ? buildCommentsSection(issue) : null, // WRONG: null
});
```

### ✅ Right: Use empty string
```typescript
const userPrompt = this.prompts.getPrompt('investigation.user', {
    commentsSection: buildCommentsSection(issue), // Returns "" if no comments
});
```

## Key Concepts

1. **Template Variables**: Prompts use `${variableName}` syntax for placeholders
2. **Type Safety**: TypeScript enforces exact variable shapes for each prompt key
3. **No Side Effects**: `getPrompt()` is a pure function that returns a string
4. **Error Handling**: Throws `ConfigError` if a required variable is missing
5. **Separation of Concerns**: System prompt defines behavior, user prompt provides data

## Related Files

- **Prompt Template**: `packages/agent/src/services/prompts/templates/investigation.prompts.ts`
- **Type Definitions**: `packages/shared/src/interfaces/PromptRegistry.ts`
- **Registry Implementation**: `packages/agent/src/services/prompts/InMemoryPromptRegistry.ts`
- **Usage Example**: `packages/agent/src/modules/investigation/CopilotIssueInvestigator.ts`
- **Helper Function**: `packages/agent/src/services/prompts/renderTemplate.ts`

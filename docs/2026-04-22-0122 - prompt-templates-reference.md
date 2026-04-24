# Prompt Templates Reference

## Overview

This document provides a comprehensive reference for all AI prompt templates used in the HCDevAgent autonomous agent system. Each prompt template serves a specific role in the agent's workflow: investigating issues, creating implementation plans, and generating code.

**Location:** `packages/agent/src/services/prompts/templates/`

**Usage:** Templates are retrieved via the `PromptRegistry` interface and filled using the `fillTemplate()` method, which replaces `${variableName}` placeholders with actual values.

---

## Workflow Context

The prompts are used in three main phases of the issue processing workflow:

1. **Investigation Phase** (Status: `ISSUE INVESTIGATION`)
   - Agent evaluates whether a Jira issue is ready for implementation
   - Uses: `investigation.system` + `investigation.user`

2. **Planning Phase** (Status: `PLAN`)
   - Agent creates both human-readable and machine-parseable implementation plans
   - Uses: `planning.system` + `planning.user`
   - If plan is rejected: `planning.refine.system` + `planning.refine.user`

3. **Implementation Phase** (Status: `IN PROGRESS`)
   - Agent generates actual code changes based on the plan
   - Uses: `implementation.system` + various user prompts

---

## Investigation Prompts

### `investigation.system`

**Goal:** Defines the AI's role as a senior software engineering analyst who evaluates whether a Jira issue contains sufficient information for an AI agent to implement.

**Where Used:** Investigation Module (`packages/agent/src/modules/investigation/`) when processing issues in `SELECTED FOR TRIAGE` or `ISSUE INVESTIGATION` status.

**Process Details:**
- Evaluates the issue on six quality dimensions: clarity, completeness, ambiguity, specificity, conflict detection, and scope
- Uses workspace-backed project description, code chunks, and repo-specific investigator settings as additional context
- Scores eight auto-fixability metrics that estimate how safely the issue can be handled with minimal human interaction
- If ALL dimensions pass: produces a structured "Description For AI" field
- If ANY dimension fails: requests clarification from humans
- Outputs both a quality report and scored auto-fixability metrics

**Parameters:** None (system prompt)

**Output Format:** Expects the AI to respond with a JSON object containing:
```json
{
  "ready": boolean,
  "descriptionForAi": string | null,
  "clarificationQuestions": string[] | null,
  "qualityReport": {
    "clarity": { "passed": boolean, "summary": string },
    "completeness": { "passed": boolean, "summary": string },
    "ambiguity": { "passed": boolean, "summary": string },
    "specificity": { "passed": boolean, "summary": string },
    "conflictDetection": { "passed": boolean, "summary": string },
    "scope": { "passed": boolean, "summary": string }
  },
  "autoFixabilityMetrics": {
    "acceptanceCriteriaCoverage": { "score": number, "summary": string },
    "reproductionClarity": { "score": number, "summary": string },
    "codeContextCoverage": { "score": number, "summary": string },
    "changeLocality": { "score": number, "summary": string },
    "dependencyConfidence": { "score": number, "summary": string },
    "testability": { "score": number, "summary": string },
    "blastRadiusConfidence": { "score": number, "summary": string },
    "humanDecisionIndependence": { "score": number, "summary": string }
  },
  "assumptions": string[],
  "suggestedFollowUp": string[]
}
```

**Compatibility Note:**
- The canonical value for `descriptionForAi` is a single markdown string with the sections `Summary`, `Goal`, `Requirements`, `Acceptance Criteria`, `Constraints`, and `Context`.
- The runtime parser also tolerates a fallback object shape containing those sections as separate properties and normalizes it back into the canonical markdown string before planning and Jira writes.

**Workflow Impact:**
- If `ready=true`: Issue transitions to `PLAN` status, `descriptionForAi` written to Jira custom field
- If `ready=false`: Issue transitions to `BLOCKED FOR PLAN CLARIFICATION`, clarification questions posted as comments

---

### `investigation.user`

**Goal:** Provides all relevant Jira issue information to the AI for evaluation.

**Where Used:** Investigation Module, paired with `investigation.system` as the user message.

**Parameters:**

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `issueKey` | `string` | The Jira issue identifier | `"PROJ-123"`, `"HCDEV-456"` |
| `summary` | `string` | The issue title/summary from Jira | `"Add user authentication to API"` |
| `description` | `string` | The full issue description/body | Multi-line markdown text describing the feature or bug |
| `status` | `string` | Current Jira workflow status | `"Selected for Triage"`, `"Issue Investigation"` |
| `labels` | `string` | Comma-separated list of issue labels | `"backend, security, high-priority"`, `""` (empty if no labels) |
| `projectDescription` | `string` | Repository-level description loaded from `WORKSPACE_PATH/.agent/project-description.md` | Markdown overview of the target repository |
| `codeChunksContext` | `string` | Relevant code snippets collected from the target workspace | `"File: src/index.ts ..."` |
| `investigatorSettingsContext` | `string` | Rendered repo-specific investigator settings | Thresholds, risky paths, labels requiring human review |
| `commentsSection` | `string` (optional) | Formatted section containing issue comments | `"\n\nComments:\n- User: Can you clarify..."` or `""` (empty if no comments) |
| `relatedIssuesSection` | `string` (optional) | Formatted section containing linked issues | `"\n\nRelated Issues:\n- PROJ-122: Related feature"` or `""` (empty if no related issues) |

**Template Structure:**
```
Issue Key: ${issueKey}
Summary: ${summary}
Description:
${description}
Status: ${status}
Labels: ${labels}

Project Description:
${projectDescription}

Relevant Code Chunks:
${codeChunksContext}

Repo-Specific Investigator Settings:
${investigatorSettingsContext}${commentsSection}${relatedIssuesSection}
```

**Notes:**
- `commentsSection` and `relatedIssuesSection` are pre-formatted strings that include their own section headers
- Empty strings are used when there are no comments or related issues
- The investigator combines general metrics with repo-specific settings after the AI call; the prompt receives the settings so the model can justify its scores in the right project context

---

## Planning Prompts

### `planning.system`

**Goal:** Defines the AI's role as a senior software architect creating dual-format implementation plans: one human-readable for reviewers, one machine-parseable for the implementation agent.

**Where Used:** Planning Module (`packages/agent/src/modules/planning/`) when processing issues in `PLAN` status.

**Process Details:**
- Produces TWO versions of the same plan simultaneously:
  1. **"plan"** — Human-readable markdown with sections: Summary, Approach, Steps, Files Affected, Testing Strategy, Risks & Open Questions, Checklist
  2. **"planForAi"** — Strict machine-parseable markdown with sections: META, DESCRIPTION, STEPS (with structured fields), TESTS (with test cases), VERIFICATION

**Parameters:** None (system prompt)

**Output Format:** Expects the AI to respond with a JSON object containing:
```json
{
  "plan": string,        // Human-readable markdown
  "planForAi": string    // Machine-parseable markdown with strict structure
}
```

**Plan Structure Details:**

**Human Plan (`plan`):**
- Summary: Brief overview
- Approach: High-level technical approach
- Steps: Numbered list with step titles and descriptions
- Files Affected: List of files with change descriptions
- Testing Strategy: How to test the implementation
- Risks & Open Questions: Known risks and assumptions
- Checklist: Implementation completion checklist

**Machine Plan (`planForAi`):**
- META: `issueKey`, `baseBranch`, `targetBranch`, `estimatedFiles`, `estimatedSteps`
- DESCRIPTION: Single-paragraph summary
- STEPS: Each step has `action` (create/modify/delete), `file`, `description`, `dependencies`, `verification`
- TESTS: Each test has `file`, `covers` (which steps), `cases` (happy path, error case, edge case)
- VERIFICATION: Checklist for validation

**Workflow Impact:**
- Both `plan` (human-readable) and `planForAi` (machine-readable) written to Jira custom fields
- Issue transitions to `PLAN REVIEW` status for human approval
- If approved: moves to `READY FOR IMPLEMENTATION`
- If rejected: moves back to `PLAN` with refinement prompts

---

### `planning.user`

**Goal:** Provides the structured issue description (produced by investigation phase) to the AI for plan creation.

**Where Used:** Planning Module, paired with `planning.system` as the user message.

**Parameters:**

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `descriptionForAi` | `string` | The structured, AI-ready description produced during investigation | Multi-line markdown with sections: Summary, Goal, Requirements, Acceptance Criteria, Constraints, Context |
| `feedbackSection` | `string` (optional) | Human feedback if this is a plan refinement | `"\n\nPrevious Rejection Feedback:\nThe approach needs more detail on error handling."` or `""` (empty on first plan) |

**Template Structure:**
```
Description For AI:
${descriptionForAi}${feedbackSection}
```

**Notes:**
- First planning attempt: `feedbackSection` is empty
- Plan refinement: `feedbackSection` contains rejection feedback (though the dedicated refine prompts are preferred)

---

### `planning.refine.system`

**Goal:** Defines the AI's role when refining a rejected implementation plan based on human feedback.

**Where Used:** Planning Module when a plan has been rejected by a human reviewer and needs to be regenerated.

**Process Details:**
- Human has reviewed and rejected the previous plan
- AI must incorporate the feedback fully
- Produces the same two-format output as the original planning task

**Parameters:** None (system prompt)

**Output Format:** Same as `planning.system`:
```json
{
  "plan": string,        // Human-readable markdown
  "planForAi": string    // Machine-parseable markdown
}
```

**Workflow Impact:**
- Issue status: remains in `PLAN` or transitions from `PLAN REVIEW` back to `PLAN`
- New plan versions written to Jira custom fields
- Issue returns to `PLAN REVIEW` for re-evaluation

---

### `planning.refine.user`

**Goal:** Provides both the existing plan and the human's rejection feedback to enable targeted plan refinement.

**Where Used:** Planning Module, paired with `planning.refine.system` when refining a rejected plan.

**Parameters:**

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `existingPlanForAi` | `string` | The machine-readable plan that was rejected | Full machine-parseable markdown plan with META, STEPS, TESTS sections |
| `rejectionComment` | `string` | Human feedback explaining why the plan was rejected | `"The error handling approach is insufficient. Need to add retry logic with exponential backoff."` |

**Template Structure:**
```
Existing plan (machine format):
${existingPlanForAi}

Rejection feedback from human reviewer:
${rejectionComment}
```

**Notes:**
- Uses the machine format (`planForAi`) rather than human format because it's more structured for AI processing
- Rejection comment comes from Jira issue comments when human transitions from `PLAN REVIEW` back to `PLAN`

---

## Implementation Prompts

### `implementation.system`

**Goal:** Defines the AI's role as a senior software engineer implementing code changes based on a machine-readable plan and codebase context.

**Where Used:** Implementation Module (`packages/agent/src/modules/implementation/`) when processing issues in `IN PROGRESS` status.

**Process Details:**
- Receives a structured implementation plan (`planForAi`)
- Receives current codebase context (relevant files, dependencies, structure)
- Produces a unified diff showing all code changes

**Parameters:** None (system prompt)

**Output Format:** Expects the AI to respond with a JSON object containing:
```json
{
  "filePath": string,   // primary file being changed (or "multi-file" if multiple)
  "diff": string,       // unified diff format showing all changes
  "language": string    // primary programming language (e.g. "typescript")
}
```

**Workflow Impact:**
- Agent applies the diff to the codebase
- Commits and pushes to feature branch
- Issue transitions to `CODE COMMITTED` → `PR IN REVIEW`

---

### `implementation.user`

**Goal:** Provides the machine-readable plan and codebase context for basic implementation (no feedback or clarification).

**Where Used:** Implementation Module, paired with `implementation.system` for initial code generation.

**Parameters:**

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `planForAi` | `string` | Machine-readable implementation plan from planning phase | Full structured markdown with META, STEPS, TESTS, VERIFICATION sections |
| `codebaseContext` | `string` | Relevant code snippets, file structures, and dependencies | Multi-line text with file contents, import statements, class definitions, etc. Gathered via semantic search and file reading |

**Template Structure:**
```
Machine-readable plan:
${planForAi}

${codebaseContext}
```

**Codebase Context Details:**
- Contains relevant existing code that the implementation will interact with
- May include: interface definitions, base classes, utility functions, configuration files
- Gathered by analyzing the plan's file dependencies and performing semantic searches

---

### `implementation.pr-feedback.user`

**Goal:** Provides the plan and codebase context along with PR review feedback when changes are requested.

**Where Used:** Implementation Module when issue is in `PR CHANGES REQUESTED` status and transitions back to `IN PROGRESS`.

**Parameters:**

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `planForAi` | `string` | Machine-readable implementation plan from planning phase | Same as `implementation.user` |
| `reviewComments` | `string` | Code review feedback and suggestions from PR reviewers | `"- Line 42: Use const instead of let\n- Missing null check in getUserData()\n- Add JSDoc comments to public methods"` |
| `codebaseContext` | `string` | Relevant code snippets, file structures, and dependencies | Same as `implementation.user`, may include the previously generated code |

**Template Structure:**
```
Machine-readable plan:
${planForAi}

PR review feedback to address:
${reviewComments}

${codebaseContext}
```

**Workflow Impact:**
- Agent generates updated code addressing the review feedback
- Commits and pushes to the same feature branch
- Issue transitions back to `PR IN REVIEW`

---

### `implementation.clarification.user`

**Goal:** Provides the plan and codebase context along with human clarification when the AI cannot proceed without more information.

**Where Used:** Implementation Module when issue is in `BLOCKED FOR CODE CLARIFICATION` status and human has provided answers.

**Parameters:**

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `planForAi` | `string` | Machine-readable implementation plan from planning phase | Same as `implementation.user` |
| `clarification` | `string` | Additional clarification or requirements provided by human | `"Use the UserService.authenticate() method instead of writing custom auth logic. The rate limit should be 100 requests per minute."` |
| `codebaseContext` | `string` | Relevant code snippets, file structures, and dependencies | Same as `implementation.user` |

**Template Structure:**
```
Machine-readable plan:
${planForAi}

Human clarification:
${clarification}

${codebaseContext}
```

**Workflow Impact:**
- Agent generates code incorporating the clarification
- Issue transitions from `BLOCKED FOR CODE CLARIFICATION` back to `IN PROGRESS`
- Implementation continues as normal

**Notes:**
- Agent may request clarification when: ambiguous dependencies exist, configuration values are unclear, implementation details are missing from the plan

---

## Parameter Value Sources

### Where Parameter Values Come From

| Parameter | Source |
|-----------|--------|
| `issueKey` | Jira issue field |
| `summary` | Jira issue field |
| `description` | Jira issue field (native "Description" field) |
| `status` | Jira issue field (current status name) |
| `labels` | Jira issue field (array joined with commas) |
| `commentsSection` | Jira API (comments array formatted with author and body) |
| `relatedIssuesSection` | Jira API (issue links formatted with relationship type) |
| `descriptionForAi` | Jira custom field `customfield_10164` (set by investigation phase) |
| `feedbackSection` | Jira issue comments (filtered by context) |
| `existingPlanForAi` | Jira custom field `customfield_10165` (set by planning phase) |
| `rejectionComment` | Jira issue comments (from human when rejecting plan) |
| `planForAi` | Jira custom field `customfield_10165` (machine-readable plan) |
| `codebaseContext` | Generated by codebase analyzer (semantic search + file reading) |
| `reviewComments` | GitHub PR API (review comments aggregated) |
| `clarification` | Jira issue comments (from human responses) |

---

## Template Rendering

Templates use JavaScript template string syntax with `${variableName}` placeholders.

**Example:**
```typescript
const registry = container.get<PromptRegistry>(TYPES.PromptRegistry);
const template = registry.getPrompt('investigation.user');
const filled = registry.fillTemplate(template, {
    issueKey: 'PROJ-123',
    summary: 'Add authentication',
    description: 'Users need to log in...',
    status: 'Selected for Triage',
    labels: 'backend, security',
    commentsSection: '',
    relatedIssuesSection: ''
});
```

**Implementation:** See `packages/agent/src/services/prompts/renderTemplate.ts`

---

## Prompt Evolution

When modifying prompts:

1. **Document changes:** Update this reference document
2. **Version compatibility:** Ensure backward compatibility with existing Jira custom fields
3. **Test thoroughly:** Test with real Jira issues across all workflow phases
4. **Schema alignment:** Ensure output schemas match what the modules expect to parse
5. **Error handling:** Consider what happens if AI returns malformed JSON

---

## Related Documentation

- [Jira Issue Workflow Events](./initial/2-issue-workflow-events.md) - Complete workflow with status transitions
- [Jira Custom Fields](./initial/4-jira-custom-fields.md) - Custom field definitions
- [Interfaces](./initial/3-interfaces.md) - Module interfaces and contracts


# Workspace investigation context collection rules

## Status
Accepted

## Context
`WorkspaceInvestigationContextProvider` prepares repository-aware context for issue investigation by reading project metadata and selecting a bounded set of workspace files.

That behavior needs to stay deterministic and failure-tolerant because it runs before planning and should not block the workflow on incidental local workspace problems.

## Decision

### 1. Keep orchestration and pure helper logic separate
The provider class remains responsible for filesystem access and logging.
Pure text and file-selection helpers live beside it in feature-scoped helper files:

- `investigationContextText.ts`
- `investigationContextFiles.ts`

This follows the accepted helper-extraction direction for feature-owned utility logic.

### 2. Always-include files have queue priority
Files listed in `.agent/project-settings.json` under `investigator.contextCollection.alwaysIncludeFiles` are inserted at the front of the candidate queue before discovered files and duplicates are removed.

This guarantees that explicit repository context such as `README.md` is still considered even when directory traversal reaches `maxCandidateFiles` before those files are discovered naturally.

### 3. Candidate traversal is deterministic
Directory entries are processed in a stable order with directories before files and names sorted alphabetically.

This makes context selection reproducible across runs and easier to test.

### 4. Unreadable workspace paths degrade gracefully
If the workspace root cannot be read, the provider logs a warning and returns an empty code-context section instead of throwing.
If an individual directory or file cannot be read, the provider skips it and logs debug details.

This preserves forward progress for investigation while still leaving operational breadcrumbs in logs.

### 5. BOM and whitespace normalization apply to project-description sources
The configured project-description file and the `README.md` fallback both have UTF-8 BOM removal and line-ending normalization applied before being embedded in prompt context.

## Consequences

### Positive
- More predictable repository-context selection
- Explicit context files are less likely to be dropped accidentally
- The provider class is easier to read and unit test
- Missing or transient workspace problems no longer fail investigation setup outright

### Trade-offs
- Additional helper files must be navigated alongside the provider
- The candidate queue may favor explicit documentation files over naturally discovered source files when the configured candidate limit is very small

## Operational guidance
When tuning `.agent/project-settings.json`:

- keep `alwaysIncludeFiles` limited to a few high-value files,
- use `maxCandidateFiles` large enough to leave room for both docs and source files,
- prefer relative repository paths using forward slashes.


# Investigation Context and Auto-Fixability Scoring

**Date:** 2026-04-23 02:05  
**Status:** Accepted

## Context

The investigation phase previously answered only one question: is the issue description good enough to continue to planning?
That was useful, but it was still too binary for a more autonomous workflow.

We now want investigation to answer two distinct questions:

1. **Readiness:** is the issue clear enough to produce a reliable `Description For AI`?
2. **Auto-fixability:** even if it is ready, is it safe for the agent to continue with minimal human interaction?

To improve that decision, investigation also needs more context than the raw Jira issue. It should use:

- a project description from the target repository,
- code chunks from the actual workspace configured by `WORKSPACE_PATH`,
- repo-specific settings that tune thresholds and risk rules.

## Decision

### 1. Investigation uses repository context

The investigation prompt now includes:

- `projectDescription` loaded from `WORKSPACE_PATH/.agent/project-description.md` (with README fallback),
- `codeChunksContext` collected from relevant source files in the target repository,
- `investigatorSettingsContext` rendered from `WORKSPACE_PATH/.agent/project-settings.json`.

### 2. Auto-fixability uses a general metric model

The metric names and semantics remain **general** so they can be reused across repositories:

- `acceptanceCriteriaCoverage`
- `reproductionClarity`
- `codeContextCoverage`
- `changeLocality`
- `dependencyConfidence`
- `testability`
- `blastRadiusConfidence`
- `humanDecisionIndependence`

Each metric is scored from `0` to `100` and accompanied by a short explanation.

### 3. Thresholds and overrides are repo-specific

The following settings are **repository-specific** and belong in `.agent/project-settings.json`:

- minimum overall auto-fixability score,
- minimum score for blocking metrics,
- which metrics are blocking,
- risky path patterns,
- labels that always require human review,
- file-selection limits for code chunk gathering.

This keeps the decision framework consistent across repos while still letting each repo express its own risk tolerance.

## Why this split?

### General metrics should stay general because:

- they express stable engineering concerns,
- they make dashboards and cross-repo comparisons easier,
- they keep prompts and tests reusable.

### Thresholds and overrides should be repo-specific because:

- some repositories tolerate autonomous changes more than others,
- risky files differ by repo,
- labels and governance rules differ by team,
- the same score can mean different risk depending on the codebase.

## Current behavior

The conductor still uses the existing workflow behavior:

- `ready = false` → transition to `BLOCKED FOR PLAN CLARIFICATION` and comment with clarification questions,
- `ready = true` → transition to `PLAN` with `Description For AI`.

The new `autoFixabilityReport` is produced and logged during investigation, but it does not yet introduce a new Jira transition.

## Future workflow plan

When autonomous implementation is introduced, use the following routing plan:

1. **Investigation finishes** and produces:
   - `ready`,
   - `descriptionForAi`,
   - `autoFixabilityReport`.
2. **If `ready = false`:**
   - keep the current behavior,
   - transition to `BLOCKED FOR PLAN CLARIFICATION`,
   - comment with clarification questions and suggested follow-up.
3. **If `ready = true` and `autoFixabilityReport.decision = needsHumanReview`:**
   - move to `PLAN`,
   - include the score and blocking reasons in logs and future reviewer-visible summaries.
4. **If `ready = true` and `autoFixabilityReport.decision = autoFixable`:**
   - move to planning automatically,
   - later allow the planner/implementer to continue autonomously,
   - flag the issue with a dedicated status or comment indicating it was classified as autonomous-safe.

## Suggested future Jira behavior

Recommended future additions:

- introduce a dedicated status such as `AUTO IMPLEMENTATION CANDIDATE`, or
- keep `PLAN` but add a comment summarizing:
  - the overall score,
  - blocking reasons if any,
  - assumptions,
  - risky files considered.

The second option is lower-risk because it avoids workflow changes, while still surfacing the decision.

## Consequences

### Positive

- less human interaction for well-scoped issues,
- better grounded investigation output,
- repo-specific control without redesigning the metric model,
- a clean upgrade path to future autonomous implementation.

### Trade-offs

- more prompt payload size,
- more local file I/O during investigation,
- extra maintenance for `.agent/project-settings.json`.

## Operational guidance

Start with conservative repo settings:

- keep `minimumScore` relatively high,
- mark business-critical entry points as risky paths,
- use labels to force human review for security or product-decision issues.

Relax thresholds only after observing stable results across several investigated issues.


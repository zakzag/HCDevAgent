# Feature-scoped helper extraction

## Status
Accepted

## Context
Several orchestration classes in `packages/agent/src` had accumulated local helper functions for parsing AI responses and formatting prompt input. Those helpers were pure and testable on their own, but they lived inside class files that should primarily coordinate dependencies.

The project guidance in `.github/copilot-instructions.md` requires helper functions to live in separate helper files and encourages single-responsibility design.

## Decision
Use feature-scoped helper files placed beside the class or module that owns the behavior.

For the first refactor batch:
- `modules/planning/CopilotPlanGenerator.ts` delegates AI plan parsing to `modules/planning/planResponseParser.ts`
- `modules/implementation/CopilotCodeImplementer.ts` delegates codebase prompt rendering to `modules/implementation/buildCodebaseContext.ts`
- `modules/implementation/CopilotCodeImplementer.ts` delegates AI implementation parsing to `modules/implementation/implementationResponseParser.ts`
- `modules/investigation/CopilotIssueInvestigator.ts` delegates prompt-section formatting to `modules/investigation/investigationPromptSections.ts`

## Consequences
### Positive
- Class files stay focused on orchestration and dependency usage
- Pure helper logic is easier to unit test directly
- Future helper extraction can follow a predictable local convention
- Parsing and prompt-formatting behavior becomes reusable without coupling to class construction

### Trade-offs
- More files must be navigated when reading a feature end-to-end
- Test coverage shifts from fewer broad tests to more focused helper tests

## Follow-up
Apply the same pattern later to:
- Jira ADF parsing and serialization helpers
- workspace investigation context text-processing helpers
- process-runner environment normalization helpers
- version-control URL and remote-management helpers


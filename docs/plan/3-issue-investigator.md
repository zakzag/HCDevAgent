---

### `docs/plan/3-issue-investigator.md`

```markdown
# HCDevAgent — Step 3: Issue Investigation Module

> **Date:** 2026-04-15

---

## Overview

Replace the stub investigator with a real AI-powered `OpenAiIssueInvestigator`
that analyses issues against six quality criteria (clarity, completeness,
ambiguity, specificity, conflict detection, scope) and decides whether an
issue is ready for planning or needs human clarification.

After this step the Conductor handles the full Phase 1 loop:
pick → investigate → ready → write `Description For AI` → `PLAN`,
**or** pick → investigate → blocked → post questions → `BLOCKED FOR PLAN CLARIFICATION` → wait for human → re-investigate.

---

## What Gets Built

| Layer | What | New / Rewrite |
|-------|------|---------------|
| **agent — services/ai** | Rewrite `OpenAiClient` — structured JSON output mode, retry on rate-limit, configurable model/temperature/maxTokens | **Rewrite** |
| **agent — modules/investigation** | New `OpenAiIssueInvestigator` — real implementation of `IssueInvestigator`, replaces stub | **New** (replaces stub) |
| **agent — modules/investigation** | New prompt templates — system prompt + user prompt for investigation analysis | **New** |
| **agent — modules/investigation** | New response parser — validates AI JSON response into `InvestigationResult` using runtypes | **New** |
| **agent — conductor** | Extend `tick()` to handle the clarification loop — when `ready === false`, call `markBlockedForPlanClarification()` with questions; when polling finds an `ISSUE INVESTIGATION` issue (returned from blocked), re-investigate with updated comments | **Extend** |
| **shared — mocks** | Add `MockOpenAiClient` to shared test mocks | **New** |

---

## Steps

### 1. Rewrite `OpenAiClient`

Rewrite [OpenAiClient.ts](../../packages/agent/src/services/ai/OpenAiClient.ts):
- `complete(systemPrompt, userPrompt)` → `completeJson<T>(systemPrompt, userPrompt, schema: Runtype<T>): Promise<T>` — requests JSON mode from the API, parses + validates response with the provided runtypes schema
- Add retry logic with exponential backoff for 429 (rate limit) and 5xx errors
- Read `OPENAI_MODEL`, `OPENAI_API_KEY` from `ConfigProvider`; optional `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`
- Keep `complete()` as a plain-text variant for backwards compat

### 2. Create investigation prompt templates

Create `packages/agent/src/modules/investigation/prompts/`:
- `investigationSystemPrompt.ts` — system prompt instructing the AI to analyse against six quality checks and return structured JSON
- `investigationUserPrompt.ts` — template function that accepts `Issue` (+ optional `relatedIssues`, `previousClarification`) and produces the user prompt
- The expected JSON response schema:

```typescript
{
    ready: boolean, descriptionForAi:
    string | null, clarificationQuestions:
    string[] | null, qualityReport:
    {
        clarity: {
            passed: boolean, summary: string
        },
        completeness: {
            passed: boolean, summary: string
        },
        ambiguity: {
            passed: boolean, summary: string
        },
        specificity: {
            passed: boolean, summary: string
        },
        conflictDetection: {
            passed: boolean, summary: string
        },
        scope: {
            passed: boolean, summary: string
        }
    }
}
```

### 3. Create investigation response parser

Create `packages/agent/src/modules/investigation/parseInvestigationResponse.ts`:
- Define runtypes schema matching `InvestigationResult`
- Parse + validate the AI JSON output
- On validation failure, throw `ValidationError` with details

### 4. Implement `OpenAiIssueInvestigator`

Create the real [OpenAiIssueInvestigator.ts](../../packages/agent/src/modules/investigation/OpenAiIssueInvestigator.ts):
- `investigate(issue, relatedIssues?)` → builds prompts → calls `OpenAiClient.completeJson()` → returns validated `InvestigationResult`
- Inject: `OpenAiClient`, `Logger`
- Log the quality report summary

### 5. Extend the Conductor for the clarification loop

Extend [Conductor.ts](../../packages/agent/src/conductor/Conductor.ts) `tick()`:
- After `fetchNextIssue()` returns null for `SELECTED FOR TRIAGE`, also check for issues in `ISSUE INVESTIGATION` status (returned from `BLOCKED FOR PLAN CLARIFICATION` by a human)
- When `investigationResult.ready === false`: call `issueTrackerOps.markBlockedForPlanClarification(issueKey, formattedQuestions)`
- When re-investigating: pass the human's reply (from `getLatestHumanReply()`) as context to `investigate()`
- Emit `investigation.blocked` and `investigation.ready` events

### 6. Update DI container

- Remove `StubIssueInvestigator`, bind `SYMBOLS.IssueInvestigator` → `OpenAiIssueInvestigator`
- Add `MockOpenAiClient` to shared mocks

### 7. Write unit tests

- `OpenAiClient` — mock `fetch`, test `completeJson` happy path, validation failure, rate-limit retry, 5xx retry
- `parseInvestigationResponse` — valid JSON → success; invalid JSON → `ValidationError`; missing fields → `ValidationError`
- `OpenAiIssueInvestigator` — mock `OpenAiClient`, test: ready issue → returns `ready: true` + `descriptionForAi`; unclear issue → returns `ready: false` + `clarificationQuestions`; AI error → propagates
- `Conductor` (extended) — mock all deps, test: investigate returns blocked → calls `markBlockedForPlanClarification`; re-investigation after human reply; investigate returns ready → calls `moveToPlan`

---

## Runnable Demo

After this step:

```powershell
cd packages/agent
pnpm dev

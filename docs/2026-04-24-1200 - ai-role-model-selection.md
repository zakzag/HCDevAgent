# AI Role Model Selection

**Date:** 2026-04-24 12:00  
**Type:** Architecture / Design Decision  
**Affects:** AI client abstraction, investigation, planning, implementation, environment configuration

## Summary

Added a simple role-based model selection mechanism on top of the existing global `AI_PROVIDER` setting.

The provider remains global (`openai`, `copilot`, or `copilot-cli`), but different workflow roles can now request different models through `.env` overrides.

## Decision

`AiClient.complete()` now accepts an optional third argument with request metadata:

- `role`
- `model`

Resolution order is:

1. explicit per-request `model`
2. role-specific env override
3. provider default model

## Supported Roles

The shared contract now supports these roles:

- `investigation`
- `planning`
- `implementation`
- `commentSummary`
- `descriptionForAi`

Current runtime usage:

- investigation module uses `investigation`
- planning module uses `planning`
- implementation module uses `implementation`

`commentSummary` and `descriptionForAi` are reserved for upcoming comment/checkpoint and description-normalization flows.

## Environment Variables

Optional `.env` settings:

- `AI_MODEL_INVESTIGATION`
- `AI_MODEL_PLANNING`
- `AI_MODEL_IMPLEMENTATION`
- `AI_MODEL_COMMENT_SUMMARY`
- `AI_MODEL_DESCRIPTION_FOR_AI`

These do not change provider selection.

## Why This Approach

This keeps the solution simple:

- one global provider switch
- small per-request API change
- no planner-specific or investigator-specific provider implementations
- cheaper models can be used for lower-value tasks later

## Notes

- `GitHubCopilotClient` keeps its existing unknown-model retry behavior and now retries through configured fallbacks more gracefully.
- Jira ADF handling is unaffected because model selection stays entirely inside the AI layer.
- Each AI client now logs `provider`, `role`, and the resolved `model` at request start so operators can see which model was actually selected for a call.


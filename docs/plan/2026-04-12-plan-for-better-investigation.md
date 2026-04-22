# Investigation Process Improvement Plan

## Description

Plan a better version of this investigation process, with less human interaction needed.

please check the internet what solutions there are, and how could it be a better, faster way!

what i want is:
- less human interaction needed
- automatic suggestions to fix the issue description
- better quality checks for the issue description, to ensure the agent has enough information to create a good implementation plan
- include project description, and required code for context.


## AI answer

Plan: Smarter, More Autonomous Investigation Process

TL;DR

Transform the current single-shot, human-heavy investigation into an iterative, self-healing pipeline that uses multiple
AI passes, reads the local codebase, infers project conventions, and auto-proposes a rewritten issue description before
asking a human. Humans are only asked when the AI is genuinely uncertain after exhausting its own context.

Issue picked up
↓
┌────────────────────────────────────────────────────────┐
│ STAGE 1 — Context Gathering (no AI)                    │
│   • Read PROJECT_CONTEXT.md (README, conventions)      │
│   • Fetch N most-similar resolved issues (vector sim)  │
│   • Discover candidate code files via keyword/grep     │
└────────────────────────────────────────────────────────┘
↓
┌────────────────────────────────────────────────────────┐
│ STAGE 2 — Initial Quality Assessment (AI pass 1)       │
│   • Score 6 dimensions with 0–10 severity              │
│   • Identify gaps, not just pass/fail                  │
│   • Output: gapReport                                  │
└────────────────────────────────────────────────────────┘
↓
┌────────────────────────────────────────────────────────┐
│ STAGE 3 — Agentic Code Exploration (AI pass 2, tool)   │
│   • AI chooses files to read via "readFile" tool       │
│   • Bounded loop (max 5 rounds / 20 files)             │
│   • Output: codebaseContext                            │
└────────────────────────────────────────────────────────┘
↓
┌────────────────────────────────────────────────────────┐
│ STAGE 4 — Auto-Enrichment (AI pass 3)                  │
│   • Rewrite issue into full descriptionForAi           │
│   • Fill missing info using code + similar issues      │
│   • Flag assumptions with [ASSUMPTION] tags            │
└────────────────────────────────────────────────────────┘
↓
┌────────────────────────────────────────────────────────┐
│ STAGE 5 — Self-Critique (AI pass 4)                    │
│   • Second AI instance reviews STAGE 4 output          │
│   • Computes confidenceScore (0–100)                   │
│   • Lists residual unknowns                            │
└────────────────────────────────────────────────────────┘
↓
┌──────────────┴─────────────┐
│   confidenceScore >= 80?   │
└─┬──────────────────┬───────┘
│ YES              │ NO
↓                  ↓
moveToPlan()    Stage 6 — Structured Clarification
(only ask about residual unknowns,
with AI-proposed answers as options)

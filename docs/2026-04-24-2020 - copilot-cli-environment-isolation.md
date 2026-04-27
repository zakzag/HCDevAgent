# Copilot CLI environment isolation

Date: 2026-04-24 20:20

## Status

Accepted.

## Context

`CopilotCliClient` is spawned from the HCDevAgent process. The agent process is
started with a project `.env` file that contains PAT-based GitHub credentials,
Jira credentials, database settings, and alternative AI-provider settings.

The standalone `copilot` CLI should instead authenticate using its own stored
OAuth session established by `copilot auth login`.

In production runs, inheriting the full agent environment caused the CLI to log
`Classic PATs are not supported` and then fail while loading models with a
silent exit code `1` and empty stdout/stderr. Reproducing the subprocess with
all project `.env` variables loaded failed, while the same invocation succeeded
once those provider/auth variables were stripped.

## Decision

Before spawning `copilot`, `CopilotCliClient` now removes agent-specific and
provider-specific environment variables from the child process environment.

This includes:

- GitHub PAT variables such as `GITHUB_TOKEN`, `GH_TOKEN`,
  `GITHUB_ENTERPRISE_TOKEN`, and `GH_ENTERPRISE_TOKEN`
- alternate provider settings such as `OPENAI_API_KEY`, `OPENAI_MODEL`,
  `COPILOT_API_URL`, and `AI_PROVIDER`
- HCDevAgent runtime configuration that is irrelevant to the CLI invocation,
  such as Jira, MongoDB, workspace, and internal Copilot wrapper settings

The client still provides the minimal terminal-control overrides it needs:
`NO_COLOR=1`, `TERM=dumb`, `CI=1`, and `FORCE_COLOR=0`.

## Consequences

Positive:

- prevents PAT-based agent credentials from interfering with Copilot OAuth
- makes CLI behavior match manual terminal runs more closely
- avoids silent startup/model-loading failures caused by unrelated env vars
- keeps the isolation local to `CopilotCliClient` without affecting other
  subsystems that legitimately need the agent environment

Negative:

- any future Copilot CLI feature that relies on inherited custom env settings
  must be explicitly allowed back in
- the blacklist of stripped keys must be maintained as the agent grows

## Alternatives considered

1. **Pass the full agent environment through unchanged** — rejected because it
   reproduced the silent failure in real runs.
2. **Strip only `GITHUB_TOKEN`** — rejected because the agent also exports other
   provider and runtime settings that can affect CLI startup behavior.
3. **Use a global environment allowlist for every process** — rejected because
   other subsystems in HCDevAgent do require the full environment.


# Copilot CLI neutral working directory

Date: 2026-04-24 18:07

## Status

Accepted.

## Context

`CopilotCliClient` runs the standalone `copilot` CLI programmatically for
machine-consumable investigation, planning, and implementation prompts. These
calls usually deny tool access and provide the full context over stdin, so they
do not need repository discovery, workspace editing, MCP startup, or remote
session features.

On Windows, launching the CLI from a repository caused Copilot to initialize
repo-scoped custom agents during startup. In the observed failure mode, that
background initialization crashed before the requested completion was returned.
The CLI exited with code `1` while emitting no stdout or stderr. The only useful
diagnostics were written to `~/.copilot/logs/process-*.log`.

## Decision

When `COPILOT_CLI_ALLOW_TOOLS` is false, `CopilotCliClient` now launches the
CLI from a neutral working directory instead of the target repository.

Working directory selection order is now:

1. `COPILOT_CLI_WORKING_DIR` when explicitly configured
2. `WORKSPACE_PATH` only when tools are enabled
3. a neutral temp directory (`TMPDIR`, `TEMP`, `TMP`, then home directory)

If a silent non-zero exit still occurs after an explicit working-directory
override, the client retries once from the neutral working directory.

## Consequences

Positive:

- avoids repo-scoped Copilot startup behavior during tool-free machine calls
- keeps prompt behavior deterministic because all relevant context is already
  passed over stdin
- preserves explicit operator control via `COPILOT_CLI_WORKING_DIR`
- keeps workspace-scoped cwd available when tool use is intentionally enabled

Negative:

- tool-free completions can no longer rely on incidental repository discovery
  from cwd alone
- if a future use case needs repo context without tool access, it must be passed
  explicitly in the prompt or opt into a working-directory override

## Alternatives considered

1. **Keep launching from `WORKSPACE_PATH` and only retry elsewhere** — rejected
   because the first attempt still triggers the broken repo startup path.
2. **Leave cwd undefined for retries** — rejected because that inherits the
   agent process cwd, which may still be a repository.
3. **Always launch from the workspace even for tool-free runs** — rejected due
   to the observed custom-agent startup crash and unnecessary coupling to repo
   state.


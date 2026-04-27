# Copilot CLI stdin prompt transport

Date: 2026-04-24 17:38

## Status

Accepted.

## Context

The `copilot-cli` provider originally passed the merged system and user prompt
through the `-p` command-line argument. That worked for small prompts, but the
investigation workflow can include repository code snippets, project metadata,
and issue comments. On Windows this pushed the process over the OS command-line
length limit, causing the CLI to fail with `The command line is too long.`.

The failure mode is not Windows-specific in principle; any platform can suffer
from brittle argv transport as prompts grow.

## Decision

Send prompt content to the standalone `copilot` CLI over standard input on all
platforms.

The provider now:

- keeps command-line arguments for flags only (`--model`, `--silent`,
  `--no-color`, `--no-custom-instructions`, tool-permission flags, and
  configured extra args)
- adds `--no-remote` on every run and `--disable-builtin-mcps` when tools are
  disallowed, because the programmatic provider never needs remote control or
  background MCP startup for plain text completion
- uses a neutral working directory for tool-free runs so the CLI does not bind
  itself to the repository being analyzed unless tool access is intentionally
  enabled
- strips agent-specific and alternate-provider environment variables before
  spawning the CLI so Copilot uses its own stored auth session instead of the
  agent's PATs or API-provider settings
- streams the full merged prompt over stdin
- logs prompt size diagnostics (`promptLength`, `promptByteLength`) for support
  and troubleshooting
- surfaces a dedicated integration error when the CLI still reports a
  command-line length failure
- scans stdout as well as stderr for CLI diagnostics because some failure modes
  are emitted on stdout with an empty stderr stream
- retries once without a workspace cwd after a silent non-zero exit and, if the
  failure persists, includes the latest Copilot process-log tail in the error
  context

## Consequences

Positive:

- removes prompt-size pressure from argv on every platform
- preserves full investigation context instead of truncating code snippets early
- keeps the process-runner abstraction unchanged because stdin support already
  existed

Negative:

- depends on the CLI continuing to support non-interactive stdin input
- requires regression coverage because the CLI help text emphasizes `-p` for
  scripting, while stdin behavior is discovered compatibility rather than an
  explicitly documented primary interface
- repository-local Copilot instruction files can interfere with programmatic
  prompts, so the provider now disables them explicitly for deterministic runs

## Alternatives considered

1. **Conditionally switch transport only on Windows or only for long prompts** —
   rejected because it keeps two execution paths and leaves hidden edge cases on
   other platforms.
2. **Truncate investigation context more aggressively** — rejected because it
   degrades analysis quality and treats the symptom instead of the transport
   limit.
3. **Write prompts to a temporary file** — deferred as a fallback option if a
   future Copilot CLI release stops accepting stdin.


# Copilot CLI AI Provider

Date: 2026-04-23 16:48

## Status

Accepted.

## Context

`GitHubCopilotClient` targets `https://models.inference.ai.azure.com` (the GitHub
Models API) with a PAT. The model catalog on that endpoint is narrower than the
one exposed to GitHub Copilot subscribers — newer model ids such as `gpt-5.4`,
`gpt-5.3-codex`, or `claude-sonnet-4.6` are only reachable through the Copilot
infrastructure, which requires an OAuth session rather than a PAT.

The standalone `copilot` CLI already owns that OAuth session on developer
machines. Reusing it lets the agent access the full Copilot Pro+ model catalog
without re-implementing the OAuth device flow, while staying compatible with
the existing `AiClient` abstraction so investigation, planning and
implementation flows require no changes.

## Decision

Add a third `AI_PROVIDER` option, `copilot-cli`, implemented by
`CopilotCliClient`. It spawns the local `copilot` CLI headlessly per call:

- prompt is streamed over stdin (system + user merged with explicit
  `<<SYSTEM>>` and `<<USER>>` markers plus a header telling the model not to
  call tools or ask questions)
- `--model` is added only when configured
- `--silent`, `--no-color`, plus `NO_COLOR=1 / TERM=dumb / CI=1` force plain
  scripting-friendly output
- `--no-custom-instructions` is always passed so repository-local Copilot
  instruction files do not override the machine-consumable prompts used by the
  agent
- `--no-remote` is always passed because the agent never uses Copilot remote
  session control
- tools are denied by default; `COPILOT_CLI_ALLOW_TOOLS=true` opts in
- when tools are denied, `--disable-builtin-mcps` is also passed so background
  MCP initialization cannot interfere with plain prompt/response requests
- for tool-free runs, the CLI is launched from a neutral working directory
  instead of the target repository so repo-scoped Copilot agents and startup
  hooks do not break machine-consumable completions
- the subprocess environment is sanitized so agent/provider variables and PAT
  credentials (for example `GITHUB_TOKEN`) are not inherited by the CLI; it
  must authenticate using its own `copilot auth login` session
- stdin is closed immediately so the CLI cannot block waiting for interaction
- on Windows, bare commands such as `copilot` are resolved to concrete
  executables like `copilot.cmd` before spawning; `.cmd` / `.bat` shims are
  then launched through the Windows shell because they are not native
  executables

Output is cleaned by the pure `parseCopilotCliOutput` function: it strips ANSI,
BOM, spinner/status lines, tool-invocation blocks, and optional assistant
markers, while preserving anything inside fenced code blocks. The result is the
same plain-text shape every other `AiClient` returns, so downstream JSON
parsers keep working unchanged.

Spawning is isolated behind a `ProcessRunner` abstraction (`shared` interface,
`NodeProcessRunner` implementation). Tests substitute `createMockProcessRunner`
so no real process is ever spawned in CI.

Switching providers remains a one-line change in `.env`.

## Consequences

Positive:

- access to Copilot Pro+ models without adding OAuth code
- provider switch is ergonomic (`AI_PROVIDER=copilot-cli`)
- `ProcessRunner` abstraction is reusable by any future service that needs to
  spawn external tooling

Negative:

- per-call process-spawn overhead (≈100–500 ms) is higher than a REST call
- relies on the host having `copilot` installed and authenticated
  (`copilot auth login`) — not suitable for stateless CI runners
- CLI output shape can change across versions, so the parser is deliberately
  lenient and instrumented with diagnostics
- on failures, the provider inspects both stdout and stderr because the CLI can
  report usage/auth diagnostics on stdout while leaving stderr empty
- if the CLI still exits non-zero with empty stdout/stderr, the provider retries
  once in a neutral cwd and attaches the latest Copilot process-log tail to the
  resulting integration error for supportability
- stdin transport is now part of the provider contract, so future CLI changes
  to piped non-interactive input would need a compatibility review

Neutral:

- the API and CLI clients now coexist; the default remains `openai` /
  `copilot` (API). `copilot-cli` is fully opt-in
- JetBrains / long-lived IDE processes on Windows can keep an outdated `PATH`
  after a new CLI install. The runner now also probes `%APPDATA%\npm`, but an
  IDE restart or explicit `COPILOT_CLI_BIN` override may still be required for
  non-standard installations

## Alternatives considered

1. **Implement OAuth device flow + `api.githubcopilot.com`** — delivers the
   same model catalog with REST reliability, but requires implementing and
   storing an OAuth token separately from the CLI. Deferred; may be revisited
   as a future `CopilotOAuthClient`.
2. **Spawn `gh copilot`** — the `gh` extension is chat-suggestion oriented and
   does not expose the same model selection flags as the standalone CLI.
3. **Stay on GitHub Models only** — rejected because the Pro+ model catalog is
   strictly broader.


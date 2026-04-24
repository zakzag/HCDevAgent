# Copilot CLI Provider — Usage Example

Date: 2026-04-23 16:48

## Prerequisites

```powershell
# Install the standalone Copilot CLI (one-time)
winget install --id GitHub.CLI   # or: brew install copilot
copilot --version

# Authenticate once per machine
copilot auth login
```

## Switch the agent to the CLI provider

Edit `.env`:

```dotenv
AI_PROVIDER=copilot-cli
COPILOT_CLI_BIN=copilot
COPILOT_CLI_MODEL=gpt-5.4
COPILOT_CLI_TIMEOUT_MS=180000
COPILOT_CLI_ALLOW_TOOLS=false
```

No other change is required — `CopilotIssueInvestigator`, `CopilotPlanGenerator`
and `CopilotCodeImplementer` all use the shared `AiClient` interface.

## Smoke test manually

```powershell
copilot --no-color --model gpt-5.4 -p "Reply with exactly OK"
```

If that prints `OK` the CLI is configured correctly and the agent will work.

## Diagnose issues

- `Copilot CLI binary not found` → install the CLI or set `COPILOT_CLI_BIN` to
  the absolute path of the executable.
- `Copilot CLI is not authenticated` → run `copilot auth login` on the host.
- `Copilot CLI timed out` → increase `COPILOT_CLI_TIMEOUT_MS`, or inspect
  `stderrTail` in the logged error context.
- Empty output with `strippedToolBlocks > 0` → the CLI tried to use tools;
  either sharpen the prompt or set `COPILOT_CLI_ALLOW_TOOLS=true` (at your
  own risk — the CLI can then edit the filesystem).

## Reverting

Set `AI_PROVIDER` back to `copilot` or `openai`. No code changes needed.


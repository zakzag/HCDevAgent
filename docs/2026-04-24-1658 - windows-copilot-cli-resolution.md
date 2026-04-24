# Windows Copilot CLI Resolution

Date: 2026-04-24 16:58

## Status

Accepted.

## Context

The agent launches external tools through `NodeProcessRunner`, preferring
direct process execution for predictable quoting and lower risk. On Windows,
bare commands such as `copilot` are not always resolved the same way they are
inside a fresh `cmd.exe` session. A common installation path for the Copilot
CLI is the npm shim `%APPDATA%\npm\copilot.cmd`, which can be available from
an interactive shell while a long-lived IDE process still has an outdated
`PATH`.

This mismatch caused `CopilotCliClient` to fail with `ENOENT` even though the
user could run `copilot` manually from CMD.

## Decision

Keep direct spawning for native executables, but add an explicit Windows
command-resolution step before spawning the process:

- if the configured command is already a path or already includes an extension,
  run it as-is
- otherwise, search Windows executable extensions from `PATHEXT`
- search both the effective `PATH` and `%APPDATA%\npm`
- return the first matching executable path, typically `copilot.cmd`
- if the resolved command is a `.cmd` or `.bat` shim, launch it with shell
  execution because Windows cannot spawn batch scripts like native executables
- treat blank working-directory config values as unset so they are not passed
  through as invalid process options

`CopilotCliClient` also surfaces a clearer remediation message that suggests an
IDE restart and an explicit `COPILOT_CLI_BIN` override when needed.

## Consequences

Positive:

- fixes the common Windows npm-global `copilot.cmd` case while still using
  direct execution for native binaries
- keeps process spawning deterministic and reusable for future external tools
- improves operator guidance when the IDE environment is stale

Negative:

- only covers known executable file types from `PATHEXT`
- `%APPDATA%\npm` is a pragmatic fallback, not a universal package-manager
  location

## Alternatives considered

1. **Use `cmd.exe /c` for every Windows process** — rejected because it adds a
   second layer of quoting/parsing and makes generic process execution harder to
   reason about. Shell execution is now limited to `.cmd` / `.bat` shims.
2. **Require `COPILOT_CLI_BIN` to be absolute on Windows** — rejected because it
   pushes a common environment mismatch onto every user.
3. **Add a third-party spawn wrapper** — deferred; the in-house resolver is
   small, testable, and sufficient for the current scope.


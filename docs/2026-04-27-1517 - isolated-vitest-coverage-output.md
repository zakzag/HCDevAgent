# Isolated Vitest coverage output per package

## Context

The monorepo `test:coverage` script runs package test tasks in parallel through Turbo.

Each package uses Vitest with the V8 coverage provider. When all packages were forced to write coverage output into the same root `.coverage` directory, Vitest created and removed the same temporary `.tmp` directory during concurrent runs. That caused intermittent `ENOENT` failures while one package was writing coverage files and another package removed the shared directory.

## Decision

Coverage output is now isolated per package:

- `agent` writes to `.coverage/agent`
- `api` writes to `.coverage/api`
- `dashboard` writes to `.coverage/dashboard`
- `shared` writes to `.coverage/shared`

The root `test:coverage` script no longer overrides `coverage.reportsDirectory`, so each package can keep its own deterministic output path.

## Consequences

- Parallel coverage runs no longer compete for the same temporary directory.
- Each package retains its own `lcov.info` artifact.
- Consumers that read coverage artifacts should use the package-specific paths under `.coverage/`.


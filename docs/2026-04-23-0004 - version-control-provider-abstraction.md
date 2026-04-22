# Version Control Provider Abstraction

**Date:** 2026-04-23 00:04  
**Type:** Architecture / Design Decision  
**Affects:** Agent version-control services, environment configuration, DI bindings

## Summary

Refactored the version-control implementation into three layers:

1. **`GitRepository`** — provider-agnostic local git operations
2. **`GitProvider`** — remote hosting provider operations
3. **`LocalGitVersionControl`** — facade that composes both abstractions behind the existing `VersionControl` interface

This keeps local repository operations reusable across any Git host while isolating GitHub-specific logic inside a dedicated provider implementation.

## Motivation

Previously, `LocalGitVersionControl` mixed two separate concerns:

- local git repository operations via `simple-git`
- GitHub API operations via `fetch`

That design made the local implementation effectively GitHub-only because it directly required:

- `GITHUB_TOKEN`
- GitHub-specific repository identity in addition to the git remote URL

The new abstraction allows the agent to work with any git repository locally, while remote collaboration features are selected through a provider.

## New Architecture

### 1. `GitRepository`

**Purpose:** local git operations that are independent of any hosting platform.

**Responsibilities:**
- create branches
- stage/apply changes
- commit changes
- push branches
- delete local branches
- ensure the configured remote URL matches `GIT_REPO_URL`

**Implementation:** `LocalGitRepository`

### 2. `GitProvider`

**Purpose:** remote hosting operations that depend on a specific platform.

**Responsibilities:**
- create pull/merge requests
- fetch pull/merge request status
- delete remote branches

**Current implementation:** `GitHubGitProvider`

### 3. `VersionControl`

**Purpose:** stable facade for higher-level modules.

**Implementation:** `LocalGitVersionControl`

The facade delegates:
- local git operations → `GitRepository`
- provider-specific remote operations → `GitProvider`

## Configuration Changes

### New generic version-control keys

```dotenv
VERSION_CONTROL_PROVIDER=github
GIT_REPO_URL=https://github.com/your-org-or-username/your-repo-name.git
```

### Existing Git identity keys remain generic

```dotenv
GIT_USER_NAME=HCDevAgent
GIT_USER_EMAIL=hcdevagent@your-domain.com
WORKSPACE_PATH=E:\projects\AI\your-repository
```

### GitHub keys are now provider-specific

Used only when:

```dotenv
VERSION_CONTROL_PROVIDER=github
```

GitHub provider keys:

```dotenv
GITHUB_TOKEN=ghp_replace_with_your_github_token
```

The GitHub provider derives `owner` and `repo` directly from `GIT_REPO_URL`.

## Dependency Injection Strategy

`versionControlModule` now binds:

- `SYMBOLS.GitRepository` → `LocalGitRepository`
- `SYMBOLS.GitProvider` → provider selected by `VERSION_CONTROL_PROVIDER`
- `SYMBOLS.VersionControl` → `LocalGitVersionControl`

This mirrors the existing `AI_PROVIDER` registry pattern used by the AI client module.

## Supported Providers

Currently supported:

- `github`

To add a new provider later:

1. implement `GitProvider`
2. register it in `versionControl.module.ts`
3. add its provider identifier to `VERSION_CONTROL_PROVIDERS`
4. add provider-specific env documentation

## Benefits

- local git logic is reusable for any Git host
- GitHub-specific env keys are isolated to the GitHub provider
- new providers can be added with minimal impact on existing code
- the public `VersionControl` facade remains stable for consumers
- tests can target local git behaviour and remote-provider behaviour separately

## Related Files

- `packages/shared/src/interfaces/GitRepository.ts`
- `packages/shared/src/interfaces/GitProvider.ts`
- `packages/shared/src/constants/versionControlProviders.ts`
- `packages/agent/src/services/versionControl/LocalGitRepository.ts`
- `packages/agent/src/services/versionControl/GitHubGitProvider.ts`
- `packages/agent/src/services/versionControl/LocalGitVersionControl.ts`
- `packages/agent/src/services/versionControl/versionControl.module.ts`
- `.env.example`

## Migration Notes

Existing GitHub-backed setups should add:

```dotenv
VERSION_CONTROL_PROVIDER=github
GIT_REPO_URL=https://github.com/<owner>/<repo>.git
```

and keep:

```dotenv
GITHUB_TOKEN=ghp_replace_with_your_github_token
```

No higher-level module changes are required because the `VersionControl` interface remains unchanged.


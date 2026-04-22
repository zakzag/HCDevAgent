import { vi } from 'vitest';

/**
 * Minimal simple-git test double used by LocalGitRepository unit tests.
 */
export type MockSimpleGitClient = {
    readonly getRemotes: ReturnType<typeof vi.fn>;
    readonly addRemote: ReturnType<typeof vi.fn>;
    readonly raw: ReturnType<typeof vi.fn>;
    readonly fetch: ReturnType<typeof vi.fn>;
    readonly checkout: ReturnType<typeof vi.fn>;
    readonly pull: ReturnType<typeof vi.fn>;
    readonly checkoutLocalBranch: ReturnType<typeof vi.fn>;
    readonly add: ReturnType<typeof vi.fn>;
    readonly addConfig: ReturnType<typeof vi.fn>;
    readonly commit: ReturnType<typeof vi.fn>;
    readonly push: ReturnType<typeof vi.fn>;
    readonly revparse: ReturnType<typeof vi.fn>;
    readonly deleteLocalBranch: ReturnType<typeof vi.fn>;
};

/**
 * Creates a fresh mock simple-git client with default successful behaviour.
 */
export const createMockSimpleGitClient = (): MockSimpleGitClient => ({
    getRemotes: vi.fn().mockResolvedValue([]),
    addRemote: vi.fn().mockResolvedValue(undefined),
    raw: vi.fn().mockResolvedValue(''),
    fetch: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined),
    checkoutLocalBranch: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
    addConfig: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue({ commit: 'commit-sha-123' }),
    push: vi.fn().mockResolvedValue(undefined),
    revparse: vi.fn().mockResolvedValue('main'),
    deleteLocalBranch: vi.fn().mockResolvedValue(undefined),
});

let currentClient: MockSimpleGitClient = createMockSimpleGitClient();

/** Replaces the active mock client returned by simpleGit(). */
export const setMockSimpleGitClient = (client: MockSimpleGitClient): void => {
    currentClient = client;
};

/** Resets the active mock client to a fresh default instance. */
export const resetMockSimpleGitClient = (): MockSimpleGitClient => {
    currentClient = createMockSimpleGitClient();
    return currentClient;
};

/** Mocked simpleGit() factory used by vi.mock(). */
export const simpleGitFactory = vi.fn(() => currentClient);


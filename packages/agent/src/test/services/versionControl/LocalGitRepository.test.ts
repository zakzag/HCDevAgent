import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationError } from '@hcdevagent/shared';
import { MockLogger } from '@hcdevagent/shared/test';
import { LocalGitRepository } from '../../../services/versionControl/LocalGitRepository.js';
import {
    createMockConfigProvider,
    createMockSimpleGitClient,
    resetMockSimpleGitClient,
    setMockSimpleGitClient,
} from '../../mocks/index.js';

vi.mock('simple-git', async () => {
    const { simpleGitFactory } = await import('../../mocks/MockSimpleGit.js');
    return { simpleGit: simpleGitFactory };
});

/**
 * Unit tests for the provider-agnostic local git repository implementation.
 */
describe('LocalGitRepository', () => {
    beforeEach(() => {
        resetMockSimpleGitClient();
    });

    it('configures the remote when missing before creating a branch', async () => {
        const git = createMockSimpleGitClient();
        setMockSimpleGitClient(git);
        const repository = new LocalGitRepository(createMockConfigProvider(), new MockLogger());

        await repository.createBranch('feature/test', 'develop');

        expect(git.addRemote).toHaveBeenCalledWith(
            'origin',
            'https://github.com/test-owner/test-repo.git',
        );
        expect(git.fetch).toHaveBeenCalledWith('origin');
        expect(git.checkout).toHaveBeenCalledWith('develop');
        expect(git.pull).toHaveBeenCalledWith('origin', 'develop');
        expect(git.checkoutLocalBranch).toHaveBeenCalledWith('feature/test');
    });

    it('updates the remote url when it differs from the configured repository url', async () => {
        const git = createMockSimpleGitClient();
        git.getRemotes.mockResolvedValue([
            {
                name: 'origin',
                refs: {
                    fetch: 'https://example.com/old-owner/old-repo.git',
                    push: 'https://example.com/old-owner/old-repo.git',
                },
            },
        ]);
        setMockSimpleGitClient(git);
        const repository = new LocalGitRepository(createMockConfigProvider(), new MockLogger());

        await repository.push('feature/test');

        expect(git.raw).toHaveBeenCalledWith([
            'remote',
            'set-url',
            'origin',
            'https://github.com/test-owner/test-repo.git',
        ]);
        expect(git.push).toHaveBeenCalledWith('origin', 'feature/test', ['--set-upstream']);
    });

    it('checks out the fallback branch before deleting the current local branch', async () => {
        const git = createMockSimpleGitClient();
        git.revparse.mockResolvedValue('feature/test');
        setMockSimpleGitClient(git);
        const repository = new LocalGitRepository(createMockConfigProvider(), new MockLogger());

        await repository.deleteLocalBranch('feature/test');

        expect(git.checkout).toHaveBeenCalledWith('main');
        expect(git.deleteLocalBranch).toHaveBeenCalledWith('feature/test', true);
    });

    it('returns an empty string when git reports no commit sha', async () => {
        const git = createMockSimpleGitClient();
        git.commit.mockResolvedValue({ commit: '' });
        const logger = new MockLogger();
        setMockSimpleGitClient(git);
        const repository = new LocalGitRepository(createMockConfigProvider(), logger);

        await expect(repository.commit('feat: test')).resolves.toBe('');
        expect(logger.warn).toHaveBeenCalledWith(
            'No commit SHA returned, possibly no changes to commit',
        );
    });

    it('wraps git errors with IntegrationError', async () => {
        const git = createMockSimpleGitClient();
        git.fetch.mockRejectedValue(new Error('fetch failed'));
        setMockSimpleGitClient(git);
        const repository = new LocalGitRepository(createMockConfigProvider(), new MockLogger());

        await expect(repository.createBranch('feature/test')).rejects.toThrow(IntegrationError);
    });
});


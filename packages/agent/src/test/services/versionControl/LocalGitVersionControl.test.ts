import { beforeEach, describe, expect, it } from 'vitest';
import type { CodeChanges, PrOptions, PrStatus, PullRequest } from '@hcdevagent/shared';
import { LocalGitVersionControl } from '../../../services/versionControl/LocalGitVersionControl.js';
import { MockGitProvider, MockGitRepository } from '../../mocks/index.js';

/**
 * Unit tests for the LocalGitVersionControl facade.
 */
describe('LocalGitVersionControl', () => {
    let gitRepository: MockGitRepository;
    let gitProvider: MockGitProvider;
    let versionControl: LocalGitVersionControl;

    beforeEach(() => {
        gitRepository = new MockGitRepository();
        gitProvider = new MockGitProvider();
        versionControl = new LocalGitVersionControl(gitRepository, gitProvider);
    });

    it('delegates branch creation to the local repository', async () => {
        await versionControl.createBranch('feature/test', 'develop');

        expect(gitRepository.createBranch).toHaveBeenCalledWith('feature/test', 'develop');
    });

    it('delegates code changes to the local repository', async () => {
        const changes: CodeChanges = {
            filePath: 'src/example.ts',
            diff: 'diff --git a/src/example.ts b/src/example.ts',
            language: 'typescript',
        };

        await versionControl.applyChanges(changes);

        expect(gitRepository.applyChanges).toHaveBeenCalledWith(changes);
    });

    it('returns commit sha from the local repository', async () => {
        gitRepository.commit.mockResolvedValue('commit-sha-123');

        await expect(versionControl.commit('feat: add support')).resolves.toBe('commit-sha-123');
    });

    it('delegates push to the local repository', async () => {
        await versionControl.push('feature/test');

        expect(gitRepository.push).toHaveBeenCalledWith('feature/test');
    });

    it('delegates pull request creation to the configured provider', async () => {
        const options: PrOptions = {
            title: 'Feature',
            body: 'Implements feature',
            sourceBranch: 'feature/test',
            targetBranch: 'main',
            issueKey: 'HC-123',
        };
        const pullRequest: PullRequest = {
            id: '42',
            title: options.title,
            description: options.body,
            url: 'https://example.com/pr/42',
            branch: options.sourceBranch,
            status: 'open',
        };
        gitProvider.createPullRequest.mockResolvedValue(pullRequest);

        await expect(versionControl.createPullRequest(options)).resolves.toEqual(pullRequest);
    });

    it('delegates pull request status queries to the configured provider', async () => {
        const status: PrStatus = {
            state: 'merged',
            reviewComments: [],
            mergeSha: 'merge-sha-123',
        };
        gitProvider.getPullRequestStatus.mockResolvedValue(status);

        await expect(versionControl.getPullRequestStatus('42')).resolves.toEqual(status);
    });

    it('deletes the remote branch before deleting the local branch', async () => {
        await versionControl.deleteBranch('feature/test');

        expect(gitProvider.deleteRemoteBranch).toHaveBeenCalledWith('feature/test');
        expect(gitRepository.deleteLocalBranch).toHaveBeenCalledWith('feature/test');
        expect(gitProvider.deleteRemoteBranch.mock.invocationCallOrder[0]).toBeLessThan(
            gitRepository.deleteLocalBranch.mock.invocationCallOrder[0],
        );
    });
});



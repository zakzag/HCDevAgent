import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, IntegrationError } from '@hcdevagent/shared';
import { MockLogger } from '@hcdevagent/shared/test';
import { GitHubGitProvider } from '../../../services/versionControl/GitHubGitProvider.js';
import { createFetchResponse, createMockConfigProvider } from '../../mocks/index.js';

/**
 * Unit tests for the GitHub-backed remote provider.
 */
describe('GitHubGitProvider', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let provider: GitHubGitProvider;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock as typeof fetch;
        provider = new GitHubGitProvider(createMockConfigProvider(), new MockLogger());
    });

    it('parses https GitHub repository URLs from GIT_REPO_URL', async () => {
        fetchMock.mockResolvedValue(createFetchResponse(true, {
            number: 42,
            html_url: 'https://github.com/test-owner/test-repo/pull/42',
            state: 'open',
        }));
        provider = new GitHubGitProvider(createMockConfigProvider({
            GIT_REPO_URL: 'https://github.com/test-owner/test-repo.git',
        }), new MockLogger());

        await provider.createPullRequest({
            title: 'Feature',
            body: 'Implements feature',
            sourceBranch: 'feature/test',
            targetBranch: 'main',
            issueKey: 'HC-123',
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/test-owner/test-repo/pulls',
            expect.anything(),
        );
    });

    it('parses SSH GitHub repository URLs from GIT_REPO_URL', async () => {
        fetchMock.mockResolvedValue(createFetchResponse(true, {}));
        provider = new GitHubGitProvider(createMockConfigProvider({
            GIT_REPO_URL: 'git@github.com:test-owner/test-repo.git',
        }), new MockLogger());

        await provider.deleteRemoteBranch('feature/test');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/test-owner/test-repo/git/refs/heads/feature/test',
            expect.anything(),
        );
    });

    it('parses ssh protocol GitHub repository URLs from GIT_REPO_URL', async () => {
        fetchMock.mockResolvedValue(createFetchResponse(true, {}));
        provider = new GitHubGitProvider(createMockConfigProvider({
            GIT_REPO_URL: 'ssh://git@github.com/test-owner/test-repo.git',
        }), new MockLogger());

        await provider.deleteRemoteBranch('feature/test');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/test-owner/test-repo/git/refs/heads/feature/test',
            expect.anything(),
        );
    });

    it('throws ConfigError when GIT_REPO_URL is not a valid GitHub repository URL', () => {
        expect(() => new GitHubGitProvider(createMockConfigProvider({
            GIT_REPO_URL: 'https://gitlab.com/test-owner/test-repo.git',
        }), new MockLogger())).toThrow(ConfigError);
    });

    it('creates pull requests using the GitHub API', async () => {
        fetchMock.mockResolvedValue(createFetchResponse(true, {
            number: 42,
            html_url: 'https://github.com/test-owner/test-repo/pull/42',
            state: 'open',
        }));

        const result = await provider.createPullRequest({
            title: 'Feature',
            body: 'Implements feature',
            sourceBranch: 'feature/test',
            targetBranch: 'main',
            issueKey: 'HC-123',
        });

        expect(result).toEqual({
            id: '42',
            title: 'Feature',
            description: 'Implements feature',
            url: 'https://github.com/test-owner/test-repo/pull/42',
            branch: 'feature/test',
            status: 'open',
        });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/test-owner/test-repo/pulls',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-github-token',
                }),
            }),
        );
    });

    it('maps merged pull requests to merged status', async () => {
        fetchMock
            .mockResolvedValueOnce(createFetchResponse(true, {
                state: 'closed',
                merged: true,
                merge_commit_sha: 'merge-sha-123',
            }))
            .mockResolvedValueOnce(createFetchResponse(true, []));

        const result = await provider.getPullRequestStatus('42');

        expect(result).toEqual({
            state: 'merged',
            reviewComments: [],
            mergeSha: 'merge-sha-123',
        });
    });

    it('maps closed pull requests with requested changes comments', async () => {
        fetchMock
            .mockResolvedValueOnce(createFetchResponse(true, {
                state: 'closed',
                merged: false,
                merge_commit_sha: null,
            }))
            .mockResolvedValueOnce(createFetchResponse(true, [
                { state: 'CHANGES_REQUESTED', body: 'Please revise this.' },
                { state: 'APPROVED', body: 'Looks good.' },
            ]));

        const result = await provider.getPullRequestStatus('99');

        expect(result).toEqual({
            state: 'changesRequested',
            reviewComments: ['Please revise this.'],
            mergeSha: null,
        });
    });

    it('deletes remote branches through the GitHub API', async () => {
        fetchMock.mockResolvedValue(createFetchResponse(true, {}));

        await provider.deleteRemoteBranch('feature/test');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/test-owner/test-repo/git/refs/heads/feature/test',
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    it('throws IntegrationError when GitHub returns a non-OK response', async () => {
        fetchMock.mockResolvedValue(createFetchResponse(false, 'Unauthorized', 401));

        await expect(provider.deleteRemoteBranch('feature/test')).rejects.toThrow(IntegrationError);
    });
});


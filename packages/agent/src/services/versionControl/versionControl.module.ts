import { ContainerModule } from 'inversify';
import type { interfaces } from 'inversify';
import type { ConfigProvider } from '@hcdevagent/shared';
import { SYMBOLS, VERSION_CONTROL_PROVIDERS, ConfigError } from '@hcdevagent/shared';
import { GitHubGitProvider } from './GitHubGitProvider.js';
import type { GitProvider } from './GitProvider.js';
import { LocalGitRepository } from './LocalGitRepository.js';
import { LocalGitVersionControl } from './LocalGitVersionControl.js';

/** Maps VERSION_CONTROL_PROVIDER values to concrete provider implementations. */
const PROVIDER_REGISTRY: Readonly<Record<string, interfaces.Newable<GitProvider>>> = {
  [VERSION_CONTROL_PROVIDERS.GITHUB]: GitHubGitProvider,
};

/** DI module that binds the VersionControl interface. */
export const versionControlModule = new ContainerModule((bind) => {
  bind(LocalGitRepository).toSelf().inSingletonScope();
  bind(LocalGitVersionControl).toSelf().inSingletonScope();
  bind(GitHubGitProvider).toSelf().inSingletonScope();

  bind(SYMBOLS.GitRepository)
    .toDynamicValue((ctx) => ctx.container.get(LocalGitRepository))
    .inSingletonScope();

  bind(SYMBOLS.GitProvider)
    .toDynamicValue((ctx) => {
      const config = ctx.container.get<ConfigProvider>(SYMBOLS.ConfigProvider);
      const provider = config.getOptional('VERSION_CONTROL_PROVIDER') ?? VERSION_CONTROL_PROVIDERS.GITHUB;
      const ProviderClass = PROVIDER_REGISTRY[provider];

      if (ProviderClass === undefined) {
        const valid = Object.keys(PROVIDER_REGISTRY).join(', ');
        throw new ConfigError(
          `Unknown VERSION_CONTROL_PROVIDER: "${provider}". Valid values: ${valid}.`,
          { provider },
        );
      }

      return ctx.container.get<GitProvider>(ProviderClass);
    })
    .inSingletonScope();

  bind(SYMBOLS.VersionControl)
    .toDynamicValue((ctx) => ctx.container.get(LocalGitVersionControl))
    .inSingletonScope();
});


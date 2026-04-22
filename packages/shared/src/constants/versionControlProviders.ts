/**
 * Valid values for the VERSION_CONTROL_PROVIDER environment variable.
 * Use these constants instead of magic strings.
 */
export const VERSION_CONTROL_PROVIDERS = {
    /** GitHub repository hosting and pull requests. */
    GITHUB: 'github',
} as const;

/** Union type of all supported version-control provider identifiers. */
export type VersionControlProvider =
    (typeof VERSION_CONTROL_PROVIDERS)[keyof typeof VERSION_CONTROL_PROVIDERS];


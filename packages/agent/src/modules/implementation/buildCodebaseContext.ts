import type { CodebaseContext } from '@hcdevagent/shared';

/** Builds the serialized codebase context embedded into implementation prompts. */
export const buildCodebaseContext = (codebase: CodebaseContext): string => {
    const lines = [`Codebase structure:\n${codebase.structure}`];

    for (const file of codebase.files) {
        lines.push(`\nFile: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``);
    }

    return lines.join('\n');
};


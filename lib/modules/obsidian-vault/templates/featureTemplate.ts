export function featureTemplate(input: { title: string; project?: string }): string {
  const project = input.project ?? "Unassigned";

  return `# ${input.title}

## Goal
Describe the feature outcome.

## Project
${project}

## Why It Matters
Explain why this should exist.

## Required Capabilities
- 

## Implementation Notes
- 

## Links
- Parent project: [[${project}]]
`;
}

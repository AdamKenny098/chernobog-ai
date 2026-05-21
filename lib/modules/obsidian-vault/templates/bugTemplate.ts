export function bugTemplate(input: { title: string; project?: string }): string {
  const project = input.project ?? "Unassigned";

  return `# ${input.title}

## Project
[[${project}]]

## Problem
Describe the bug.

## Expected Behaviour
Describe what should happen.

## Actual Behaviour
Describe what happens instead.

## Suspected Cause
- 

## Fix Notes
- 

## Links
- Parent project: [[${project}]]
`;
}

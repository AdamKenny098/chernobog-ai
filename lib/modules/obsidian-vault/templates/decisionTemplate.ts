export function decisionTemplate(input: { title: string; project?: string }): string {
  const project = input.project ?? "Unassigned";

  return `# ${input.title}

## Decision
State the decision clearly.

## Project
${project}

## Reason
Explain why this decision was made.

## Consequences
- 

## Alternatives Considered
- 

## Links
- Parent project: [[${project}]]
`;
}

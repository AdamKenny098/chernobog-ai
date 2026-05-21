export function taskTemplate(input: { title: string; project?: string }): string {
  const project = input.project ?? "Unassigned";

  return `# ${input.title}

## Project
[[${project}]]

## Status
Todo

## Definition of Done
- 

## Steps
- [ ] 

## Links
- Parent project: [[${project}]]
`;
}

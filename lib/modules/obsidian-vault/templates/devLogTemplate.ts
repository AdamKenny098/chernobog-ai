export function devLogTemplate(input: {
  title: string;
  project?: string;
  summary?: string;
}): string {
  const project = input.project ?? "Unassigned";
  const summary = input.summary ?? "";

  return `# ${input.title}

## Project
[[${project}]]

## Summary
${summary}

## What Changed
- 

## Decisions Made
- 

## New Nodes Created
- 

## Next Actions
- 
`;
}

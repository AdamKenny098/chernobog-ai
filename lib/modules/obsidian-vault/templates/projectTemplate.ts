export function projectTemplate(input: { title: string; area?: string }): string {
  const area = input.area ?? "Unsorted";

  return `# ${input.title}

## Purpose
Describe what this project exists to do.

## Area
${area}

## Current Stage
Unknown

## Active Threads
- 

## Current Priorities
- 

## Related
- 
`;
}

const MAX_CRITERIA = 10;
const LIST_ITEM = /^(?:[-*•]|\d{1,2}[.)])\s(.*)$/;
const GHERKIN = /^(given|when|then|and|but)\s/i;

/**
 * Acceptance criteria written in a story: bullet or numbered lines, or Given/When/Then blocks
 * (one criterion per block). Returns an empty list when the story has none.
 */
export function parseCriteria(story: string | null): string[] {
  if (!story) return [];
  const lines = story.split(/\r?\n/).map((line) => line.trim());

  const listed = lines
    .map((line) => LIST_ITEM.exec(line)?.[1]?.trim() ?? '')
    .filter((item) => item.length > 0);
  if (listed.length > 0) return unique(listed);

  const blocks: string[][] = [];
  for (const line of lines) {
    const keyword = GHERKIN.exec(line)?.[1]?.toLowerCase();
    if (!keyword) continue;
    if (keyword === 'given' || blocks.length === 0) blocks.push([]);
    blocks.at(-1)?.push(line);
  }
  return unique(blocks.map((block) => block.join(' ')));
}

function unique(items: readonly string[]): string[] {
  return [...new Set(items)].slice(0, MAX_CRITERIA);
}

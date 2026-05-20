export function extractDescriptionFromContent(content: string, maxLen?: number): string;
export function inferTagsFromContent(content: string, maxTags?: number): string[];
export function isTrivialDescription(description: string | undefined | null, title: string): boolean;

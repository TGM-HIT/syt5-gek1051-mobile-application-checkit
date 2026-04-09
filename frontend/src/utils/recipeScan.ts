export interface RecipeIngredient {
  name: string;
  menge: string;
  orderIndex: number;
}

const INGREDIENT_HEADER_REGEX = /^zutaten\b[:]?$/i;
const RECIPE_SECTION_STOP_REGEX = /^(zubereitung|anleitung|schritte|nahrwerte|notizen|tipps)\b/i;
const TOKEN_SPLIT_REGEX = /[,;]|\s\+\s/g;

const QUANTITY_PREFIX_REGEX =
  /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*(?:kg|g|mg|l|ml|el|tl|stk|stuck|stueck|zehe|zehen|prise|prisen|bund|becher|dose|dosen|packung|packungen|scheibe|scheiben|tasse|tassen|x)?)\s+(.+)$/i;

function normalizeLine(rawLine: string): string {
  return rawLine
    .replace(/[\u2022*\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function extractIngredientParts(token: string): { menge: string; name: string } | null {
  const cleaned = token
      .replace(/\(.*?\)/g, '')
      .replace(/^[-:\d.)\s]+/, '')
      .trim();

  if (!cleaned || cleaned.length < 2) return null;
  if (INGREDIENT_HEADER_REGEX.test(cleaned)) return null;
  if (RECIPE_SECTION_STOP_REGEX.test(cleaned)) return null;

  const match = cleaned.match(QUANTITY_PREFIX_REGEX);
  if (match) {
    return {
      menge: match[1]!.replace(/\s+/g, ' ').trim(),
      name: match[2]!.trim(),
    };
  }

  return {
    menge: '1',
    name: cleaned,
  };
}

export function parseRecipeIngredients(ocrText: string): RecipeIngredient[] {
  const lines = ocrText
      .split('\n')
      .map(normalizeLine)
      .filter(Boolean);

  if (lines.length === 0) return [];

  let start = 0;
  const headerIndex = lines.findIndex((line) => line.toLowerCase().startsWith('zutaten'));
  if (headerIndex >= 0) {
    start = headerIndex + 1;
  }

  const candidates: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    if (RECIPE_SECTION_STOP_REGEX.test(line)) break;
    candidates.push(line);
  }

  const source = candidates.length > 0 ? candidates : lines;
  const parsed: RecipeIngredient[] = [];

  source
      .flatMap((line) => line.split(TOKEN_SPLIT_REGEX))
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const parts = extractIngredientParts(token);
        if (!parts) return;
        parsed.push({
          name: parts.name,
          menge: parts.menge,
          orderIndex: parsed.length + 1,
        });
      });

  return parsed;
}



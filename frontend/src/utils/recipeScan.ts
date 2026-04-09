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




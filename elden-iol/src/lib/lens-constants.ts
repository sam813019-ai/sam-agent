export interface ToricLensFamily {
  id: string;
  label: string;
  aConstant: number;
  lensFactor: number;
  toricPowers: string[];
}

export const TORIC_FAMILIES: ToricLensFamily[] = [
  {
    id: 'JJ_DIU',
    label: 'J&J Tecnis Toric II (DIU)',
    aConstant: 119.39,
    lensFactor: 2.09,
    toricPowers: ['DIU150', 'DIU225', 'DIU300', 'DIU375', 'DIU450', 'DIU525', 'DIU600'],
  },
];

/** 非散光片型號 → 對應的散光片系列 id */
const NON_TORIC_TO_TORIC: Record<string, string> = {
  ZCB00: 'JJ_DIU',
  'ZCB00-1': 'JJ_DIU',
};

/** 已知型號代碼，長的排前面，避免 ZCB00 先命中而吃掉 ZCB00-1 */
const KNOWN_MODEL_CODES = Object.keys(NON_TORIC_TO_TORIC).sort((a, b) => b.length - a.length);

export function normalizeLensModel(raw: string): string | null {
  const upper = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const code of KNOWN_MODEL_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

export function getFamilyById(id: string): ToricLensFamily | null {
  return TORIC_FAMILIES.find((f) => f.id === id) ?? null;
}

export function lookupToricFamily(model: string): ToricLensFamily | null {
  const code = normalizeLensModel(model);
  if (code === null) return null;
  const familyId = NON_TORIC_TO_TORIC[code];
  return familyId === undefined ? null : getFamilyById(familyId);
}

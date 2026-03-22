const RU_TO_LAT: Record<string, string[]> = {
  а: ['a'], б: ['b'], в: ['v'], г: ['g'], д: ['d'], е: ['e'],
  ё: ['e', 'yo'], ж: ['zh'], з: ['z', 's'], и: ['i', 'y'], й: ['y'],
  к: ['k'], л: ['l'], м: ['m'], н: ['n'], о: ['o'], п: ['p'],
  р: ['r'], с: ['s'], т: ['t'], у: ['u'], ф: ['f'], х: ['h', 'kh'],
  ц: ['ts'], ч: ['ch'], ш: ['sh'], щ: ['sch', 'sh'],
  ъ: [''], ы: ['y'], ь: [''], э: ['e'], ю: ['yu'], я: ['ya'],
  і: ['i'], ї: ['yi'], є: ['ye'], ґ: ['g'],
};

// Two-char combos that map to single latin chars
const RU_COMBOS: Record<string, string[]> = {
  кс: ['x', 'ks'],
};

export function translitVariants(text: string): string[] {
  const lower = text.toLowerCase();
  let variants: string[] = [''];

  let i = 0;
  while (i < lower.length) {
    // Check two-char combo first
    const twoChar = lower.slice(i, i + 2);
    const comboMappings = RU_COMBOS[twoChar];
    if (comboMappings && i + 1 < lower.length) {
      const newVariants: string[] = [];
      for (const v of variants) {
        for (const m of comboMappings) {
          newVariants.push(v + m);
        }
      }
      variants = newVariants;
      i += 2;
      continue;
    }

    const ch = lower[i];
    const mappings = RU_TO_LAT[ch];
    if (mappings) {
      const newVariants: string[] = [];
      for (const v of variants) {
        for (const m of mappings) {
          newVariants.push(v + m);
        }
      }
      variants = newVariants;
    } else {
      variants = variants.map((v) => v + ch);
    }
    // Cap variants to avoid explosion
    if (variants.length > 8) {
      variants = variants.slice(0, 8);
    }
    i++;
  }

  return [...new Set(variants)];
}

export function hasCyrillic(text: string): boolean {
  return /[а-яА-ЯіїєґІЇЄҐёЁ]/.test(text);
}

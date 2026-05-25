// Master spice list. This is the hardcoded baseline — users can also add their
// own spices via the Spice Hub UI, which stores them in the custom_spices table.
//
// Matching is case-insensitive substring: "smoked paprika" matches "paprika",
// "ground cumin" matches "cumin", "fresh thyme" matches "thyme", etc.

export const SPICE_MASTER_SET = new Set([
  // Salt & Pepper
  "salt", "pepper", "black pepper", "white pepper", "sea salt", "kosher salt",
  "fleur de sel", "red pepper flakes", "pink salt", "himalayan salt",
  "peppercorn", "szechuan pepper",

  // Heat & Chili
  "cumin", "chili powder", "cayenne", "paprika", "smoked paprika",
  "chipotle", "ancho", "guajillo", "red chili", "chili flakes",
  "red pepper", "ghost pepper", "habanero powder",

  // Warm Spices
  "cinnamon", "nutmeg", "cloves", "clove", "cardamom", "allspice", "mace",
  "ginger", "star anise", "anise",

  // Savory Spices
  "coriander", "turmeric", "mustard powder", "mustard seeds", "celery salt",
  "celery seed", "fenugreek", "asafoetida", "hing", "amchur", "sumac",
  "za'atar", "caraway", "caraway seeds", "juniper",

  // Garlic & Onion
  "garlic powder", "onion powder", "garlic salt", "dried garlic",

  // Herbs (dried)
  "oregano", "thyme", "rosemary", "basil", "sage", "bay leaf", "bay leaves",
  "marjoram", "dill", "tarragon", "chervil", "savory", "lavender",
  "mint", "spearmint", "peppermint",

  // Fresh herbs
  "cilantro", "parsley", "chives", "lemongrass", "kaffir lime",

  // Seeds
  "fennel seeds", "fennel", "cumin seeds", "coriander seeds",
  "poppy seeds", "sesame seeds", "nigella seeds", "black sesame",
  "mustard seeds", "hemp seeds",

  // Spice Blends
  "curry powder", "garam masala", "ras el hanout", "five spice",
  "chinese five spice", "old bay", "cajun seasoning", "creole seasoning",
  "italian seasoning", "herbes de provence", "baharat", "berbere",
  "harissa", "dukkah", "chaat masala", "everything bagel seasoning",
  "jerk seasoning", "taco seasoning", "poultry seasoning", "adobo", "sazon",

  // Specialty
  "saffron", "vanilla", "vanilla bean", "annatto", "achiote",
  "dried lime", "loomi", "galangal",
]);

/** Strip parenthetical notes like "(to taste)" or "((or substitute x))" */
export function cleanSpiceName(name: string): string {
  return name.split(/\s*\(/)[0].trim();
}

/** Check against hardcoded set + any user-supplied extra names */
export function makeIsSpice(extraNames: string[] = []) {
  const extras = new Set(extraNames.map((n) => n.toLowerCase()));
  return function isSpice(rawName: string): boolean {
    const lower = cleanSpiceName(rawName).toLowerCase();
    for (const spice of SPICE_MASTER_SET) {
      if (lower.includes(spice)) return true;
    }
    for (const custom of extras) {
      if (lower.includes(custom)) return true;
    }
    return false;
  };
}

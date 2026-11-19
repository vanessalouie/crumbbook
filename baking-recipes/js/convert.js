// ==========================================================================
// convert.js — Unit conversion and recipe scaling (shared by every page)
// --------------------------------------------------------------------------
// Table of contents
// 1. Unit facts (how big each unit is, what it's called)
// 2. Grams per cup for common baking ingredients
// 3. Small text helpers
// 4. parseIngredient — reading "1 1/4 cups brown sugar"
// 5. Converting between US and Metric
// 6. formatAmount — turning numbers back into recipe-style text
// 7. Countable items (eggs, bananas, cans)
// 8. displayIngredient — the one function the pages call
// 9. Temperatures in the instructions
// 10. Servings / yield ("Makes 24 cookies")
// 11. runConversionTests — checks you can run from the console
//
// IMPORTANT: nothing here changes saved text. These functions only work out
// what to SHOW. "Original" + "1×" always returns the saved line untouched.
// ==========================================================================


// ==========================================================================
// 1. Unit facts
// ==========================================================================

// system: which measuring system the unit belongs to
// ml / g: how many millilitres or grams ONE of this unit is
const UNIT_INFO = {
  tsp:   { system: "us",     type: "volume", ml: 4.93 },
  tbsp:  { system: "us",     type: "volume", ml: 14.79 },   // 3 tsp
  cup:   { system: "us",     type: "volume", ml: 236.6 },   // 16 tbsp
  floz:  { system: "us",     type: "volume", ml: 29.57 },
  oz:    { system: "us",     type: "weight", g: 28.35 },
  lb:    { system: "us",     type: "weight", g: 453.6 },
  stick: { system: "us",     type: "stick",  g: 113 },      // stick of butter = ½ cup
  g:     { system: "metric", type: "weight", g: 1 },
  kg:    { system: "metric", type: "weight", g: 1000 },
  ml:    { system: "metric", type: "volume", ml: 1 },
  l:     { system: "metric", type: "volume", ml: 1000 },
  can:   { system: "none",   type: "count" }                // never converted, only scaled
};

// How many teaspoons are in each spoon/cup unit (used to pick a sensible unit)
const TEASPOONS_IN = { tsp: 1, tbsp: 3, cup: 48 };

// What each unit is called: [singular, plural]. Spanish lines keep Spanish names.
const UNIT_LABELS = {
  en: {
    tsp: ["tsp", "tsp"], tbsp: ["tbsp", "tbsp"], cup: ["cup", "cups"], floz: ["fl oz", "fl oz"],
    oz: ["oz", "oz"], lb: ["lb", "lb"], stick: ["stick", "sticks"], g: ["g", "g"], kg: ["kg", "kg"],
    ml: ["ml", "ml"], l: ["L", "L"], can: ["can", "cans"]
  },
  es: {
    tsp: ["cdta", "cdtas"], tbsp: ["cda", "cdas"], cup: ["taza", "tazas"], can: ["lata", "latas"]
  }
};

// How units can be written, checked in this order (longer spellings first).
// Capital "T" means tablespoon and lowercase "t" means teaspoon, so those two
// patterns have no "i" flag (they're case-sensitive).
const UNIT_PATTERNS = [
  { unit: "floz",  lang: "en", pattern: /^(?:fl\.?\s*oz\.?|fluid\s+ounces?)/i },
  { unit: "tbsp",  lang: "en", pattern: /^(?:tablespoons?|tbsps?\.?|tbls?\.?|tbs\.?)/i },
  { unit: "tsp",   lang: "en", pattern: /^(?:teaspoons?|tsps?\.?)/i },
  { unit: "tbsp",  lang: "en", pattern: /^T\.?/ },
  { unit: "tsp",   lang: "en", pattern: /^t\.?/ },
  { unit: "tsp",   lang: "es", pattern: /^(?:cucharaditas?|cdtas?\.?)/i },
  { unit: "tbsp",  lang: "es", pattern: /^(?:cucharadas?|cdas?\.?)/i },
  { unit: "cup",   lang: "es", pattern: /^tazas?/i },
  { unit: "cup",   lang: "en", pattern: /^(?:cups?|c\.?)/i },
  { unit: "can",   lang: "es", pattern: /^latas?/i },
  { unit: "can",   lang: "en", pattern: /^cans?/i },
  { unit: "stick", lang: "en", pattern: /^sticks?/i },
  { unit: "oz",    lang: "en", pattern: /^(?:ounces?|oz\.?)/i },
  { unit: "lb",    lang: "en", pattern: /^(?:pounds?|lbs?\.?)/i },
  { unit: "kg",    lang: "en", pattern: /^(?:kilograms?|kilos?|kg\.?)/i },
  { unit: "g",     lang: "es", pattern: /^gramos?/i },
  { unit: "g",     lang: "en", pattern: /^(?:grams?|gr?\.?)/i },
  { unit: "ml",    lang: "en", pattern: /^(?:millilit(?:er|re)s?|ml\.?)/i },
  { unit: "l",     lang: "es", pattern: /^litros?/i },
  { unit: "l",     lang: "en", pattern: /^(?:lit(?:er|re)s?|l\.?)/i }
];


// ==========================================================================
// 2. Grams per cup (a cup of flour weighs much less than a cup of sugar)
// --------------------------------------------------------------------------
// "liquid" means: measure it in ml, not grams.
// ==========================================================================
const GRAMS_PER_CUP_TABLE = [
  { grams: 125, names: ["all-purpose flour", "flour", "harina"] },
  { grams: 130, names: ["bread flour"] },
  { grams: 115, names: ["cake flour"] },
  { grams: 120, names: ["whole wheat flour"] },
  { grams: 96,  names: ["almond flour"] },
  { grams: 200, names: ["granulated sugar", "sugar", "azúcar"] },
  { grams: 213, names: ["brown sugar"] },
  { grams: 120, names: ["powdered sugar", "confectioners' sugar", "confectioners sugar", "icing sugar"] },
  { grams: 85,  names: ["cocoa powder", "cocoa"] },
  { grams: 227, names: ["butter", "mantequilla"] },
  { grams: 90,  names: ["oats", "rolled oats"] },
  { grams: 170, names: ["chocolate chips", "chispas de chocolate"] },
  { grams: 85,  names: ["shredded coconut"] },
  { grams: 115, names: ["chopped nuts", "walnuts", "pecans"] },
  { grams: 340, names: ["honey", "maple syrup", "molasses"] },
  { grams: "liquid", names: ["milk", "water", "buttermilk", "heavy cream", "cream", "oil",
                             "juice", "coffee", "leche", "agua", "aceite", "jugo"] }
];

// One flat list of { name, grams }, longest names first, so "brown sugar"
// is checked before "sugar" and "bread flour" before "flour"
const GRAMS_PER_CUP = [];
GRAMS_PER_CUP_TABLE.forEach(function (row) {
  row.names.forEach(function (name) {
    GRAMS_PER_CUP.push({ name: name, grams: row.grams });
  });
});
GRAMS_PER_CUP.sort(function (a, b) {
  return b.name.length - a.name.length;
});

// Returns grams per cup (a number), "liquid", or null if not in the table
function findGramsPerCup(ingredientName) {
  const text = simplifyText(ingredientName);
  const match = GRAMS_PER_CUP.find(function (row) {
    return containsWord(text, simplifyText(row.name));
  });
  return match ? match.grams : null;
}


// ==========================================================================
// 3. Small text helpers
// ==========================================================================

// Lowercase and without accents, so "Azúcar" and "azucar" match.
// "NFD" splits "ú" into "u" + an accent mark, then we delete the marks.
// (Used by every page, which is why it lives in this shared file.)
function simplifyText(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

// True if `word` appears in `text` as a whole word (with an optional plural "s"),
// so "oats" matches "rolled oats" but "cream" doesn't match "creamy"
function containsWord(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?:^|[^\\p{L}])" + escaped + "s?(?![\\p{L}])", "u").test(text);
}

// Rounds to the nearest 5 (used for grams, ml, and temperatures)
function roundToFive(value) {
  return Math.round(value / 5) * 5;
}

// The "×" label for a scale: 0.5 → "½×", 2 → "2×", 1.3 → "1.3×"
function formatScale(scale) {
  const isEighths = Math.abs(scale * 8 - Math.round(scale * 8)) < 0.001;
  return (isEighths ? formatFraction(scale) : String(Number(scale.toFixed(2)))) + "×";
}


// ==========================================================================
// 4. parseIngredient — reading the amount and unit at the start of a line
// ==========================================================================

const FRACTION_VALUES = {
  "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4,
  "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8
};

// One number, in any of these forms (checked in this order):
//   "1 1/2" (mixed)  |  "1/2"  |  "1½", "1 ½", "½"  |  "2", "0.5", "1,5"
const NUMBER_SOURCE = "\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d*\\s?[½⅓⅔¼¾⅛⅜⅝⅞]|\\d+(?:[.,]\\d+)?";

// A number, optionally followed by a range: "2-3", "2–3", "2 to 3", "2 a 3"
const AMOUNT_PATTERN = new RegExp(
  "^(" + NUMBER_SOURCE + ")(?:\\s*[-–—]\\s*|\\s+(?:to|a)\\s+)?(" + NUMBER_SOURCE + ")?"
);

// Turns "1 1/2", "3/4", "1½", "½", "0.5" into a number
function parseNumber(text) {
  const clean = text.trim();
  const fractionChar = clean.slice(-1);

  if (FRACTION_VALUES[fractionChar] !== undefined) {
    const whole = clean.slice(0, -1).trim();
    return (whole ? Number(whole) : 0) + FRACTION_VALUES[fractionChar];
  }
  if (clean.includes("/")) {
    const parts = clean.split(/\s+/);           // "1 1/2" → ["1", "1/2"]
    const fraction = parts.pop().split("/");
    const whole = parts.length > 0 ? Number(parts[0]) : 0;
    const bottom = Number(fraction[1]);
    return bottom === 0 ? whole : whole + Number(fraction[0]) / bottom;
  }
  return Number(clean.replace(",", "."));
}

// Finds which unit (if any) starts this text. Returns { unit, lang, length }.
function matchUnit(text) {
  for (const option of UNIT_PATTERNS) {
    const match = text.match(option.pattern);
    // The unit must end there: "l" must not match the start of "large"
    if (match && !/^\p{L}/u.test(text.slice(match[0].length))) {
      return { unit: option.unit, lang: option.lang, length: match[0].length };
    }
  }
  return null;
}

// "1 1/4 cups brown sugar" →
//   { amount: 1.25, amountMax: null, unit: "cup", unitLang: "en",
//     rest: "brown sugar", parsed: true }
// Lines with no amount ("pinch of salt") → { parsed: false }
function parseIngredient(text) {
  const notParsed = { amount: null, amountMax: null, unit: null, unitLang: "en", rest: text, parsed: false };
  const line = text.trim();

  const amountMatch = line.match(AMOUNT_PATTERN);
  if (!amountMatch) {
    return notParsed;
  }

  // The range part only counts if there really was a second number
  let matchedText = amountMatch[0];
  let amountMax = null;
  if (amountMatch[2]) {
    amountMax = parseNumber(amountMatch[2]);
  } else {
    matchedText = amountMatch[1];
  }

  const amount = parseNumber(amountMatch[1]);
  if (isNaN(amount) || (amountMax !== null && isNaN(amountMax))) {
    return notParsed;
  }

  // The unit can follow with or without a space: "200g" or "200 g"
  let afterAmount = line.slice(matchedText.length).trim();
  const unitMatch = matchUnit(afterAmount);
  let unit = null;
  let unitLang = "en";
  if (unitMatch) {
    unit = unitMatch.unit;
    unitLang = unitMatch.lang;
    afterAmount = afterAmount.slice(unitMatch.length).trim();
  }

  return {
    amount: amount,
    amountMax: amountMax,
    unit: unit,
    unitLang: unitLang,
    rest: afterAmount,
    parsed: true
  };
}


// ==========================================================================
// 5. Converting between US and Metric
// --------------------------------------------------------------------------
// Takes { low, high, unit } and returns the same shape in the other system,
// plus approx: true when we had to guess (a cup of something not in the table).
// ==========================================================================
function convertQuantity(quantity, ingredientName, targetSystem) {
  const info = UNIT_INFO[quantity.unit];
  let factor;      // multiply the amount by this...
  let newUnit;     // ...to get this unit
  let approx = false;

  if (targetSystem === "metric") {
    if (info.type === "stick" || info.type === "weight") {
      factor = info.g;
      newUnit = "g";
    } else if (quantity.unit === "cup") {
      // Cups depend on the ingredient: look up how much a cup weighs
      const gramsPerCup = findGramsPerCup(ingredientName);
      if (typeof gramsPerCup === "number") {
        factor = gramsPerCup;
        newUnit = "g";
      } else {
        factor = info.ml;
        newUnit = "ml";
        approx = gramsPerCup === null;   // not liquid and not in the table
      }
    } else {
      // tsp, tbsp, fl oz → ml (spoons stay as volume: bakers measure them with spoons)
      factor = info.ml;
      newUnit = "ml";
    }
  } else {
    // targetSystem === "us"
    if (info.type === "weight") {
      const grams = info.g;   // grams in one of the original unit
      const gramsPerCup = findGramsPerCup(ingredientName);
      if (typeof gramsPerCup === "number") {
        factor = grams / gramsPerCup;   // grams → cups
        newUnit = "cup";
      } else if (gramsPerCup === "liquid") {
        factor = grams / UNIT_INFO.cup.ml;   // 1 g of liquid ≈ 1 ml
        newUnit = "cup";
      } else {
        factor = grams / UNIT_INFO.oz.g;     // unknown ingredient → ounces
        newUnit = "oz";
      }
    } else {
      factor = info.ml / UNIT_INFO.cup.ml;   // ml → cups (formatAmount picks tbsp/tsp if small)
      newUnit = "cup";
    }
  }

  const converted = {
    low: quantity.low * factor,
    high: quantity.high === null ? null : quantity.high * factor,
    unit: newUnit,
    approx: approx
  };

  // A pound is easier to read than 16+ ounces
  if (converted.unit === "oz" && converted.low >= 16) {
    converted.low = converted.low / 16;
    converted.high = converted.high === null ? null : converted.high / 16;
    converted.unit = "lb";
  }
  return converted;
}


// ==========================================================================
// 6. formatAmount — numbers back into recipe-style text
// ==========================================================================

// Friendly fractions for US amounts: [value, how it's written]
const FRACTION_STEPS = [
  [0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"],
  [2 / 3, "⅔"], [3 / 4, "¾"], [1, ""]
];

// Rounds to the nearest whole number + friendly fraction (0.3333 → ⅓).
// Anything above zero shows at least ⅛, so a small amount never shows as "0".
function roundToFriendly(value) {
  const whole = Math.floor(value);
  const leftover = value - whole;
  let best = FRACTION_STEPS[0];
  FRACTION_STEPS.forEach(function (step) {
    if (Math.abs(leftover - step[0]) < Math.abs(leftover - best[0])) {
      best = step;
    }
  });
  const rounded = whole + best[0];
  return rounded === 0 && value > 0 ? 1 / 8 : rounded;
}

// 1.5 → "1½", 0.75 → "¾", 2 → "2" (expects an already-rounded value)
function formatFraction(value) {
  const whole = Math.floor(value + 0.0001);
  const leftover = value - whole;
  const step = FRACTION_STEPS.find(function (option) {
    return Math.abs(option[0] - leftover) < 0.01;
  });
  const fractionText = step ? step[1] : "";
  if (whole === 0) {
    return fractionText || "0";
  }
  return String(whole) + fractionText;
}

// Metric numbers: show ".5" only when it's needed (5 → "5", 2.5 → "2.5")
function formatDecimal(value) {
  return String(Number(value.toFixed(1)));
}

function getUnitLabel(unit, lang, plural) {
  const labels = (UNIT_LABELS[lang] && UNIT_LABELS[lang][unit]) || UNIT_LABELS.en[unit];
  return plural ? labels[1] : labels[0];
}

// Picks the most sensible spoon/cup unit for an amount in teaspoons:
// ¼ cup and up stays in cups, 1 tbsp up to ¼ cup → tbsp, under 1 tbsp → tsp
function pickUsVolumeUnit(teaspoons) {
  if (teaspoons >= 12) {
    return "cup";
  }
  if (teaspoons >= 3) {
    return "tbsp";
  }
  return "tsp";
}

// Metric rounding rules:
//   grams: under 100 → whole grams, 100 and up → nearest 5
//   ml: under 15 → nearest 0.5, 15 and up → nearest 5, 1000 and up → liters
function roundMetric(value, unit) {
  if (unit === "g") {
    return value < 100 ? Math.max(1, Math.round(value)) : roundToFive(value);
  }
  if (unit === "l") {
    return Math.round(value * 10) / 10;
  }
  return value < 15 ? Math.max(0.5, Math.round(value * 2) / 2) : roundToFive(value);
}

// Turns { low, high, unit } into { amountText, unitLabel }.
// Ranges share one unit (picked from the low number): "2–3 cups".
function formatQuantity(quantity, lang) {
  let unit = quantity.unit;
  let low = quantity.low;
  let high = quantity.high;

  if (UNIT_INFO[unit].system === "metric") {
    // Work in g and ml, then switch to liters for big amounts
    if (unit === "kg") { low *= 1000; high = high === null ? null : high * 1000; unit = "g"; }
    if (unit === "l")  { low *= 1000; high = high === null ? null : high * 1000; unit = "ml"; }
    if (unit === "ml" && (high === null ? low : high) >= 1000) {
      low /= 1000; high = high === null ? null : high / 1000; unit = "l";
    }
    const lowText = formatDecimal(roundMetric(low, unit));
    const highText = high === null ? "" : "–" + formatDecimal(roundMetric(high, unit));
    return { amountText: lowText + highText, unitLabel: getUnitLabel(unit, "en", true) };
  }

  // US: switch between tsp / tbsp / cup so the number is easy to measure
  if (TEASPOONS_IN[unit]) {
    const newUnit = pickUsVolumeUnit(low * TEASPOONS_IN[unit]);
    const factor = TEASPOONS_IN[unit] / TEASPOONS_IN[newUnit];
    low *= factor;
    high = high === null ? null : high * factor;
    unit = newUnit;
  }

  const lowRounded = roundToFriendly(low);
  const highRounded = high === null ? null : roundToFriendly(high);
  const largest = highRounded === null ? lowRounded : highRounded;

  return {
    amountText: formatFraction(lowRounded) + (highRounded === null ? "" : "–" + formatFraction(highRounded)),
    unitLabel: getUnitLabel(unit, lang, largest > 1)   // "1 cup" but "2 cups"
  };
}

// The spec'd helper: one value + unit → text, e.g.
//   formatAmount(0.25, "tbsp", "us") → "¾ tsp"
//   formatAmount(266.25, "g", "metric") → "265 g"
// (system is the unit's system; it's here so the call reads clearly)
function formatAmount(value, unit, system) {
  const formatted = formatQuantity({ low: value, high: null, unit: unit }, "en");
  return formatted.amountText + " " + formatted.unitLabel;
}


// ==========================================================================
// 7. Countable items (eggs, bananas, cans)
// --------------------------------------------------------------------------
// You can't measure half a banana with a cup, so these are scaled and
// rounded to the nearest ½, with a note when the result isn't whole.
// ==========================================================================

// [singular, plural] — fixed so "1 large eggs" reads "1 large egg"
const COUNT_NOUNS = [
  ["egg", "eggs"], ["yolk", "yolks"], ["white", "whites"], ["banana", "bananas"],
  ["lemon", "lemons"], ["lime", "limes"], ["orange", "oranges"], ["apple", "apples"],
  ["huevo", "huevos"], ["yema", "yemas"], ["clara", "claras"], ["plátano", "plátanos"]
];

// Changes the LAST countable noun to singular or plural
// ("2 egg whites" → "1 egg white", not "1 eggs white")
function matchNounNumber(text, singular) {
  let lastMatch = null;
  COUNT_NOUNS.forEach(function (pair) {
    const pattern = new RegExp("(^|[^\\p{L}])(" + pair[0] + "|" + pair[1] + ")(?![\\p{L}])", "giu");
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index + match[1].length;
      if (!lastMatch || start > lastMatch.start) {
        lastMatch = { start: start, length: match[2].length, pair: pair };
      }
    }
  });

  if (!lastMatch) {
    return text;
  }
  const replacement = singular ? lastMatch.pair[0] : lastMatch.pair[1];
  return text.slice(0, lastMatch.start) + replacement + text.slice(lastMatch.start + lastMatch.length);
}

function roundToHalf(value) {
  return Math.max(0.5, Math.round(value * 2) / 2);
}

// Half an egg needs a hint. Amounts are rounded to the nearest ½, so:
//   ½ egg  → "(beat 1 egg, use half of it)"
//   1½ eggs → "(beat 2 eggs, use ¾ of it)"       (1.5 ÷ 2 = ¾ exactly)
//   4½ eggs → "(use 4 eggs + half of 1 beaten egg)"
//   (for bigger amounts "beat 5, use 9/10" isn't a fraction anyone can measure)
function getCountNote(value, restText) {
  if (Number.isInteger(value)) {
    return "";
  }
  if (/(^|[^\p{L}])(eggs?|huevos?|yolks?|yemas?)(?![\p{L}])/iu.test(restText)) {
    // Say "yolk" or "white" when that's what the line is about
    let part = "egg";
    if (/yolk|yema/i.test(restText)) {
      part = "yolk";
    } else if (/white|clara/i.test(restText)) {
      part = "white";
    }

    const whole = Math.floor(value);
    if (whole === 0) {
      return "(beat 1 " + part + ", use half of it)";
    }
    if (whole === 1) {
      return "(beat 2 " + part + "s, use ¾ of it)";
    }
    return "(use " + whole + " " + part + "s + half of 1 beaten " + part + ")";
  }
  return "(round to taste)";
}

function formatCountLine(low, high, parsed) {
  const lowRounded = roundToHalf(low);
  const highRounded = high === null ? null : roundToHalf(high);
  const largest = highRounded === null ? lowRounded : highRounded;

  const amountText = formatFraction(lowRounded) + (highRounded === null ? "" : "–" + formatFraction(highRounded));
  const isSingular = largest <= 1;

  let unitLabel = "";
  let rest = parsed.rest;
  if (parsed.unit === "can") {
    unitLabel = getUnitLabel("can", parsed.unitLang, !isSingular);   // "1 lata" / "2 latas"
  } else {
    rest = matchNounNumber(rest, isSingular);                       // "1 large egg"
  }

  const note = getCountNote(lowRounded, rest) || (highRounded === null ? "" : getCountNote(highRounded, rest));
  return { text: joinParts(amountText, unitLabel, rest), note: note, approx: false };
}

function joinParts(amountText, unitLabel, rest) {
  return [amountText, unitLabel, rest].filter(Boolean).join(" ");
}


// ==========================================================================
// 8. displayIngredient — what the pages call for every ingredient line
// --------------------------------------------------------------------------
// settings = { system: "original" | "us" | "metric", scale: 1 }
// Returns { text, note, approx }:
//   text   — the line to show
//   note   — extra hint like "(round to taste)", or ""
//   approx — true when shown as volume because we don't know its weight
// ==========================================================================
function displayIngredient(text, settings) {
  const system = settings.system;
  const scale = settings.scale;
  const unchanged = { text: text, note: "", approx: false };

  // Original + 1× must show exactly what was saved
  if (system === "original" && scale === 1) {
    return unchanged;
  }

  const parsed = parseIngredient(text);
  if (!parsed.parsed) {
    return unchanged;   // "pinch of salt" is the same in every mode
  }

  const unitSystem = parsed.unit ? UNIT_INFO[parsed.unit].system : "none";
  const needsConversion = system !== "original" && unitSystem !== "none" && unitSystem !== system;

  // Already in the system we want, and not scaled: leave the line alone
  if (scale === 1 && !needsConversion) {
    return unchanged;
  }

  const low = parsed.amount * scale;
  const high = parsed.amountMax === null ? null : parsed.amountMax * scale;

  if (unitSystem === "none") {
    return formatCountLine(low, high, parsed);
  }

  let quantity = { low: low, high: high, unit: parsed.unit, approx: false };
  let rest = parsed.rest;
  if (needsConversion) {
    quantity = convertQuantity(quantity, rest, system);
    // "1 cup (226g) butter": drop the old measurement in brackets, it's now shown up front
    rest = rest.replace(/^\([^)]*\d[^)]*\)\s*/, "");
  }

  const formatted = formatQuantity(quantity, parsed.unitLang);
  return {
    text: joinParts(formatted.amountText, formatted.unitLabel, rest),
    note: "",
    approx: quantity.approx
  };
}


// ==========================================================================
// 9. Temperatures in the instructions
// --------------------------------------------------------------------------
// Finds "350°F", "350 °F", "350 degrees F", "350F" (and the same with C).
// Only 2–3 digit numbers count, so "2 c flour" isn't mistaken for 2°C.
// ==========================================================================
const TEMPERATURE_PATTERN = /(\d{2,3})\s*(°|º|degrees?\s*)?\s*([FC])(?![\p{L}])/giu;

// Both directions round to the nearest 5°. We picked 5 (not 25) so the number
// stays as close as possible to what the creator actually used. Most oven
// dials and digital ovens can be set in 5° steps.
function convertTemperatures(text, system) {
  if (system === "original") {
    return text;
  }
  return text.replace(TEMPERATURE_PATTERN, function (whole, number, degreeSign, letter) {
    const value = Number(number);
    const isFahrenheit = letter.toUpperCase() === "F";

    if (system === "metric" && isFahrenheit) {
      return roundToFive((value - 32) * 5 / 9) + "°C";
    }
    if (system === "us" && !isFahrenheit) {
      return roundToFive(value * 9 / 5 + 32) + "°F";
    }
    return whole;   // already in the right system
  });
}


// ==========================================================================
// 10. Servings / yield ("Makes 24 cookies", "Serves 8", "Rinde 12")
// ==========================================================================
// The noun words use [ \t]+ (not \s+) so they can't run onto the next line
const YIELD_PATTERN = /\b(makes|serves|yields?|rinde|servings|porciones)[ \t]*:?[ \t]*(?:about[ \t]+|approx\.?[ \t]+|aprox\.?[ \t]+)?(\d+)(?:[ \t]*(?:-|–|to|a)[ \t]*(\d+))?((?:[ \t]+\p{L}+){0,2})/iu;

// Small words that end the noun: "Makes 24 cookies and..." → "cookies"
const YIELD_STOP_WORDS = ["and", "or", "with", "for", "in", "y", "con", "para"];

// Returns { verb, low, high, noun } or null if the caption doesn't say
function detectYield(caption) {
  const match = (caption || "").match(YIELD_PATTERN);
  if (!match) {
    return null;
  }

  const words = match[4].trim().split(/\s+/).filter(Boolean);
  const nounWords = [];
  for (const word of words) {
    if (YIELD_STOP_WORDS.includes(word.toLowerCase())) {
      break;
    }
    nounWords.push(word);
  }

  return {
    verb: match[1].toLowerCase(),
    low: Number(match[2]),
    high: match[3] ? Number(match[3]) : null,
    noun: nounWords.join(" ")
  };
}

// "Makes 48 cookies" at 2×. Without a yield: "2× recipe" (or "" at 1×).
function describeYield(yieldInfo, scale) {
  if (!yieldInfo) {
    return scale === 1 ? "" : formatScale(scale) + " recipe";
  }

  const low = Math.max(1, Math.round(yieldInfo.low * scale));
  const high = yieldInfo.high === null ? null : Math.max(1, Math.round(yieldInfo.high * scale));
  const count = low + (high === null ? "" : "–" + high);

  // "Servings: 8" and "8 porciones" read better as "16 servings"
  if (yieldInfo.verb === "servings" || yieldInfo.verb === "porciones") {
    return count + " " + yieldInfo.verb;
  }
  // "Yield: 12" → "Yields 24"
  const verbWord = yieldInfo.verb === "yield" ? "yields" : yieldInfo.verb;
  const verb = verbWord.charAt(0).toUpperCase() + verbWord.slice(1);
  return [verb, count, yieldInfo.noun].filter(Boolean).join(" ");
}


// ==========================================================================
// 11. runConversionTests — type runConversionTests() in the DevTools console
// ==========================================================================
function runConversionTests() {
  const tests = [
    { input: "1 cup all-purpose flour", system: "metric", scale: 1, expected: "125 g all-purpose flour" },
    { input: "1 1/4 cups brown sugar", system: "metric", scale: 1, expected: "265 g brown sugar" },
    { input: "1/2 cup butter", system: "metric", scale: 2, expected: "225 g butter" },
    { input: "1 tsp vanilla", system: "metric", scale: 1, expected: "5 ml vanilla" },
    { input: "2 large eggs", system: "original", scale: 0.5, expected: "1 large egg" },
    { input: "3 ripe bananas", system: "original", scale: 0.5, expected: "1½ ripe bananas", expectNote: true },
    { input: "200g sugar", system: "us", scale: 1, expected: "1 cup sugar" },
    { input: "250 ml milk", system: "us", scale: 1, expected: "1 cup milk" },
    { input: "1/3 cup oil", system: "us", scale: 3, expected: "1 cup oil" },
    { input: "1 tbsp sugar", system: "us", scale: 0.25, expected: "¾ tsp sugar" },
    { input: "pinch of salt", system: "metric", scale: 2, expected: "pinch of salt" },
    { input: "2-3 cups chocolate chips", system: "metric", scale: 1, expected: "340–510 g chocolate chips" },
    { input: "Bake at 350°F for 12 minutes", system: "metric", temperature: true, expected: "Bake at 175°C for 12 minutes" },
    // A few extra checks for the trickier parts
    { input: "1½ cups sugar", system: "metric", scale: 1, expected: "300 g sugar" },
    { input: "1 T sugar", system: "metric", scale: 1, expected: "15 ml sugar" },
    { input: "1 t salt", system: "metric", scale: 1, expected: "5 ml salt" },
    { input: "1 stick butter", system: "original", scale: 1.5, expected: "1½ sticks butter" },
    { input: "1 cup pumpkin purée", system: "metric", scale: 1, expected: "235 ml pumpkin purée", expectApprox: true },
    { input: "1 taza de azúcar", system: "original", scale: 2, expected: "2 tazas de azúcar" },
    { input: "1 lata de leche condensada", system: "metric", scale: 2, expected: "2 latas de leche condensada" },
    { input: "100 g chocolate", system: "us", scale: 1, expected: "3½ oz chocolate" },
    { input: "Hornea a 180°C", system: "us", temperature: true, expected: "Hornea a 355°F" },
    { input: "1 cup flour", system: "original", scale: 1, expected: "1 cup flour" }
  ];

  let passed = 0;
  tests.forEach(function (test) {
    let actual;
    let ok;
    if (test.temperature) {
      actual = convertTemperatures(test.input, test.system);
      ok = actual === test.expected;
    } else {
      const result = displayIngredient(test.input, { system: test.system, scale: test.scale });
      actual = result.text + (result.note ? " " + result.note : "") + (result.approx ? " [≈ volume]" : "");
      ok = result.text === test.expected &&
        Boolean(result.note) === Boolean(test.expectNote) &&
        result.approx === Boolean(test.expectApprox);
    }

    if (ok) {
      passed++;
    }
    const label = test.temperature ? test.system : test.system + " " + formatScale(test.scale);
    console.log((ok ? "PASS" : "FAIL") + "  " + test.input + "  [" + label + "]  →  " + actual +
      (ok ? "" : "   (expected: " + test.expected + ")"));
  });

  console.log(passed + " of " + tests.length + " tests passed");
  return passed === tests.length;
}

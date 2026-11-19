// ==========================================================================
// main.js — "Add a Recipe" form on the home page
// --------------------------------------------------------------------------
// Table of contents
// 1. Page elements
// 2. Sample captions (developer helper)
// 3. Instagram link validation
// 4. Cleaning up the caption text
// 5. Recognizing headings, ingredients, and instructions
// 6. parseCaption — the main caption reader
// 7. classifyIngredient — Dry / Wet / Mix-in
// 8. findRecipeLinks — "Full recipe" links
// 9. Showing the recipe card
// 10. Saving to the Recipe Box
// 11. Form handling and event listeners
//
// Uses getRecipes(), saveRecipe(), updateRecipe(), createRecipeId(),
// RECIPE_CATEGORIES, get/saveUnitPreference() from storage.js;
// simplifyText(), detectYield() from convert.js; and renderIngredientGroups(),
// renderInstructionList(), renderRecipeTools(), renderInstagramEmbed(),
// getNextKind() from render.js.
// All three are loaded before this file.
// ==========================================================================


// ==========================================================================
// 1. Page elements
// ==========================================================================
const form = document.getElementById("recipe-form");
const urlInput = document.getElementById("post-url");
const urlError = document.getElementById("post-url-error");
const captionInput = document.getElementById("caption");
const captionError = document.getElementById("caption-error");
const categorySelect = document.getElementById("category");
const trySampleButton = document.getElementById("try-sample");

const previewHeading = document.getElementById("preview-heading");
const previewEmpty = document.getElementById("preview-empty");
const saveStatus = document.getElementById("save-status");
const recipeCard = document.getElementById("recipe-card");
const categoryTag = document.getElementById("recipe-category");
const titleInput = document.getElementById("recipe-title");
const sourceText = document.getElementById("recipe-source");
const recipeLinkButton = document.getElementById("recipe-link");
const recipeLinkLabel = document.getElementById("recipe-link-label");
const bioNote = document.getElementById("bio-note");
const headerInstagramLink = document.getElementById("header-instagram-link");
const postArea = document.getElementById("post-area");
const notFoundMessage = document.getElementById("not-found");
const recipeTools = document.getElementById("recipe-tools");
const recipeBody = document.getElementById("recipe-body");
const ingredientGroups = document.getElementById("ingredient-groups");
const scaleNotice = document.getElementById("scale-notice");
const instructionList = document.getElementById("instruction-list");
const notesSection = document.getElementById("notes-section");
const notesList = document.getElementById("notes-list");
const recipeFooter = document.getElementById("recipe-footer");
const saveButton = document.getElementById("save-button");
const duplicateConfirm = document.getElementById("duplicate-confirm");
const duplicateMessage = document.getElementById("duplicate-message");
const duplicateYes = document.getElementById("duplicate-yes");
const duplicateNo = document.getElementById("duplicate-no");

// The recipe currently shown in the preview card (null when there is none).
// Clicking an ingredient's tag changes this object, and saving reads from it.
let currentRecipe = null;

// The saved recipe that has the same Instagram link (used by "update instead?")
let duplicateRecipe = null;

// How the preview card is displayed: units (remembered site-wide) and
// scale (always starts at 1× for a new recipe). Only changes what's SHOWN.
let displaySettings = { system: getUnitPreference(), scale: 1 };


// ==========================================================================
// 2. Sample captions (developer helper for quick testing)
// ==========================================================================
const SAMPLE_CAPTIONS = [
  `Brown Butter Chocolate Chip Cookies 🍪
Full recipe: https://www.example-bakes.com/recipes/brown-butter-cookies
Ingredients:
• 1 cup unsalted butter, browned
• 1 1/4 cups brown sugar
• 2 large eggs
• 2 1/4 cups flour
• 1 tsp baking soda
• 1/2 tsp salt
• 2 cups chocolate chips
Instructions:
1. Brown the butter and let it cool 10 minutes.
2. Whisk in sugar, then eggs.
3. Fold in dry ingredients and chocolate chips.
4. Chill 30 minutes, then bake at 350°F for 10-12 minutes.
Save this for later! #cookies #baking #brownbutter`,

  `easiest banana bread ever 🍌
3 ripe bananas
1/3 cup melted butter
3/4 cup sugar
1 egg
1 tsp vanilla
1 tsp baking soda
pinch of salt
1 1/2 cups flour
Preheat oven to 350°F and grease a loaf pan.
Mash bananas and mix in butter, sugar, egg and vanilla.
Stir in baking soda, salt and flour.
Bake 55-60 minutes until a toothpick comes out clean.
#bananabread #easybaking`,

  `Strawberry shortcake cups for summer 🍓✨
Recipe is linked in my bio! Follow for more easy desserts 💕
#strawberry #dessert #nobake`,

  `Flan de vainilla 🍮
Ingredientes:
- 1 taza de azúcar
- 4 huevos
- 1 lata de leche condensada
- 1 lata de leche evaporada
- 1 cdta de vainilla
Preparación:
1. Derrite el azúcar hasta hacer caramelo.
2. Licúa el resto de ingredientes.
3. Hornea a baño maría a 350°F por 50 minutos.`,

  `Banana Mochi Dough
3-4 overripe bananas (about 250 to 300 g total peeled weight)
60 g granulated sugar
10 g neutral oil
80 g water
160 g glutinous rice flour
50 g rice flour
Toasted Flour
50 g glutinous rice flour
Instructions
Place the bananas in a large bowl and mash them into a paste.
Add the sugar, oil, and water and mix.
Add the glutinous rice flour and rice flour and combine into a thick batter.
Steam for 25 minutes over medium heat.
Meanwhile, toast the glutinous rice flour in a pan over medium-low heat until it takes on the slightest yellow hue and smells toasty, about 3-5 minutes.
Remove the dough from the steamer and while still hot, knead the mixture with a spoon or spatula until it starts to pull away from the sides of the bowl, about 3-5 minutes.
Heavily dust a work surface with the toasted flour and place the dough onto the flour, covering all surfaces.
Roll the dough out until it is a rectangle with about 0.5 cm (1/4 inch) thickness. Make sure every surface is covered in the toasted flour.
From the long side, roll the dough up until it forms a long log. Cut into your desired shapes.`
];

let lastSampleIndex = -1;

// Fills the caption box with a random sample (never the same one twice in a row)
function fillRandomSample() {
  let index = Math.floor(Math.random() * SAMPLE_CAPTIONS.length);
  if (index === lastSampleIndex) {
    index = (index + 1) % SAMPLE_CAPTIONS.length;
  }
  lastSampleIndex = index;

  captionInput.value = SAMPLE_CAPTIONS[index];
  hideFieldError(captionInput, captionError);
  captionInput.focus();
}


// ==========================================================================
// 3. Instagram link validation
// ==========================================================================

// Matches https://www.instagram.com/ or https://instagram.com/, then p/, reel/
// or reels/, then the post ID. The ID must be followed by "/", "?", "#" or the
// end, and anything after it (like ?igsh=... tracking codes) is ignored.
const INSTAGRAM_PATTERN = /^https:\/\/(?:www\.)?instagram\.com\/(p|reels?)\/([A-Za-z0-9_-]+)(?:[/?#]|$)/i;

// Returns a clean link like "https://www.instagram.com/reel/ABC123/",
// or null if the text isn't an Instagram post/reel link.
function cleanInstagramUrl(rawUrl) {
  const match = rawUrl.trim().match(INSTAGRAM_PATTERN);
  if (!match) {
    return null;
  }
  const postType = match[1].toLowerCase(); // "p", "reel", or "reels"
  const postId = match[2];
  return "https://www.instagram.com/" + postType + "/" + postId + "/";
}


// ==========================================================================
// 4. Cleaning up the caption text
// ==========================================================================

// Turns the caption into a list of tidy lines:
// trimmed, no empty lines, no hashtag lines, no bullets/emoji at the start.
function cleanLines(text) {
  // normalize("NFC") makes accented letters consistent (á typed vs. pasted)
  const rawLines = text.normalize("NFC").split(/\r?\n/);
  const cleaned = [];

  rawLines.forEach(function (rawLine) {
    let line = rawLine.trim();

    // Hashtag lines must be checked before bullets are removed,
    // because removing leading symbols would also remove the "#"
    if (line === "" || isHashtagLine(line)) {
      return;
    }

    line = stripTrailingHashtags(line);
    line = stripLeadingBullets(line);
    line = line.trim();

    if (line !== "") {
      cleaned.push(line);
    }
  });

  return cleaned;
}

// A line is a "hashtag line" if at least half of its words are #tags
function isHashtagLine(line) {
  const words = line.split(/\s+/);
  const tagCount = words.filter(function (word) {
    return word.startsWith("#");
  }).length;
  return tagCount > 0 && tagCount >= words.length / 2;
}

// "Best cookies #baking #yum" → "Best cookies"
function stripTrailingHashtags(line) {
  return line.replace(/(\s*#[\p{L}\p{N}_]+)+\s*$/u, "");
}

// Removes bullets and emoji like •, -, *, ▪️, ✅, 🔸, 👉 from the start of a line.
// It removes every character that isn't a letter, number, opening
// question/exclamation mark (Spanish), quote, or bracket.
// Numbers are kept, so "1/2 cup" and "1. Mix" are safe.
function stripLeadingBullets(line) {
  return line.replace(/^[^\p{L}\p{N}¿¡"'“(]+/u, "");
}

// Removes emoji and spaces from the end of a line (used for the title)
function stripTrailingEmoji(line) {
  return line.replace(/[\s\p{Extended_Pictographic}️‍]+$/u, "");
}

// (simplifyText — lowercase, no accents — lives in convert.js, shared by all pages)


// ==========================================================================
// 5. Recognizing headings, ingredients, and instructions
// ==========================================================================

const INGREDIENT_HEADINGS = [
  "ingredients", "ingredientes", "you'll need", "you will need", "what you need",
  "for the dough", "for the filling", "for the frosting", "for the glaze", "for the crust"
];

const INSTRUCTION_HEADINGS = [
  "instructions", "instrucciones", "directions", "method", "steps",
  "how to make", "preparation", "preparación"
];

// Any short "For the ___:" or Spanish "Para el/la ___:" line is a creator group
// (for example "For the cake:"), not only the ones in the list above.
const GROUP_HEADING_PATTERN = /^(for|para)\s+(the|el|la|los|las)\s+/i;

// Checks if a line is a section heading.
// Returns null if not, otherwise an object like
//   { section: "ingredients", group: "For the frosting" }
//   { section: "instructions", group: "" }
function getHeading(line) {
  const lower = line.toLowerCase().replace(/’/g, "'"); // curly → straight apostrophe
  const endsWithColon = /:\s*\p{Extended_Pictographic}*\s*$/u.test(line);

  // A heading is the keyword alone (plus ":" or emoji), or a short line ending in ":"
  // like "Ingredients (makes 12):"
  function isHeadingLine(keyword) {
    if (!lower.startsWith(keyword)) {
      return false;
    }
    const rest = lower.slice(keyword.length);
    const restHasWords = /[\p{L}\p{N}]/u.test(rest);
    return !restHasWords || (endsWithColon && line.length < 40);
  }

  // Creator groups ("For the frosting:") start a new ingredient group
  if (GROUP_HEADING_PATTERN.test(line) && line.length < 40) {
    const isListedGroup = INGREDIENT_HEADINGS.some(isHeadingLine);
    if (endsWithColon || isListedGroup) {
      return { section: "ingredients", group: cleanGroupName(line) };
    }
  }

  if (INGREDIENT_HEADINGS.some(isHeadingLine)) {
    return { section: "ingredients", group: "" };
  }

  if (INSTRUCTION_HEADINGS.some(isHeadingLine)) {
    return { section: "instructions", group: "" };
  }

  return null;
}

// "For the frosting: 🍰" → "For the frosting"
function cleanGroupName(line) {
  return stripTrailingEmoji(line).replace(/:\s*$/, "").trim();
}

// Step numbers: "1.", "1)", "Step 1", "Paso 1", "1️⃣".
// "1.5 cups" is NOT a step number (the dot is followed by a digit).
const STEP_NUMBER_PATTERN = /^(?:(?:step|paso)\s*\d+\s*[:.)\-–]?|\d+\s*\.(?!\d)|\d+\s*\)|(?:\d️?⃣)+)\s*/i;

function hasStepNumber(line) {
  return STEP_NUMBER_PATTERN.test(line);
}

function removeStepNumber(line) {
  return line.replace(STEP_NUMBER_PATTERN, "").trim();
}

// Starts with a number or fraction: "2", "1/2", "½", "1 1/2", "2-3"
function startsWithQuantity(line) {
  return /^[\d¼½¾⅓⅔⅛⅜⅝⅞]/.test(line);
}

// Has a quantity somewhere, like "Butter, 1 cup". Limited to 1–3 digits
// so years like "2024" in a title don't count.
function hasQuantity(line) {
  return /(?:^|\s)(?:\d{1,3}(?:[.,/]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?=\s|$|[a-z])/i.test(line);
}

// Measurement units (English and Spanish). The unit can't have a letter
// right before or after it, so "g" matches "200 g" and "200g" but not the
// g in "egg". (A digit right before is fine: that's the "200g" case.)
const UNIT_PATTERN = /(?<![\p{L}])(?:cups?|c|tbsps?|tbs|tablespoons?|tsps?|teaspoons?|g|grams?|gramos|kg|ml|l|cm|oz|ounces?|lbs?|pounds?|sticks?|pinch(?:es)?|dash(?:es)?|large|eggs?|tazas?|cdtas?|cdas?|cucharadas?|cucharaditas?|latas?|huevos?)(?![\p{L}])/iu;

// Starts with a unit, like "pinch of salt", "a dash of cinnamon", "large eggs"
const STARTS_WITH_UNIT_PATTERN = new RegExp("^(?:a |an |un |una )?" + UNIT_PATTERN.source, "iu");

function startsWithUnit(line) {
  return STARTS_WITH_UNIT_PATTERN.test(line);
}

// Cooking verbs that usually start an instruction (plus a few Spanish ones).
// "cream" is skipped when followed by "cheese" or "of", since "Cream cheese"
// is an ingredient. (?![\p{L}]) means the whole word must match, so "toast"
// matches "Toast the flour" but not the label "Toasted Flour".
const COOKING_VERB_PATTERN = /^(?:preheat|mix|whisk|stir|combine|fold|beat|cream(?!\s+(?:cheese|of))|add|pour|bake|cool|chill|knead|roll|cut|melt|line|grease|sift|let|place|transfer|top|serve|freeze|refrigerate|mash|heat|cook|bring|boil|simmer|blend|scoop|spread|sprinkle|drizzle|whip|brush|divide|remove|shape|press|dissolve|slice|chop|steam|toast|dust|meanwhile|then|once|in a|precalienta|mezcla|bate|agrega|añade|vierte|hornea|derrite|licúa|deja|refrigera|enfría|incorpora|calienta|sirve)(?![\p{L}])/iu;

function startsWithCookingVerb(line) {
  return COOKING_VERB_PATTERN.test(line);
}

// Mentions a time or temperature: minutes, mins, hour, °F, °C, degrees
function mentionsTimeOrTemp(line) {
  return /\b(?:minutes?|mins?|hours?|hrs?|minutos|horas?|degrees|grados)\b|°/i.test(line);
}

// Calls-to-action that aren't part of the recipe ("follow for more", etc.)
const CALL_TO_ACTION_PATTERN = /(follow (me |us )?for more|follow @|save (this|it)|link(ed)? (is )?in (my |the )?bio|in my bio|tag (a friend|someone)|share (this )?with|comment below|like (and|&) (follow|save)|turn on (post )?notifications|dm me|sígueme|guarda (esta|este))/i;

function isCallToAction(line) {
  return CALL_TO_ACTION_PATTERN.test(line);
}

// Lines that start like a note rather than a step
function isNoteLine(line) {
  return /^(notes?|tips?|recipe (adapted|from)|adapted from|inspired by|credit|nota)\b/i.test(line);
}

// Any web address: http(s)://... or a bare domain like site.com/cookies.
// (?![a-z0-9-]) stops "something.company" from matching as "something.co".
const URL_PATTERN = /https?:\/\/[^\s<>"'()]+|(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|net|org|co|io|me|ly|us|uk|ca|au|blog|recipes|kitchen|bio|ee|ai|store|app|it|to|es|mx)(?![a-z0-9-])(?:\/[^\s<>"'()]*)?/gi;

function containsUrl(line) {
  URL_PATTERN.lastIndex = 0; // reset, because the "g" flag remembers its position
  return URL_PATTERN.test(line);
}

// A short label like "Toasted Flour" or "Banana Mochi Dough" that names a
// group of ingredients, without the "For the..." wording. All must be true:
//   - 5 words or fewer and under 40 characters
//   - no numbers, and doesn't end like a sentence (. ! ?)
//   - isn't a heading, a step, a note, or an ingredient itself
//   - the NEXT line looks like an ingredient
function isGroupLabel(line, nextLine) {
  if (!nextLine) {
    return false;
  }
  const wordCount = line.split(/\s+/).length;
  return wordCount <= 5 &&
    line.length < 40 &&
    !/\d/.test(line) &&
    !/[.!?]\s*$/.test(line) &&
    getHeading(line) === null &&
    !startsWithCookingVerb(line) &&
    !isNoteLine(line) &&
    guessLineType(line) !== "ingredient" &&   // "pinch of salt" is an ingredient
    !couldBeIngredientName(line) &&
    getHeading(nextLine) === null &&
    guessLineType(nextLine) === "ingredient";
}

// An ingredient written without an amount ("Sprinkles", "Flaky salt") looks
// a lot like a group label. The difference: labels are usually written in
// Title Case with 2+ words ("Toasted Flour"), ingredients usually aren't.
// So a line that mentions an ingredient word only counts as a label when
// it's Title Case and at least 2 words long.
function couldBeIngredientName(line) {
  if (findIngredientKind(line) === null) {
    return false;   // no ingredient words at all: "Crust", "Frosting"
  }
  const words = line.split(/\s+/);
  return words.length < 2 || !isTitleCase(words);
}

// Short, Title Case, no numbers, not a sentence: "Brown Butter Chocolate Chip Cookies"
function looksLikeTitle(line) {
  const words = stripTrailingEmoji(line).split(/\s+/);
  return words.length <= 8 && !/\d/.test(line) && !/[.!?]\s*$/.test(line) && isTitleCase(words);
}

// Every word starts with a capital letter, except small words like "of", "and"
function isTitleCase(words) {
  const smallWords = ["of", "and", "the", "for", "with", "de", "con", "y"];
  return words.every(function (word) {
    const firstLetter = word.charAt(0);
    return smallWords.includes(word.toLowerCase()) || firstLetter !== firstLetter.toLowerCase();
  });
}

// Guesses what one line is, on its own.
// Returns "ingredient", "instruction", or "other".
// The order matters: step numbers are checked before quantities,
// otherwise "1. Mix the flour" would look like "1 cup flour".
function guessLineType(line) {
  // "Makes 24 cookies" / "Serves 8" has a number but isn't an ingredient
  if (/^(makes|serves|yields?|rinde|servings|porciones)(?![\p{L}])/iu.test(line)) {
    return "other";
  }
  if (hasStepNumber(line)) {
    return "instruction";
  }
  if (startsWithQuantity(line)) {
    return "ingredient";
  }
  if (startsWithCookingVerb(line)) {
    return "instruction";
  }

  const timeOrTemp = mentionsTimeOrTemp(line);

  if (line.length > 60 && timeOrTemp) {
    return "instruction";
  }
  // Short lines that start with a unit ("pinch of salt") or have a quantity
  // ("Butter, 1 cup"). A unit word alone isn't enough: a title like
  // "Strawberry shortcake cups" mentions "cups" but isn't an ingredient.
  // Skip lines with a time/temperature, like "Oven at 180°C".
  if (line.length <= 60 && !timeOrTemp && (startsWithUnit(line) || hasQuantity(line))) {
    return "ingredient";
  }
  return "other";
}


// ==========================================================================
// 6. parseCaption — reads the caption and sorts every line
// ==========================================================================

// Returns { title, ingredients, instructions, recipeLinks, notes, mentionsLinkInBio }
// ingredients contains plain strings plus group labels like
// { type: "group", text: "For the frosting" }.
//
// Headings and line-by-line guessing work TOGETHER:
//   - after an ingredients heading → ingredients (unless a line is clearly a step)
//   - after an instructions heading → instructions
//   - anywhere else (before the first heading, or no headings at all)
//     → each line is guessed on its own (Step C)
// So with only an "Instructions" heading, the lines above it are still
// recognized as ingredients. Notes are the last resort.
function parseCaption(text) {
  // Links are collected separately by findRecipeLinks(), and calls-to-action
  // ("Save this for later!") are dropped, so neither can confuse the
  // "what's on the next line?" check for group labels
  const lines = cleanLines(text).filter(function (line) {
    return !containsUrl(line) && !isCallToAction(line);
  });

  const ingredients = [];
  const instructions = [];
  const leftovers = []; // becomes the title (if needed) + notes

  let section = null;            // null, "ingredients", or "instructions"
  let stepsAreNumbered = false;  // true once a numbered step is seen
  let firstLineIsGroup = false;  // e.g. "Banana Mochi Dough" above its ingredients

  lines.forEach(function (line, index) {
    // Step B: headings mark sections
    const heading = getHeading(line);
    if (heading) {
      section = heading.section;
      if (heading.group) {
        ingredients.push({ type: "group", text: heading.group });
      }
      return;
    }

    // Short labels like "Toasted Flour" start a new ingredient group
    // (but never inside the instructions)
    if (section !== "instructions" && isGroupLabel(line, lines[index + 1])) {
      ingredients.push({ type: "group", text: cleanGroupName(line) });
      if (index === 0) {
        firstLineIsGroup = true;
      }
      return;
    }

    // A Title Case first line is the title, even if it starts with a cooking
    // verb ("Sprinkle Cookies", "Cut-Out Sugar Cookies")
    if (index === 0 && section === null && looksLikeTitle(line)) {
      leftovers.push(line);
      return;
    }

    if (section === null) {
      // Step C: not inside a known section, so guess this line on its own
      const type = guessLineType(line);
      if (type === "ingredient") {
        ingredients.push(line);
      } else if (type === "instruction") {
        addInstruction(line);
      } else {
        leftovers.push(line);   // Step D: title or notes, the last resort
      }
    } else if (section === "ingredients") {
      // A numbered step, or a line that reads like a step and has no amount
      // ("Bake 10 minutes."), means the creator moved on to instructions
      // without writing an "Instructions:" heading
      const readsLikeStep = !startsWithQuantity(line) && guessLineType(line) === "instruction";
      if (hasStepNumber(line) || readsLikeStep) {
        addInstruction(line);
      } else {
        ingredients.push(line);
      }
    } else if (section === "instructions") {
      // In a numbered list, an un-numbered line that doesn't read like a step
      // is probably a note ("Recipe adapted from...")
      const looksLikeNote = isNoteLine(line) ||
        (stepsAreNumbered && !hasStepNumber(line) && guessLineType(line) !== "instruction");
      if (looksLikeNote) {
        leftovers.push(line);
      } else {
        addInstruction(line);
      }
    }
  });

  // Saves an instruction without its step number (the card numbers them itself)
  function addInstruction(line) {
    if (hasStepNumber(line)) {
      stepsAreNumbered = true;
    }
    const step = removeStepNumber(line);
    if (step !== "") {
      instructions.push(step);
    }
  }

  // Step D: the title. If the very first line was a group label
  // ("Banana Mochi Dough"), it's the title too. Otherwise the first leftover
  // line is the title. Whatever is left over after that becomes notes.
  let title = "Untitled Recipe";
  if (firstLineIsGroup) {
    title = makeTitle(ingredients[0].text);
  } else if (leftovers.length > 0) {
    title = makeTitle(leftovers.shift());
  }

  removeLoneTitleGroup(ingredients, title);

  return {
    title: title,
    ingredients: ingredients,
    instructions: instructions,
    recipeLinks: findRecipeLinks(text),
    notes: leftovers,
    mentionsLinkInBio: mentionsLinkInBio(text)
  };
}

// If the ONLY group is the title itself (e.g. "easiest banana bread ever"
// above a plain ingredient list), a bold heading repeating the title adds
// nothing, so remove it. With two or more groups (like Sample 5), keep them.
function removeLoneTitleGroup(ingredients, title) {
  const groups = ingredients.filter(function (item) {
    return typeof item === "object";
  });
  const onlyGroup = groups.length === 1 ? groups[0] : null;
  if (onlyGroup && ingredients[0] === onlyGroup && makeTitle(onlyGroup.text) === title) {
    ingredients.shift();
  }
}

// Tidies a line into a title: no trailing emoji, at most 80 characters
function makeTitle(line) {
  let title = stripTrailingEmoji(line);
  if (title.length > 80) {
    title = title.slice(0, 79).trim() + "…";
  }
  return title || "Untitled Recipe";
}

// True if the caption says the recipe/link is in the creator's bio
function mentionsLinkInBio(text) {
  return /(link(ed)?\s+(is\s+)?in\s+(my\s+|the\s+)?bio|in\s+my\s+bio|recipe\s+(is\s+)?in\s+(my\s+|the\s+)?bio|en\s+mi\s+bio)/i.test(text);
}


// ==========================================================================
// 7. classifyIngredient — Dry / Wet / Mix-ins & Toppings
// ==========================================================================

// Keyword lists, checked in this order: mix-ins → wet → dry.
// Plurals are handled automatically (egg → eggs, banana → bananas).
const MIXIN_KEYWORDS = [
  "chocolate chips", "chips", "chunks", "nuts", "walnuts", "pecans", "almonds",
  "sprinkles", "raisins", "dried fruit", "coconut flakes", "berries", "blueberries",
  "strawberries", "toffee", "candy", "marshmallows", "zest", "chispas de chocolate", "nueces"
];

const WET_KEYWORDS = [
  "butter", "oil", "neutral oil", "egg", "egg yolk", "egg white", "milk", "buttermilk", "cream",
  "heavy cream", "sour cream", "yogurt", "cream cheese", "water", "vanilla", "extract",
  "honey", "maple syrup", "syrup", "molasses", "juice", "coffee", "condensed milk",
  "evaporated milk", "mashed banana", "banana", "applesauce", "pumpkin purée", "melted",
  "leche", "huevo", "mantequilla", "aceite", "vainilla", "jugo"
];

const DRY_KEYWORDS = [
  "flour", "sugar", "brown sugar", "powdered sugar", "cocoa", "baking soda",
  "baking powder", "salt", "yeast", "cornstarch", "cinnamon", "nutmeg", "spice", "oats",
  "cornmeal", "ground almonds", "almond flour", "espresso powder", "gelatin", "harina",
  "azúcar", "sal", "polvo de hornear", "canela",
  "glutinous rice flour", "rice flour", "mochiko", "tapioca starch"
];

// Builds one search pattern per list. Each keyword must be a whole word
// (so "oil" doesn't match "boil"), with an optional plural "s" or "es".
// Accents are removed from the keywords and the line before comparing.
function buildKeywordPattern(keywords) {
  const escaped = keywords.map(function (keyword) {
    return simplifyText(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp("(?:^|[^\\p{L}])(?:" + escaped.join("|") + ")(?:s|es)?(?![\\p{L}])", "u");
}

const MIXIN_PATTERN = buildKeywordPattern(MIXIN_KEYWORDS);
const WET_PATTERN = buildKeywordPattern(WET_KEYWORDS);
const DRY_PATTERN = buildKeywordPattern(DRY_KEYWORDS);
const MELTED_PATTERN = buildKeywordPattern(["melted"]);

// Returns "dry", "wet", "mixin", or null if no keyword matched
function findIngredientKind(line) {
  const text = simplifyText(line);

  // "melted" always means wet, even for "1/2 cup melted chocolate chips"
  if (MELTED_PATTERN.test(text)) {
    return "wet";
  }
  // Mix-ins first, so "chocolate chips" isn't caught by a dry word.
  // Wet before dry, so "buttermilk" isn't caught by a dry word.
  if (MIXIN_PATTERN.test(text)) {
    return "mixin";
  }
  if (WET_PATTERN.test(text)) {
    return "wet";
  }
  if (DRY_PATTERN.test(text)) {
    return "dry";
  }
  return null;
}

// Returns "dry", "wet", or "mixin". Unknown ingredients default to "dry".
function classifyIngredient(line) {
  return findIngredientKind(line) || "dry";
}

// Turns parseCaption's ingredient list (strings + group labels) into the
// objects we save: { text, kind, group, guessed }
function buildIngredientObjects(parsedIngredients) {
  const result = [];
  let currentGroup = "";

  parsedIngredients.forEach(function (item) {
    if (typeof item === "object" && item.type === "group") {
      currentGroup = item.text;
      return;
    }
    result.push({
      text: item,
      kind: classifyIngredient(item),
      group: currentGroup,
      guessed: findIngredientKind(item) === null // no keyword matched
    });
  });

  return result;
}


// ==========================================================================
// 8. findRecipeLinks — finds "Full recipe" links in the caption
// ==========================================================================

// Links that are never the recipe itself
const IGNORED_DOMAINS = [
  "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "facebook.com",
  "pinterest.com", "pin.it", "amzn.to", "liketk.it", "shopmy.us", "ltk.app"
];

// "Link in bio" services: a menu of links, not the recipe
const LINK_PAGE_DOMAINS = ["linktr.ee", "beacons.ai", "stan.store", "linkin.bio"];

// True if hostname is the domain or one of its subdomains (www.tiktok.com)
function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith("." + domain);
}

// Returns a list like [{ url, label }] with the best link first.
// label is "Full recipe" or "Creator's link page".
function findRecipeLinks(text) {
  const found = [];

  // Go line by line so we can look at the words around each link
  text.split(/\r?\n/).forEach(function (line) {
    const lineWords = line.toLowerCase();
    URL_PATTERN.lastIndex = 0;
    let match;

    while ((match = URL_PATTERN.exec(line)) !== null) {
      // Skip email addresses (the part after the @)
      if (match.index > 0 && line[match.index - 1] === "@") {
        continue;
      }

      const url = normalizeUrl(match[0]);
      if (!url) {
        continue;
      }

      const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      const isIgnored = hostname.includes("amazon.") || IGNORED_DOMAINS.some(function (domain) {
        return matchesDomain(hostname, domain);
      });
      if (isIgnored) {
        continue;
      }

      const isLinkPage = LINK_PAGE_DOMAINS.some(function (domain) {
        return matchesDomain(hostname, domain);
      });

      // Score: 2 = clearly a recipe, 1 = some other website, 0 = link page
      let score = 1;
      if (isLinkPage) {
        score = 0;
      } else if (/recipe|printable|receta/.test(lineWords) || /\/recipe/i.test(url)) {
        score = 2;
      }

      const alreadyFound = found.some(function (link) {
        return link.url === url;
      });
      if (!alreadyFound) {
        found.push({
          url: url,
          label: isLinkPage ? "Creator's link page" : "Full recipe",
          score: score
        });
      }
    }
  });

  // Highest score first (sort keeps the original order for equal scores)
  found.sort(function (a, b) {
    return b.score - a.score;
  });

  return found.map(function (link) {
    return { url: link.url, label: link.label };
  });
}

// Removes trailing punctuation and adds https:// to bare links.
// Returns null if the result still isn't a valid web address.
function normalizeUrl(rawUrl) {
  let url = rawUrl.replace(/[.,!?;:\]]+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    return new URL(url).href;
  } catch (error) {
    return null;
  }
}


// ==========================================================================
// 9. Showing the recipe card
// ==========================================================================
// Everything is built with createElement + textContent (never innerHTML),
// so text pasted from a caption can't inject HTML into the page.
// The ingredient boxes are drawn by renderIngredientGroups() in render.js.

// Fills the preview card with a recipe
function showRecipe(recipe) {
  previewEmpty.hidden = true;
  hideSaveStatus();
  hideDuplicateConfirm();

  categoryTag.textContent = recipe.category;
  titleInput.value = recipe.title;
  sourceText.textContent = recipe.instagramUrl ? "From an Instagram post" : "From a pasted caption";

  // "Full recipe →" button: first good link, hidden if there isn't one
  const bestLink = recipe.recipeLinks[0];
  if (bestLink) {
    recipeLinkButton.href = bestLink.url;
    recipeLinkLabel.textContent = bestLink.label;
    recipeLinkButton.hidden = false;
  } else {
    recipeLinkButton.hidden = true;
  }

  // "Recipe in bio" note: only when there is no real link to show
  bioNote.hidden = !(recipe.mentionsLinkInBio && !bestLink);

  // Instagram post (click to load) beside the ingredients. render.js hides
  // the area when there's no valid link. The extra class switches the body
  // to the "post | ingredients" layout.
  const hasPost = renderInstagramEmbed(postArea, recipe.instagramUrl, recipe.title);
  recipeBody.classList.toggle("recipe-body--with-post", hasPost);

  // Nothing found: show the friendly message instead of empty lists
  const foundNothing = recipe.ingredients.length === 0 && recipe.instructions.length === 0;
  notFoundMessage.hidden = !foundNothing;
  recipeTools.hidden = foundNothing;
  recipeBody.hidden = foundNothing;
  recipeFooter.hidden = foundNothing;

  // When nothing was found the body (and the post) is hidden, so show a plain
  // "View on Instagram" link up top instead, next to the "recipe in bio" note
  headerInstagramLink.hidden = !(foundNothing && recipe.instagramUrl);
  headerInstagramLink.href = recipe.instagramUrl || "#";

  // Units / Servings dropdowns (render.js). A new recipe starts at 1×,
  // but keeps the unit system the user picked last time.
  displaySettings = { system: getUnitPreference(), scale: 1 };
  renderRecipeTools(recipeTools, {
    idPrefix: "preview",
    yieldInfo: detectYield(recipe.originalCaption),
    settings: displaySettings,
    onChange: handleDisplayChange
  });

  renderIngredients();
  renderInstructions();
  renderNotes(recipe.notes);

  recipeCard.hidden = false;
  fitTitleHeight(); // must run after the card is visible, or the height is 0
}

// Grows the title box so long titles wrap onto more lines instead of being cut off
function fitTitleHeight() {
  titleInput.style.height = "auto";
  titleInput.style.height = titleInput.scrollHeight + "px";
}

// Draws the Dry / Wet / Mix-in boxes with clickable tags (code in render.js),
// converted and scaled for display
function renderIngredients() {
  renderIngredientGroups(ingredientGroups, currentRecipe.ingredients, {
    clickableTags: true,
    settings: displaySettings
  });
}

// Numbered steps (temperatures converted in Metric/US) + the scaled notice
function renderInstructions() {
  renderInstructionList(instructionList, currentRecipe.instructions, displaySettings.system);
  updateScaleNotice(scaleNotice, displaySettings.scale);
}

// Units or Servings dropdown changed: remember the units, redraw the lists
function handleDisplayChange(newSettings) {
  displaySettings = newSettings;
  saveUnitPreference(newSettings.system);
  renderIngredients();
  renderInstructions();
}

// Moves an ingredient to the next type: Dry → Wet → Mix-in → Dry
function cycleIngredientKind(index) {
  const ingredient = currentRecipe.ingredients[index];
  ingredient.kind = getNextKind(ingredient.kind);
  ingredient.guessed = false; // the user decided, so it's no longer a guess

  renderIngredients();

  // The old button was replaced, so put keyboard focus on the new one
  const movedTag = ingredientGroups.querySelector('[data-index="' + index + '"]');
  if (movedTag) {
    movedTag.focus();
  }
}

function renderNotes(notes) {
  notesList.replaceChildren();
  notes.forEach(function (note) {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.appendChild(item);
  });
  notesSection.hidden = notes.length === 0;
}


// ==========================================================================
// 10. Saving to the Recipe Box
// ==========================================================================

// Builds the object that gets stored (only the fields we want to keep)
function buildRecipeToSave() {
  return {
    id: createRecipeId(),
    // Collapse pasted line breaks/extra spaces into single spaces
    title: titleInput.value.replace(/\s+/g, " ").trim() || "Untitled Recipe",
    category: currentRecipe.category,
    instagramUrl: currentRecipe.instagramUrl,
    recipeLink: currentRecipe.recipeLinks.length > 0 ? currentRecipe.recipeLinks[0].url : "",
    ingredients: currentRecipe.ingredients.map(function (ingredient) {
      return {
        text: ingredient.text,
        kind: ingredient.kind,
        group: ingredient.group,
        guessed: ingredient.guessed
      };
    }),
    instructions: currentRecipe.instructions.slice(),
    notes: currentRecipe.notes.slice(),
    originalCaption: currentRecipe.originalCaption,
    dateSaved: new Date().toISOString(),
    favorite: false
  };
}

function handleSaveClick() {
  if (!currentRecipe) {
    return;
  }

  // Same Instagram post already saved? Ask before making a second copy.
  if (currentRecipe.instagramUrl) {
    duplicateRecipe = getRecipes().find(function (saved) {
      return saved.instagramUrl === currentRecipe.instagramUrl;
    }) || null;

    if (duplicateRecipe) {
      showDuplicateConfirm();
      return;
    }
  }

  const recipe = buildRecipeToSave();
  finishSaving(saveRecipe(recipe), recipe.id);
}

// "Yes, update it": replace the old recipe but keep its id, date, and favorite
function handleUpdateExisting() {
  const recipe = buildRecipeToSave();
  recipe.id = duplicateRecipe.id;
  recipe.dateSaved = duplicateRecipe.dateSaved;
  recipe.favorite = duplicateRecipe.favorite;

  hideDuplicateConfirm();
  finishSaving(updateRecipe(recipe), recipe.id);
}

function showDuplicateConfirm() {
  duplicateMessage.textContent =
    "You already saved this post as “" + duplicateRecipe.title + "”. Update it instead?";
  saveButton.hidden = true;
  duplicateConfirm.hidden = false;
  duplicateYes.focus();
}

function hideDuplicateConfirm() {
  duplicateConfirm.hidden = true;
  saveButton.hidden = false;
  duplicateRecipe = null;
}

// Shows success (and clears everything) or an error if storage failed.
// recipeId is used to link straight to the saved recipe in the Recipe Box.
function finishSaving(didSave, recipeId) {
  if (!didSave) {
    showSaveStatus("error",
      "Sorry, this recipe couldn't be saved. Your browser's storage may be full or turned off.");
    return;
  }

  // Clear the form and the card so the next recipe starts fresh
  form.reset();
  currentRecipe = null;
  recipeCard.hidden = true;

  showSaveStatus("success", "Saved to your Recipe Box! ");
  const boxLink = document.createElement("a");
  // "#recipe-<id>" makes the Recipe Box open this recipe straight away
  boxLink.href = "recipes.html#recipe-" + recipeId;
  boxLink.textContent = "View it in My Recipe Box →";
  saveStatus.appendChild(boxLink);

  previewHeading.focus();
}

function showSaveStatus(type, message) {
  saveStatus.className = "status-message status-message--" + type;
  saveStatus.textContent = message;
  saveStatus.hidden = false;
}

function hideSaveStatus() {
  saveStatus.hidden = true;
  saveStatus.textContent = "";
}


// ==========================================================================
// 11. Form handling and event listeners
// ==========================================================================

// Fills the category dropdown from the shared list in storage.js
function fillCategoryDropdown() {
  RECIPE_CATEGORIES.forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

fillCategoryDropdown();

function showFieldError(field, errorElement, message) {
  errorElement.textContent = message;
  errorElement.hidden = false;
  field.setAttribute("aria-invalid", "true"); // screen readers announce "invalid"
}

function hideFieldError(field, errorElement) {
  errorElement.textContent = "";
  errorElement.hidden = true;
  field.removeAttribute("aria-invalid");
}

// Runs when "Extract Recipe" is clicked
function handleExtract(event) {
  event.preventDefault(); // stop the page from reloading

  hideFieldError(urlInput, urlError);
  hideFieldError(captionInput, captionError);

  // --- Check the inputs ---
  const rawUrl = urlInput.value.trim();
  const caption = captionInput.value.trim();
  let instagramUrl = "";
  let firstInvalidField = null;

  if (rawUrl !== "") {
    instagramUrl = cleanInstagramUrl(rawUrl);
    if (!instagramUrl) {
      showFieldError(urlInput, urlError,
        "That doesn't look like an Instagram post or reel link. It should look like " +
        "https://www.instagram.com/reel/ABC123/ — or leave this box empty.");
      firstInvalidField = urlInput;
    }
  }

  if (caption === "") {
    showFieldError(captionInput, captionError,
      "Please paste the caption so we have something to turn into a recipe.");
    firstInvalidField = firstInvalidField || captionInput;
  }

  if (firstInvalidField) {
    firstInvalidField.focus();
    return;
  }

  // Show the cleaned link, so the user sees what will be saved
  if (instagramUrl) {
    urlInput.value = instagramUrl;
  }

  // --- Read the caption and show the card ---
  const parsed = parseCaption(caption);

  currentRecipe = {
    title: parsed.title,
    category: categorySelect.value,
    instagramUrl: instagramUrl,
    recipeLinks: parsed.recipeLinks,
    mentionsLinkInBio: parsed.mentionsLinkInBio,
    ingredients: buildIngredientObjects(parsed.ingredients),
    instructions: parsed.instructions,
    notes: parsed.notes,
    originalCaption: captionInput.value
  };

  showRecipe(currentRecipe);
  previewHeading.focus(); // also scrolls the card into view
}

form.addEventListener("submit", handleExtract);
trySampleButton.addEventListener("click", fillRandomSample);
saveButton.addEventListener("click", handleSaveClick);
duplicateYes.addEventListener("click", handleUpdateExisting);
duplicateNo.addEventListener("click", function () {
  hideDuplicateConfirm();
  saveButton.focus();
});

// Clicking an ingredient's tag. One listener on the container handles every
// tag, even the ones created later ("event delegation").
ingredientGroups.addEventListener("click", function (event) {
  const tag = event.target.closest(".kind-tag");
  if (tag) {
    cycleIngredientKind(Number(tag.dataset.index));
  }
});

// Changing the category after extracting updates the card's tag too
categorySelect.addEventListener("change", function () {
  if (currentRecipe) {
    currentRecipe.category = categorySelect.value;
    categoryTag.textContent = categorySelect.value;
  }
});

// Title box: grow while typing, and don't allow line breaks in a title
titleInput.addEventListener("input", fitTitleHeight);
titleInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
  }
});
window.addEventListener("resize", function () {
  if (currentRecipe) {
    fitTitleHeight();
  }
});

// Hide an error as soon as the user starts fixing that field
urlInput.addEventListener("input", function () {
  hideFieldError(urlInput, urlError);
});
captionInput.addEventListener("input", function () {
  hideFieldError(captionInput, captionError);
});

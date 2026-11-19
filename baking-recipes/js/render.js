// ==========================================================================
// render.js — Drawing ingredient lists (shared by every page)
// --------------------------------------------------------------------------
// The home page preview card and the Recipe Box detail view both show
// ingredients the same way:
//
//   For the frosting          ← creator group (only if the caption had one)
//     🌾 Dry (2)              ← one coloured box per type, empty ones hidden
//       • 2 cups powdered sugar  [DRY]
//     💧 Wet (1)
//       • 1/2 cup butter         [WET]
//
// Keeping that code here means the two pages can't drift apart.
// Everything is built with createElement + textContent (never innerHTML),
// so saved or pasted text can't inject HTML into the page.
//
// Also here: the Units / Servings controls, the instruction list, and the
// Instagram post embed, which both pages show the same way.
// The math lives in convert.js (loaded first).
// ==========================================================================

// The three types, in the order they're shown
const KIND_ORDER = ["dry", "wet", "mixin"];

const KIND_INFO = {
  dry:   { emoji: "🌾", heading: "Dry",                tag: "Dry" },
  wet:   { emoji: "💧", heading: "Wet",                tag: "Wet" },
  mixin: { emoji: "🍫", heading: "Mix-ins & Toppings", tag: "Mix-in" }
};

// Dry → Wet → Mix-in → Dry (used when a tag is clicked)
function getNextKind(kind) {
  const position = KIND_ORDER.indexOf(kind);
  return KIND_ORDER[(position + 1) % KIND_ORDER.length];
}

// Draws all ingredients into `container`, replacing what was there.
// options.clickableTags: true  → tags are buttons (the page handles the clicks)
//                        false → tags are plain labels
// options.settings: { system, scale } for converting/scaling what's SHOWN
//                   (the ingredient text itself is never changed)
function renderIngredientGroups(container, ingredients, options) {
  const clickableTags = Boolean(options && options.clickableTags);
  const settings = (options && options.settings) || { system: "original", scale: 1 };
  container.replaceChildren();

  // Group names in the order they first appear ("" = no creator group)
  const groupNames = [];
  ingredients.forEach(function (ingredient) {
    if (!groupNames.includes(ingredient.group)) {
      groupNames.push(ingredient.group);
    }
  });

  groupNames.forEach(function (groupName) {
    const groupWrapper = document.createElement("div");
    groupWrapper.className = "ingredient-group";

    if (groupName) {
      const groupHeading = document.createElement("h5");
      groupHeading.className = "ingredient-group-title";
      groupHeading.textContent = groupName;
      groupWrapper.appendChild(groupHeading);
    }

    KIND_ORDER.forEach(function (kind) {
      // Remember each ingredient's position so its tag knows which one to change
      const indexes = [];
      ingredients.forEach(function (ingredient, index) {
        if (ingredient.group === groupName && ingredient.kind === kind) {
          indexes.push(index);
        }
      });

      if (indexes.length === 0) {
        return; // hide empty sub-sections
      }
      groupWrapper.appendChild(createKindSection(ingredients, kind, indexes, clickableTags, settings));
    });

    container.appendChild(groupWrapper);
  });
}

// One coloured box, e.g. "🌾 Dry (4)" with its bulleted list
function createKindSection(ingredients, kind, indexes, clickableTags, settings) {
  const info = KIND_INFO[kind];

  const section = document.createElement("div");
  section.className = "kind-section kind-section--" + kind;

  const heading = document.createElement("h6");
  heading.className = "kind-heading";
  const emoji = document.createElement("span");
  emoji.setAttribute("aria-hidden", "true");
  emoji.textContent = info.emoji + " ";
  heading.appendChild(emoji);
  heading.appendChild(document.createTextNode(info.heading + " (" + indexes.length + ")"));
  section.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "kind-list";
  indexes.forEach(function (index) {
    const item = document.createElement("li");
    // Converted/scaled version of the line, e.g. "265 g brown sugar"
    const display = displayIngredient(ingredients[index].text, settings);

    const text = document.createElement("span");
    text.textContent = display.text;
    item.appendChild(text);

    // "≈ volume": shown in ml because we don't know what a cup of it weighs
    if (display.approx) {
      const approx = document.createElement("span");
      approx.className = "approx-tag";
      approx.title = "Converted by volume, not weight";
      approx.textContent = "≈ volume";
      item.appendChild(document.createTextNode(" "));
      item.appendChild(approx);
    }

    // Hint for countable items, e.g. "(beat 2 eggs, use ¾ of it)"
    if (display.note) {
      const note = document.createElement("span");
      note.className = "ingredient-note";
      note.textContent = " " + display.note;
      item.appendChild(note);
    }

    item.appendChild(document.createTextNode(" "));
    item.appendChild(createKindTag(ingredients[index], index, clickableTags));
    list.appendChild(item);
  });
  section.appendChild(list);

  return section;
}

// The small "Dry / Wet / Mix-in" tag. A button when it can be clicked,
// otherwise a plain label. data-index tells the page which ingredient it is.
function createKindTag(ingredient, index, clickable) {
  const tag = document.createElement(clickable ? "button" : "span");
  if (clickable) {
    tag.type = "button";
  }
  tag.className = "kind-tag kind-tag--" + ingredient.kind;
  tag.dataset.index = index;
  tag.textContent = KIND_INFO[ingredient.kind].tag;

  let description = "Type: " + KIND_INFO[ingredient.kind].tag;
  if (ingredient.guessed) {
    // Small "?" means none of our keywords matched, so we guessed
    const guessMark = document.createElement("span");
    guessMark.className = "guess-mark";
    guessMark.setAttribute("aria-hidden", "true");
    guessMark.textContent = "?";
    tag.appendChild(guessMark);
    description += " (guessed)";
  }

  if (clickable) {
    tag.title = ingredient.guessed ? "We guessed this one. Click to change." : "Click to change type";
    tag.setAttribute("aria-label", description + ". Click to change.");
  } else {
    tag.title = ingredient.guessed ? "We guessed this one" : "";
  }
  return tag;
}


// ==========================================================================
// Instructions (numbered list) and the "scaled recipe" notice
// ==========================================================================

// Fills an <ol> with the steps. Only temperatures are converted
// ("350°F" → "175°C" in Metric); other numbers in sentences are left alone.
function renderInstructionList(list, instructions, system) {
  list.replaceChildren();
  instructions.forEach(function (step) {
    const item = document.createElement("li");
    item.textContent = convertTemperatures(step, system);
    list.appendChild(item);
  });
}

const SCALE_NOTICE_TEXT = "Scaled recipe: pan size and bake time may need to change. Check for doneness early.";

// Shows the notice only when the recipe isn't at 1×
function updateScaleNotice(notice, scale) {
  notice.textContent = SCALE_NOTICE_TEXT;
  notice.hidden = scale === 1;
}


// ==========================================================================
// Units / Servings controls
// --------------------------------------------------------------------------
// Builds the two dropdowns inside `container`. Every change calls
// options.onChange({ system, scale }) so the page can redraw its lists.
//
// options = {
//   idPrefix:  makes the ids unique, e.g. "preview" → "preview-units"
//   yieldInfo: from detectYield(), or null
//   settings:  starting { system, scale }
//   onChange:  function to call with the new settings
// }
// ==========================================================================
const UNIT_OPTIONS = [["original", "Original"], ["us", "US"], ["metric", "Metric"]];
const SCALE_OPTIONS = [["0.5", "½×"], ["1", "1×"], ["2", "2×"], ["3", "3×"], ["custom", "Custom…"]];
const MIN_SCALE = 0.25;
const MAX_SCALE = 10;

function renderRecipeTools(container, options) {
  const settings = { system: options.settings.system, scale: options.settings.scale };
  const prefix = options.idPrefix;
  container.replaceChildren();

  // --- Units ---
  const unitsSelect = createSelect(prefix + "-units", UNIT_OPTIONS, settings.system);
  container.appendChild(createToolField("Units", unitsSelect));

  // --- Servings (scale) + the Custom… number box ---
  const scaleSelect = createSelect(prefix + "-scale", SCALE_OPTIONS, String(settings.scale));
  const scaleField = createToolField("Servings", scaleSelect);

  const customLabel = document.createElement("label");
  customLabel.className = "custom-scale";
  customLabel.hidden = true;
  const customInput = document.createElement("input");
  customInput.type = "number";
  customInput.id = prefix + "-custom-scale";
  customInput.min = MIN_SCALE;
  customInput.max = MAX_SCALE;
  customInput.step = "0.25";
  customInput.value = "1.5";
  customInput.setAttribute("aria-describedby", prefix + "-scale-error");
  customLabel.appendChild(customInput);
  const times = document.createElement("span");
  times.textContent = "×";
  times.setAttribute("aria-hidden", "true");
  customLabel.appendChild(times);
  const customName = document.createElement("span");
  customName.className = "visually-hidden";
  customName.textContent = "Custom scale, from 0.25 to 10";
  customLabel.appendChild(customName);
  scaleField.appendChild(customLabel);
  container.appendChild(scaleField);

  // --- "Makes 48 cookies" / "2× recipe" ---
  const yieldText = document.createElement("p");
  yieldText.className = "yield-text";
  yieldText.setAttribute("aria-live", "polite");
  container.appendChild(yieldText);

  // --- Error for a bad custom number ---
  const error = document.createElement("p");
  error.className = "tool-error";
  error.id = prefix + "-scale-error";
  error.hidden = true;
  error.textContent = "Enter a number from " + MIN_SCALE + " to " + MAX_SCALE + ".";
  container.appendChild(error);

  function notify() {
    yieldText.textContent = describeYield(options.yieldInfo, settings.scale);
    yieldText.hidden = yieldText.textContent === "";
    options.onChange({ system: settings.system, scale: settings.scale });
  }

  unitsSelect.addEventListener("change", function () {
    settings.system = unitsSelect.value;
    notify();
  });

  scaleSelect.addEventListener("change", function () {
    const isCustom = scaleSelect.value === "custom";
    customLabel.hidden = !isCustom;
    error.hidden = true;
    customInput.removeAttribute("aria-invalid");

    if (isCustom) {
      customInput.focus();
      applyCustomScale();
    } else {
      settings.scale = Number(scaleSelect.value);
      notify();
    }
  });

  customInput.addEventListener("input", applyCustomScale);

  // Only use the typed number if it's between 0.25 and 10
  function applyCustomScale() {
    const value = Number(customInput.value);
    const isValid = customInput.value !== "" && value >= MIN_SCALE && value <= MAX_SCALE;
    error.hidden = isValid;
    if (isValid) {
      customInput.removeAttribute("aria-invalid");
      settings.scale = value;
      notify();
    } else {
      customInput.setAttribute("aria-invalid", "true");
    }
  }

  // Show the starting yield text without calling onChange
  yieldText.textContent = describeYield(options.yieldInfo, settings.scale);
  yieldText.hidden = yieldText.textContent === "";
}

function createSelect(id, choices, selectedValue) {
  const select = document.createElement("select");
  select.id = id;
  choices.forEach(function (choice) {
    const option = document.createElement("option");
    option.value = choice[0];
    option.textContent = choice[1];
    select.appendChild(option);
  });
  select.value = selectedValue;
  return select;
}

// Label + control, side by side
function createToolField(labelText, control) {
  const field = document.createElement("div");
  field.className = "tool-field";
  const label = document.createElement("label");
  label.htmlFor = control.id;
  label.textContent = labelText;
  field.appendChild(label);
  field.appendChild(control);
  return field;
}


// ==========================================================================
// Instagram post embed (click to load)
// --------------------------------------------------------------------------
// Instagram has a public "embed page" for every public post, which we show
// in an <iframe>. No Instagram script, no API key. Nothing loads from
// Instagram until the user clicks "Show Instagram post", which keeps pages
// fast and avoids Instagram's tracking until they ask for it.
//
// iframes don't tell us if the other site failed (private or deleted post),
// so instead of detecting errors we always show a note and the
// "View on Instagram" link as the fallback.
// ==========================================================================

// p/ or reel/ (or reels/), then the shortcode. Anything after it,
// like ?igsh=... tracking, is ignored.
const INSTAGRAM_POST_PATTERN = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reels?)\/([A-Za-z0-9_-]+)(?:[/?#]|$)/i;

// "https://www.instagram.com/reels/ABC123/?igsh=x" →
// "https://www.instagram.com/reel/ABC123/embed/"   (null if not a post/reel link)
function getInstagramEmbedUrl(instagramUrl) {
  const match = (instagramUrl || "").trim().match(INSTAGRAM_POST_PATTERN);
  if (!match) {
    return null;
  }
  const postType = match[1].toLowerCase() === "p" ? "p" : "reel";   // reels → reel
  return "https://www.instagram.com/" + postType + "/" + match[2] + "/embed/";
}

// Fills `container` with the click-to-load box + the "View on Instagram" link.
// Returns true if the area is shown, false if it's hidden (no valid link).
// Calling it again replaces everything, so the iframe is never duplicated.
function renderInstagramEmbed(container, instagramUrl, recipeTitle) {
  container.replaceChildren();
  const embedUrl = getInstagramEmbedUrl(instagramUrl);

  if (!embedUrl) {
    container.hidden = true;
    return false;
  }

  // --- Placeholder with the ▶ button ---
  const placeholder = document.createElement("div");
  placeholder.className = "ig-placeholder";

  const icon = document.createElement("span");
  icon.className = "ig-placeholder-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "📷";
  placeholder.appendChild(icon);

  const loadButton = document.createElement("button");
  loadButton.type = "button";
  loadButton.className = "btn btn-primary btn-small";
  loadButton.textContent = "▶ Show Instagram post";
  placeholder.appendChild(loadButton);

  const loadNote = document.createElement("p");
  loadNote.className = "ig-note";
  loadNote.textContent = "Loads content from Instagram";
  placeholder.appendChild(loadNote);

  container.appendChild(placeholder);

  // --- Fallback link, always there ---
  const link = document.createElement("a");
  link.className = "btn btn-secondary btn-small ig-link";
  link.href = instagramUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "View on Instagram";
  container.appendChild(link);

  // Only now (on click) do we create the iframe and load Instagram
  loadButton.addEventListener("click", function () {
    const frame = createInstagramFrame(embedUrl, recipeTitle);
    const missingNote = document.createElement("p");
    missingNote.className = "ig-note";
    missingNote.textContent = "Post not showing? It may be private or deleted. Open it on Instagram.";

    placeholder.replaceWith(frame);
    frame.after(missingNote);
    frame.focus();   // the button is gone, so keep keyboard focus nearby
  });

  container.hidden = false;
  return true;
}

// The <iframe>, built with createElement and setAttribute (never innerHTML),
// so a saved URL can't add any HTML of its own
function createInstagramFrame(embedUrl, recipeTitle) {
  const frame = document.createElement("iframe");
  frame.src = embedUrl;
  frame.className = "ig-frame" + (embedUrl.includes("/reel/") ? " ig-frame--reel" : "");
  frame.title = "Instagram post: " + (recipeTitle || "recipe");
  frame.setAttribute("loading", "lazy");
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("frameborder", "0");
  frame.setAttribute("scrolling", "no");
  return frame;
}

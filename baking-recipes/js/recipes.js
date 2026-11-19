// ==========================================================================
// recipes.js — "My Recipe Box" page
// --------------------------------------------------------------------------
// Table of contents
// 1. Page elements and page state
// 2. Remembering filters (sessionStorage)
// 3. Small helpers (dates, counts, text matching)
// 4. Search, filter, and sort — one list
// 5. Building the cards
// 6. Showing the grid, empty state, or "no matches"
// 7. Favorites
// 8. Detail view: opening, closing, and #recipe-<id> links
// 9. Detail view: reading mode
// 10. Detail view: edit mode
// 11. Deleting a recipe
// 12. Event listeners and start-up
//
// Uses getRecipes(), updateRecipe(), deleteRecipe(), RECIPE_CATEGORIES,
// get/saveUnitPreference() from storage.js; simplifyText(), detectYield()
// from convert.js; and renderIngredientGroups(), renderInstructionList(),
// renderRecipeTools(), renderInstagramEmbed(), getInstagramEmbedUrl(),
// createKindTag(), getNextKind() from render.js.
// All three are loaded before this file.
// ==========================================================================


// ==========================================================================
// 1. Page elements and page state
// ==========================================================================
const recipeCount = document.getElementById("recipe-count");
const toolbar = document.getElementById("toolbar");
const searchInput = document.getElementById("search");
const favoritesToggle = document.getElementById("favorites-toggle");
const sortSelect = document.getElementById("sort");
const categoryChips = document.getElementById("category-chips");
const boxMessage = document.getElementById("box-message");
const recipeGrid = document.getElementById("recipe-grid");
const emptyState = document.getElementById("empty-state");
const noResults = document.getElementById("no-results");
const clearFiltersButton = document.getElementById("clear-filters");

const dialog = document.getElementById("recipe-dialog");
const dialogContent = document.getElementById("dialog-content");
const dialogCloseButton = document.getElementById("dialog-close");

// Every saved recipe (loaded from localStorage at start-up)
let allRecipes = [];

// What the toolbar is currently set to. All four work together.
const filters = {
  search: "",
  category: "All",
  favoritesOnly: false,
  sort: "newest"   // "newest", "oldest", or "az"
};

// The recipe shown in the detail view (null when it's closed)
let openRecipeId = null;

// While editing: a copy of the recipe's editable parts. Changes go here
// first, so "Cancel" can throw them away without touching the saved recipe.
let editDraft = null;

// How the open recipe is displayed: units (remembered site-wide) and
// scale (starts at 1× for every recipe). Only changes what's SHOWN.
let detailSettings = { system: "original", scale: 1 };


// ==========================================================================
// 2. Remembering filters (sessionStorage)
// --------------------------------------------------------------------------
// sessionStorage is like localStorage but is cleared when the tab closes,
// which is right for "remember my filters while I browse".
// ==========================================================================
const SESSION_CATEGORY_KEY = "recipeBoxCategory";
const SESSION_SORT_KEY = "recipeBoxSort";

function loadRememberedFilters() {
  try {
    const category = sessionStorage.getItem(SESSION_CATEGORY_KEY);
    const sort = sessionStorage.getItem(SESSION_SORT_KEY);

    // Only use saved values that are still valid options
    if (category === "All" || RECIPE_CATEGORIES.includes(category)) {
      filters.category = category;
    }
    if (sort === "newest" || sort === "oldest" || sort === "az") {
      filters.sort = sort;
    }
  } catch (error) {
    // sessionStorage blocked: just use the defaults
  }
}

function rememberFilters() {
  try {
    sessionStorage.setItem(SESSION_CATEGORY_KEY, filters.category);
    sessionStorage.setItem(SESSION_SORT_KEY, filters.sort);
  } catch (error) {
    // Not important enough to bother the user about
  }
}


// ==========================================================================
// 3. Small helpers
// ==========================================================================

// "2026-11-18T10:00:00.000Z" → "Saved Nov 18"
function formatSavedDate(isoDate) {
  const date = new Date(isoDate);
  if (isNaN(date)) {
    return "";
  }
  return "Saved " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "2026-11-18T10:00:00.000Z" → "Saved November 18, 2026" (for the detail view)
function formatLongDate(isoDate) {
  const date = new Date(isoDate);
  if (isNaN(date)) {
    return "";
  }
  return "Saved " + date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// 1 → "1 ingredient", 7 → "7 ingredients"
function pluralize(count, word) {
  return count + " " + word + (count === 1 ? "" : "s");
}

// "7 ingredients · 4 steps"
function describeRecipeSize(recipe) {
  return pluralize(recipe.ingredients.length, "ingredient") + " · " +
    pluralize(recipe.instructions.length, "step");
}

// (simplifyText — lowercase, no accents, so "azucar" finds "azúcar" — lives
// in convert.js, shared by all pages)

// Fills in any missing fields, so an older or damaged saved recipe
// can't break the page
function withDefaults(recipe) {
  return {
    id: recipe.id,
    title: recipe.title || "Untitled Recipe",
    category: recipe.category || "Other",
    instagramUrl: recipe.instagramUrl || "",
    recipeLink: recipe.recipeLink || "",
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ingredientWithDefaults) : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    notes: Array.isArray(recipe.notes) ? recipe.notes : [],
    originalCaption: recipe.originalCaption || "",
    dateSaved: recipe.dateSaved || "",
    favorite: recipe.favorite === true
  };
}

function ingredientWithDefaults(ingredient) {
  return {
    text: String(ingredient.text || ""),
    kind: KIND_ORDER.includes(ingredient.kind) ? ingredient.kind : "dry",
    group: ingredient.group || "",
    guessed: ingredient.guessed === true
  };
}

function loadRecipes() {
  allRecipes = getRecipes().filter(function (recipe) {
    return recipe && recipe.id; // skip anything without an id
  }).map(withDefaults);
}

function findRecipe(id) {
  return allRecipes.find(function (recipe) {
    return recipe.id === id;
  });
}

// The full saved recipe straight from storage (including any extra fields),
// used when saving changes so nothing else gets lost
function findSavedRecipe(id) {
  return getRecipes().find(function (saved) {
    return saved.id === id;
  });
}


// ==========================================================================
// 4. Search, filter, and sort — one list
// --------------------------------------------------------------------------
// Every time anything in the toolbar changes, we start again from ALL
// recipes and run them through each step in turn:
//   all recipes → category → favorites → search → sort → shown on the page
// Each step only removes recipes, so the filters combine automatically
// (Cookies + Favorites + "chocolate" = cookies that are favorites AND
// mention chocolate).
// ==========================================================================
function getVisibleRecipes() {
  let visible = allRecipes;

  if (filters.category !== "All") {
    visible = visible.filter(function (recipe) {
      return recipe.category === filters.category;
    });
  }

  if (filters.favoritesOnly) {
    visible = visible.filter(function (recipe) {
      return recipe.favorite;
    });
  }

  // Each word typed must appear somewhere in the recipe, so
  // "chocolate cookies" finds recipes with both words, in any order
  const searchWords = simplifyText(filters.search).split(/\s+/).filter(Boolean);
  if (searchWords.length > 0) {
    visible = visible.filter(function (recipe) {
      const searchableText = getSearchableText(recipe);
      return searchWords.every(function (word) {
        return searchableText.includes(word);
      });
    });
  }

  return sortRecipes(visible);
}

// Title + category + every ingredient, simplified, in one string to search
function getSearchableText(recipe) {
  const ingredientText = recipe.ingredients.map(function (ingredient) {
    return ingredient.text;
  }).join(" ");
  return simplifyText(recipe.title + " " + recipe.category + " " + ingredientText);
}

// Returns a sorted copy (slice() so the original list isn't reordered)
function sortRecipes(recipes) {
  const sorted = recipes.slice();

  if (filters.sort === "az") {
    sorted.sort(function (a, b) {
      // "base" ignores upper/lower case and accents when comparing
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  } else {
    sorted.sort(function (a, b) {
      const timeA = new Date(a.dateSaved).getTime() || 0;
      const timeB = new Date(b.dateSaved).getTime() || 0;
      return filters.sort === "oldest" ? timeA - timeB : timeB - timeA;
    });
  }

  return sorted;
}

function hasActiveFilters() {
  return filters.search.trim() !== "" || filters.category !== "All" || filters.favoritesOnly;
}


// ==========================================================================
// 5. Building the cards
// ==========================================================================
// Built with createElement + textContent (never innerHTML), so saved text
// can't inject HTML into the page.

// The "All" chip plus one chip per category
function buildCategoryChips() {
  ["All"].concat(RECIPE_CATEGORIES).forEach(function (category) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.category = category;
    chip.textContent = category;
    categoryChips.appendChild(chip);
  });
}

// One recipe card. How the "whole card is clickable" trick works:
// the title is a real <button>, and in CSS its ::after covers the whole card,
// so clicking anywhere on the card clicks the title button. The ★ button and
// the links sit on top of that layer, so clicking them does NOT open the recipe.
function createRecipeCard(recipe) {
  const card = document.createElement("article");
  card.className = "card recipe-tile";
  card.dataset.id = recipe.id;

  // --- Top row: category tag + favorite star ---
  const top = document.createElement("div");
  top.className = "tile-top";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = recipe.category;
  top.appendChild(tag);

  top.appendChild(createFavoriteButton(recipe));
  card.appendChild(top);

  // --- Title (the button that opens the detail view) ---
  const title = document.createElement("h2");
  title.className = "tile-title";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "tile-open";
  openButton.textContent = recipe.title;
  title.appendChild(openButton);
  card.appendChild(title);

  // --- "7 ingredients · 4 steps" and "Saved Nov 18" ---
  const summary = document.createElement("p");
  summary.className = "tile-summary";
  summary.textContent = describeRecipeSize(recipe);
  card.appendChild(summary);

  const date = document.createElement("p");
  date.className = "tile-date";
  date.textContent = formatSavedDate(recipe.dateSaved);
  card.appendChild(date);

  // --- Bottom row: links (only the ones that exist; no row if neither) ---
  if (recipe.instagramUrl || recipe.recipeLink) {
    const links = document.createElement("div");
    links.className = "tile-links";
    if (recipe.instagramUrl) {
      links.appendChild(createTileLink(recipe.instagramUrl, "📷", "Instagram"));
    }
    if (recipe.recipeLink) {
      links.appendChild(createTileLink(recipe.recipeLink, "🔗", "Full recipe"));
    }
    card.appendChild(links);
  }

  return card;
}

// ★ (favorite) or ☆ (not a favorite)
function createFavoriteButton(recipe) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "fav-button";
  button.dataset.id = recipe.id;
  updateFavoriteButton(button, recipe.favorite);
  return button;
}

// Sets the star's look and its screen reader label
function updateFavoriteButton(button, isFavorite) {
  button.textContent = isFavorite ? "★" : "☆";
  button.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  button.setAttribute("aria-label", "Favorite");
  button.title = isFavorite ? "Remove from favorites" : "Add to favorites";
}

// Small link like "📷 Instagram" that opens in a new tab
function createTileLink(url, emoji, label) {
  const link = document.createElement("a");
  link.className = "tile-link";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = emoji + " ";
  link.appendChild(icon);
  link.appendChild(document.createTextNode(label));
  return link;
}


// ==========================================================================
// 6. Showing the grid, empty state, or "no matches"
// ==========================================================================

// Redraws everything from the current filters. Called after every change.
function renderPage() {
  updateToolbar();

  const visible = getVisibleRecipes();
  const nothingSaved = allRecipes.length === 0;
  const nothingMatches = !nothingSaved && visible.length === 0;

  emptyState.hidden = !nothingSaved;
  toolbar.hidden = nothingSaved;   // nothing to search or filter yet
  noResults.hidden = !nothingMatches;
  recipeGrid.hidden = visible.length === 0;

  recipeCount.textContent = describeCount(visible.length);

  recipeGrid.replaceChildren();
  visible.forEach(function (recipe) {
    recipeGrid.appendChild(createRecipeCard(recipe));
  });
}

// "12 recipes saved" when everything shows, otherwise "Showing 3 of 12 recipes"
function describeCount(visibleCount) {
  const total = allRecipes.length;
  if (total === 0) {
    return "No recipes saved yet";
  }
  if (visibleCount === total && !hasActiveFilters()) {
    return pluralize(total, "recipe") + " saved";
  }
  return "Showing " + visibleCount + " of " + pluralize(total, "recipe");
}

// Makes the toolbar match the filters (pressed chip, toggle, sort, search)
function updateToolbar() {
  categoryChips.querySelectorAll(".chip").forEach(function (chip) {
    const isSelected = chip.dataset.category === filters.category;
    chip.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
  favoritesToggle.setAttribute("aria-pressed", filters.favoritesOnly ? "true" : "false");
  sortSelect.value = filters.sort;
  if (searchInput.value !== filters.search) {
    searchInput.value = filters.search;
  }
}

// Shows a short message above the grid that fades away after a few seconds
let messageTimer = null;
function showBoxMessage(text, type) {
  boxMessage.textContent = text;
  boxMessage.className = "box-message box-message--" + (type || "info");
  boxMessage.hidden = false;

  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () {
    boxMessage.hidden = true;
  }, 4000);
}


// ==========================================================================
// 7. Favorites
// ==========================================================================

// Flips a recipe's favorite, saves it, and updates the grid.
// Returns true if it was saved. (The caller decides where focus goes.)
function toggleFavorite(id) {
  const recipe = findRecipe(id);
  // Change the full saved recipe (not our display copy), so no other fields are touched
  const savedRecipe = findSavedRecipe(id);
  if (!recipe || !savedRecipe) {
    return false;
  }
  savedRecipe.favorite = !recipe.favorite;

  if (!updateRecipe(savedRecipe)) {
    showBoxMessage("Sorry, your favorite couldn't be saved. Your browser's storage may be full or turned off.", "error");
    return false;
  }
  recipe.favorite = savedRecipe.favorite;

  if (filters.favoritesOnly) {
    // With "Favorites only" on, an un-starred card has to disappear
    renderPage();
  } else {
    // Otherwise just update this one star; no need to redraw everything
    const star = findCardElement(id, ".fav-button");
    if (star) {
      updateFavoriteButton(star, recipe.favorite);
    }
  }
  return true;
}

// Finds something inside a recipe's card, e.g. its star or title button.
// CSS.escape makes any id safe to use in a selector.
function findCardElement(id, selector) {
  return recipeGrid.querySelector('.recipe-tile[data-id="' + CSS.escape(id) + '"] ' + selector);
}


// ==========================================================================
// 8. Detail view: opening, closing, and #recipe-<id> links
// --------------------------------------------------------------------------
// The native <dialog> element does most of the work: showModal() dims the
// page behind it, keeps Tab inside the dialog, and closes on Esc. When it
// closes for ANY reason (✕, Esc, background click, delete), the "close"
// event runs, so the clean-up code lives in one place.
// ==========================================================================
const HASH_PREFIX = "#recipe-";

function openRecipe(id) {
  const recipe = findRecipe(id);
  if (!recipe) {
    showBoxMessage("That recipe isn't in your Recipe Box anymore.", "error");
    clearHash();
    return;
  }

  openRecipeId = id;
  editDraft = null;
  showReadingMode(recipe);

  if (!dialog.open) {
    dialog.showModal();
  }
  dialogContent.scrollTop = 0;
  dialogCloseButton.focus();   // move keyboard focus into the dialog
  setHash(id);
}

function closeDialog() {
  dialog.close();   // triggers the "close" event below
}

function handleDialogClosed() {
  // The browser fires "close" a moment AFTER the dialog closes. If a recipe
  // was opened again in that moment, don't clear the new one.
  if (dialog.open) {
    return;
  }
  const closedId = openRecipeId;
  openRecipeId = null;
  editDraft = null;   // closing while editing throws the changes away
  dialogContent.replaceChildren();
  clearHash();
  returnFocusAfterClose(closedId);
}

// Puts focus back on the card that was opened. If that card is gone
// (deleted, or hidden by a filter), focus the search box instead.
function returnFocusAfterClose(id) {
  const cardButton = id ? findCardElement(id, ".tile-open") : null;
  if (cardButton) {
    cardButton.focus();
  } else if (!toolbar.hidden) {
    searchInput.focus();
  } else {
    emptyState.querySelector("a").focus();
  }
}

// Clicking the dark background closes the dialog. The background counts as
// the <dialog> element itself, because the content box covers the inside.
// We also check where the press STARTED, so selecting text in a field and
// releasing the mouse outside doesn't close it by accident.
let pressStartedOnBackdrop = false;

function handleDialogPointerDown(event) {
  pressStartedOnBackdrop = event.target === dialog;
}

function handleDialogClick(event) {
  if (event.target === dialog && pressStartedOnBackdrop) {
    closeDialog();
  }
}

// The address bar shows recipes.html#recipe-<id> while a recipe is open, so
// the link can be copied. replaceState changes it without adding a Back step.
function setHash(id) {
  history.replaceState(null, "", HASH_PREFIX + id);
}

function clearHash() {
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

// Opens the recipe named in the address, e.g. recipes.html#recipe-abc123
function openFromHash() {
  const hash = window.location.hash;
  if (hash.startsWith(HASH_PREFIX)) {
    openRecipe(decodeURIComponent(hash.slice(HASH_PREFIX.length)));
  }
}


// ==========================================================================
// 9. Detail view: reading mode
// --------------------------------------------------------------------------
// Buttons inside the dialog have a data-action ("edit", "delete", ...).
// One click listener (handleDialogAction) reads it and does the right thing.
// ==========================================================================

// statusText (optional) shows a small message at the top, e.g. "Changes saved."
function showReadingMode(recipe, statusText) {
  dialogContent.replaceChildren();

  if (statusText) {
    const status = document.createElement("p");
    status.className = "dialog-status";
    status.setAttribute("role", "status");
    status.textContent = statusText;
    dialogContent.appendChild(status);
  }

  dialogContent.appendChild(buildDetailHeader(recipe));
  dialogContent.appendChild(buildDeleteConfirm());

  // Units / Servings dropdowns (render.js). Each recipe starts at 1×,
  // but keeps the unit system the user picked last time.
  detailSettings = { system: getUnitPreference(), scale: 1 };
  const tools = document.createElement("div");
  tools.className = "recipe-tools";
  tools.hidden = recipe.ingredients.length === 0 && recipe.instructions.length === 0;
  renderRecipeTools(tools, {
    idPrefix: "detail",
    yieldInfo: detectYield(recipe.originalCaption),
    settings: detailSettings,
    onChange: handleDetailDisplayChange
  });
  dialogContent.appendChild(tools);

  dialogContent.appendChild(buildDetailBody(recipe));
  renderDetailLists(recipe);

  if (recipe.notes.length > 0) {
    dialogContent.appendChild(buildNotes(recipe.notes));
  }
  if (recipe.originalCaption) {
    dialogContent.appendChild(buildOriginalCaption(recipe.originalCaption));
  }
}

// Category, star, title, date, links, Edit/Delete
function buildDetailHeader(recipe) {
  const header = document.createElement("div");
  header.className = "recipe-header dialog-header";

  const meta = document.createElement("div");
  meta.className = "recipe-meta";

  const top = document.createElement("div");
  top.className = "dialog-top";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = recipe.category;
  top.appendChild(tag);

  const star = createFavoriteButton(recipe);
  star.dataset.action = "favorite";
  top.appendChild(star);
  meta.appendChild(top);

  const title = document.createElement("h2");
  title.className = "recipe-title";
  title.id = "dialog-title";   // the dialog's aria-labelledby points here
  title.textContent = recipe.title;
  meta.appendChild(title);

  const date = document.createElement("p");
  date.className = "recipe-source";
  date.textContent = formatLongDate(recipe.dateSaved);
  meta.appendChild(date);

  // Link buttons, only for links that exist. "View on Instagram" normally
  // sits under the post embed, so it's only up here if the link can't be
  // embedded (an old or unusual saved link).
  const instagramUpHere = recipe.instagramUrl && !getInstagramEmbedUrl(recipe.instagramUrl);
  if (instagramUpHere || recipe.recipeLink) {
    const links = document.createElement("div");
    links.className = "recipe-actions";
    if (instagramUpHere) {
      links.appendChild(createLinkButton(recipe.instagramUrl, "View on Instagram", false));
    }
    if (recipe.recipeLink) {
      links.appendChild(createLinkButton(recipe.recipeLink, "Full recipe", true));
    }
    meta.appendChild(links);
  }

  const manage = document.createElement("div");
  manage.className = "recipe-actions manage-actions";
  manage.appendChild(createActionButton("edit", "✏️", "Edit", "btn btn-secondary btn-small"));
  manage.appendChild(createActionButton("delete", "🗑️", "Delete", "btn btn-danger-outline btn-small"));
  meta.appendChild(manage);

  header.appendChild(meta);
  return header;
}

// "View on Instagram" / "Full recipe →" — open in a new tab
function createLinkButton(url, label, withArrow) {
  const link = document.createElement("a");
  link.className = "btn btn-secondary btn-small";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = label;
  if (withArrow) {
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = " →";
    link.appendChild(arrow);
  }
  return link;
}

// A button with data-action, an optional emoji, and a label
function createActionButton(action, emoji, label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  if (emoji) {
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = emoji;
    button.appendChild(icon);
    button.appendChild(document.createTextNode(" "));
  }
  button.appendChild(document.createTextNode(label));
  return button;
}

// Instagram post + ingredients (shared render.js code) + numbered instructions
function buildDetailBody(recipe) {
  const body = document.createElement("div");
  body.className = "recipe-body";

  // --- Instagram post (click to load). Hidden if there's no valid link. ---
  // Built fresh every time the recipe opens, so the iframe is never duplicated.
  const postArea = document.createElement("div");
  postArea.className = "ig-embed-area";
  const hasPost = renderInstagramEmbed(postArea, recipe.instagramUrl, recipe.title);
  body.classList.toggle("recipe-body--with-post", hasPost);
  body.appendChild(postArea);

  // --- Ingredients ---
  const ingredientColumn = document.createElement("div");
  ingredientColumn.className = "recipe-column recipe-column--ingredients";
  const ingredientHeading = document.createElement("h3");
  ingredientHeading.className = "column-heading";
  ingredientHeading.textContent = "Ingredients";
  ingredientColumn.appendChild(ingredientHeading);

  if (recipe.ingredients.length === 0) {
    ingredientColumn.appendChild(createMutedText("No ingredients yet. Click Edit to add some."));
  } else {
    // Filled by renderDetailLists()
    const groups = document.createElement("div");
    groups.id = "detail-ingredients";
    ingredientColumn.appendChild(groups);
  }
  body.appendChild(ingredientColumn);

  // --- Instructions ---
  const instructionColumn = document.createElement("div");
  instructionColumn.className = "recipe-column recipe-column--instructions";
  const instructionHeading = document.createElement("h3");
  instructionHeading.className = "column-heading";
  instructionHeading.textContent = "Instructions";
  instructionColumn.appendChild(instructionHeading);

  if (recipe.instructions.length === 0) {
    instructionColumn.appendChild(createMutedText("No steps yet. Click Edit to add some."));
  } else {
    // Both filled by renderDetailLists()
    const notice = document.createElement("p");
    notice.className = "scale-notice";
    notice.id = "detail-scale-notice";
    notice.hidden = true;
    instructionColumn.appendChild(notice);

    const list = document.createElement("ol");
    list.className = "instruction-list";
    list.id = "detail-instructions";
    instructionColumn.appendChild(list);
  }
  body.appendChild(instructionColumn);

  return body;
}

// Draws the ingredients and steps using the current Units / Servings choice.
// Called when the recipe opens and every time a dropdown changes.
function renderDetailLists(recipe) {
  const groups = document.getElementById("detail-ingredients");
  if (groups) {
    // Tags are plain labels here; they become clickable in edit mode
    renderIngredientGroups(groups, recipe.ingredients, {
      clickableTags: false,
      settings: detailSettings
    });
  }

  const list = document.getElementById("detail-instructions");
  if (list) {
    renderInstructionList(list, recipe.instructions, detailSettings.system);
    updateScaleNotice(document.getElementById("detail-scale-notice"), detailSettings.scale);
  }
}

// Units or Servings dropdown changed: remember the units, redraw the lists
function handleDetailDisplayChange(newSettings) {
  detailSettings = newSettings;
  saveUnitPreference(newSettings.system);
  renderDetailLists(findRecipe(openRecipeId));
}

function createMutedText(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "muted-text";
  paragraph.textContent = text;
  return paragraph;
}

function buildNotes(notes) {
  const section = document.createElement("div");
  section.className = "notes-section";
  const heading = document.createElement("h3");
  heading.textContent = "Notes";
  section.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "notes-list";
  notes.forEach(function (note) {
    const item = document.createElement("li");
    item.textContent = note;
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

// <details> is a built-in open/close section: no JavaScript needed to toggle it
function buildOriginalCaption(caption) {
  const details = document.createElement("details");
  details.className = "caption-details";

  const summary = document.createElement("summary");
  summary.textContent = "Original caption";
  details.appendChild(summary);

  const text = document.createElement("p");
  text.className = "original-caption";
  text.textContent = caption;   // CSS keeps the original line breaks
  details.appendChild(text);
  return details;
}

function handleDialogFavorite() {
  if (toggleFavorite(openRecipeId)) {
    const star = dialogContent.querySelector('[data-action="favorite"]');
    updateFavoriteButton(star, findRecipe(openRecipeId).favorite);
  }
}


// ==========================================================================
// 10. Detail view: edit mode
// --------------------------------------------------------------------------
// Editing works on editDraft (a copy). Typing updates the copy straight
// away; adding, deleting, or changing a tag updates the copy and redraws
// that list. "Save changes" writes the copy to storage; "Cancel" drops it.
// ==========================================================================
function startEditing() {
  const recipe = findRecipe(openRecipeId);

  // JSON parse/stringify makes a deep copy, so editing the draft can't
  // accidentally change the real recipe
  editDraft = JSON.parse(JSON.stringify({
    ingredients: recipe.ingredients,
    instructions: recipe.instructions
  }));

  showEditMode(recipe);
  document.getElementById("edit-title").focus();
}

function showEditMode(recipe) {
  dialogContent.replaceChildren();

  const form = document.createElement("div");
  form.className = "edit-form";

  const heading = document.createElement("h2");
  heading.id = "dialog-title";
  heading.className = "edit-heading";
  heading.textContent = "Edit recipe";
  form.appendChild(heading);

  // --- Title and category ---
  const fields = document.createElement("div");
  fields.className = "edit-fields";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.id = "edit-title";
  titleInput.maxLength = 120;
  titleInput.value = recipe.title;
  fields.appendChild(createFormGroup("Title", titleInput));

  const categorySelect = document.createElement("select");
  categorySelect.id = "edit-category";
  const categories = RECIPE_CATEGORIES.slice();
  if (!categories.includes(recipe.category)) {
    categories.push(recipe.category);   // keep an old category that's no longer in the list
  }
  categories.forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  categorySelect.value = recipe.category;
  fields.appendChild(createFormGroup("Category", categorySelect));
  form.appendChild(fields);

  // --- Ingredients ---
  form.appendChild(createEditSection("Ingredients",
    "Click a tag to switch between Dry, Wet, and Mix-in.",
    "ul", "edit-ingredients", "add-ingredient", "Add ingredient"));

  // --- Instructions ---
  form.appendChild(createEditSection("Instructions", "",
    "ol", "edit-instructions", "add-step", "Add step"));

  // --- Error message + Save / Cancel ---
  const error = document.createElement("p");
  error.className = "edit-error";
  error.id = "edit-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  form.appendChild(error);

  const footer = document.createElement("div");
  footer.className = "edit-footer";
  footer.appendChild(createActionButton("cancel-edit", "", "Cancel", "btn btn-secondary"));
  footer.appendChild(createActionButton("save-edit", "", "Save changes", "btn btn-primary"));
  form.appendChild(footer);

  dialogContent.appendChild(form);
  dialogContent.scrollTop = 0;

  renderEditIngredients();
  renderEditInstructions();
}

// Label + field, using the same .form-group styles as the home page form
function createFormGroup(labelText, field) {
  const group = document.createElement("div");
  group.className = "form-group";
  const label = document.createElement("label");
  label.htmlFor = field.id;
  label.textContent = labelText;
  group.appendChild(label);
  group.appendChild(field);
  return group;
}

// Heading, optional hint, an empty list (filled by the render functions),
// and an "+ Add" button
function createEditSection(headingText, hintText, listTag, listId, addAction, addLabel) {
  const section = document.createElement("section");
  section.className = "edit-section";
  section.setAttribute("aria-labelledby", listId + "-heading");

  const heading = document.createElement("h3");
  heading.id = listId + "-heading";
  heading.className = "column-heading";
  heading.textContent = headingText;
  section.appendChild(heading);

  if (hintText) {
    const hint = document.createElement("p");
    hint.className = "tag-hint";
    hint.textContent = hintText;
    section.appendChild(hint);
  }

  const list = document.createElement(listTag);
  list.className = "edit-list edit-list--" + listTag;
  list.id = listId;
  section.appendChild(list);

  section.appendChild(createActionButton(addAction, "＋", addLabel, "btn btn-secondary btn-small"));
  return section;
}

// One row per ingredient: [text field] [Dry/Wet/Mix-in tag] [✕].
// Creator groups ("For the frosting") show as a small label above their rows.
function renderEditIngredients() {
  const list = document.getElementById("edit-ingredients");
  list.replaceChildren();
  let previousGroup = "";

  editDraft.ingredients.forEach(function (ingredient, index) {
    if (ingredient.group && ingredient.group !== previousGroup) {
      const groupLabel = document.createElement("li");
      groupLabel.className = "edit-group-label";
      groupLabel.textContent = ingredient.group;
      list.appendChild(groupLabel);
    }
    previousGroup = ingredient.group;

    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "edit-row";

    const input = createEditField("input", "ingredients", index, ingredient.text,
      "Ingredient " + (index + 1));
    row.appendChild(input);
    row.appendChild(createKindTag(ingredient, index, true));   // from render.js
    row.appendChild(createDeleteLineButton("ingredients", index, "ingredient"));

    item.appendChild(row);
    list.appendChild(item);
  });
}

// One row per step: [text box] [✕]. The <ol> numbers them.
function renderEditInstructions() {
  const list = document.getElementById("edit-instructions");
  list.replaceChildren();

  editDraft.instructions.forEach(function (step, index) {
    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "edit-row";

    const textarea = createEditField("textarea", "instructions", index, step,
      "Step " + (index + 1));
    textarea.rows = 2;
    row.appendChild(textarea);
    row.appendChild(createDeleteLineButton("instructions", index, "step"));

    item.appendChild(row);
    list.appendChild(item);
  });
}

// A text field that knows which list and line it belongs to (data-list, data-index)
function createEditField(tagName, listName, index, value, accessibleName) {
  const field = document.createElement(tagName);
  field.className = "edit-input";
  field.dataset.list = listName;
  field.dataset.index = index;
  field.value = value;
  field.setAttribute("aria-label", accessibleName);
  return field;
}

function createDeleteLineButton(listName, index, word) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "row-delete";
  button.dataset.action = "delete-line";
  button.dataset.list = listName;
  button.dataset.index = index;
  button.textContent = "✕";
  button.setAttribute("aria-label", "Delete " + word + " " + (index + 1));
  button.title = "Delete this " + word;
  return button;
}

// Typing in any edit field updates the draft immediately
function handleEditInput(event) {
  const field = event.target;
  if (!editDraft || !field.dataset.list) {
    return;
  }
  const index = Number(field.dataset.index);
  if (field.dataset.list === "ingredients") {
    editDraft.ingredients[index].text = field.value;
  } else {
    editDraft.instructions[index] = field.value;
  }
}

function addIngredientLine() {
  // A new line joins the last creator group, so it appears where you'd expect
  const last = editDraft.ingredients[editDraft.ingredients.length - 1];
  editDraft.ingredients.push({
    text: "",
    kind: "dry",
    group: last ? last.group : "",
    guessed: false
  });
  renderEditIngredients();
  focusEditField("ingredients", editDraft.ingredients.length - 1);
}

function addInstructionLine() {
  editDraft.instructions.push("");
  renderEditInstructions();
  focusEditField("instructions", editDraft.instructions.length - 1);
}

function deleteLine(listName, index) {
  editDraft[listName].splice(index, 1);
  if (listName === "ingredients") {
    renderEditIngredients();
  } else {
    renderEditInstructions();
  }

  // Focus the line that moved into this spot, or the one before it,
  // or the "+ Add" button if the list is now empty
  const remaining = editDraft[listName].length;
  if (remaining > 0) {
    focusEditField(listName, Math.min(index, remaining - 1));
  } else {
    const addAction = listName === "ingredients" ? "add-ingredient" : "add-step";
    dialogContent.querySelector('[data-action="' + addAction + '"]').focus();
  }
}

function focusEditField(listName, index) {
  const field = dialogContent.querySelector(
    '.edit-input[data-list="' + listName + '"][data-index="' + index + '"]');
  if (field) {
    field.focus();
  }
}

// Clicking a tag in edit mode: Dry → Wet → Mix-in
function cycleDraftKind(index) {
  const ingredient = editDraft.ingredients[index];
  ingredient.kind = getNextKind(ingredient.kind);
  ingredient.guessed = false;   // the user decided, so it's no longer a guess
  renderEditIngredients();
  dialogContent.querySelector('#edit-ingredients .kind-tag[data-index="' + index + '"]').focus();
}

function saveEdits() {
  const id = openRecipeId;
  const savedRecipe = findSavedRecipe(id);
  const error = document.getElementById("edit-error");

  if (!savedRecipe) {
    error.textContent = "This recipe couldn't be found. It may have been deleted in another tab.";
    error.hidden = false;
    return;
  }

  // Tidy up: trim text and drop lines that were left empty
  const ingredients = editDraft.ingredients
    .map(function (ingredient) {
      return Object.assign({}, ingredient, { text: ingredient.text.trim() });
    })
    .filter(function (ingredient) {
      return ingredient.text !== "";
    });

  const instructions = editDraft.instructions
    .map(function (step) {
      return step.trim();
    })
    .filter(function (step) {
      return step !== "";
    });

  // Start from the full saved recipe so fields we don't edit stay the same
  const updated = Object.assign({}, savedRecipe, {
    title: document.getElementById("edit-title").value.replace(/\s+/g, " ").trim() || "Untitled Recipe",
    category: document.getElementById("edit-category").value,
    ingredients: ingredients,
    instructions: instructions
  });

  if (!updateRecipe(updated)) {
    error.textContent = "Sorry, your changes couldn't be saved. Your browser's storage may be full or turned off.";
    error.hidden = false;
    return;
  }

  // Refresh the grid behind the dialog, then show the saved version
  editDraft = null;
  loadRecipes();
  renderPage();
  showReadingMode(findRecipe(id), "Changes saved.");
  dialogContent.querySelector('[data-action="edit"]').focus();
}

function cancelEditing() {
  editDraft = null;
  showReadingMode(findRecipe(openRecipeId));
  dialogContent.querySelector('[data-action="edit"]').focus();
}


// ==========================================================================
// 11. Deleting a recipe
// --------------------------------------------------------------------------
// Instead of the browser's confirm() pop-up, the question appears inside
// the dialog with its own Delete / Keep buttons.
// ==========================================================================
function buildDeleteConfirm() {
  const box = document.createElement("div");
  box.className = "confirm-box delete-confirm";
  box.id = "delete-confirm";
  box.hidden = true;

  const question = document.createElement("p");
  question.textContent = "Delete this recipe? This can't be undone.";
  box.appendChild(question);

  const buttons = document.createElement("div");
  buttons.className = "confirm-buttons";
  buttons.appendChild(createActionButton("keep", "", "Keep", "btn btn-secondary btn-small"));
  buttons.appendChild(createActionButton("confirm-delete", "", "Delete", "btn btn-danger btn-small"));
  box.appendChild(buttons);
  return box;
}

function askToDelete() {
  document.getElementById("delete-confirm").hidden = false;
  // Focus "Keep" (the safe choice), so pressing Enter by accident doesn't delete
  dialogContent.querySelector('[data-action="keep"]').focus();
}

function keepRecipe() {
  document.getElementById("delete-confirm").hidden = true;
  dialogContent.querySelector('[data-action="delete"]').focus();
}

function confirmDelete() {
  if (!deleteRecipe(openRecipeId)) {
    const question = dialogContent.querySelector("#delete-confirm p");
    question.textContent = "Sorry, this recipe couldn't be deleted. Your browser's storage may be turned off.";
    return;
  }

  loadRecipes();
  renderPage();      // removes the card and updates the count
  closeDialog();     // focus goes to the search box, since the card is gone
  showBoxMessage("Recipe deleted.");
}


// ==========================================================================
// 12. Event listeners and start-up
// ==========================================================================

// Search updates as the user types
searchInput.addEventListener("input", function () {
  filters.search = searchInput.value;
  renderPage();
});

// One listener for all chips ("event delegation")
categoryChips.addEventListener("click", function (event) {
  const chip = event.target.closest(".chip");
  if (!chip) {
    return;
  }
  filters.category = chip.dataset.category;
  rememberFilters();
  renderPage();
});

favoritesToggle.addEventListener("click", function () {
  filters.favoritesOnly = !filters.favoritesOnly;
  renderPage();
});

sortSelect.addEventListener("change", function () {
  filters.sort = sortSelect.value;
  rememberFilters();
  renderPage();
});

// Sort is left alone: it never hides recipes
clearFiltersButton.addEventListener("click", function () {
  filters.search = "";
  filters.category = "All";
  filters.favoritesOnly = false;
  rememberFilters();
  renderPage();
  searchInput.focus();
});

// Clicks on the cards (one listener for the whole grid)
recipeGrid.addEventListener("click", function (event) {
  const star = event.target.closest(".fav-button");
  if (star) {
    const id = star.dataset.id;
    if (toggleFavorite(id)) {
      // If the card disappeared (Favorites only), keep focus somewhere sensible
      const sameStar = findCardElement(id, ".fav-button");
      if (sameStar) {
        sameStar.focus();
      } else {
        favoritesToggle.focus();
      }
    }
    return;
  }

  const openButton = event.target.closest(".tile-open");
  if (openButton) {
    openRecipe(openButton.closest(".recipe-tile").dataset.id);
  }
});

// --- Detail view ---
dialogCloseButton.addEventListener("click", closeDialog);
dialog.addEventListener("close", handleDialogClosed);
dialog.addEventListener("pointerdown", handleDialogPointerDown);
dialog.addEventListener("click", handleDialogClick);
dialogContent.addEventListener("input", handleEditInput);

// Every button inside the dialog has a data-action saying what it does
dialogContent.addEventListener("click", function (event) {
  // In edit mode, ingredient tags are buttons that change the type
  const tag = event.target.closest("button.kind-tag");
  if (tag && editDraft) {
    cycleDraftKind(Number(tag.dataset.index));
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  switch (button.dataset.action) {
    case "favorite":       handleDialogFavorite(); break;
    case "edit":           startEditing(); break;
    case "delete":         askToDelete(); break;
    case "keep":           keepRecipe(); break;
    case "confirm-delete": confirmDelete(); break;
    case "add-ingredient": addIngredientLine(); break;
    case "add-step":       addInstructionLine(); break;
    case "delete-line":    deleteLine(button.dataset.list, Number(button.dataset.index)); break;
    case "save-edit":      saveEdits(); break;
    case "cancel-edit":    cancelEditing(); break;
  }
});

// A #recipe-<id> link opened while already on this page
window.addEventListener("hashchange", openFromHash);

// If the browser restores this page from its back/forward cache (for example,
// after saving a recipe on the home page and pressing Back), reload the
// recipes so new ones show up
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    loadRecipes();
    renderPage();
  }
});

// --- Start-up ---
buildCategoryChips();
loadRememberedFilters();
loadRecipes();
renderPage();
openFromHash();   // recipes.html#recipe-<id> opens that recipe straight away

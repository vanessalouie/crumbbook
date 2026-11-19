// ==========================================================================
// storage.js — Saving and loading recipes
// --------------------------------------------------------------------------
// All recipes live in the browser's localStorage under one key ("recipeBox")
// as a JSON array. Every page that needs recipes loads this file first, so
// the saving logic only exists in one place.
//
// localStorage can fail (private browsing, storage full, user turned it off),
// so every read and write is wrapped in try/catch. Functions that write
// return true/false so the page can tell the user if something went wrong.
// ==========================================================================

const STORAGE_KEY = "recipeBox";

// The recipe categories, defined once here so every page uses the same list
// (the dropdown on the home page and the filter chips in the Recipe Box).
const RECIPE_CATEGORIES = ["Cookies", "Cakes", "Breads", "Pastries", "Pies & Tarts", "Other"];

// Returns every saved recipe as an array (empty array if none or on error).
function getRecipes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const recipes = JSON.parse(saved);
    // Guard against something else being stored under our key
    return Array.isArray(recipes) ? recipes : [];
  } catch (error) {
    console.error("Could not read the recipe box:", error);
    return [];
  }
}

// Writes the whole list back to localStorage. Returns true if it worked.
function writeRecipes(recipes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    return true;
  } catch (error) {
    console.error("Could not save the recipe box:", error);
    return false;
  }
}

// Adds a new recipe to the box. Returns true if it was saved.
function saveRecipe(recipe) {
  const recipes = getRecipes();
  recipes.push(recipe);
  return writeRecipes(recipes);
}

// Replaces the saved recipe that has the same id. Returns true if saved.
function updateRecipe(recipe) {
  const recipes = getRecipes();
  const index = recipes.findIndex(function (saved) {
    return saved.id === recipe.id;
  });

  if (index === -1) {
    return false; // nothing with that id to update
  }

  recipes[index] = recipe;
  return writeRecipes(recipes);
}

// Removes the recipe with this id. Returns true if saved.
function deleteRecipe(id) {
  const remaining = getRecipes().filter(function (saved) {
    return saved.id !== id;
  });
  return writeRecipes(remaining);
}

// --------------------------------------------------------------------------
// Unit preference (Original / US / Metric), remembered across the whole site.
// The scale is NOT remembered: every recipe starts at 1×.
// --------------------------------------------------------------------------
const UNIT_PREFERENCE_KEY = "unitPreference";
const UNIT_SYSTEMS = ["original", "us", "metric"];

function getUnitPreference() {
  try {
    const saved = localStorage.getItem(UNIT_PREFERENCE_KEY);
    return UNIT_SYSTEMS.includes(saved) ? saved : "original";
  } catch (error) {
    return "original";
  }
}

function saveUnitPreference(system) {
  try {
    localStorage.setItem(UNIT_PREFERENCE_KEY, system);
  } catch (error) {
    // Not important enough to bother the user about
  }
}

// Makes a unique id from the current time plus a few random characters.
// Only letters, numbers, and "-" so it is safe to use in a URL later.
function createRecipeId() {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return timePart + "-" + randomPart;
}

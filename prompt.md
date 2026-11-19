

# Prompt 01 — Main Page UI

## Context
I'm building a baking recipe website as a class project. Users paste an Instagram baking video link and the caption text, and the site turns it into a clean recipe card (ingredients + instructions + a link to the full recipe if the caption has one).

**Rules for the whole project:**
- Vanilla HTML, CSS, and JavaScript only — no frameworks, libraries, CDNs, or build tools.
- Everything lives inside the project folder and must deploy to Netlify as a static site.
- Keep code organized and commented so I can understand and explain it.

## This step: UI only
Build the **layout and styling** of the main page. Do NOT add JavaScript functionality yet — buttons can exist but don't need to work. I'll test this in the browser before moving on.

## Folder structure
Create this structure (empty files are fine for anything not used yet):

```
baking-recipes/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js        (empty for now, just linked)
├── images/
└── prompts/
```

## Main page (`index.html`) sections
1. **Header / nav bar**
   - Site name/logo text (placeholder: "Crumb Book" — I may rename it)
   - Nav links: Home, My Recipe Box, About (the other pages don't exist yet; links can point to `recipes.html` and `about.html`)

2. **Hero section**
   - Short headline like "Turn baking reels into recipes you can actually follow"
   - One-sentence explanation of how the site works

3. **"Add a Recipe" form**
   - Text input: Instagram post/reel URL
   - Large textarea: "Paste the caption here"
   - Dropdown: category (Cookies, Cakes, Breads, Pastries, Pies & Tarts, Other)
   - Button: "Extract Recipe"
   - Small helper text explaining that Instagram doesn't let sites read captions automatically, so the user pastes it

4. **Recipe preview card** (shown with placeholder/sample content for now so I can see the design)
   - Recipe title
   - Category tag
   - Area where the Instagram post/link will go (a placeholder box is fine)
   - "Full recipe →" button (for when the caption has a link)
   - Two columns on desktop: **Ingredients** (bulleted list) and **Instructions** (numbered list)
   - "Save to Recipe Box" button

5. **"How it works" section** — 3 simple steps with small icons made from emoji or CSS (no image libraries)

6. **Footer** — my name, class, year

## Design direction
- Warm, cozy bakery feel: cream/off-white background, warm browns, a soft accent color (like strawberry pink or butter yellow)
- Rounded corners, soft shadows on cards
- Readable fonts — use system fonts or a Google Font via a plain `<link>` tag only if you say so; otherwise system fonts
- Fully responsive: looks good on phone (single column) and desktop (two-column recipe card)
- Use CSS variables for colors and spacing so the theme is easy to change
- Accessible: labels on every form field, good color contrast, semantic HTML (`header`, `main`, `section`, `footer`)

## When you're done
- List the files you created
- Tell me how to open the page in my browser to review it
- Don't start on functionality until I confirm the UI looks right

---

# Prompt 02 — Main Page Functionality

## Context
The main page UI from Prompt 01 is done and approved. Now make the "Add a Recipe" form actually work using **vanilla JavaScript only** (no libraries). Put the logic in `js/main.js`. Don't change the look of the page except where this prompt says to.

Keep the code readable for a student: small named functions, comments explaining *why*, no clever one-liners.

---

## 1. Validating the Instagram link
When the user clicks **Extract Recipe**:
- The URL field is optional, but if it's filled in it must look like an Instagram post or reel:
  - starts with `https://www.instagram.com/` or `https://instagram.com/`
  - followed by `p/`, `reel/`, or `reels/` and an ID
  - ignore extra stuff after the ID (like `?igsh=...` tracking codes) and save a clean version of the link
- The caption box is **required**. If it's empty, show a friendly message under the field (not a browser `alert()`).
- If the link is invalid, show an inline error message under the URL field and don't continue.

## 2. Splitting the caption into ingredients and instructions
Write a function `parseCaption(text)` that returns:
```js
{ title, ingredients: [], instructions: [], recipeLinks: [], notes: [] }
```

### Step A: Clean up the text
- Split the caption into lines; trim each line; drop empty lines.
- Remove hashtag-only lines (lines made up mostly of `#tags`) and strip hashtags from the end of lines.
- Remove leading bullets/emoji such as `•`, `-`, `*`, `▪️`, `✅`, `🔸`, `👉` from the start of lines (keep the rest of the line).

### Step B: Look for section headings first (most reliable)
Treat a line as a heading if it **starts with** one of these words, case-insensitive, optionally followed by `:` or emoji:
- **Ingredients headings:** `ingredients`, `you'll need`, `you will need`, `what you need`, `for the dough`, `for the filling`, `for the frosting`, `for the glaze`, `for the crust`, `ingredientes`
- **Instructions headings:** `instructions`, `directions`, `method`, `steps`, `how to make`, `preparation`, `instrucciones`, `preparación`

Lines after an ingredients heading go into `ingredients` until an instructions heading appears; lines after that go into `instructions`.
- Sub-headings like "For the frosting:" inside the ingredients section should be kept as a **group label** (store as an object like `{ type: "group", text: "For the frosting" }`) so the card can show them in bold.

### Step C: If there are no headings, guess line by line
A line is an **ingredient** if it matches any of these:
- starts with a number, fraction, or range: `2`, `1/2`, `½`, `1 1/2`, `2-3`
- contains a measurement unit: `cup(s)`, `c`, `tbsp`, `tablespoon(s)`, `tsp`, `teaspoon(s)`, `g`, `grams`, `kg`, `ml`, `l`, `oz`, `lb(s)`, `stick(s)`, `pinch`, `dash`, `large`, `egg(s)`
- It is short (under ~60 characters) AND has a quantity

A line is an **instruction** if it matches any of these:
- starts with a step number: `1.`, `1)`, `Step 1`, `1️⃣`
- starts with a cooking verb: preheat, mix, whisk, stir, combine, fold, beat, cream, add, pour, bake, cool, chill, knead, roll, cut, melt, line, grease, sift, let, place, transfer, top, serve, freeze, refrigerate
- is a longer sentence (over ~60 characters) that mentions a time or temperature (`minutes`, `mins`, `hour`, `°F`, `°C`, `degrees`)

Remove the step numbers from instructions before saving (the card's numbered list adds its own).

### Step D: Everything else
- The **first line** that isn't an ingredient, instruction, link, or heading becomes the `title` (max ~80 characters). If nothing fits, use "Untitled Recipe."
- Other leftover lines (like "Save this for later!" or "Recipe adapted from...") go into `notes`. Don't show notes that are pure calls-to-action ("follow for more," "save this," "link in bio") — filter those out.

## 2b. Sorting ingredients into Dry and Wet
After the ingredients are found, label each one as **Dry**, **Wet**, or **Mix-ins & Toppings**, which is how bakers usually prepare them (dry in one bowl, wet in another, mix-ins folded in at the end). Write a function `classifyIngredient(line)` that returns `"dry"`, `"wet"`, or `"mixin"`.

Check the line (lowercase) against these keyword lists **in this order**. The first match wins:

1. **Mix-ins & Toppings:** chocolate chips, chips, chunks, nuts, walnuts, pecans, almonds, sprinkles, raisins, dried fruit, coconut flakes, berries, blueberries, strawberries, toffee, candy, marshmallows, zest, chispas de chocolate, nueces
2. **Wet:** butter, oil, egg(s), egg yolk(s), egg white(s), milk, buttermilk, cream, heavy cream, sour cream, yogurt, cream cheese, water, vanilla, extract, honey, maple syrup, syrup, molasses, juice, coffee, condensed milk, evaporated milk, mashed banana(s), banana(s), applesauce, pumpkin purée, melted, leche, huevo(s), mantequilla, aceite, vainilla, jugo
3. **Dry:** flour, sugar, brown sugar, powdered sugar, cocoa, baking soda, baking powder, salt, yeast, cornstarch, cinnamon, nutmeg, spice(s), oats, cornmeal, ground almonds, almond flour, espresso powder, gelatin, harina, azúcar, sal, polvo de hornear, canela
4. **No match:** default to `"dry"` but mark it `guessed: true` so the card can show a small "?" next to it.

Notes on tricky cases:
- "Sugar" counts as dry even though recipes cream it with butter. Don't try to be smarter than this, since the user can fix it (see below).
- Check **mix-ins before wet**, so "melted chocolate chips" doesn't land in Wet... **except** when the line contains `melted`. Then it's Wet ("1/2 cup melted chocolate").
- Check **wet before dry**, so "buttermilk" isn't caught by a dry keyword.

**If the creator already grouped the ingredients** (for example "For the cake:" / "For the frosting:"), keep their groups as the main sections, and sort the Dry/Wet/Mix-ins *inside* each group. A frosting section usually has only one or two types, so hide any empty sub-group.

**Let the user fix mistakes:** on the preview card, each ingredient shows a small clickable tag (Dry / Wet / Mix-in). Clicking it cycles to the next type and moves the ingredient into the right list immediately. Corrections are saved with the recipe.

## 3. Finding a "full recipe" link
Write `findRecipeLinks(text)`:
- Find every URL in the caption — anything starting with `http://` or `https://`, **and** bare domains like `sallysbakingaddiction.com/cookies` or `www.site.com/...`. Add `https://` to bare ones.
- **Ignore** links that are not recipes:
  - `instagram.com`, `tiktok.com`, `youtube.com`, `youtu.be`, `facebook.com`, `pinterest.com`
  - shopping/affiliate links: `amazon.`, `amzn.to`, `liketk.it`, `shopmy.us`, `ltk.app`
- **Ranking:** if there are several links, put first any link whose text or nearby words include `recipe`, `full recipe`, `printable`, or whose URL path contains `/recipe`.
- Link-in-bio services (`linktr.ee`, `beacons.ai`, `stan.store`, `linkin.bio`) are allowed but labeled **"Creator's link page"** instead of "Full recipe," because they're a menu of links, not the recipe itself.
- If the caption says "link in bio" but has no actual URL, show a small note on the card: *"The creator says the recipe is in their bio — open their profile to find it."* plus a link to the Instagram post if one was provided.

On the card, the first good link becomes the **"Full recipe →"** button (opens in a new tab with `rel="noopener"`). If there's no link, hide the button.

## 4. Showing the result in the preview card
Replace the sample content in the preview card with the parsed result:
- Title (editable — make it an input or `contenteditable` so the user can fix it)
- Category tag from the dropdown
- Link to the Instagram post ("View on Instagram"), shown only if a URL was given. Use a styled link button for now; we'll try embedding the actual post in a later step.
- Ingredients split into labeled sub-sections **🌾 Dry**, **💧 Wet**, and **🍫 Mix-ins & Toppings**, each a bulleted list with its own count (for example "Dry (4)"). Give each type a subtle color (for example a light wheat tone for dry, a light blue tone for wet, a light cocoa tone for mix-ins) using CSS variables, and make sure contrast stays readable. Creator groups like "For the frosting" appear as bold headings above their own Dry/Wet/Mix-ins sub-sections. Hide empty sub-sections.
- Instructions as a numbered list
- Notes (if any) in a small muted section
- If the parser finds **no ingredients and no instructions**, show a friendly message: *"We couldn't find a recipe in this caption. Check the comments or the creator's link, then paste the recipe here."* and keep the caption so the user can edit it and try again.

Build the list items with `document.createElement` and `textContent` (not `innerHTML`) so pasted text can't inject HTML.

## 5. Saving to the Recipe Box
When the user clicks **Save to Recipe Box**:
- Save to `localStorage` under the key `recipeBox` as a JSON array.
- Each recipe object:
```js
{
  id: "unique id (Date.now() + random number is fine)",
  title: "...",
  category: "Cookies",
  instagramUrl: "https://www.instagram.com/reel/ABC123/" or "",
  recipeLink: "https://..." or "",
  ingredients: [
    { text: "2 cups flour", kind: "dry", group: "", guessed: false },
    { text: "1 cup butter, softened", kind: "wet", group: "", guessed: false },
    { text: "2 cups powdered sugar", kind: "dry", group: "For the frosting", guessed: false },
    ...
  ],
  instructions: [ "...", "..." ],
  notes: [ ... ],
  originalCaption: "the raw pasted text",
  dateSaved: "ISO date string",
  favorite: false
}
```
- **Prevent duplicates:** if a recipe with the same `instagramUrl` (when not empty) is already saved, ask whether to update it instead (use an inline confirmation message with Yes/No buttons, not `confirm()`).
- Wrap all `localStorage` reads and writes in `try/catch`; if storage fails, show a message that the recipe couldn't be saved.
- Put the storage code in its own file, `js/storage.js`, with functions `getRecipes()`, `saveRecipe(recipe)`, `updateRecipe(recipe)`, `deleteRecipe(id)`, so the Recipe Box page can reuse it later. Load it before `main.js` with a normal `<script>` tag (no modules required).
- After saving, show a success message ("Saved to your Recipe Box!") with a link to `recipes.html`, and clear the form.

## 6. Test captions
Add a hidden developer helper: a small **"Try a sample"** link under the caption box that fills it with one of these captions at random, so I can test quickly.

**Sample 1 — has headings and a link**
```
Brown Butter Chocolate Chip Cookies 🍪
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
Save this for later! #cookies #baking #brownbutter
```

**Sample 2 — no headings**
```
easiest banana bread ever 🍌
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
#bananabread #easybaking
```

**Sample 3 — link in bio only**
```
Strawberry shortcake cups for summer 🍓✨
Recipe is linked in my bio! Follow for more easy desserts 💕
#strawberry #dessert #nobake
```

**Sample 4 — Spanish caption**
```
Flan de vainilla 🍮
Ingredientes:
- 1 taza de azúcar
- 4 huevos
- 1 lata de leche condensada
- 1 lata de leche evaporada
- 1 cdta de vainilla
Preparación:
1. Derrite el azúcar hasta hacer caramelo.
2. Licúa el resto de ingredientes.
3. Hornea a baño maría a 350°F por 50 minutos.
```

Expected results:
- Sample 1 → 7 ingredients, 4 instructions, "Full recipe" button, title "Brown Butter Chocolate Chip Cookies"
  - Dry (4): brown sugar, flour, baking soda, salt
  - Wet (2): butter, eggs
  - Mix-ins (1): chocolate chips
- Sample 2 → 8 ingredients, 4 instructions, no button
  - Dry (4): sugar, baking soda, salt, flour
  - Wet (4): bananas, melted butter, egg, vanilla
- Sample 3 → no recipe found message + "link in bio" note
- Sample 4 → 5 ingredients, 3 instructions (add Spanish units `taza`, `cdta`, `cda`, `lata`, `huevos` to the unit list)
  - Dry (1): azúcar
  - Wet (4): huevos, leche condensada, leche evaporada, vainilla
- Clicking the tag on any ingredient moves it to the next list, and the change is kept after saving.

## When you're done
- List every file you created or changed
- Explain in plain language how `parseCaption` decides what is an ingredient vs. an instruction, and how `classifyIngredient` decides dry vs. wet vs. mix-in
- Tell me how to test each sample, and which results I should check
- Do NOT build the Recipe Box page yet — that's the next prompt

---

# Prompt 03 — Recipe Box Page (UI + Functionality)

## Context
The main page (Prompts 01–02) is done. Recipes are saved in `localStorage` under the key `recipeBox` using the functions in `js/storage.js`: `getRecipes()`, `saveRecipe()`, `updateRecipe()`, `deleteRecipe(id)`. Each recipe has `id`, `title`, `category`, `instagramUrl`, `recipeLink`, `ingredients` (objects with `text`, `kind` = dry/wet/mixin, `group`, `guessed`), `instructions`, `notes`, `originalCaption`, `dateSaved`, and `favorite`.

Now build the **My Recipe Box** page (`recipes.html`) and a simple **About** page (`about.html`). Vanilla HTML, CSS, and JavaScript only. Reuse `css/styles.css`, the same header, nav, and footer, and the same color variables so the site looks like one site. Put this page's code in `js/recipes.js` and load `js/storage.js` before it.

Build in this order, and stop after each part so I can check it in the browser:
**Part A: page layout with sample cards → Part B: real saved recipes and filters → Part C: recipe detail view, edit, and delete → Part D: About page.**

---

## Part A — Layout
1. **Page header:** "My Recipe Box" title and a count, for example "12 recipes saved"
2. **Toolbar:**
   - Search box ("Search recipes or ingredients…")
   - Category filter buttons ("chips"): All, Cookies, Cakes, Breads, Pastries, Pies & Tarts, Other. Use the same list as the main page dropdown, defined once in a shared constant in `js/storage.js` so both pages use the same list.
   - "★ Favorites only" toggle
   - Sort dropdown: Newest first, Oldest first, A–Z
3. **Recipe grid:** responsive cards (1 column on phones, 2 on tablets, 3 on desktop). Each card shows:
   - title
   - category tag
   - a quick summary like "7 ingredients · 4 steps"
   - a ★ favorite button (filled or outlined)
   - small icons or links: "Instagram" and "Full recipe" (only if those links exist)
   - the date saved ("Saved Nov 18")
   - the whole card is clickable to open the detail view, but the ★ button and links must not also open it
4. **Empty state:** if nothing is saved, show a friendly message with a whisk or cookie emoji and a button "Add your first recipe" linking to `index.html`.

## Part B — Real data, search, and filters
- Load recipes with `getRecipes()` and build the cards with `document.createElement` and `textContent` (no `innerHTML` with saved text).
- **Search** matches the title, the ingredient text, and the category. It isn't case-sensitive, it updates as the user types, and it ignores accents so "azucar" finds "azúcar".
- Search, category, favorites, and sort all work **together** (for example, Cookies + Favorites + "chocolate").
- Show "No recipes match your search" with a "Clear filters" button when filters hide everything.
- Clicking ★ toggles `favorite`, saves it with `updateRecipe()`, and updates the card without reloading the page.
- **Remember** the last chosen category and sort in `sessionStorage` so they stay if I open a recipe and come back.
- Update the recipe count to show what's visible, for example "Showing 3 of 12 recipes".

## Part C — Recipe detail view, editing, and deleting
Clicking a card opens a **detail view** in a modal dialog using the native `<dialog>` element. Requirements:
- Closes with an ✕ button, the Esc key, or a click on the dark background
- Keyboard focus moves into the dialog when it opens and back to the card when it closes

The detail view shows the full recipe in the same style as the main page preview card:
- Title, category, date saved, ★ favorite
- "View on Instagram" and "Full recipe →" buttons (only if those links exist; open in a new tab with `rel="noopener"`)
- Ingredients grouped into **🌾 Dry / 💧 Wet / 🍫 Mix-ins & Toppings**, with creator groups ("For the frosting") as headings, exactly like the main page. Move the code that draws the ingredient groups into a shared function in a new file, `js/render.js`, used by both pages, so the two pages don't have two copies.
- Leave an empty toolbar `<div class="recipe-tools"></div>` above the ingredients. The Units and Servings dropdowns will go there in Prompt 04.
- Numbered instructions
- Notes
- A collapsible "Original caption" section (`<details>`) showing the raw pasted text

**Edit mode** (an "Edit" button in the detail view):
- Title and category become editable
- Each ingredient line and instruction line becomes an editable text field, with buttons to delete a line and to add a new line
- The Dry / Wet / Mix-in tags can still be clicked to change the type
- "Save changes" uses `updateRecipe()` and refreshes the grid. "Cancel" throws away the changes.

**Delete:**
- A "Delete" button in the detail view
- An inline confirmation inside the dialog: "Delete this recipe? This can't be undone." with Delete / Keep buttons. Don't use `confirm()`.
- After deleting, close the dialog, remove the card, and show a short message "Recipe deleted."

**Direct link to a recipe:** support `recipes.html#recipe-<id>`. If the page loads with that hash, open that recipe's detail view. The "Saved!" message on the main page can link straight there.

## Part D — About page (`about.html`)
A simple page with the same header and footer:
- What the site does (2–3 sentences)
- "How to use it" — 3 steps (copy the Instagram link and caption → paste and extract → save and organize)
- A short note on why captions are pasted by hand: Instagram doesn't let websites read captions or comments automatically
- "Built with" — vanilla HTML, CSS, and JavaScript, deployed on Netlify, built with help from Claude Code
- A short "About me" placeholder paragraph I'll fill in

Make sure the nav highlights the current page on all three pages (with `aria-current="page"`).

## Testing checklist
Before telling me you're done, check these and tell me the results:
- [ ] With an empty recipe box, the empty state shows
- [ ] Save 4+ recipes from the main page using the "Try a sample" captions, and they all appear here
- [ ] Search "flour" finds the cookies and the banana bread; search "azucar" finds the flan
- [ ] The category filter + favorites + search work together
- [ ] ★ stays after refreshing the page
- [ ] The detail view opens, closes with Esc, ✕, and a background click, and opens from a `#recipe-<id>` link
- [ ] Editing an ingredient and saving it stays after refreshing; Cancel throws the edit away
- [ ] Delete removes the recipe and the count updates
- [ ] The layout works at phone width (375px) and desktop width
- [ ] The main page still works after moving the ingredient code into `js/render.js`

## When you're done
- List every file you created or changed
- Explain how the search, filters, and sort are combined into one list
- Do NOT add unit conversion or scaling yet. That's Prompt 04.

---

# Prompt 04 — Unit Conversion & Recipe Scaling

## Context
The main page (Prompts 01–02) and the Recipe Box page (Prompt 03) are done. Now add two controls to every recipe card, both on the main page preview card and on the Recipe Box page:

1. **Units dropdown:** Original / US / Metric
2. **Scale dropdown:** ½×, 1×, 2×, 3×, plus a "Custom…" option that lets the user type a number (0.25 to 10)

Vanilla JavaScript only. Put all of the math in a new file, `js/convert.js`, loaded with a normal `<script>` tag before the page scripts so both pages can use it. Keep the functions small and commented.

**Important:** never change the saved ingredient text. Conversion and scaling only change what's *displayed*. Switching back to "Original" and "1×" must show exactly what was saved.

---

## 1. Reading the amount in an ingredient line
Write `parseIngredient(text)` that returns:
```js
{ amount: 1.5, amountMax: null, unit: "cup", rest: "all-purpose flour", parsed: true }
```
It must understand:
- whole numbers and decimals: `2`, `0.5`, `1.25`
- fractions: `1/2`, `3/4`
- mixed numbers: `1 1/2`, `2 3/4`
- unicode fractions: `½ ⅓ ⅔ ¼ ¾ ⅛`, including `1½`
- ranges: `2-3`, `2 to 3`. Store the low number in `amount` and the high one in `amountMax`, and scale/convert both
- units right after the number, with or without a space: `200g`, `200 g`, `1 cup`, `2 cups`, `1 tbsp`, `1 Tbsp`, `1 T`, `1 tsp`, `1 t`, `8 oz`, `1 lb`, `250 ml`, `1 stick`
- Spanish units: `taza(s)`, `cda` (tablespoon), `cdta` (teaspoon), `gramos`, `lata` (can, so don't convert it, just scale it)
- amounts with no unit: `2 large eggs`, `3 ripe bananas` (scale only)

If a line has no amount at all ("pinch of salt", "sprinkles for topping", "salt to taste"), return `parsed: false` and **show it unchanged** in every mode.

## 2. Scaling
- Multiply `amount` (and `amountMax`) by the scale factor.
- **Countable items with no unit** (eggs, bananas, cans/latas): round to the nearest ½. If the result isn't a whole number, show it with a small note, for example `1½ large eggs (beat 2 eggs, use ¾ of it)`. A simpler note like `(round to taste)` is also fine.
- **Sticks of butter:** scale normally, and show sticks with fractions (`1½ sticks`).
- When the scale isn't 1×, show a small notice above the instructions: *"Scaled recipe: pan size and bake time may need to change. Check for doneness early."*
- The instructions text is not scaled. Don't try to rewrite numbers inside sentences, except for temperatures (see section 4).

## 3. Unit conversion
### Volume (fixed math)
- 1 tsp = 4.93 ml
- 1 tbsp = 3 tsp = 14.79 ml
- 1 cup = 16 tbsp = 236.6 ml
- 1 fl oz = 29.57 ml

### Weight (fixed math)
- 1 oz = 28.35 g
- 1 lb = 453.6 g
- 1 stick of butter = ½ cup = 113 g

### Cups ⇄ grams (depends on the ingredient)
Create a lookup table `GRAMS_PER_CUP` and match it by keyword in the ingredient's `rest` text. Check longer names first so "brown sugar" doesn't match "sugar":

| Ingredient keyword | grams per cup |
|---|---|
| all-purpose flour / flour / harina | 125 |
| bread flour | 130 |
| cake flour | 115 |
| whole wheat flour | 120 |
| almond flour | 96 |
| granulated sugar / sugar / azúcar | 200 |
| brown sugar | 213 |
| powdered sugar / confectioners' sugar | 120 |
| cocoa powder / cocoa | 85 |
| butter / mantequilla | 227 |
| oats / rolled oats | 90 |
| chocolate chips / chispas de chocolate | 170 |
| shredded coconut | 85 |
| chopped nuts / walnuts / pecans | 115 |
| honey / maple syrup / molasses | 340 |
| milk / water / buttermilk / heavy cream | (use ml, not grams) |

Rules:
- **To Metric:** dry and solid ingredients found in the table → grams. Liquids → ml. Anything with a volume unit that **isn't in the table** → ml, plus a small muted "≈ volume" tag so the user knows it wasn't weighed.
- **Small amounts stay small:** teaspoons and tablespoons of anything (baking soda, salt, vanilla, spices) convert to **ml** in Metric mode, not grams, since bakers measure them with spoons anyway.
- **To US:** grams of a table ingredient → cups. ml → cups/tbsp/tsp. Grams of an unknown ingredient → ounces.
- If a line already uses the target system, leave it alone.

## 4. Temperatures in the instructions
In **Metric** mode, find temperatures in the instruction text (`350°F`, `350 °F`, `350 degrees F`, `350F`) and show them converted (`175°C`). Round to the nearest 5. In **US** mode, convert °C → °F (round to the nearest 5, so `180°C` becomes `355°F`; rounding to the nearest 25 for common oven settings, giving `350°F`, is also OK. Pick one and explain why in a comment). In **Original** mode, show the text as written. Build the text with `textContent` only.

## 5. Formatting the numbers so they look like a recipe
Write `formatAmount(value, unit, system)`:
- **US units:** show friendly fractions. Round to the nearest of `⅛, ¼, ⅓, ½, ⅔, ¾` and show mixed numbers like `1 ½`. Never show long decimals like `0.3333`.
- **Make units sensible:**
  - under ¼ cup → show in tbsp (`¼ cup` and up stays in cups)
  - under 1 tbsp → tsp
  - 3 tsp or more → tbsp
  - plural units: `1 cup` / `2 cups`
- **Metric:**
  - grams under 100: round to the nearest whole gram
  - grams 100 and up: round to the nearest 5 g
  - ml under 15: round to the nearest 0.5 and show the decimal only when it's .5 (`4.93` → `5 ml`, `2.46` → `2.5 ml`)
  - ml 15 and up: round to the nearest 5 ml
  - ml 1000 and up → liters with one decimal
- **Ranges:** `2–3 cups` (en dash)

## 6. The controls
- Put the two dropdowns side by side in a small toolbar at the top of the ingredients section, with labels ("Units", "Servings"). On phones, stack them.
- If the caption mentioned servings or a yield ("Makes 24 cookies", "Serves 8", "Rinde 12"), detect it and show the scaled yield next to the scale control ("Makes 48 cookies" at 2×). If there isn't one, just show "2× recipe".
- Changing either dropdown updates the card instantly, with no page reload.
- **Remember the unit choice** (not the scale) as a site-wide setting in `localStorage` under the key `unitPreference`, wrapped in `try/catch`. The scale resets to 1× for each recipe.
- The Dry / Wet / Mix-ins grouping from Prompt 02 must keep working. Converted lines stay in the same groups, and the type tags still work.

## 7. Test cases
Add a few simple checks to the console in a function `runConversionTests()` that I can call from the browser DevTools console. Each check prints PASS or FAIL:

| Input | Mode | Scale | Expected |
|---|---|---|---|
| `1 cup all-purpose flour` | Metric | 1× | `125 g all-purpose flour` |
| `1 1/4 cups brown sugar` | Metric | 1× | `265 g brown sugar` |
| `1/2 cup butter` | Metric | 2× | `225 g butter` (227 rounded to the nearest 5) |
| `1 tsp vanilla` | Metric | 1× | `5 ml vanilla` |
| `2 large eggs` | Original | ½× | `1 large eggs` → display as `1 large egg` if easy, otherwise leave it |
| `3 ripe bananas` | Original | ½× | `1½ ripe bananas` + note |
| `200g sugar` | US | 1× | `1 cup sugar` |
| `250 ml milk` | US | 1× | `1 cup milk` (rounded) |
| `1/3 cup oil` | US | 3× | `1 cup oil` |
| `1 tbsp sugar` | US | ¼× | `¾ tsp sugar` |
| `pinch of salt` | Metric | 2× | `pinch of salt` (unchanged) |
| `2-3 cups chocolate chips` | Metric | 1× | `340–510 g chocolate chips` |
| `Bake at 350°F for 12 minutes` | Metric | — | `Bake at 175°C for 12 minutes` |

## When you're done
- List every file you created or changed
- Explain in plain language how a line like `1 1/4 cups brown sugar` becomes grams, step by step
- Tell me how to run `runConversionTests()` and what to try by hand on both pages
- Mention any test that didn't pass and why


Prompt 02b — Fix: Ingredients Ending Up in Notes
The bug

When a caption has an "Instructions" heading but no "Ingredients" heading, every ingredient line ends up in Notes instead of Ingredients. Short labels like "Banana Mochi Dough" and "Toasted Flour" are also not recognized as ingredient groups.

Failing caption (add it as Sample 5 in the "Try a sample" helper):

Banana Mochi Dough
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
From the long side, roll the dough up until it forms a long log. Cut into your desired shapes.
Fix these rules in parseCaption (js/main.js)
Headings and line-by-line guessing work together. Headings mark sections when they exist, but any line that is not inside a known section (for example, everything before "Instructions" when there's no "Ingredients" heading) must go through the line-by-line guessing (Step C), not straight into Notes.
Simple approach: if there's an instructions heading but no ingredients heading, treat everything before the instructions heading as the ingredients section, and the reverse when only an ingredients heading exists.
Notes are the last resort. A line only goes into notes if it isn't a heading, a group label, an ingredient, an instruction, a link, or the title.
Recognize group labels without "For the…". A line is a group label when ALL of these are true:
it's short (5 words or fewer, under ~40 characters)
it has no numbers and doesn't end with a period
it isn't an instructions heading
the next line looks like an ingredient
Store it as the ingredients' group (like "For the frosting"), so it shows as a bold heading with its own Dry/Wet/Mix-ins sub-groups.
Title when the first line is a group label: if the first line is a group label and there's no other title line, use it as the title and keep it as the first group. The title stays editable so I can fix it.
More cooking verbs for spotting instructions: steam, toast, remove, dust, heat, boil, simmer, spread, shape, divide, cut, roll, meanwhile.
Units: make sure g, kg, ml, and cm work with or without a space (60 g and 60g), and that extra text in parentheses doesn't break the match (3-4 overripe bananas (about 250 to 300 g …) is an ingredient).
Dry/wet keywords: add glutinous rice flour, rice flour, mochiko, and tapioca starch to Dry, and neutral oil to Wet. (banana is already Wet.)
Expected result for Sample 5
Title: Banana Mochi Dough
Group "Banana Mochi Dough":
Dry (3): granulated sugar, glutinous rice flour, rice flour
Wet (3): bananas, neutral oil, water
Group "Toasted Flour":
Dry (1): glutinous rice flour
Instructions: 9 steps
Notes: empty
Don't break the old samples

Re-test Samples 1–4 after the fix and confirm they give the same results as before. In particular, Sample 1's "Save this for later!" should still be filtered out, and Sample 3 should still show the "no recipe found" + "link in bio" message.

When you're done
Tell me which functions you changed and why the bug happened
Show me the results for all 5 samples

Prompt 05 — Show the Instagram Post on the Recipe Card
Context

Prompts 01–04 are done. Right now, recipe cards only show a "View on Instagram" link button. I want to try showing the actual Instagram post or reel on the card, so you can watch the video next to the recipe.

Rules still apply: vanilla HTML, CSS, and JavaScript only. No Instagram embed.js script, no libraries, no API keys, no server code. If something below doesn't work, keep the existing link button as the fallback. The site must never break because Instagram didn't load.

Build Part A first and stop so I can test it. Part B is an experiment. Only do it after I say Part A works.

Part A — Embed the post with an iframe

Instagram has a public embed page for every public post:

https://www.instagram.com/p/<SHORTCODE>/embed/
https://www.instagram.com/reel/<SHORTCODE>/embed/

Adding captioned/ at the end (.../embed/captioned/) also shows the caption under the post.

What to build
Get the shortcode: write getInstagramEmbedUrl(instagramUrl) in js/render.js:
accepts the clean URL we already save (/p/, /reel/, or /reels/ + ID)
treat /reels/ the same as /reel/
returns https://www.instagram.com/<p-or-reel>/<SHORTCODE>/embed/ or null if the URL is empty or invalid
Click to load: don't load Instagram automatically. Instead, show a placeholder box where the post will go, with:
a ▶ "Show Instagram post" button
a small note in muted text: "Loads content from Instagram"
Only when the user clicks the button, replace the placeholder with the iframe. This keeps pages fast (the Recipe Box could have many recipes) and doesn't load Instagram's tracking until the user asks for it.
The iframe:
src = the embed URL
title="Instagram post: <recipe title>" for screen readers
loading="lazy", allowfullscreen, frameborder="0", scrolling="no"
width 100% with max-width: 540px, centered, rounded corners to match the card style
height around 650px for posts and 750px for reels. Put these in CSS variables so I can adjust them.
Where it appears:
main page preview card: in the Instagram placeholder area from Prompt 01
Recipe Box: only in the detail view (the dialog), not on the small grid cards
Desktop: the post sits beside the ingredients; phones: the post goes above the ingredients
Fallback: always keep the "View on Instagram" link under the embed area. If there's no Instagram URL, hide the whole embed area. Also add a short note under the iframe: "Post not showing? It may be private or deleted. Open it on Instagram."
iframes don't reliably report errors from other sites, so don't try to detect failures. The note and link are the fallback.
Build all elements with document.createElement and set attributes in JavaScript. Don't build the iframe with innerHTML and the saved URL.
Test Part A

Use 2–3 real public baking posts or reels I'll paste in (at least one /p/ and one /reel/), plus:

an invalid link → no embed area, no errors in the console
no link → embed area hidden
a link with ?igsh=... tracking → still embeds correctly
open and close the Recipe Box dialog several times → the iframe isn't duplicated
# ADR-0025 — Food and nutrition tracker

- **Status:** Accepted
- **Date:** 2026-11-24
- **Phase:** 9 — Food and Nutrition Tracker
- **Supersedes:** none
- **Related:** D-09, ADR-0003, ADR-0005, ADR-0006, ADR-0010, ADR-0012, ADR-0013, ADR-0020

## Context

Phase 9 adds food logging, a manual nutrition database, recipes, daily goals/planning, and food analytics to web and Android. The external specification leaves the nutrition provider TBD; D-09 already resolves this by choosing manual nutrition entry plus recipes and deferring an external provider. The architecture already names `Food`, `FoodNutrition`, `Meal`, `MealEntry`, `Recipe`, `RecipeIngredient`, `RecipeStep`, and `NutritionGoal`, but it does not define how planned-versus-consumed meals, image references, units, rounding, or deletion guards work.

Prior feature phases (6–8) shipped local web + Android repositories and kept server endpoints for the sync phases. That precedent is followed here.

## Decision

1. **Scope boundary.** Phase 9 is local-first web + Android. The existing server stays health/sync only; food API endpoints, food sync, and an external nutrition provider remain deferred. This is not a mock: all food records are real local Dexie/Room records.
2. **Canonical records.**
   - `Food`: `id`, `name`, `servingSize`, optional `servingGrams`, per-serving `calories`, `protein`, `carbs`, `fat`, `source` (`manual` or reserved `import`), optional `sourceRef`, optional `imageRef`, optional `notes`, `createdAt`, `updatedAt`.
   - `MealEntry`: `id`, `localDate`, `mealType`, either `foodId` or `recipeId`, `quantity` in servings, optional `notes`, optional `imageRef`, `loggedAt`. Multiple entries may share a local date and meal type.
   - `MealPlan`: same identity fields as `MealEntry` plus `plannedAt`; it is an explicit planned record so planned-versus-consumed nutrition is derived, never inferred from an entry.
   - `Recipe`: `id`, `name`, `servings`, `prepMinutes`, `cookMinutes`, `favorite`, optional `notes`, optional `imageRef`, embedded canonical arrays `ingredients` (`foodId`, `quantity`) and `steps` (`order`, `text`).
   - `NutritionGoal`: `id`, `calories`, `protein`, `carbs`, `fat`, `updatedAt`. Goals are per-date records so planning a future date does not mutate today's goal.
3. **Units and rounding.** Calories are kcal; protein/carbs/fat are grams; serving grams are grams; quantity is servings. Rules calculate with unrounded doubles and round only for display to one decimal place. Empty data produces an explicit empty state, not a zero-valued chart.
4. **Recipe scaling.** Ingredient nutrition is per ingredient quantity. Recipe nutrition per serving is `sum(ingredient nutrition) / recipe.servings`. A logged recipe entry multiplies that per-serving value by the entry quantity. Zero-serving recipes cannot be saved.
5. **Goal progress.** Progress is `consumed / goal` for each macro, with a zero or missing goal reported as unavailable. Over-goal is a distinct state and is never clamped to 100%.
6. **Images.** `imageRef` stores an attachment reference string (local content URI or stable URL), never embedded bytes. No camera/photo permission flow is introduced in Phase 9; a reference can be corrected by the user.
7. **Deletion.** Food or recipe records used by meal entries, plans, or recipe ingredients cannot be deleted; the UI shows an in-use message. Plan/entry deletion requires confirmation and removes only the selected record.
8. **Storage parity.** Web Dexie upgrades to v6 with food, mealEntries, mealPlans, recipes, and nutritionGoals tables. Android Room upgrades to v7 with non-destructive `MIGRATION_6_7`; local storage may normalize nested recipe arrays into tables, but repository boundaries expose the canonical shapes above.
9. **Analytics and fixtures.** Pure functions on web and Kotlin derive daily totals, meal-type distribution, daily/weekly/monthly series, planned-versus-consumed values, and goal progress from source records. `contracts/fixtures/food.nutrition.json` is consumed by both clients.
10. **Dashboard.** `foodOverview` is backed by today's real local entries and goals on both web and the Android dashboard screen. Interactive Android home-screen widgets remain Phase 19 work (D-08).

## Consequences

- Food data is not sent to a third party; the external provider stays deferred.
- Manual corrections are ordinary edits to local food records; imported records retain `sourceRef` without fabricating provider data.
- New JSON Schemas define the canonical fields before sync work, following ADR-0024's boundary-conversion precedent.
- All user-facing labels remain in EN/TA bundles; no hard-coded strings are introduced.
- Server, security, backup, and sync surfaces are N-A for Phase 9 feature work but still pass the existing smoke gate.

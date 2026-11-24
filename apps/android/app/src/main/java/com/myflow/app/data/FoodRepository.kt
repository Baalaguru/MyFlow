package com.myflow.app.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** Local-first food repository. All records are real Room rows; no nutrition is invented. */
class FoodRepository(private val dao: FoodDao) {

    fun observeFoods(): Flow<List<FoodEntity>> = dao.observeFoods()
    fun observeEntries(): Flow<List<MealEntryEntity>> = dao.observeEntries()
    fun observePlans(): Flow<List<MealPlanEntity>> = dao.observePlans()
    fun observeRecipes(): Flow<List<RecipeEntity>> = dao.observeRecipes()
    fun observeGoals(): Flow<List<NutritionGoalEntity>> = dao.observeGoals()
    fun observeRecipeAggregates(): Flow<List<RecipeAggregate>> =
        combine(dao.observeRecipes(), dao.observeIngredients(), dao.observeSteps()) { recipes, ingredients, steps ->
            buildAggregates(recipes, ingredients, steps)
        }

    suspend fun foods(): List<FoodEntity> = dao.foods()
    suspend fun searchFoods(query: String): List<FoodEntity> = dao.searchFoods(query.trim())
    suspend fun food(id: String): FoodEntity? = dao.food(id)

    suspend fun entries(): List<MealEntryEntity> = dao.entries()
    suspend fun entriesForDate(localDate: String): List<MealEntryEntity> = dao.entriesForDate(localDate)
    suspend fun entry(id: String): MealEntryEntity? = dao.entry(id)

    suspend fun plans(): List<MealPlanEntity> = dao.plans()
    suspend fun plansForDate(localDate: String): List<MealPlanEntity> = dao.plansForDate(localDate)
    suspend fun plan(id: String): MealPlanEntity? = dao.plan(id)

    suspend fun recipes(): List<RecipeEntity> = dao.recipes()
    suspend fun recipe(id: String): RecipeEntity? = dao.recipe(id)
    suspend fun recipeAggregates(): List<RecipeAggregate> =
        buildAggregates(dao.recipes(), dao.ingredients(), dao.steps())

    suspend fun recipeAggregate(id: String): RecipeAggregate? =
        buildAggregates(listOfNotNull(dao.recipe(id)), dao.ingredientsFor(id), dao.stepsFor(id)).firstOrNull()

    suspend fun goals(): List<NutritionGoalEntity> = dao.goals()
    suspend fun goalForDate(localDate: String): NutritionGoalEntity? = dao.goalForDate(localDate)

    suspend fun saveFood(food: FoodEntity): Boolean {
        val name = food.name.trim()
        if (name.isEmpty()) return false
        val now = Instant.now().toString()
        dao.saveFood(
            food.copy(
                id = food.id.ifBlank { UUID.randomUUID().toString() },
                name = name,
                servingSize = food.servingSize.trim().ifBlank { "1 serving" },
                servingGrams = food.servingGrams?.takeIf { it.isFinite() && it > 0.0 },
                calories = normalizeNutrition(food.calories),
                protein = normalizeNutrition(food.protein),
                carbs = normalizeNutrition(food.carbs),
                fat = normalizeNutrition(food.fat),
                source = food.source.trim().lowercase().takeIf { it == "import" } ?: "manual",
                sourceRef = normalizeRef(food.sourceRef),
                imageRef = normalizeRef(food.imageRef),
                notes = normalizeRef(food.notes),
                createdAt = food.createdAt.ifBlank { now },
                updatedAt = now,
            ),
        )
        return true
    }

    suspend fun deleteFood(id: String): Boolean {
        if (dao.foodEntryUsage(id) > 0 || dao.foodPlanUsage(id) > 0 || dao.foodIngredientUsage(id) > 0) {
            return false
        }
        dao.deleteFood(id)
        return true
    }

    suspend fun saveEntry(entry: MealEntryEntity): Boolean {
        val foodId = normalizeRef(entry.foodId)
        val recipeId = if (foodId == null) normalizeRef(entry.recipeId) else null
        if (foodId == null && recipeId == null) return false
        dao.saveEntry(
            entry.copy(
                id = entry.id.ifBlank { UUID.randomUUID().toString() },
                localDate = parseLocalDate(entry.localDate)?.toString() ?: LocalDate.now().toString(),
                mealType = normalizeMealType(entry.mealType),
                foodId = foodId,
                recipeId = recipeId,
                quantity = normalizeQuantity(entry.quantity),
                notes = normalizeRef(entry.notes),
                imageRef = normalizeRef(entry.imageRef),
                loggedAt = entry.loggedAt.ifBlank { Instant.now().toString() },
            ),
        )
        return true
    }

    suspend fun deleteEntry(id: String) = dao.deleteEntry(id)

    suspend fun savePlan(plan: MealPlanEntity): Boolean {
        val foodId = normalizeRef(plan.foodId)
        val recipeId = if (foodId == null) normalizeRef(plan.recipeId) else null
        if (foodId == null && recipeId == null) return false
        dao.savePlan(
            plan.copy(
                id = plan.id.ifBlank { UUID.randomUUID().toString() },
                localDate = parseLocalDate(plan.localDate)?.toString() ?: LocalDate.now().toString(),
                mealType = normalizeMealType(plan.mealType),
                foodId = foodId,
                recipeId = recipeId,
                quantity = normalizeQuantity(plan.quantity),
                notes = normalizeRef(plan.notes),
                plannedAt = plan.plannedAt.ifBlank { Instant.now().toString() },
            ),
        )
        return true
    }

    suspend fun deletePlan(id: String) = dao.deletePlan(id)

    /** Replaces a recipe's owned ingredient and step rows together with the recipe row. */
    suspend fun saveRecipe(
        recipe: RecipeEntity,
        ingredients: List<RecipeIngredientEntity>,
        steps: List<RecipeStepEntity>,
    ): Boolean {
        val name = recipe.name.trim()
        if (name.isEmpty()) return false
        val id = recipe.id.ifBlank { UUID.randomUUID().toString() }
        val now = Instant.now().toString()
        dao.saveRecipe(
            recipe.copy(
                id = id,
                name = name,
                servings = normalizeServings(recipe.servings),
                prepMinutes = normalizeMinutes(recipe.prepMinutes),
                cookMinutes = normalizeMinutes(recipe.cookMinutes),
                notes = normalizeRef(recipe.notes),
                imageRef = normalizeRef(recipe.imageRef),
                createdAt = recipe.createdAt.ifBlank { now },
                updatedAt = now,
            ),
        )
        dao.deleteIngredientsForRecipe(id)
        dao.deleteStepsForRecipe(id)
        ingredients.forEach { ingredient ->
            val foodId = normalizeRef(ingredient.foodId) ?: return@forEach
            dao.saveIngredient(
                ingredient.copy(
                    id = ingredient.id.ifBlank { UUID.randomUUID().toString() },
                    recipeId = id,
                    foodId = foodId,
                    quantity = normalizeQuantity(ingredient.quantity),
                ),
            )
        }
        steps.map { it.text.trim() }.filter { it.isNotEmpty() }.forEachIndexed { index, text ->
            dao.saveStep(
                RecipeStepEntity(
                    id = UUID.randomUUID().toString(),
                    recipeId = id,
                    order = index + 1,
                    text = text,
                ),
            )
        }
        return true
    }

    suspend fun deleteRecipe(id: String): Boolean {
        if (dao.recipeEntryUsage(id) > 0 || dao.recipePlanUsage(id) > 0) return false
        dao.deleteIngredientsForRecipe(id)
        dao.deleteStepsForRecipe(id)
        dao.deleteRecipe(id)
        return true
    }

    suspend fun saveGoal(goal: NutritionGoalEntity): Boolean {
        val localDate = parseLocalDate(goal.localDate) ?: return false
        dao.saveGoal(
            goal.copy(
                id = goal.id.ifBlank { "goal:${localDate}" },
                localDate = localDate.toString(),
                calories = normalizeNutrition(goal.calories),
                protein = normalizeNutrition(goal.protein),
                carbs = normalizeNutrition(goal.carbs),
                fat = normalizeNutrition(goal.fat),
                updatedAt = Instant.now().toString(),
            ),
        )
        return true
    }

    suspend fun deleteGoal(id: String) = dao.deleteGoal(id)

    private fun buildAggregates(
        recipes: List<RecipeEntity>,
        ingredients: List<RecipeIngredientEntity>,
        steps: List<RecipeStepEntity>,
    ): List<RecipeAggregate> {
        val ingredientGroups = ingredients.groupBy { it.recipeId }
        val stepGroups = steps.groupBy { it.recipeId }
        return recipes.map { recipe ->
            RecipeAggregate(
                recipe = recipe,
                ingredients = ingredientGroups[recipe.id].orEmpty().sortedBy { it.id },
                steps = stepGroups[recipe.id].orEmpty().sortedBy { it.order },
            )
        }
    }
}

package com.myflow.app.data

import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.roundToInt
import kotlin.math.roundToLong

/** Canonical nutrition values. Rules calculate with unrounded doubles; UI rounds for display only. */
data class NutritionValues(
    val calories: Double = 0.0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
) {
    companion object {
        val EMPTY: NutritionValues = NutritionValues()

        fun of(calories: Double?, protein: Double?, carbs: Double?, fat: Double?): NutritionValues =
            NutritionValues(
                normalizeNutrition(calories),
                normalizeNutrition(protein),
                normalizeNutrition(carbs),
                normalizeNutrition(fat),
            )
    }

    operator fun plus(other: NutritionValues): NutritionValues = NutritionValues(
        calories + other.calories,
        protein + other.protein,
        carbs + other.carbs,
        fat + other.fat,
    )

    operator fun times(factor: Double): NutritionValues {
        val safe = if (factor.isFinite()) factor.coerceAtLeast(0.0) else 0.0
        return NutritionValues(calories * safe, protein * safe, carbs * safe, fat * safe)
    }

    fun dividedBy(divisor: Double): NutritionValues =
        if (divisor.isFinite() && divisor > 0.0) times(1.0 / divisor) else EMPTY

    /** One-decimal display values; never stored as source of truth. */
    fun rounded(): NutritionValues = NutritionValues(
        calories.round1(),
        protein.round1(),
        carbs.round1(),
        fat.round1(),
    )

    fun isEmpty(): Boolean = calories == 0.0 && protein == 0.0 && carbs == 0.0 && fat == 0.0
}

fun Double.round1(): Double = if (isFinite()) (this * 10.0).roundToLong() / 10.0 else 0.0

/** Stable canonical meal types, used as the four keys of the distribution fixture. */
val mealTypes: List<String> = listOf("breakfast", "lunch", "dinner", "snack")
const val DEFAULT_MEAL_TYPE: String = "breakfast"

fun normalizeMealType(value: String?): String {
    val key = value?.trim()?.lowercase().orEmpty()
    return if (key in mealTypes) key else DEFAULT_MEAL_TYPE
}

/** Nutrition values are never negative or non-finite. */
fun normalizeNutrition(value: Double?): Double =
    if (value != null && value.isFinite() && value > 0.0) value else 0.0

/** Rules never multiply by a non-positive quantity; repository validation keeps stored quantity > 0. */
fun safeQuantity(value: Double?): Double =
    if (value != null && value.isFinite() && value > 0.0) value else 0.0

/** Repository-level default for a quantity the user left invalid. */
fun normalizeQuantity(value: Double?): Double = safeQuantity(value).takeIf { it > 0.0 } ?: 1.0

fun normalizeServings(value: Int?): Int = if (value != null && value >= 1) value else 1

fun normalizeMinutes(value: Int?): Int = if (value != null && value >= 0) value else 0

fun normalizeRef(value: String?): String? = value?.trim()?.takeIf { it.isNotEmpty() }

fun normalizeLocalDate(value: String?): String? =
    value?.trim()?.takeIf { Regex("\\d{4}-\\d{2}-\\d{2}").matches(it) }

fun parseLocalDate(value: String?): LocalDate? = try {
    LocalDate.parse(value?.trim().orEmpty())
} catch (_: Exception) {
    null
}

/** A recipe boundary exposes its canonical embedded ingredient and step arrays. */
data class RecipeAggregate(
    val recipe: RecipeEntity,
    val ingredients: List<RecipeIngredientEntity>,
    val steps: List<RecipeStepEntity>,
)

private fun nutritionForRef(
    foodId: String?,
    recipeId: String?,
    quantity: Double,
    foodById: Map<String, FoodEntity>,
    recipesById: Map<String, RecipeAggregate>,
): NutritionValues = when {
    !foodId.isNullOrBlank() -> foodById[foodId]?.let { foodNutrition(it, quantity) } ?: NutritionValues.EMPTY
    !recipeId.isNullOrBlank() -> recipesById[recipeId]?.let {
        recipeNutritionPerServing(it, foodById.values.toList()) * safeQuantity(quantity)
    } ?: NutritionValues.EMPTY
    else -> NutritionValues.EMPTY
}

/** Food nutrition is per serving and multiplies by the logged quantity in servings. */
fun foodNutrition(food: FoodEntity, quantity: Double): NutritionValues =
    NutritionValues(food.calories, food.protein, food.carbs, food.fat) * safeQuantity(quantity)

/** Sum of ingredient nutrition divided by servings. Zero-serving recipes cannot be saved. */
fun recipeNutritionPerServing(aggregate: RecipeAggregate, foods: List<FoodEntity>): NutritionValues {
    val byId = foods.associateBy { it.id }
    val total = aggregate.ingredients.fold(NutritionValues.EMPTY) { acc, ingredient ->
        val food = byId[ingredient.foodId] ?: return@fold acc
        acc + foodNutrition(food, ingredient.quantity)
    }
    return total.dividedBy(aggregate.recipe.servings.toDouble())
}

fun entryNutrition(
    entry: MealEntryEntity,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): NutritionValues = nutritionForRef(
    entry.foodId,
    entry.recipeId,
    entry.quantity,
    foods.associateBy { it.id },
    recipes.associateBy { it.recipe.id },
)

fun planNutrition(
    plan: MealPlanEntity,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): NutritionValues = nutritionForRef(
    plan.foodId,
    plan.recipeId,
    plan.quantity,
    foods.associateBy { it.id },
    recipes.associateBy { it.recipe.id },
)

private fun sumEntries(
    entries: List<MealEntryEntity>,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): NutritionValues {
    val foodById = foods.associateBy { it.id }
    val recipesById = recipes.associateBy { it.recipe.id }
    return entries.fold(NutritionValues.EMPTY) { acc, entry ->
        acc + nutritionForRef(
            entry.foodId,
            entry.recipeId,
            entry.quantity,
            foodById,
            recipesById,
        )
    }
}

fun dailyNutrition(
    entries: List<MealEntryEntity>,
    localDate: LocalDate,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): NutritionValues = dailyNutrition(entries, localDate.toString(), foods, recipes)

fun dailyNutrition(
    entries: List<MealEntryEntity>,
    localDate: String,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): NutritionValues = sumEntries(entries.filter { it.localDate == localDate }, foods, recipes)

/** Calories by all four meal types. A zero total yields explicit zeros, not a fabricated share. */
fun mealTypeDistribution(
    entries: List<MealEntryEntity>,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): Map<String, Double> {
    val result = mealTypes.associateWith { 0.0 }.toMutableMap()
    entries.forEach { entry ->
        val type = normalizeMealType(entry.mealType)
        result[type] = (result[type] ?: 0.0) + entryNutrition(entry, foods, recipes).calories
    }
    return result
}

fun mealTypeShares(distribution: Map<String, Double>): Map<String, Double> {
    val total = distribution.values.sum()
    return mealTypes.associateWith { type ->
        if (total > 0.0) (distribution[type] ?: 0.0) / total else 0.0
    }
}

data class NutritionPoint(val localDate: LocalDate, val nutrition: NutritionValues)

/** Every requested day is present, including empty days with explicit zero values. */
fun nutritionSeries(
    entries: List<MealEntryEntity>,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
    days: Int,
    today: LocalDate,
): List<NutritionPoint> {
    val count = days.coerceAtLeast(1)
    val byDate = entries.groupBy { parseLocalDate(it.localDate) }
    return (0 until count).map { index ->
        val date = today.minusDays((count - 1 - index).toLong())
        NutritionPoint(date, sumEntries(byDate[date].orEmpty(), foods, recipes))
    }
}

/** Month buckets use the first local date of the month and keep empty months as zero points. */
fun monthlyNutritionSeries(
    entries: List<MealEntryEntity>,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
    months: Int,
    today: LocalDate,
): List<NutritionPoint> {
    val count = months.coerceAtLeast(1)
    val current = YearMonth.from(today)
    val byMonth = entries.groupBy { entry -> parseLocalDate(entry.localDate)?.let { YearMonth.from(it) } }
    return (0 until count).map { index ->
        val month = current.minusMonths((count - 1 - index).toLong())
        NutritionPoint(
            localDate = month.atDay(1),
            nutrition = sumEntries(byMonth[month].orEmpty(), foods, recipes),
        )
    }
}

data class MacroProgress(
    val available: Boolean = false,
    val ratio: Double? = null,
    val percent: Int? = null,
    val overGoal: Boolean = false,
)

/**
 * Calorie fields mirror the canonical progress fixture; the macro fields expose the same rule
 * for protein/carbs/fat. Over-goal ratios are never clamped.
 */
data class NutritionGoalProgress(
    val available: Boolean = false,
    val ratio: Double? = null,
    val percent: Int? = null,
    val overGoal: Boolean = false,
    val calories: MacroProgress = MacroProgress(),
    val protein: MacroProgress = MacroProgress(),
    val carbs: MacroProgress = MacroProgress(),
    val fat: MacroProgress = MacroProgress(),
)

private fun macroProgress(consumed: Double, target: Double?): MacroProgress {
    if (target == null || !target.isFinite() || target <= 0.0) return MacroProgress()
    val safeConsumed = if (consumed.isFinite()) consumed.coerceAtLeast(0.0) else 0.0
    val ratio = safeConsumed / target
    return MacroProgress(
        available = true,
        ratio = ratio,
        percent = (ratio * 100.0).roundToInt(),
        overGoal = ratio > 1.0,
    )
}

fun nutritionGoalValues(goal: NutritionGoalEntity?): NutritionValues? = goal?.let {
    NutritionValues(it.calories, it.protein, it.carbs, it.fat)
}

/** Missing or zero calorie target is unavailable; over-goal is reported above one. */
fun goalProgress(consumed: NutritionValues, goal: NutritionValues?): NutritionGoalProgress {
    val calories = macroProgress(consumed.calories, goal?.calories)
    return NutritionGoalProgress(
        available = calories.available,
        ratio = calories.ratio,
        percent = calories.percent,
        overGoal = calories.overGoal,
        calories = calories,
        protein = macroProgress(consumed.protein, goal?.protein),
        carbs = macroProgress(consumed.carbs, goal?.carbs),
        fat = macroProgress(consumed.fat, goal?.fat),
    )
}

data class PlannedVsConsumed(
    val planned: NutritionValues = NutritionValues.EMPTY,
    val consumed: NutritionValues = NutritionValues.EMPTY,
)

/** Plans and entries are summed separately; a plan is never inferred from a consumed entry. */
fun plannedVsConsumed(
    plans: List<MealPlanEntity>,
    entries: List<MealEntryEntity>,
    localDate: LocalDate,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): PlannedVsConsumed {
    val key = localDate.toString()
    val foodById = foods.associateBy { it.id }
    val recipesById = recipes.associateBy { it.recipe.id }
    val planned = plans.filter { it.localDate == key }.fold(NutritionValues.EMPTY) { acc, plan ->
        acc + nutritionForRef(plan.foodId, plan.recipeId, plan.quantity, foodById, recipesById)
    }
    val consumed = sumEntries(entries.filter { it.localDate == key }, foods, recipes)
    return PlannedVsConsumed(planned, consumed)
}

data class FoodSummary(
    val localDate: LocalDate,
    val entryCount: Int,
    val plannedCount: Int,
    val nutrition: NutritionValues,
    val planned: NutritionValues,
    val consumed: NutritionValues,
    val goal: NutritionValues?,
    val progress: NutritionGoalProgress,
    val distribution: Map<String, Double>,
)

fun foodSummary(
    entries: List<MealEntryEntity>,
    plans: List<MealPlanEntity>,
    goal: NutritionGoalEntity?,
    localDate: LocalDate,
    foods: List<FoodEntity>,
    recipes: List<RecipeAggregate>,
): FoodSummary {
    val dailyEntries = entries.filter { it.localDate == localDate.toString() }
    val dailyPlans = plans.filter { it.localDate == localDate.toString() }
    val consumed = sumEntries(dailyEntries, foods, recipes)
    val goalForDate = nutritionGoalValues(goal)?.takeIf { goal?.localDate == localDate.toString() }
    val comparison = plannedVsConsumed(plans, entries, localDate, foods, recipes)
    return FoodSummary(
        localDate = localDate,
        entryCount = dailyEntries.size,
        plannedCount = dailyPlans.size,
        nutrition = consumed,
        planned = comparison.planned,
        consumed = comparison.consumed,
        goal = goalForDate,
        progress = goalProgress(consumed, goalForDate),
        distribution = mealTypeDistribution(dailyEntries, foods, recipes),
    )
}

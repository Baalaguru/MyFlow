package com.myflow.app.data

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.io.File
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class FoodRulesTest {

    private companion object {
        const val TOLERANCE = 0.00001
        const val FIXTURE_PATH = "contracts/fixtures/food.nutrition.json"
    }

    private fun fixtureRoot(): File {
        System.getenv("MYFLOW_ROOT")?.let { env ->
            val fromEnv = File(env, FIXTURE_PATH)
            if (fromEnv.exists()) return fromEnv
        }
        var dir = File(System.getProperty("user.dir").orEmpty()).absoluteFile
        repeat(8) {
            val candidate = File(dir, FIXTURE_PATH)
            if (candidate.exists()) return candidate
            dir = dir.parentFile ?: return dir
        }
        error("Cannot locate $FIXTURE_PATH from ${System.getProperty("user.dir").orEmpty()}")
    }

    private fun JsonObject.string(name: String, fallback: String = ""): String =
        if (has(name) && !get(name).isJsonNull) get(name).asString else fallback

    private fun JsonObject.double(name: String, fallback: Double = 0.0): Double =
        if (has(name) && !get(name).isJsonNull) get(name).asDouble else fallback

    private fun JsonObject.int(name: String, fallback: Int = 0): Int =
        if (has(name) && !get(name).isJsonNull) get(name).asInt else fallback

    private fun JsonObject.nullableString(name: String): String? =
        if (has(name) && !get(name).isJsonNull) get(name).asString else null

    private fun JsonObject.array(name: String): JsonArray =
        if (has(name) && get(name).isJsonArray) get(name).asJsonArray else JsonArray()

    private fun nutrition(json: JsonObject) = NutritionValues(
        json.double("calories"),
        json.double("protein"),
        json.double("carbs"),
        json.double("fat"),
    )

    private fun assertNutrition(expected: JsonObject, actual: NutritionValues) {
        assertEquals(expected.double("calories"), actual.calories, TOLERANCE)
        assertEquals(expected.double("protein"), actual.protein, TOLERANCE)
        assertEquals(expected.double("carbs"), actual.carbs, TOLERANCE)
        assertEquals(expected.double("fat"), actual.fat, TOLERANCE)
    }

    private fun food(json: JsonObject) = FoodEntity(
        id = json.string("id"),
        name = json.string("name", json.string("id")),
        servingSize = json.string("servingSize", "serving"),
        servingGrams = json.nullableString("servingGrams")?.toDoubleOrNull(),
        calories = json.double("calories"),
        protein = json.double("protein"),
        carbs = json.double("carbs"),
        fat = json.double("fat"),
        source = json.string("source", "manual"),
        sourceRef = json.nullableString("sourceRef"),
        imageRef = json.nullableString("imageRef"),
        notes = json.nullableString("notes"),
        createdAt = json.string("createdAt", "2026-11-24T00:00:00Z"),
        updatedAt = json.string("updatedAt", "2026-11-24T00:00:00Z"),
    )

    private fun recipe(json: JsonObject): RecipeAggregate {
        val id = json.string("id")
        val ingredients = json.array("ingredients").mapIndexed { index, element: JsonElement ->
            val item = element.asJsonObject
            RecipeIngredientEntity(
                id = item.string("id", "$id:ingredient:$index"),
                recipeId = item.string("recipeId", id),
                foodId = item.string("foodId"),
                quantity = item.double("quantity"),
            )
        }
        val steps = json.array("steps").mapIndexed { index, element: JsonElement ->
            val item = element.asJsonObject
            RecipeStepEntity(
                id = item.string("id", "$id:step:$index"),
                recipeId = item.string("recipeId", id),
                order = item.int("order", index + 1),
                text = item.string("text"),
            )
        }
        return RecipeAggregate(
            recipe = RecipeEntity(
                id = id,
                name = json.string("name", id),
                servings = json.int("servings", 1),
                prepMinutes = json.int("prepMinutes"),
                cookMinutes = json.int("cookMinutes"),
                favorite = json.string("favorite").toBoolean(),
                notes = json.nullableString("notes"),
                imageRef = json.nullableString("imageRef"),
                createdAt = json.string("createdAt", "2026-11-24T00:00:00Z"),
                updatedAt = json.string("updatedAt", "2026-11-24T00:00:00Z"),
            ),
            ingredients = ingredients,
            steps = steps,
        )
    }

    private fun entry(json: JsonObject) = MealEntryEntity(
        id = json.string("id"),
        localDate = json.string("localDate"),
        mealType = json.string("mealType"),
        foodId = json.nullableString("foodId"),
        recipeId = json.nullableString("recipeId"),
        quantity = json.double("quantity"),
        notes = json.nullableString("notes"),
        imageRef = json.nullableString("imageRef"),
        loggedAt = json.string("loggedAt", "${json.string("localDate")}T00:00:00Z"),
    )

    private fun plan(json: JsonObject) = MealPlanEntity(
        id = json.string("id"),
        localDate = json.string("localDate"),
        mealType = json.string("mealType"),
        foodId = json.nullableString("foodId"),
        recipeId = json.nullableString("recipeId"),
        quantity = json.double("quantity"),
        notes = json.nullableString("notes"),
        plannedAt = json.string("plannedAt", "${json.string("localDate")}T00:00:00Z"),
    )

    @Test
    fun fixture_cases_all_match_pure_food_rules() {
        val root = JsonParser.parseString(fixtureRoot().readText()).asJsonObject
        val cases = root.getAsJsonArray("cases")
        assertEquals(7, cases.size())

        cases.forEach { caseElement ->
            val case = caseElement.asJsonObject
            val rule = case.string("rule")
            val input = case.getAsJsonObject("input")
            val expected = case.getAsJsonObject("expected")
            val foods = input.array("foods").map { food(it.asJsonObject) }
            val recipes = input.array("recipes").map { recipe(it.asJsonObject) }
            val entries = input.array("entries").map { entry(it.asJsonObject) }
            val plans = input.array("plans").map { plan(it.asJsonObject) }

            when (rule) {
                "food.entry.nutrition" -> {
                    val actual = entryNutrition(entries.first(), foods, recipes)
                    assertNutrition(expected, actual)
                    assertNutrition(expected, foodNutrition(foods.first(), entries.first().quantity))
                }

                "recipe.perServing" -> {
                    assertNutrition(expected.getAsJsonObject("perServing"), recipeNutritionPerServing(recipes.first(), foods))
                    assertNutrition(expected.getAsJsonObject("entry"), entryNutrition(entries.first(), foods, recipes))
                }

                "daily.nutrition" -> {
                    val date = LocalDate.parse(entries.first().localDate)
                    assertNutrition(expected, dailyNutrition(entries, date, foods, recipes))
                    assertNutrition(expected, dailyNutrition(entries, date.toString(), foods, recipes))
                }

                "goal.progress", "goal.progress.unavailable" -> {
                    val consumed = nutrition(input.getAsJsonObject("consumed"))
                    val goalElement = input.get("goal")
                    val goal = if (goalElement == null || goalElement.isJsonNull) null
                    else nutrition(goalElement.asJsonObject)
                    val actual = goalProgress(consumed, goal)
                    assertEquals(expected.string("available").toBoolean(), actual.available)
                    assertEquals(expected.string("overGoal").toBoolean(), actual.overGoal)
                    if (expected.get("ratio").isJsonNull) {
                        assertNull(actual.ratio)
                        assertNull(actual.percent)
                    } else {
                        assertEquals(expected.double("ratio"), assertNotNull(actual.ratio), TOLERANCE)
                        assertEquals(expected.int("percent"), assertNotNull(actual.percent))
                    }
                }

                "meal.distribution" -> {
                    val actual = mealTypeDistribution(entries, foods, recipes)
                    assertEquals(4, actual.size)
                    mealTypes.forEach { type ->
                        assertEquals(expected.double(type), assertNotNull(actual[type]), TOLERANCE)
                    }
                }

                "planned.vs.consumed" -> {
                    val date = LocalDate.parse(entries.first().localDate)
                    val actual = plannedVsConsumed(plans, entries, date, foods, recipes)
                    assertNutrition(expected.getAsJsonObject("planned"), actual.planned)
                    assertNutrition(expected.getAsJsonObject("consumed"), actual.consumed)
                }

                else -> error("Unhandled fixture rule: $rule")
            }
        }
    }

    @Test
    fun goal_progress_zero_target_is_unavailable_and_over_goal_is_not_clamped() {
        val partiallyMissing = goalProgress(
            NutritionValues(500.0, 30.0, 20.0, 10.0),
            NutritionValues(0.0, 20.0, 0.0, 10.0),
        )
        assertFalse(partiallyMissing.available)
        assertNull(partiallyMissing.ratio)
        assertNull(partiallyMissing.percent)
        assertTrue(partiallyMissing.protein.available)
        assertTrue(partiallyMissing.protein.overGoal)
        assertFalse(partiallyMissing.carbs.available)
        assertFalse(partiallyMissing.carbs.overGoal)

        val over = goalProgress(
            NutritionValues(2000.0, 40.0, 150.0, 25.0),
            NutritionValues(1000.0, 40.0, 150.0, 20.0),
        )
        assertTrue(over.available)
        assertEquals(2.0, assertNotNull(over.ratio), TOLERANCE)
        assertEquals(200, assertNotNull(over.percent))
        assertTrue(over.overGoal)
        assertTrue(over.fat.overGoal)
        assertFalse(over.carbs.overGoal)
    }

    @Test
    fun nutrition_series_keeps_explicit_zero_days() {
        val today = LocalDate.of(2026, 11, 24)
        val entry = MealEntryEntity(
            id = "e1", localDate = "2026-11-23", mealType = "breakfast",
            foodId = "oats", quantity = 2.0, loggedAt = "2026-11-23T08:00:00Z",
        )
        val food = FoodEntity(
            id = "oats", name = "Oats", servingSize = "1 bowl", calories = 100.0,
            protein = 10.0, carbs = 15.0, fat = 2.0,
            createdAt = "2026-11-01T00:00:00Z", updatedAt = "2026-11-01T00:00:00Z",
        )
        val series = nutritionSeries(listOf(entry), listOf(food), emptyList(), 3, today)
        assertEquals(3, series.size)
        assertEquals("2026-11-22", series[0].localDate.toString())
        assertTrue(series[0].nutrition.isEmpty())
        assertEquals(200.0, series[1].nutrition.calories, TOLERANCE)
        assertTrue(series[2].nutrition.isEmpty())
    }
}

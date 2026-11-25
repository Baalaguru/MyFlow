package com.myflow.app.data

import com.google.gson.JsonElement
import com.google.gson.JsonParser
import java.io.File
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CardioRulesTest {

    private companion object {
        const val TOLERANCE = 0.00001
        const val FIXTURE_PATH = "contracts/fixtures/cardio.metrics.json"
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

    private fun JsonElement.plain(): Any? = when {
        isJsonNull -> null
        isJsonPrimitive -> when {
            asJsonPrimitive.isBoolean -> asBoolean
            asJsonPrimitive.isNumber -> asNumber
            else -> asString
        }
        isJsonArray -> asJsonArray.map { it.plain() }
        isJsonObject -> asJsonObject.entrySet().associate { (key, value) -> key to value.plain() }
        else -> null
    }

    private fun assertValue(expected: Any?, actual: Any?) {
        when (expected) {
            null -> assertNull(actual)
            is Number -> assertEquals(expected.toDouble(), assertNotNull(actual as? Number).toDouble(), TOLERANCE)
            is Boolean -> assertEquals(expected, actual)
            is String -> assertEquals(expected, actual)
            is Map<*, *> -> {
                val map = assertNotNull(actual as? Map<*, *>)
                expected.forEach { (key, value) -> assertValue(value, map[key]) }
            }
            is List<*> -> {
                val list = assertNotNull(actual as? List<*>)
                assertEquals(expected.size, list.size)
                expected.forEachIndexed { index, value -> assertValue(value, list[index]) }
            }
            else -> error("Unsupported fixture value: $expected")
        }
    }

    @Test
    fun fixture_cases_all_match_pure_cardio_rules() {
        val root = JsonParser.parseString(fixtureRoot().readText()).asJsonObject
        val cases = root.getAsJsonArray("cases")
        assertEquals(11, cases.size())
        assertEquals(cardioFixtureRuleNames, cases.map { it.asJsonObject.get("rule").asString }.toSet())

        cases.forEach { element ->
            val testCase = element.asJsonObject
            val rule = testCase.get("rule").asString
            val inputValue = assertNotNull(testCase.get("input")?.asJsonObject?.plain())
            val input = inputValue as? Map<String, Any?> ?: error("Fixture input is not an object for $rule")
            val expected = testCase.get("expected")?.plain()
            val actual = evaluateCardioFixture(rule, input)
            val target = if (expected is Map<*, *>) actual else actual["value"]
            assertValue(expected, target)
        }
    }

    private fun stepRecord(
        id: String,
        date: String,
        steps: Int,
        source: String,
        eventId: String,
    ) = StepRecordEntity(
        id = id,
        localDate = date,
        stepCount = steps,
        source = source,
        sourceEventId = eventId,
        createdAt = "2026-11-24T00:00:00Z",
    )

    @Test
    fun daily_steps_dedupe_and_precedence_never_double_count() {
        val date = "2026-11-24"
        val records = listOf(
            stepRecord("1", date, 3000, STEP_SOURCE_SENSOR, "am"),
            stepRecord("2", date, 3000, STEP_SOURCE_SENSOR, "am"),
            stepRecord("3", date, 2000, STEP_SOURCE_SENSOR, "pm"),
            stepRecord("4", date, 900, STEP_SOURCE_SESSION, "walk"),
        )
        assertEquals(5000, dailySteps(records, date))
        val manual = stepRecord("5", date, 6500, STEP_SOURCE_MANUAL, "correction")
        assertEquals(6500, dailySteps(records + manual, date))
        assertNull(dailySteps(records, "2026-11-23"))
        assertNull(dailySteps(listOf(stepRecord("6", date, 0, STEP_SOURCE_MANUAL, "zero")), date))
    }

    @Test
    fun goal_progress_is_unavailable_without_both_values_and_over_goal_is_not_clamped() {
        assertFalse(stepGoalProgress(null, 10_000).available)
        assertFalse(stepGoalProgress(8_000, 0).available)
        val over = stepGoalProgress(12_000, 10_000)
        assertTrue(over.available)
        assertEquals(120, assertNotNull(over.percent))
        assertTrue(over.overGoal)
        val exact = stepGoalProgress(8_000, 10_000)
        assertEquals(80, assertNotNull(exact.percent))
        assertFalse(exact.overGoal)
    }

    @Test
    fun met_calories_are_null_when_weight_or_duration_is_missing() {
        assertNull(metCalories("walking", null, 3600L))
        assertNull(metCalories("walking", 70.0, null))
        assertNull(metCalories("unknown", 70.0, 3600L))
        assertEquals(245.0, assertNotNull(metCalories("walking", 70.0, 3600L)), TOLERANCE)
        assertEquals(413.0, assertNotNull(metCalories("jump_rope", 70.0, 1800L)), TOLERANCE)
    }

    @Test
    fun cycling_pause_stationary_and_speed_filters_use_only_known_values() {
        assertEquals(2400L, cyclingMovingSeconds(3600L, 600L, 600L))
        assertEquals(30.0, assertNotNull(cyclingAverageSpeedKmh(20_000.0, 2400L)), TOLERANCE)
        assertNull(cyclingAverageSpeedKmh(null, 2400L))
        assertNull(cyclingMovingSeconds(null, 600L, 600L))
        assertFalse(accuracyAccepted(75.0))
        assertFalse(speedAccepted(135.0))
        assertFalse(timeDeltaAccepted(500L))
        assertTrue(stationarySpeed(0.5))
        assertFalse(stationarySpeed(null))
    }

    @Test
    fun max_speed_ignores_inaccurate_subsecond_and_incomplete_fixes() {
        val samples = listOf(
            CyclingGpsSample(10.0, 30.0, 1_000L, 12.9716, 80.2707),
            CyclingGpsSample(10.0, 60.0, 1_500L, 12.9717, 80.2708),
            CyclingGpsSample(15.0, 42.5, 13_000L, 12.9725, 80.2715),
            CyclingGpsSample(15.0, 55.0, 13_400L, 12.9726, 80.2716),
            CyclingGpsSample(75.0, 50.0, 41_000L, 12.9740, 80.2730),
            CyclingGpsSample(12.0, 135.0, 61_000L, 12.9750, 80.2740),
            CyclingGpsSample(12.0, 70.0, 81_000L, null, 80.2750),
        )
        assertEquals(42.5, assertNotNull(cyclingMaxSpeedKmh(samples)), TOLERANCE)
        assertNull(cyclingMaxSpeedKmh(samples.take(1))?.let { null })
    }

    @Test
    fun haversine_and_distance_never_infer_missing_points() {
        val distance = assertNotNull(haversineMeters(12.9716, 80.2707, 12.9725, 80.2715))
        assertTrue(distance > 0.0)
        assertNull(haversineMeters(null, 80.2707, 12.9725, 80.2715))
        val samples = listOf(
            CyclingGpsSample(10.0, 10.0, 1_000L, 12.9716, 80.2707),
            CyclingGpsSample(10.0, 10.0, 13_000L, 12.9725, 80.2715),
            CyclingGpsSample(10.0, 0.5, 26_000L, 12.9725, 80.2715),
        )
        assertEquals(distance, assertNotNull(cyclingDistanceMeters(samples)), TOLERANCE)
        assertNull(cyclingDistanceMeters(samples.take(1)))
    }

    @Test
    fun jump_count_source_is_advisory_not_verified() {
        val result = evaluateCardioFixture(
            "cardio.jump.countSource",
            mapOf("jumpCount" to 300, "countSource" to COUNT_SOURCE_SENSOR_ASSISTED),
        )
        assertEquals(COUNT_SOURCE_SENSOR_ASSISTED, result["countSource"])
        assertEquals(false, result["verified"])
        assertEquals(COUNT_SOURCE_MANUAL, CardioRepository.normalizeCountSource("unknown"))
    }

    @Test
    fun combined_summary_keeps_unknown_calories_and_empty_series_buckets() {
        val date = LocalDate.of(2026, 11, 24)
        val walks = listOf(
            WalkingSessionEntity(
                id = "w1", localDate = date.toString(), startedAt = "", endedAt = "",
                stepCount = 0, durationSeconds = 1800L, distanceMeters = 5000.0,
                calories = null, calorieBasis = "unavailable", source = STEP_SOURCE_MANUAL,
                notes = null, createdAt = "", updatedAt = "",
            ),
        )
        val rides = listOf(
            CyclingSessionEntity(
                id = "r1", localDate = date.toString(), startedAt = "", endedAt = "",
                durationSeconds = 2400L, movingSeconds = 2400L, pauseSeconds = 0L,
                stationarySeconds = 0L, distanceMeters = 10000.0, averageSpeedKmh = null,
                maxSpeedKmh = null, sourceQuality = QUALITY_GPS_ACCEPTED, notes = null,
                createdAt = "", updatedAt = "",
            ),
        )
        val summary = combinedCardioSummary(walks, emptyList(), null, emptyList(), rides, date)
        assertEquals(4200L, assertNotNull(summary.durationSeconds))
        assertEquals(15000.0, assertNotNull(summary.distanceMeters), TOLERANCE)
        assertNull(summary.calories)
        assertFalse(summary.available == false && summary.sessionCount == 2)

        val steps = weeklySteps(emptyList(), date, 3)
        assertEquals(3, steps.size)
        assertTrue(steps.all { it.value == null })
        assertEquals("2026-11-22", steps.first().localDate.toString())
    }

    @Test
    fun repository_normalizers_reject_invalid_measurements() {
        assertNull(CardioRepository.normalizeDate("24-11-2026"))
        assertEquals("2026-11-24", CardioRepository.normalizeDate("2026-11-24"))
        assertNull(CardioRepository.normalizeCount(0))
        assertNull(CardioRepository.normalizeDuration(0L))
        assertNull(CardioRepository.normalizeOptionalPositive(Double.NaN))
        assertEquals(STEP_SOURCE_SENSOR, CardioRepository.normalizeSource("SENSOR"))
        assertEquals(QUALITY_UNAVAILABLE, CardioRepository.normalizeQuality("denied"))
        assertEquals("none", CardioRepository.normalizeCalorieBasis(null, "met"))
    }
}

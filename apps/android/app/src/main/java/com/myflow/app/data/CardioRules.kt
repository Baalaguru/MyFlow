package com.myflow.app.data

import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.acos
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

/** Pure cardio rules. Every unavailable measurement stays null; no value is fabricated. */
const val GPS_MAX_ACCURACY_METERS: Double = 50.0
const val GPS_MAX_SPEED_KMH: Double = 120.0
const val GPS_MIN_TIME_DELTA_MS: Long = 1000L
const val STATIONARY_SPEED_KMH: Double = 1.0
const val MET_WALKING: Double = 3.5
const val MET_JUMP_ROPE: Double = 11.8

const val STEP_SOURCE_MANUAL: String = "manual"
const val STEP_SOURCE_SENSOR: String = "sensor"
const val STEP_SOURCE_SESSION: String = "session"
const val COUNT_SOURCE_MANUAL: String = "manual"
const val COUNT_SOURCE_SENSOR_ASSISTED: String = "sensor_assisted"
const val QUALITY_MANUAL: String = "manual"
const val QUALITY_GPS_ACCEPTED: String = "gps_accepted"
const val QUALITY_GPS_FILTERED: String = "gps_filtered"
const val QUALITY_UNAVAILABLE: String = "unavailable"

/** Lower rank wins when several sources report the same day. */
fun stepSourceRank(source: String?): Int = when (source?.trim()?.lowercase()) {
    STEP_SOURCE_MANUAL -> 0
    STEP_SOURCE_SENSOR -> 1
    STEP_SOURCE_SESSION -> 2
    else -> 3
}

private fun positiveInt(value: Int?): Int? = value?.takeIf { it > 0 }

private fun positiveLong(value: Long?): Long? = value?.takeIf { it > 0L }

private fun finitePositive(value: Double?): Double? =
    value?.takeIf { it.isFinite() && it > 0.0 }

private fun finiteNonNegative(value: Double?): Double? =
    value?.takeIf { it.isFinite() && it >= 0.0 }

private fun dedupeStepRecords(records: List<StepRecordEntity>): List<StepRecordEntity> {
    val seen = HashSet<Triple<String, String, String>>()
    return records.filter { record ->
        seen.add(Triple(record.source.trim().lowercase(), record.localDate, record.sourceEventId))
    }
}

/**
 * Daily steps from one source only. A manual entry always wins over a sensor total, which wins
 * over a session summary. Records from losing sources are never added on top, preventing double
 * counting when the phone sensor and a logged session overlap.
 */
fun dailySteps(records: List<StepRecordEntity>, localDate: String): Int? {
    val forDay = dedupeStepRecords(records).filter { it.localDate == localDate }
    if (forDay.isEmpty()) return null
    val bestRank = forDay.minOf { stepSourceRank(it.source) }
    val stepCounts = forDay.filter { stepSourceRank(it.source) == bestRank }
        .mapNotNull { positiveInt(it.stepCount) }
    return if (stepCounts.isEmpty()) null else stepCounts.sum()
}

fun dailySteps(records: List<StepRecordEntity>, localDate: LocalDate): Int? =
    dailySteps(records, localDate.toString())

data class StepGoalProgress(
    val available: Boolean = false,
    val percent: Int? = null,
    val overGoal: Boolean = false,
)

/** Missing steps or a non-positive goal is unavailable; over-goal percentages are not clamped. */
fun stepGoalProgress(steps: Int?, goal: Int?): StepGoalProgress {
    val safeSteps = positiveInt(steps) ?: return StepGoalProgress()
    val safeGoal = positiveInt(goal) ?: return StepGoalProgress()
    val percent = ((safeSteps.toDouble() * 100.0) / safeGoal.toDouble()).roundToInt()
    return StepGoalProgress(available = true, percent = percent, overGoal = safeSteps > safeGoal)
}

/** MET estimate: kcal = MET * body weight (kg) * duration (hours). */
fun metCalories(kind: String?, bodyWeightKg: Double?, durationSeconds: Long?): Double? {
    val met = when (kind?.trim()?.lowercase()) {
        "walking", "walk" -> MET_WALKING
        "jump_rope", "jump rope", "jumprope", "jump" -> MET_JUMP_ROPE
        else -> null
    } ?: return null
    val weight = finitePositive(bodyWeightKg) ?: return null
    val seconds = positiveLong(durationSeconds) ?: return null
    return met * weight * seconds.toDouble() / 3600.0
}

fun cyclingAverageSpeedKmh(distanceMeters: Double?, movingSeconds: Long?): Double? {
    val distance = finiteNonNegative(distanceMeters) ?: return null
    val seconds = positiveLong(movingSeconds) ?: return null
    val kmh = distance * 3.6 / seconds.toDouble()
    return kmh.takeIf { it.isFinite() && it >= 0.0 }
}

data class CyclingGpsSample(
    val accuracyMeters: Double? = null,
    val speedKmh: Double? = null,
    val timeMillis: Long? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
)

fun accuracyAccepted(accuracyMeters: Double?): Boolean {
    val accuracy = finiteNonNegative(accuracyMeters) ?: return false
    return accuracy <= GPS_MAX_ACCURACY_METERS
}

fun speedAccepted(speedKmh: Double?): Boolean {
    val speed = finiteNonNegative(speedKmh) ?: return false
    return speed <= GPS_MAX_SPEED_KMH
}

fun timeDeltaAccepted(deltaMillis: Long?): Boolean = deltaMillis != null && deltaMillis >= GPS_MIN_TIME_DELTA_MS

fun stationarySpeed(speedKmh: Double?): Boolean {
    val speed = finiteNonNegative(speedKmh) ?: return false
    return speed < STATIONARY_SPEED_KMH
}

private fun coordinatesAvailable(sample: CyclingGpsSample): Boolean =
    sample.latitude?.isFinite() == true && sample.longitude?.isFinite() == true

fun acceptedGpsSamples(samples: List<CyclingGpsSample>): List<CyclingGpsSample> =
    samples.filter { sample ->
        accuracyAccepted(sample.accuracyMeters) &&
            (sample.speedKmh == null || speedAccepted(sample.speedKmh)) &&
            coordinatesAvailable(sample)
    }

/**
 * Max speed uses only plausible, independent fixes. A null coordinate or speed, an inaccurate
 * fix, an implausible burst, or a sub-second repeat never contributes a speed value.
 */
fun cyclingMaxSpeedKmh(samples: List<CyclingGpsSample>): Double? {
    val ordered = acceptedGpsSamples(samples).sortedBy { it.timeMillis ?: Long.MAX_VALUE }
    var lastAcceptedTime: Long? = null
    val independent = ordered.filter { sample ->
        val time = sample.timeMillis
        val keep = if (time != null && lastAcceptedTime != null) {
            val gap = time - lastAcceptedTime
            gap < 0L || gap >= GPS_MIN_TIME_DELTA_MS
        } else {
            true
        }
        if (keep && time != null) lastAcceptedTime = time
        keep
    }
    return independent.mapNotNull { finiteNonNegative(it.speedKmh) }.maxOrNull()
}

/** Pause and stationary intervals are excluded, never inferred from missing location data. */
fun cyclingMovingSeconds(durationSeconds: Long?, pauseSeconds: Long?, stationarySeconds: Long?): Long? {
    val duration = positiveLong(durationSeconds) ?: return null
    val pause = (pauseSeconds ?: 0L).coerceAtLeast(0L)
    val stationary = (stationarySeconds ?: 0L).coerceAtLeast(0L)
    return (duration - pause - stationary).coerceAtLeast(0L)
}

/** Haversine distance between two WGS84 points, in metres. */
fun haversineMeters(lat1: Double?, lon1: Double?, lat2: Double?, lon2: Double?): Double? {
    val aLat = lat1?.takeIf { it.isFinite() && it in -90.0..90.0 } ?: return null
    val aLon = lon1?.takeIf { it.isFinite() && it in -180.0..180.0 } ?: return null
    val bLat = lat2?.takeIf { it.isFinite() && it in -90.0..90.0 } ?: return null
    val bLon = lon2?.takeIf { it.isFinite() && it in -180.0..180.0 } ?: return null
    val radians = Math.PI / 180.0
    val dLat = (bLat - aLat) * radians
    val dLon = (bLon - aLon) * radians
    val sinLat = sin(dLat / 2.0)
    val sinLon = sin(dLon / 2.0)
    val h = sinLat * sinLat +
        cos(aLat * radians) * cos(bLat * radians) * sinLon * sinLon
    val centralAngle = 2.0 * acos((1.0 - 2.0 * h).coerceIn(-1.0, 1.0))
    return 6_371_000.0 * centralAngle
}

/** Consecutive accepted fixes at least one second apart; stationary fixes never add distance. */
fun cyclingDistanceMeters(samples: List<CyclingGpsSample>): Double? {
    val accepted = acceptedGpsSamples(samples)
    if (accepted.size < 2) return null
    var total = 0.0
    var found = false
    for (index in 1 until accepted.size) {
        val previous = accepted[index - 1]
        val current = accepted[index]
        val delta = if (previous.timeMillis != null && current.timeMillis != null) {
            current.timeMillis - previous.timeMillis
        } else {
            null
        }
        if (delta != null && !timeDeltaAccepted(delta)) continue
        if (stationarySpeed(current.speedKmh)) continue
        val step = haversineMeters(previous.latitude, previous.longitude, current.latitude, current.longitude)
            ?: continue
        total += step
        found = true
    }
    return if (found) total else null
}

data class WalkingSummary(
    val localDate: LocalDate,
    val steps: Int?,
    val stepGoal: Int?,
    val goalProgress: StepGoalProgress,
    val sessionCount: Int,
    val durationSeconds: Long?,
    val distanceMeters: Double?,
    val calories: Double?,
)

fun walkingSummary(
    sessions: List<WalkingSessionEntity>,
    stepRecords: List<StepRecordEntity>,
    stepGoal: StepGoalEntity?,
    localDate: LocalDate,
): WalkingSummary {
    val key = localDate.toString()
    val daySessions = sessions.filter { it.localDate == key }
    val steps = dailySteps(stepRecords, key)
    val goal = stepGoal?.stepGoal?.takeIf { it > 0 && stepGoal.localDate == key }
    return WalkingSummary(
        localDate = localDate,
        steps = steps,
        stepGoal = goal,
        goalProgress = stepGoalProgress(steps, goal),
        sessionCount = daySessions.size,
        durationSeconds = daySessions.mapNotNull { positiveLong(it.durationSeconds) }.sum().takeIf { daySessions.isNotEmpty() },
        distanceMeters = daySessions.mapNotNull { finiteNonNegative(it.distanceMeters) }.sum()
            .takeIf { daySessions.any { it.distanceMeters != null } },
        calories = daySessions.mapNotNull { finiteNonNegative(it.calories) }.sum()
            .takeIf { daySessions.any { it.calories != null } },
    )
}

data class JumpRopeSummary(
    val localDate: LocalDate,
    val jumpCount: Int?,
    val durationSeconds: Long?,
    val rounds: Int?,
    val restSeconds: Long?,
    val calories: Double?,
    val sessionCount: Int,
    val jumpsPerMinute: Double?,
)

fun jumpRopeSummary(sessions: List<JumpRopeSessionEntity>, localDate: LocalDate): JumpRopeSummary {
    val daySessions = sessions.filter { it.localDate == localDate.toString() }
    val jumps = daySessions.mapNotNull { positiveInt(it.jumpCount) }.sum().takeIf { daySessions.isNotEmpty() }
    val duration = daySessions.mapNotNull { positiveLong(it.durationSeconds) }.sum().takeIf { daySessions.isNotEmpty() }
    val rounds = daySessions.mapNotNull { positiveInt(it.rounds) }.sum().takeIf { daySessions.any { it.rounds > 0 } }
    val rest = daySessions.mapNotNull { it.restSeconds.takeIf { value -> value > 0L } }.sum()
        .takeIf { daySessions.any { it.restSeconds > 0L } }
    val calories = daySessions.mapNotNull { finiteNonNegative(it.calories) }.sum()
        .takeIf { daySessions.any { it.calories != null } }
    val rate = if (jumps != null && duration != null && duration > 0L) {
        jumps.toDouble() * 60.0 / duration.toDouble()
    } else {
        null
    }
    return JumpRopeSummary(
        localDate = localDate,
        jumpCount = jumps,
        durationSeconds = duration,
        rounds = rounds,
        restSeconds = rest,
        calories = calories,
        sessionCount = daySessions.size,
        jumpsPerMinute = rate,
    )
}

data class CyclingSummary(
    val localDate: LocalDate,
    val distanceMeters: Double?,
    val movingSeconds: Long?,
    val durationSeconds: Long?,
    val pauseSeconds: Long?,
    val stationarySeconds: Long?,
    val averageSpeedKmh: Double?,
    val maxSpeedKmh: Double?,
    val sessionCount: Int,
    val gpsAcceptedCount: Int,
)

fun cyclingSummary(sessions: List<CyclingSessionEntity>, localDate: LocalDate): CyclingSummary {
    val daySessions = sessions.filter { it.localDate == localDate.toString() }
    val distance = daySessions.mapNotNull { finiteNonNegative(it.distanceMeters) }.sum()
        .takeIf { daySessions.any { it.distanceMeters != null } }
    val moving = daySessions.mapNotNull { positiveLong(it.movingSeconds) }.sum()
        .takeIf { daySessions.any { it.movingSeconds > 0L } }
    val duration = daySessions.mapNotNull { positiveLong(it.durationSeconds) }.sum()
        .takeIf { daySessions.isNotEmpty() }
    val pause = daySessions.mapNotNull { it.pauseSeconds.takeIf { value -> value > 0L } }.sum()
        .takeIf { daySessions.any { it.pauseSeconds > 0L } }
    val stationary = daySessions.mapNotNull { it.stationarySeconds.takeIf { value -> value > 0L } }.sum()
        .takeIf { daySessions.any { it.stationarySeconds > 0L } }
    val average = if (distance != null && moving != null) cyclingAverageSpeedKmh(distance, moving) else null
    val maxSpeed = daySessions.mapNotNull { finiteNonNegative(it.maxSpeedKmh) }.maxOrNull()
    return CyclingSummary(
        localDate = localDate,
        distanceMeters = distance,
        movingSeconds = moving,
        durationSeconds = duration,
        pauseSeconds = pause,
        stationarySeconds = stationary,
        averageSpeedKmh = average,
        maxSpeedKmh = maxSpeed,
        sessionCount = daySessions.size,
        gpsAcceptedCount = daySessions.count { it.sourceQuality == QUALITY_GPS_ACCEPTED },
    )
}

data class CombinedCardioSummary(
    val localDate: LocalDate,
    val walking: WalkingSummary,
    val jumpRope: JumpRopeSummary,
    val cycling: CyclingSummary,
    val durationSeconds: Long?,
    val distanceMeters: Double?,
    val calories: Double?,
    val sessionCount: Int,
    val available: Boolean,
)

fun combinedCardioSummary(
    walkingSessions: List<WalkingSessionEntity>,
    stepRecords: List<StepRecordEntity>,
    stepGoal: StepGoalEntity?,
    jumpRopeSessions: List<JumpRopeSessionEntity>,
    cyclingSessions: List<CyclingSessionEntity>,
    localDate: LocalDate,
): CombinedCardioSummary {
    val walking = walkingSummary(walkingSessions, stepRecords, stepGoal, localDate)
    val jumpRope = jumpRopeSummary(jumpRopeSessions, localDate)
    val cycling = cyclingSummary(cyclingSessions, localDate)
    val durations = listOfNotNull(walking.durationSeconds, jumpRope.durationSeconds, cycling.durationSeconds)
    val distances = listOfNotNull(walking.distanceMeters, cycling.distanceMeters)
    val calories = listOfNotNull(walking.calories, jumpRope.calories)
    val sessionCount = walking.sessionCount + jumpRope.sessionCount + cycling.sessionCount
    return CombinedCardioSummary(
        localDate = localDate,
        walking = walking,
        jumpRope = jumpRope,
        cycling = cycling,
        durationSeconds = durations.sum().takeIf { durations.isNotEmpty() },
        distanceMeters = distances.sum().takeIf { distances.isNotEmpty() },
        calories = calories.sum().takeIf { calories.isNotEmpty() },
        sessionCount = sessionCount,
        available = sessionCount > 0 || walking.steps != null,
    )
}

data class CardioPoint(val localDate: LocalDate, val value: Double?)

/** Every bucket is present; a day with no data holds null rather than a synthetic zero. */
fun weeklySeries(days: Int, today: LocalDate, valueForDate: (LocalDate) -> Double?): List<CardioPoint> {
    val count = days.coerceAtLeast(1)
    return (0 until count).map { index ->
        val date = today.minusDays((count - 1 - index).toLong())
        CardioPoint(date, valueForDate(date))
    }
}

fun monthlySeries(months: Int, today: LocalDate, valueForDate: (LocalDate) -> Double?): List<CardioPoint> {
    val count = months.coerceAtLeast(1)
    val current = YearMonth.from(today)
    return (0 until count).map { index ->
        val month = current.minusMonths((count - 1 - index).toLong())
        val date = month.atDay(1)
        CardioPoint(date, valueForDate(date))
    }
}

fun weeklySteps(records: List<StepRecordEntity>, today: LocalDate, days: Int = 7): List<CardioPoint> =
    weeklySeries(days, today) { date -> dailySteps(records, date)?.toDouble() }

fun monthlySteps(records: List<StepRecordEntity>, today: LocalDate, months: Int = 6): List<CardioPoint> {
    val byMonth = records.groupBy { runCatching { YearMonth.parse(it.localDate.substring(0, 7)) }.getOrNull() }
    return monthlySeries(months, today) { date ->
        val month = YearMonth.from(date)
        val dayTotals = byMonth[month].orEmpty().groupBy { it.localDate }
            .mapNotNull { (day, rows) -> dailySteps(rows, day) }
        dayTotals.sum().takeIf { dayTotals.isNotEmpty() }?.toDouble()
    }
}

fun weeklyDistance(sessions: List<CyclingSessionEntity>, today: LocalDate, days: Int = 7): List<CardioPoint> =
    weeklySeries(days, today) { date -> cyclingSummary(sessions, date).distanceMeters }

fun monthlyDistance(sessions: List<CyclingSessionEntity>, today: LocalDate, months: Int = 6): List<CardioPoint> =
    monthlySeries(months, today) { date ->
        val month = YearMonth.from(date)
        val totals = sessions.filter { runCatching { YearMonth.parse(it.localDate.substring(0, 7)) }.getOrNull() == month }
            .mapNotNull { it.distanceMeters }
        totals.sum().takeIf { totals.isNotEmpty() }
    }

fun weeklyDuration(
    walkingSessions: List<WalkingSessionEntity>,
    jumpRopeSessions: List<JumpRopeSessionEntity>,
    cyclingSessions: List<CyclingSessionEntity>,
    today: LocalDate,
    days: Int = 7,
): List<CardioPoint> = weeklySeries(days, today) { date ->
    val totals = listOfNotNull(
        walkingSummary(walkingSessions, emptyList(), null, date).durationSeconds,
        jumpRopeSummary(jumpRopeSessions, date).durationSeconds,
        cyclingSummary(cyclingSessions, date).durationSeconds,
    )
    totals.sum().takeIf { totals.isNotEmpty() }?.toDouble()
}

fun monthlyDuration(
    walkingSessions: List<WalkingSessionEntity>,
    jumpRopeSessions: List<JumpRopeSessionEntity>,
    cyclingSessions: List<CyclingSessionEntity>,
    today: LocalDate,
    months: Int = 6,
): List<CardioPoint> = monthlySeries(months, today) { date ->
    val month = YearMonth.from(date)
    val dated = walkingSessions.map { it.localDate to it.durationSeconds } +
        jumpRopeSessions.map { it.localDate to it.durationSeconds } +
        cyclingSessions.map { it.localDate to it.durationSeconds }
    val totals = dated
        .filter { (localDate, _) -> runCatching { YearMonth.parse(localDate.substring(0, 7)) }.getOrNull() == month }
        .mapNotNull { (_, seconds) -> positiveLong(seconds) }
    totals.sum().takeIf { totals.isNotEmpty() }?.toDouble()
}

fun cyclingSpeedSeries(sessions: List<CyclingSessionEntity>, today: LocalDate, days: Int = 7): List<CardioPoint> =
    weeklySeries(days, today) { date -> cyclingSummary(sessions, date).averageSpeedKmh }

fun jumpRopePerformanceSeries(sessions: List<JumpRopeSessionEntity>, today: LocalDate, days: Int = 7): List<CardioPoint> =
    weeklySeries(days, today) { date -> jumpRopeSummary(sessions, date).jumpsPerMinute }

/** Canonical fixture rule names shared with the web client and validator. */
val cardioFixtureRuleNames: Set<String> = setOf(
    "cardio.steps.daily",
    "cardio.steps.dedupe",
    "cardio.steps.sourcePrecedence",
    "cardio.steps.unavailable",
    "cardio.walking.goalProgress",
    "cardio.cycling.averageSpeed",
    "cardio.cycling.pauseExcluded",
    "cardio.cycling.maxSpeed",
    "cardio.jump.countSource",
    "cardio.calories.met",
    "cardio.combined.summary",
)

@Suppress("UNCHECKED_CAST")
private fun Any?.asMap(): Map<String, Any?> = this as? Map<String, Any?> ?: emptyMap()

@Suppress("UNCHECKED_CAST")
private fun Any?.asList(): List<Any?> = this as? List<Any?> ?: emptyList()

private fun Any?.asText(): String? = when (this) {
    is String -> trim().takeIf { it.isNotEmpty() }
    is Number -> toString()
    else -> null
}

private fun Any?.asNumber(): Double? = when (this) {
    is Number -> toDouble().takeIf { it.isFinite() }
    is String -> trim().toDoubleOrNull()?.takeIf { it.isFinite() }
    else -> null
}

private fun Any?.asInteger(): Int? = asNumber()?.toInt()

private fun Any?.asLongValue(): Long? = asNumber()?.toLong()

private fun Map<String, Any?>.firstOf(vararg names: String): Any? =
    names.firstOrNull { get(it) != null }?.let { get(it) }

private fun inputRecord(item: Any?, fallbackDate: String): StepRecordEntity {
    val map = item.asMap()
    return StepRecordEntity(
        id = map.firstOf("id").asText() ?: "step:${map.firstOf("sourceEventId").asText().orEmpty()}",
        localDate = map.firstOf("localDate", "date").asText() ?: fallbackDate,
        stepCount = map.firstOf("stepCount", "steps", "value").asInteger() ?: 0,
        source = map.firstOf("source").asText() ?: STEP_SOURCE_MANUAL,
        sourceEventId = map.firstOf("sourceEventId", "eventId").asText().orEmpty(),
        createdAt = map.firstOf("createdAt").asText().orEmpty(),
    )
}

private fun inputSample(item: Any?): CyclingGpsSample {
    val map = item.asMap()
    val recordedAt = map.firstOf("recordedAt").asText()
    val recordedMillis = recordedAt?.let { value ->
        runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()
    }
    return CyclingGpsSample(
        accuracyMeters = map.firstOf("accuracyMeters", "accuracy").asNumber(),
        speedKmh = map.firstOf("speedKmh", "speed", "currentSpeedKmh").asNumber(),
        timeMillis = map.firstOf("timeMillis", "timestampMillis", "time").asLongValue()
            ?: recordedMillis,
        latitude = map.firstOf("latitude", "lat").asNumber(),
        longitude = map.firstOf("longitude", "lon", "lng").asNumber(),
    )
}

private fun goalNumber(value: Any?): Int? = when (value) {
    is Map<*, *> -> (value["stepGoal"] ?: value["goal"]).asInteger()
    else -> value.asInteger()
}

private fun sessionItems(value: Any?): List<Any?> = when (value) {
    is List<*> -> value
    is Map<*, *> -> listOf(value)
    else -> emptyList()
}

private fun nonNegativeNumber(value: Any?): Double? = value.asNumber()?.takeIf { it >= 0.0 }

private fun inputWalking(item: Any?, fallbackDate: String): WalkingSessionEntity {
    val map = item.asMap()
    return WalkingSessionEntity(
        id = map.firstOf("id").asText() ?: "walk:fixture",
        localDate = map.firstOf("localDate", "date").asText() ?: fallbackDate,
        startedAt = map.firstOf("startedAt").asText().orEmpty(),
        endedAt = map.firstOf("endedAt").asText().orEmpty(),
        stepCount = map.firstOf("stepCount", "steps").asInteger() ?: 0,
        durationSeconds = map.firstOf("durationSeconds", "duration").asLongValue() ?: 0L,
        distanceMeters = nonNegativeNumber(map.firstOf("distanceMeters", "distance")),
        calories = nonNegativeNumber(map.firstOf("calories")),
        bodyWeightKg = nonNegativeNumber(map.firstOf("bodyWeightKg", "weightKg", "weight")),
        calorieBasis = map.firstOf("calorieBasis").asText() ?: "unavailable",
        source = map.firstOf("source").asText() ?: STEP_SOURCE_MANUAL,
        notes = map.firstOf("notes").asText(),
        createdAt = map.firstOf("createdAt").asText().orEmpty(),
        updatedAt = map.firstOf("updatedAt").asText().orEmpty(),
    )
}

private fun inputJumpRope(item: Any?, fallbackDate: String): JumpRopeSessionEntity {
    val map = item.asMap()
    return JumpRopeSessionEntity(
        id = map.firstOf("id").asText() ?: "jump:fixture",
        localDate = map.firstOf("localDate", "date").asText() ?: fallbackDate,
        startedAt = map.firstOf("startedAt").asText().orEmpty(),
        endedAt = map.firstOf("endedAt").asText().orEmpty(),
        durationSeconds = map.firstOf("durationSeconds", "duration").asLongValue() ?: 0L,
        jumpCount = map.firstOf("jumpCount", "jumps", "count").asInteger() ?: 0,
        countSource = map.firstOf("countSource").asText() ?: COUNT_SOURCE_MANUAL,
        rounds = map.firstOf("rounds").asInteger() ?: 0,
        restSeconds = map.firstOf("restSeconds", "rest").asLongValue() ?: 0L,
        calories = nonNegativeNumber(map.firstOf("calories")),
        bodyWeightKg = nonNegativeNumber(map.firstOf("bodyWeightKg", "weightKg", "weight")),
        calorieBasis = map.firstOf("calorieBasis").asText() ?: "unavailable",
        notes = map.firstOf("notes").asText(),
        createdAt = map.firstOf("createdAt").asText().orEmpty(),
        updatedAt = map.firstOf("updatedAt").asText().orEmpty(),
    )
}

private fun inputCycling(item: Any?, fallbackDate: String): CyclingSessionEntity {
    val map = item.asMap()
    return CyclingSessionEntity(
        id = map.firstOf("id").asText() ?: "ride:fixture",
        localDate = map.firstOf("localDate", "date").asText() ?: fallbackDate,
        startedAt = map.firstOf("startedAt").asText().orEmpty(),
        endedAt = map.firstOf("endedAt").asText().orEmpty(),
        durationSeconds = map.firstOf("durationSeconds", "duration").asLongValue() ?: 0L,
        movingSeconds = map.firstOf("movingSeconds", "moving").asLongValue() ?: 0L,
        pauseSeconds = map.firstOf("pauseSeconds", "pause").asLongValue() ?: 0L,
        stationarySeconds = map.firstOf("stationarySeconds", "stationary").asLongValue() ?: 0L,
        distanceMeters = nonNegativeNumber(map.firstOf("distanceMeters", "distance")),
        averageSpeedKmh = nonNegativeNumber(map.firstOf("averageSpeedKmh", "averageSpeed")),
        maxSpeedKmh = nonNegativeNumber(map.firstOf("maxSpeedKmh", "maxSpeed")),
        sourceQuality = map.firstOf("sourceQuality").asText() ?: QUALITY_MANUAL,
        notes = map.firstOf("notes").asText(),
        createdAt = map.firstOf("createdAt").asText().orEmpty(),
        updatedAt = map.firstOf("updatedAt").asText().orEmpty(),
    )
}

private fun stepsResult(steps: Int?): Map<String, Any?> = mapOf(
    "value" to steps,
    "steps" to steps,
    "dailySteps" to steps,
    "totalSteps" to steps,
    "available" to (steps != null),
)

/**
 * Pure dispatch used by the JVM fixture test. Inputs are plain maps so the same rules can be
 * exercised from JSON without any Android dependency. Unrecognised rules return an empty map.
 */
fun evaluateCardioFixture(rule: String, input: Map<String, Any?>): Map<String, Any?> {
    val fallbackDate = input.firstOf("localDate", "date").asText() ?: "2026-11-24"
    val records = input.firstOf("records", "stepRecords").asList().map { inputRecord(it, fallbackDate) }
    return when (rule) {
        "cardio.steps.daily", "cardio.steps.dedupe", "cardio.steps.sourcePrecedence", "cardio.steps.unavailable" ->
            stepsResult(dailySteps(records, fallbackDate))

        "cardio.walking.goalProgress" -> {
            val progress = stepGoalProgress(
                input.firstOf("steps", "dailySteps").asInteger(),
                goalNumber(input.firstOf("goal", "stepGoal")),
            )
            mapOf(
                "value" to progress.percent,
                "available" to progress.available,
                "percent" to progress.percent,
                "overGoal" to progress.overGoal,
                "over_goal" to progress.overGoal,
            )
        }

        "cardio.cycling.averageSpeed" -> {
            val average = cyclingAverageSpeedKmh(
                input.firstOf("distanceMeters", "distance").asNumber(),
                input.firstOf("movingSeconds", "moving").asLongValue(),
            )
            mapOf("value" to average, "averageSpeedKmh" to average, "kmh" to average)
        }

        "cardio.cycling.pauseExcluded" -> {
            val moving = cyclingMovingSeconds(
                input.firstOf("durationSeconds", "duration").asLongValue(),
                input.firstOf("pauseSeconds", "pause").asLongValue(),
                input.firstOf("stationarySeconds", "stationary").asLongValue(),
            )
            val average = cyclingAverageSpeedKmh(
                input.firstOf("distanceMeters", "distance").asNumber(),
                moving,
            )
            mapOf(
                "value" to moving,
                "movingSeconds" to moving,
                "averageSpeedKmh" to average,
            )
        }

        "cardio.cycling.maxSpeed" -> {
            val max = cyclingMaxSpeedKmh(input.firstOf("samples", "points").asList().map(::inputSample))
            mapOf("value" to max, "maxSpeedKmh" to max)
        }

        "cardio.jump.countSource" -> {
            val source = input.firstOf("countSource", "source").asText()?.trim()?.lowercase()
            val normalized = if (source == COUNT_SOURCE_SENSOR_ASSISTED) COUNT_SOURCE_SENSOR_ASSISTED else COUNT_SOURCE_MANUAL
            val jumps = input.firstOf("jumpCount", "jumps", "count").asInteger()
            mapOf(
                "value" to jumps,
                "jumpCount" to jumps,
                "countSource" to normalized,
                "sensorAssisted" to (normalized == COUNT_SOURCE_SENSOR_ASSISTED),
                "verified" to false,
            )
        }

        "cardio.calories.met" -> {
            val weight = input.firstOf("bodyWeightKg", "weightKg", "weight").asNumber()
            val walkingMap = input.firstOf("walking").asMap()
            val jumpMap = input.firstOf("jumpRope").asMap()
            val walkingCalories = if (walkingMap.isEmpty()) {
                null
            } else {
                metCalories(
                    "walking",
                    nonNegativeNumber(walkingMap.firstOf("bodyWeightKg", "weightKg", "weight")) ?: weight,
                    walkingMap.firstOf("durationSeconds", "duration").asLongValue(),
                )
            }
            val jumpCalories = if (jumpMap.isEmpty()) {
                null
            } else {
                metCalories(
                    "jump_rope",
                    nonNegativeNumber(jumpMap.firstOf("bodyWeightKg", "weightKg", "weight")) ?: weight,
                    jumpMap.firstOf("durationSeconds", "duration").asLongValue(),
                )
            }
            val scalar = metCalories(
                input.firstOf("kind", "activity", "type").asText(),
                weight,
                input.firstOf("durationSeconds", "duration").asLongValue(),
            )
            mapOf(
                "value" to (walkingCalories ?: jumpCalories ?: scalar),
                "calories" to scalar,
                "kcal" to scalar,
                "walking" to walkingCalories,
                "jumpRope" to jumpCalories,
            )
        }

        "cardio.combined.summary" -> {
            val walks = sessionItems(input.firstOf("walkingSessions", "walking"))
                .map { inputWalking(it, fallbackDate) }
            val jumps = sessionItems(input.firstOf("jumpRopeSessions", "jumpRope"))
                .map { inputJumpRope(it, fallbackDate) }
            val rides = sessionItems(input.firstOf("cyclingSessions", "cycling"))
                .map { inputCycling(it, fallbackDate) }
            val allRecords = input.firstOf("stepRecords", "records").asList()
                .map { inputRecord(it, fallbackDate) }
            val goalValue = goalNumber(input.firstOf("stepGoal", "goal"))
            val goalEntity = goalValue?.let { value ->
                StepGoalEntity(
                    id = "goal:$fallbackDate",
                    localDate = fallbackDate,
                    stepGoal = value,
                    updatedAt = "",
                )
            }
            val summary = combinedCardioSummary(
                walks,
                allRecords,
                goalEntity,
                jumps,
                rides,
                runCatching { LocalDate.parse(fallbackDate) }.getOrDefault(LocalDate.now()),
            )
            mapOf(
                "value" to summary.durationSeconds,
                "durationSeconds" to summary.durationSeconds,
                "distanceMeters" to summary.distanceMeters,
                "distanceAvailable" to (summary.distanceMeters != null),
                "calories" to summary.calories,
                "caloriesAvailable" to (summary.calories != null),
                "sessionCount" to summary.sessionCount,
                "steps" to summary.walking.steps,
                "available" to summary.available,
            )
        }

        else -> emptyMap()
    }
}

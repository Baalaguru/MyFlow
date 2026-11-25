package com.myflow.app.data

import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * Local-first cardio repository. The validation boundary never invents a measurement: absent
 * sensor or GPS data stays null, and step records are appended once and never overwritten.
 */
class CardioRepository(private val dao: CardioDao) {

    fun observeWalkingSessions(): Flow<List<WalkingSessionEntity>> = dao.observeWalkingSessions()
    fun observeStepRecords(): Flow<List<StepRecordEntity>> = dao.observeStepRecords()
    fun observeStepGoals(): Flow<List<StepGoalEntity>> = dao.observeStepGoals()
    fun observeJumpRopeSessions(): Flow<List<JumpRopeSessionEntity>> = dao.observeJumpRopeSessions()
    fun observeCyclingSessions(): Flow<List<CyclingSessionEntity>> = dao.observeCyclingSessions()

    suspend fun walkingSessions(): List<WalkingSessionEntity> = dao.walkingSessions()
    suspend fun stepRecords(): List<StepRecordEntity> = dao.stepRecords()
    suspend fun stepRecordsForDate(localDate: String): List<StepRecordEntity> =
        dao.stepRecordsForDate(normalizeDate(localDate) ?: LocalDate.now().toString())

    suspend fun stepGoals(): List<StepGoalEntity> = dao.stepGoals()
    suspend fun jumpRopeSessions(): List<JumpRopeSessionEntity> = dao.jumpRopeSessions()
    suspend fun cyclingSessions(): List<CyclingSessionEntity> = dao.cyclingSessions()

    suspend fun saveWalkingSession(session: WalkingSessionEntity): Boolean {
        val stepCount = normalizeCount(session.stepCount) ?: return false
        val duration = normalizeDuration(session.durationSeconds) ?: return false
        val now = Instant.now().toString()
        dao.saveWalkingSession(
            session.copy(
                id = session.id.ifBlank { UUID.randomUUID().toString() },
                localDate = normalizeDate(session.localDate) ?: LocalDate.now().toString(),
                startedAt = normalizeInstant(session.startedAt, now),
                endedAt = normalizeInstant(session.endedAt, now),
                stepCount = stepCount,
                durationSeconds = duration,
                distanceMeters = normalizeOptionalPositive(session.distanceMeters),
                calories = normalizeOptionalPositive(session.calories),
                bodyWeightKg = normalizeOptionalPositive(session.bodyWeightKg),
                calorieBasis = normalizeCalorieBasis(session.calories, session.calorieBasis),
                source = normalizeSource(session.source),
                notes = normalizeText(session.notes),
                createdAt = session.createdAt.ifBlank { now },
                updatedAt = now,
            ),
        )
        return true
    }

    suspend fun deleteWalkingSession(id: String) = dao.deleteWalkingSession(id)

    /**
     * Append-only step ledger. An existing (source, localDate, sourceEventId) triple is left
     * untouched and the call returns false; no overwrite or second row is created.
     */
    suspend fun addStepRecord(record: StepRecordEntity): Boolean {
        val stepCount = normalizeCount(record.stepCount) ?: return false
        val source = normalizeSource(record.source)
        val localDate = normalizeDate(record.localDate) ?: LocalDate.now().toString()
        val eventId = normalizeText(record.sourceEventId) ?: return false
        if (dao.stepRecordForEvent(source, localDate, eventId) != null) return false
        dao.insertStepRecord(
            record.copy(
                id = record.id.ifBlank { UUID.randomUUID().toString() },
                localDate = localDate,
                stepCount = stepCount,
                source = source,
                sourceEventId = eventId,
                createdAt = normalizeInstant(record.createdAt, Instant.now().toString()),
            ),
        )
        return true
    }

    suspend fun addStepRecord(
        localDate: String,
        stepCount: Int,
        source: String,
        sourceEventId: String,
    ): Boolean = addStepRecord(
        StepRecordEntity(
            id = UUID.randomUUID().toString(),
            localDate = localDate,
            stepCount = stepCount,
            source = source,
            sourceEventId = sourceEventId,
            createdAt = Instant.now().toString(),
        ),
    )

    /** Batch append for sensor batches; duplicates are skipped, never replaced. */
    suspend fun addStepRecords(records: List<StepRecordEntity>): Int {
        val now = Instant.now().toString()
        val prepared = records.mapNotNull { record ->
            val count = normalizeCount(record.stepCount) ?: return@mapNotNull null
            val source = normalizeSource(record.source)
            val localDate = normalizeDate(record.localDate) ?: LocalDate.now().toString()
            val eventId = normalizeText(record.sourceEventId) ?: return@mapNotNull null
            if (dao.stepRecordForEvent(source, localDate, eventId) != null) return@mapNotNull null
            record.copy(
                id = record.id.ifBlank { UUID.randomUUID().toString() },
                localDate = localDate,
                stepCount = count,
                source = source,
                sourceEventId = eventId,
                createdAt = normalizeInstant(record.createdAt, now),
            )
        }
        if (prepared.isEmpty()) return 0
        dao.insertStepRecords(prepared)
        return prepared.size
    }

    suspend fun deleteStepRecord(id: String) = dao.deleteStepRecord(id)

    suspend fun getStepGoal(localDate: String): StepGoalEntity? =
        dao.stepGoalForDate(normalizeDate(localDate) ?: LocalDate.now().toString())

    suspend fun setStepGoal(localDate: String, stepGoal: Int): Boolean {
        val date = normalizeDate(localDate) ?: return false
        val goal = normalizeCount(stepGoal) ?: return false
        dao.saveStepGoal(
            StepGoalEntity(
                id = "goal:$date",
                localDate = date,
                stepGoal = goal,
                updatedAt = Instant.now().toString(),
            ),
        )
        return true
    }

    suspend fun saveJumpRopeSession(session: JumpRopeSessionEntity): Boolean {
        val jumpCount = normalizeCount(session.jumpCount) ?: return false
        val duration = normalizeDuration(session.durationSeconds) ?: return false
        val now = Instant.now().toString()
        dao.saveJumpRopeSession(
            session.copy(
                id = session.id.ifBlank { UUID.randomUUID().toString() },
                localDate = normalizeDate(session.localDate) ?: LocalDate.now().toString(),
                startedAt = normalizeInstant(session.startedAt, now),
                endedAt = normalizeInstant(session.endedAt, now),
                durationSeconds = duration,
                jumpCount = jumpCount,
                countSource = normalizeCountSource(session.countSource),
                rounds = session.rounds.coerceAtLeast(0),
                restSeconds = session.restSeconds.coerceAtLeast(0L),
                calories = normalizeOptionalPositive(session.calories),
                bodyWeightKg = normalizeOptionalPositive(session.bodyWeightKg),
                calorieBasis = normalizeCalorieBasis(session.calories, session.calorieBasis),
                notes = normalizeText(session.notes),
                createdAt = session.createdAt.ifBlank { now },
                updatedAt = now,
            ),
        )
        return true
    }

    suspend fun deleteJumpRopeSession(id: String) = dao.deleteJumpRopeSession(id)

    suspend fun saveCyclingSession(session: CyclingSessionEntity): Boolean {
        val duration = normalizeDuration(session.durationSeconds) ?: return false
        val now = Instant.now().toString()
        val moving = session.movingSeconds.coerceIn(0L, duration)
        val pause = session.pauseSeconds.coerceAtLeast(0L)
        val stationary = session.stationarySeconds.coerceAtLeast(0L)
        dao.saveCyclingSession(
            session.copy(
                id = session.id.ifBlank { UUID.randomUUID().toString() },
                localDate = normalizeDate(session.localDate) ?: LocalDate.now().toString(),
                startedAt = normalizeInstant(session.startedAt, now),
                endedAt = normalizeInstant(session.endedAt, now),
                durationSeconds = duration,
                movingSeconds = moving,
                pauseSeconds = pause,
                stationarySeconds = stationary,
                distanceMeters = normalizeOptionalPositive(session.distanceMeters),
                averageSpeedKmh = normalizeOptionalPositive(session.averageSpeedKmh),
                maxSpeedKmh = normalizeOptionalPositive(session.maxSpeedKmh),
                sourceQuality = normalizeQuality(session.sourceQuality),
                notes = normalizeText(session.notes),
                createdAt = session.createdAt.ifBlank { now },
                updatedAt = now,
            ),
        )
        return true
    }

    suspend fun deleteCyclingSession(id: String) = dao.deleteCyclingSession(id)

    companion object {
        fun normalizeText(value: String?): String? = value?.trim()?.takeIf { it.isNotEmpty() }

        fun normalizeDate(value: String?): String? =
            value?.trim()?.takeIf { Regex("\\d{4}-\\d{2}-\\d{2}").matches(it) }

        fun normalizeInstant(value: String?, fallback: String): String =
            value?.trim()?.takeIf { it.isNotEmpty() } ?: fallback

        fun normalizeCount(value: Int?): Int? = value?.takeIf { it > 0 }

        fun normalizeDuration(value: Long?): Long? = value?.takeIf { it > 0L }

        fun normalizeOptionalPositive(value: Double?): Double? =
            value?.takeIf { it.isFinite() && it > 0.0 }

        fun normalizeSource(value: String?): String = when (value?.trim()?.lowercase()) {
            STEP_SOURCE_SENSOR -> STEP_SOURCE_SENSOR
            STEP_SOURCE_SESSION -> STEP_SOURCE_SESSION
            else -> STEP_SOURCE_MANUAL
        }

        fun normalizeCountSource(value: String?): String =
            if (value?.trim()?.lowercase() == COUNT_SOURCE_SENSOR_ASSISTED) {
                COUNT_SOURCE_SENSOR_ASSISTED
            } else {
                COUNT_SOURCE_MANUAL
            }

        fun normalizeQuality(value: String?): String = when (value?.trim()?.lowercase()) {
            QUALITY_GPS_ACCEPTED -> QUALITY_GPS_ACCEPTED
            QUALITY_GPS_FILTERED -> QUALITY_GPS_FILTERED
            QUALITY_UNAVAILABLE, "denied", "signal_lost", "permission_denied" -> QUALITY_UNAVAILABLE
            else -> QUALITY_MANUAL
        }

        fun normalizeCalorieBasis(calories: Double?, value: String?): String =
            if (normalizeOptionalPositive(calories) != null && value?.trim()?.lowercase() == "met") {
                "met"
            } else if (normalizeOptionalPositive(calories) != null) {
                "manual"
            } else {
                "none"
            }
    }
}

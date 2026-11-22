package com.myflow.app.data

import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class HabitInput(
    val name: String,
    val description: String = "",
    val icon: String = "",
    val accent: String = "",
    val scheduleType: String = "daily",
    val weekdays: Set<Int> = setOf(0, 1, 2, 3, 4, 5, 6),
    val target: Int? = null,
    val reminderOffsetMinutes: Int? = null,
    val paused: Boolean = false,
    val archived: Boolean = false,
)

class HabitRepository(private val dao: HabitDao) {
    fun observeHabits(): Flow<List<HabitEntity>> = dao.observeAll()
    fun observeLogs(): Flow<List<HabitLogEntity>> = dao.observeLogs()
    fun observeMascot(): Flow<MascotStateEntity?> = dao.observeMascot()

    suspend fun create(input: HabitInput) {
        val name = input.name.trim()
        if (name.isBlank()) return
        dao.save(
            HabitEntity(
                id = UUID.randomUUID().toString(),
                name = name,
                description = input.description.trim(),
                icon = input.icon.trim(),
                accent = input.accent.trim(),
                scheduleType = input.scheduleType,
                weekdays = input.weekdays.sorted().joinToString(","),
                target = input.target,
                reminderOffsetMinutes = input.reminderOffsetMinutes,
                paused = input.paused,
                archived = input.archived,
                createdAt = Instant.now().toString(),
            ),
        )
    }

    suspend fun update(id: String, input: HabitInput) {
        val current = dao.get(id) ?: return
        val name = input.name.trim()
        if (name.isBlank()) return
        dao.save(
            current.copy(
                name = name,
                description = input.description.trim(),
                icon = input.icon.trim(),
                accent = input.accent.trim(),
                scheduleType = input.scheduleType,
                weekdays = input.weekdays.sorted().joinToString(","),
                target = input.target,
                reminderOffsetMinutes = input.reminderOffsetMinutes,
                paused = input.paused,
                archived = input.archived,
            ),
        )
    }

    suspend fun delete(id: String) {
        dao.delete(id)
        dao.deleteLogsForHabit(id)
    }

    suspend fun setPaused(id: String, paused: Boolean) {
        dao.get(id)?.let { dao.save(it.copy(paused = paused)) }
    }

    suspend fun setArchived(id: String, archived: Boolean) {
        dao.get(id)?.let { dao.save(it.copy(archived = archived, paused = if (archived) false else it.paused)) }
    }

    suspend fun setLog(habitId: String, localDate: LocalDate, status: HabitLogStatus, value: Int? = null) {
        val existing = dao.logForDay(habitId, localDate.toString())
        val now = Instant.now().toString()
        dao.saveLog(
            HabitLogEntity(
                id = existing?.id ?: UUID.randomUUID().toString(),
                habitId = habitId,
                localDate = localDate.toString(),
                status = status.key,
                value = if (status == HabitLogStatus.DONE) value else null,
                completedAt = if (status == HabitLogStatus.DONE) now else null,
                createdAt = existing?.createdAt ?: now,
            ),
        )
    }

    suspend fun clearLog(habitId: String, localDate: LocalDate) {
        dao.clearLog(habitId, localDate.toString())
    }

    suspend fun saveMascot(companion: String, plantStyle: String, animationsEnabled: Boolean) {
        dao.saveMascot(
            MascotStateEntity(
                id = "default",
                companion = companion,
                plantStyle = plantStyle,
                animationsEnabled = animationsEnabled,
                updatedAt = Instant.now().toString(),
            ),
        )
    }
}
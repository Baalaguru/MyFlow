package com.myflow.app.data

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToInt

enum class HabitLogStatus(val key: String) {
    DONE("done"), SKIPPED("skipped"), REST("rest");

    companion object {
        fun from(value: String): HabitLogStatus = entries.firstOrNull { it.key == value } ?: DONE
    }
}

data class HabitStats(
    val currentStreak: Int,
    val longestStreak: Int,
    val daily: ProgressSnapshot,
    val weekly: ProgressSnapshot,
    val monthly: ProgressSnapshot,
)

data class MascotProgress(val completedDays: Int, val stage: String, val nextThreshold: Int, val percent: Int)

private fun parseDate(value: String): LocalDate? = runCatching { LocalDate.parse(value) }.getOrNull()

fun habitWeekdays(entity: HabitEntity): Set<Int> =
    entity.weekdays.split(',').mapNotNull { it.trim().toIntOrNull() }.filter { it in 0..6 }.toSet()

fun isHabitScheduled(habit: HabitEntity, date: LocalDate): Boolean {
    if (habit.archived || habit.paused) return false
    val created = parseDate(habit.createdAt.take(10)) ?: return false
    if (date.isBefore(created)) return false
    return when (habit.scheduleType) {
        "daily" -> true
        else -> habitWeekdays(habit).contains(date.dayOfWeek.value % 7)
    }
}

fun habitLogForDay(logs: List<HabitLogEntity>, habitId: String, date: LocalDate): HabitLogEntity? =
    logs.firstOrNull { it.habitId == habitId && it.localDate == date.toString() }

fun habitCompletionForRange(habit: HabitEntity, logs: List<HabitLogEntity>, start: LocalDate, end: LocalDate): ProgressSnapshot {
    var scheduled = 0
    var done = 0
    var cursor = start
    while (!cursor.isAfter(end)) {
        if (isHabitScheduled(habit, cursor)) {
            scheduled++
            if (habitLogForDay(logs, habit.id, cursor)?.status == HabitLogStatus.DONE.key) done++
        }
        cursor = cursor.plusDays(1)
    }
    return if (scheduled == 0) unavailableProgress else calculateProgress(done, scheduled)
}

fun calculateHabitStreaks(habit: HabitEntity, logs: List<HabitLogEntity>, today: LocalDate = LocalDate.now()): Pair<Int, Int> {
    val start = parseDate(habit.createdAt.take(10)) ?: today
    var cursor = start
    var running = 0
    var longest = 0
    var lastDone: LocalDate? = null
    while (!cursor.isAfter(today)) {
        if (isHabitScheduled(habit, cursor)) {
            when (habitLogForDay(logs, habit.id, cursor)?.status) {
                HabitLogStatus.DONE.key -> {
                    running++; longest = maxOf(longest, running); lastDone = cursor
                }
                HabitLogStatus.SKIPPED.key, HabitLogStatus.REST.key -> Unit
                else -> running = 0
            }
        }
        cursor = cursor.plusDays(1)
    }
    var current = 0
    if (lastDone != null) {
        cursor = lastDone
        while (!cursor.isBefore(start)) {
            if (isHabitScheduled(habit, cursor)) {
                when (habitLogForDay(logs, habit.id, cursor)?.status) {
                    HabitLogStatus.DONE.key -> current++
                    HabitLogStatus.SKIPPED.key, HabitLogStatus.REST.key -> Unit
                    else -> break
                }
            }
            cursor = cursor.minusDays(1)
        }
    }
    return current to longest
}

fun habitStats(habit: HabitEntity, logs: List<HabitLogEntity>, today: LocalDate = LocalDate.now()): HabitStats {
    val (current, longest) = calculateHabitStreaks(habit, logs, today)
    return HabitStats(
        currentStreak = current,
        longestStreak = longest,
        daily = habitCompletionForRange(habit, logs, today, today),
        weekly = habitCompletionForRange(habit, logs, today.minusDays(6), today),
        monthly = habitCompletionForRange(habit, logs, today.minusDays(29), today),
    )
}

fun aggregateHabitCompletion(habits: List<HabitEntity>, logs: List<HabitLogEntity>, days: Int, today: LocalDate = LocalDate.now()): ProgressSnapshot {
    val start = today.minusDays((days - 1).toLong())
    var scheduled = 0
    var done = 0
    for (habit in habits) {
        var cursor = start
        while (!cursor.isAfter(today)) {
            if (isHabitScheduled(habit, cursor)) {
                scheduled++
                if (habitLogForDay(logs, habit.id, cursor)?.status == HabitLogStatus.DONE.key) done++
            }
            cursor = cursor.plusDays(1)
        }
    }
    return if (scheduled == 0) unavailableProgress else calculateProgress(done, scheduled)
}

fun mascotProgress(habits: List<HabitEntity>, logs: List<HabitLogEntity>): MascotProgress {
    val habitIds = habits.map { it.id }.toSet()
    val completedDays = logs.count { it.status == HabitLogStatus.DONE.key && it.habitId in habitIds }
    val stage = when {
        completedDays >= 30 -> "grove"
        completedDays >= 14 -> "bloom"
        completedDays >= 5 -> "sprout"
        else -> "seed"
    }
    val next = when (stage) { "seed" -> 5; "sprout" -> 14; else -> 30 }
    val percent = ((completedDays.toDouble() / next) * 100).roundToInt().coerceIn(0, 100)
    return MascotProgress(completedDays, stage, next, percent)
}

fun habitHeatmap(habit: HabitEntity, logs: List<HabitLogEntity>, days: Int, today: LocalDate = LocalDate.now()): List<Pair<LocalDate, String>> {
    val start = today.minusDays((days - 1).toLong())
    val out = mutableListOf<Pair<LocalDate, String>>()
    var cursor = start
    while (!cursor.isAfter(today)) {
        val status = habitLogForDay(logs, habit.id, cursor)?.status
        val value = when {
            status != null -> status
            isHabitScheduled(habit, cursor) && cursor.isBefore(today) -> "missed"
            isHabitScheduled(habit, cursor) -> "none"
            else -> "unscheduled"
        }
        out += cursor to value
        cursor = cursor.plusDays(1)
    }
    return out
}
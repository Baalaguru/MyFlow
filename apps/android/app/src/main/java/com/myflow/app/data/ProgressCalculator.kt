package com.myflow.app.data

import kotlin.math.round

/** Mirrors the web progress contract: no goal means no percentage. */
data class ProgressSnapshot(
    val completed: Int = 0,
    val total: Int = 0,
    val percent: Int? = null,
    val available: Boolean = false,
)

val unavailableProgress: ProgressSnapshot = ProgressSnapshot()

/** Pure calculation shared by every workspace. Total <= 0 is never shown as 0%. */
fun calculateProgress(completed: Int, total: Int): ProgressSnapshot {
    if (total <= 0) return unavailableProgress
    val safeCompleted = completed.coerceIn(0, total)
    val percent = round(safeCompleted.toDouble() / total.toDouble() * 100.0).toInt()
    return ProgressSnapshot(
        completed = safeCompleted,
        total = total,
        percent = percent,
        available = true,
    )
}

/** To-Do progress uses scheduled local tasks only; unscheduled notes are excluded. */
fun progressForTasks(tasks: List<TaskEntity>): ProgressSnapshot = scheduledProgress(tasks)

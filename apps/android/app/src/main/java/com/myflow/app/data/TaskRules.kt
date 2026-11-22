package com.myflow.app.data

import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.util.UUID

/** Pure projections mirroring apps/web/src/lib/tasks.ts. No database or UI dependencies. */
enum class TaskView { ALL, TODAY, UPCOMING, OVERDUE, COMPLETED, PRIORITY, CATEGORY, CALENDAR }

data class TaskFilters(
    val view: TaskView,
    val query: String = "",
    val priority: String? = null,
    val category: String? = null,
    val calendarMonth: String = "",
)

data class TaskSeriesPoint(val label: String, val captured: Int, val completed: Int)

private val priorityOrder = mapOf(
    TaskPriority.VERY_HIGH.key to 0,
    TaskPriority.HIGH.key to 1,
    TaskPriority.MEDIUM.key to 2,
    TaskPriority.LOW.key to 3,
)

private fun localDate(value: String): LocalDate? =
    if (value.isBlank()) null else runCatching { LocalDate.parse(value) }.getOrNull()

private fun instantDate(value: String?): LocalDate? {
    if (value.isNullOrBlank()) return null
    return runCatching { Instant.parse(value).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
}

fun taskDueDate(task: TaskEntity): LocalDate? = localDate(task.dueDate)

fun isScheduled(task: TaskEntity): Boolean = task.dueDate.isNotBlank() || task.startTime.isNotBlank()

fun sortTasks(tasks: List<TaskEntity>): List<TaskEntity> = tasks.sortedWith(
    compareBy<TaskEntity> { it.completed }
        .thenBy { priorityOrder[it.priority] ?: 2 }
        .thenBy { it.dueDate.ifBlank { "9999" } }
        .thenByDescending { it.createdAt },
)

fun filterTasks(tasks: List<TaskEntity>, filters: TaskFilters, now: LocalDate = LocalDate.now()): List<TaskEntity> {
    val today = now.toString()
    val query = filters.query.trim().lowercase()
    val month = filters.calendarMonth.ifBlank { today.substring(0, 7) }
    return sortTasks(tasks.filter { task ->
        if (query.isNotBlank()) {
            val haystack = "${task.title} ${task.description} ${task.category}".lowercase()
            if (!haystack.contains(query)) return@filter false
        }
        when (filters.view) {
            TaskView.ALL -> true
            TaskView.TODAY -> task.dueDate == today
            TaskView.UPCOMING -> task.dueDate > today && !task.completed
            TaskView.OVERDUE -> task.dueDate.isNotBlank() && task.dueDate < today && !task.completed
            TaskView.COMPLETED -> task.completed
            TaskView.PRIORITY -> task.priority == (filters.priority ?: TaskPriority.MEDIUM.key)
            TaskView.CATEGORY -> task.category == (filters.category ?: "")
            TaskView.CALENDAR -> task.dueDate.startsWith(month)
        }
    })
}

/** Unscheduled notes never enter the denominator; an empty schedule is unavailable. */
fun scheduledProgress(
    tasks: List<TaskEntity>,
    now: LocalDate = LocalDate.now(),
    days: Int = 7,
): ProgressSnapshot {
    val start = now.minusDays((days - 1).toLong())
    val end = now.plusDays(1)
    val scheduled = tasks.filter { task ->
        if (!isScheduled(task)) return@filter false
        val due = taskDueDate(task)
        if (due == null) task.startTime.isNotBlank() && now >= start && now < end
        else !due.isBefore(start) && due.isBefore(end)
    }
    return calculateProgress(scheduled.count { it.completed }, scheduled.size)
}

fun dailyCompletionCount(tasks: List<TaskEntity>, now: LocalDate = LocalDate.now()): Int =
    tasks.count { it.completed && instantDate(it.completedAt) == now }

fun completionSeries(
    tasks: List<TaskEntity>,
    days: Int,
    now: LocalDate = LocalDate.now(),
): List<TaskSeriesPoint> = (0 until days).map { offset ->
    val day = now.minusDays((days - 1 - offset).toLong())
    TaskSeriesPoint(
        label = day.dayOfMonth.toString(),
        captured = tasks.count { instantDate(it.createdAt) == day },
        completed = tasks.count { it.completed && instantDate(it.completedAt) == day },
    )
}

fun monthlyCompletionSeries(
    tasks: List<TaskEntity>,
    months: Int = 6,
    now: LocalDate = LocalDate.now(),
): List<TaskSeriesPoint> = (0 until months).map { offset ->
    val month = YearMonth.from(now).minusMonths((months - 1 - offset).toLong())
    TaskSeriesPoint(
        label = "${month.monthValue}/${month.year.toString().takeLast(2)}",
        captured = tasks.count { instantDate(it.createdAt)?.let { YearMonth.from(it) == month } == true },
        completed = tasks.count {
            it.completed && instantDate(it.completedAt)?.let { date -> YearMonth.from(date) == month } == true
        },
    )
}

fun priorityDistribution(tasks: List<TaskEntity>): Map<String, Int> {
    val result = TaskPriority.entries.associate { it.key to 0 }.toMutableMap()
    tasks.forEach { result[it.priority] = (result[it.priority] ?: 0) + 1 }
    return result
}

fun overdueCount(tasks: List<TaskEntity>, now: LocalDate = LocalDate.now()): Int =
    tasks.count { !it.completed && it.dueDate.isNotBlank() && it.dueDate < now.toString() }

fun subtaskProgress(subtasks: List<SubtaskRecord>): ProgressSnapshot =
    calculateProgress(subtasks.count { it.completed }, subtasks.size)

private fun addInterval(date: LocalDate, rule: RecurrenceRule): LocalDate = when (rule.frequency) {
    RecurrenceFrequency.DAILY -> date.plusDays(rule.interval.coerceAtLeast(1).toLong())
    RecurrenceFrequency.WEEKLY -> date.plusWeeks(rule.interval.coerceAtLeast(1).toLong())
    RecurrenceFrequency.MONTHLY -> date.plusMonths(rule.interval.coerceAtLeast(1).toLong())
}

/** Append-only: the next occurrence is a new record and previous ones are never rewritten. */
fun nextOccurrence(
    task: TaskEntity,
    allTasks: List<TaskEntity>,
    now: LocalDate = LocalDate.now(),
): TaskEntity? {
    val rule = task.recurrence ?: return null
    val rootId = task.recurrenceParentId ?: task.id
    val occurrences = allTasks.count { (it.recurrenceParentId ?: it.id) == rootId }
    if (rule.count != null && occurrences >= rule.count) return null

    val next = addInterval(taskDueDate(task) ?: now, rule)
    val nextKey = next.toString()
    if (rule.until != null && nextKey > rule.until) return null
    if (allTasks.any { it.recurrenceParentId == rootId && it.dueDate == nextKey }) return null

    return TaskEntity(
        id = UUID.randomUUID().toString(),
        title = task.title,
        description = task.description,
        priority = task.priority,
        category = task.category,
        dueDate = nextKey,
        startTime = task.startTime,
        endTime = task.endTime,
        completed = false,
        status = "open",
        createdAt = Instant.now().toString(),
        subtasks = task.subtasks.map {
            SubtaskRecord(UUID.randomUUID().toString(), it.title, false)
        },
        recurrence = rule.copy(),
        recurrenceParentId = rootId,
        reminderOffsetMinutes = task.reminderOffsetMinutes,
    )
}

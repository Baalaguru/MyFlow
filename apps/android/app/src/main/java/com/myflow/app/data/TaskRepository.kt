package com.myflow.app.data

import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.util.UUID

/** Editable task fields shared by the Android editor and quick capture. */
data class TaskInput(
    val title: String,
    val description: String = "",
    val priority: String = TaskPriority.MEDIUM.key,
    val category: String = "",
    val dueDate: String = "",
    val startTime: String = "",
    val endTime: String = "",
    val subtasks: List<SubtaskRecord> = emptyList(),
    val recurrence: RecurrenceRule? = null,
    val reminderOffsetMinutes: Int? = null,
)

/** Local-only task operations used by quick capture, the Tasks workspace, and global search. */
class TaskRepository(private val dao: TaskDao) {
    fun observeTasks(): Flow<List<TaskEntity>> = dao.observeAll()

    suspend fun create(input: TaskInput): TaskEntity {
        val title = input.title.trim()
        require(title.isNotBlank()) { "empty task title" }
        val task = TaskEntity(
            id = UUID.randomUUID().toString(),
            title = title,
            description = input.description.trim(),
            priority = input.priority,
            category = input.category.trim(),
            dueDate = input.dueDate,
            startTime = input.startTime,
            endTime = input.endTime,
            completed = false,
            status = "open",
            createdAt = Instant.now().toString(),
            subtasks = input.subtasks.map {
                it.copy(id = it.id.ifBlank { UUID.randomUUID().toString() }, completed = false)
            },
            recurrence = input.recurrence,
            reminderOffsetMinutes = input.reminderOffsetMinutes,
        )
        dao.save(task)
        return task
    }

    suspend fun addTask(title: String): TaskEntity = create(TaskInput(title = title))

    suspend fun update(id: String, input: TaskInput) {
        val row = dao.get(id) ?: return
        val title = input.title.trim()
        if (title.isBlank()) return
        dao.save(
            row.copy(
                title = title,
                description = input.description.trim(),
                priority = input.priority,
                category = input.category.trim(),
                dueDate = input.dueDate,
                startTime = input.startTime,
                endTime = input.endTime,
                subtasks = input.subtasks,
                recurrence = input.recurrence,
                reminderOffsetMinutes = input.reminderOffsetMinutes,
            ),
        )
    }

    suspend fun delete(id: String) = dao.delete(id)

    suspend fun toggle(task: TaskEntity) {
        val completing = !task.completed
        val now = if (completing) Instant.now().toString() else null
        dao.save(
            task.copy(
                completed = completing,
                status = if (completing) "completed" else "open",
                completedAt = now,
            ),
        )
        if (completing) nextOccurrence(task, dao.all())?.let { dao.save(it) }
    }

    suspend fun toggleSubtask(id: String, subtaskId: String) {
        val row = dao.get(id) ?: return
        dao.save(
            row.copy(
                subtasks = row.subtasks.map {
                    if (it.id == subtaskId) it.copy(completed = !it.completed) else it
                },
            ),
        )
    }

    suspend fun removeSubtask(id: String, subtaskId: String) {
        val row = dao.get(id) ?: return
        dao.save(row.copy(subtasks = row.subtasks.filterNot { it.id == subtaskId }))
    }

    suspend fun progress(): ProgressSnapshot = scheduledProgress(dao.all())

    suspend fun search(query: String, limit: Int = 8): List<SearchResult> =
        projectTaskSearch(dao.all(), query, limit)
}

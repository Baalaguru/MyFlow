package com.myflow.app.data

import kotlinx.coroutines.flow.Flow
import java.time.Instant
import java.util.UUID

/** Local-only task operations used by quick capture, the Tasks workspace, and global search. */
class TaskRepository(private val dao: TaskDao) {
    fun observeTasks(): Flow<List<TaskEntity>> = dao.observeAll()

    suspend fun addTask(title: String) {
        val trimmed = title.trim()
        if (trimmed.isEmpty()) return
        dao.insert(
            TaskEntity(
                id = UUID.randomUUID().toString(),
                title = trimmed,
                completed = false,
                createdAt = Instant.now().toString(),
            ),
        )
    }

    suspend fun toggle(task: TaskEntity) {
        dao.setCompleted(id = task.id, completed = !task.completed)
    }

    suspend fun search(query: String, limit: Int = 8): List<SearchResult> =
        projectTaskSearch(dao.all(), query, limit)
}

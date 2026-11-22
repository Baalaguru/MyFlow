package com.myflow.app.data

/** A local, read-only projection. Every result points back to the Tasks workspace. */
data class SearchResult(
    val id: String,
    val route: String,
    val title: String,
    val completed: Boolean,
)

/** Pure local matcher over title, description, and category; whitespace is ignored. */
fun projectTaskSearch(
    tasks: List<TaskEntity>,
    query: String,
    limit: Int = 8,
): List<SearchResult> {
    val normalised = query.trim().lowercase()
    if (normalised.isBlank()) return emptyList()
    return tasks
        .filter { "${it.title} ${it.description} ${it.category}".lowercase().contains(normalised) }
        .take(limit)
        .map { task ->
            SearchResult(
                id = "task:${task.id}",
                route = "tasks",
                title = task.title,
                completed = task.completed,
            )
        }
}

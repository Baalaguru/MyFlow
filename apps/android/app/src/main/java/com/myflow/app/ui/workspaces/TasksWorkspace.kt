package com.myflow.app.ui.workspaces

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.TaskEntity
import com.myflow.app.data.TaskRepository
import com.myflow.app.data.progressForTasks
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.theme.GeneratedTokens
import kotlinx.coroutines.launch

private enum class TaskFilter(val labelRes: Int) {
    ALL(R.string.filter_all),
    OPEN(R.string.filter_open),
    DONE(R.string.filter_done),
}

@Composable
fun TasksWorkspace(repository: TaskRepository) {
    val tasks by repository.observeTasks().collectAsState(initial = emptyList())
    var filter by rememberSaveable { mutableStateOf(TaskFilter.ALL) }
    var composing by rememberSaveable { mutableStateOf(false) }
    var draft by rememberSaveable { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    val completed = tasks.count { it.completed }
    val progress = progressForTasks(tasks)
    val visible = when (filter) {
        TaskFilter.ALL -> tasks
        TaskFilter.OPEN -> tasks.filterNot { it.completed }
        TaskFilter.DONE -> tasks.filter { it.completed }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(R.string.nav_tasks),
            subtitle = stringResource(R.string.workspace_subtitle_tasks),
            routeId = AppDestinations.TASKS,
        )
        ProgressStrip(snapshot = progress, routeId = AppDestinations.TASKS)
        ModuleStats(
            records = tasks.size.toString(),
            done = completed.toString(),
            open = (tasks.size - completed).toString(),
        )

        ModuleActions {
            if (composing) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    label = { Text(stringResource(R.string.task_title_label)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            val title = draft
                            composing = false
                            draft = ""
                            scope.launch { repository.addTask(title) }
                        },
                        enabled = draft.isNotBlank(),
                    ) {
                        Text(stringResource(R.string.save_action))
                    }
                    TextButton(
                        onClick = {
                            composing = false
                            draft = ""
                        },
                    ) {
                        Text(stringResource(R.string.cancel_action))
                    }
                }
            } else {
                Button(onClick = { composing = true }) {
                    Text(stringResource(R.string.new_task))
                }
            }
        }

        ModuleFilters {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TaskFilter.entries.forEach { option ->
                    FilterChip(
                        selected = filter == option,
                        onClick = { filter = option },
                        label = { Text(stringResource(option.labelRes)) },
                    )
                }
            }
        }

        Text(
            text = stringResource(R.string.task_list_label),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        when {
            tasks.isEmpty() -> EmptyState(
                title = stringResource(R.string.empty_title),
                body = stringResource(R.string.module_empty_tasks),
            )

            visible.isEmpty() -> EmptyState(
                title = stringResource(R.string.empty_title),
                body = stringResource(R.string.no_tasks_in_view),
            )

            else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                visible.forEach { task ->
                    TaskRow(
                        task = task,
                        onToggle = { scope.launch { repository.toggle(task) } },
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskRow(task: TaskEntity, onToggle: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = stringResource(
                        if (task.completed) R.string.task_status_done else R.string.task_status_open,
                    ),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = onToggle) {
                Text(
                    stringResource(
                        if (task.completed) R.string.mark_open else R.string.mark_complete,
                    ),
                )
            }
        }
    }
}

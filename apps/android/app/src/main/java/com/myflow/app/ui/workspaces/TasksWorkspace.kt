package com.myflow.app.ui.workspaces

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.RecurrenceFrequency
import com.myflow.app.data.RecurrenceRule
import com.myflow.app.data.SubtaskRecord
import com.myflow.app.data.TaskEntity
import com.myflow.app.data.TaskFilters
import com.myflow.app.data.TaskInput
import com.myflow.app.data.TaskPriority
import com.myflow.app.data.TaskRepository
import com.myflow.app.data.TaskView
import com.myflow.app.data.completionSeries
import com.myflow.app.data.dailyCompletionCount
import com.myflow.app.data.filterTasks
import com.myflow.app.data.monthlyCompletionSeries
import com.myflow.app.data.overdueCount
import com.myflow.app.data.priorityDistribution
import com.myflow.app.data.progressForTasks
import com.myflow.app.data.subtaskProgress
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.theme.GeneratedTokens
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

private val views = TaskView.entries
private val priorities = TaskPriority.entries
private val weekdayLabels = listOf(
    R.string.weekday_sun,
    R.string.weekday_mon,
    R.string.weekday_tue,
    R.string.weekday_wed,
    R.string.weekday_thu,
    R.string.weekday_fri,
    R.string.weekday_sat,
)

private fun viewLabel(view: TaskView): Int = when (view) {
    TaskView.ALL -> R.string.view_all
    TaskView.TODAY -> R.string.view_today
    TaskView.UPCOMING -> R.string.view_upcoming
    TaskView.OVERDUE -> R.string.view_overdue
    TaskView.COMPLETED -> R.string.view_completed
    TaskView.PRIORITY -> R.string.view_priority
    TaskView.CATEGORY -> R.string.view_category
    TaskView.CALENDAR -> R.string.view_calendar
}

private fun priorityLabel(key: String): Int = when (key) {
    TaskPriority.VERY_HIGH.key -> R.string.priority_very_high
    TaskPriority.HIGH.key -> R.string.priority_high
    TaskPriority.LOW.key -> R.string.priority_low
    else -> R.string.priority_medium
}

private fun frequencyLabel(key: String?): Int = when (key) {
    RecurrenceFrequency.DAILY.key -> R.string.recurrence_daily
    RecurrenceFrequency.WEEKLY.key -> R.string.recurrence_weekly
    RecurrenceFrequency.MONTHLY.key -> R.string.recurrence_monthly
    else -> R.string.recurrence_none
}

@Composable
fun TasksWorkspace(repository: TaskRepository) {
    val tasks by repository.observeTasks().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    var view by rememberSaveable { mutableStateOf(TaskView.ALL) }
    var query by rememberSaveable { mutableStateOf("") }
    var priorityFilter by rememberSaveable { mutableStateOf("all") }
    var categoryFilter by rememberSaveable { mutableStateOf("") }
    var calendarMonth by rememberSaveable { mutableStateOf(LocalDate.now().toString().substring(0, 7)) }

    var composing by rememberSaveable { mutableStateOf(false) }
    var editingId by rememberSaveable { mutableStateOf<String?>(null) }
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("") }
    var dueDate by rememberSaveable { mutableStateOf("") }
    var startTime by rememberSaveable { mutableStateOf("") }
    var endTime by rememberSaveable { mutableStateOf("") }
    var reminder by rememberSaveable { mutableStateOf("") }
    var priority by rememberSaveable { mutableStateOf(TaskPriority.MEDIUM.key) }
    var frequency by rememberSaveable { mutableStateOf("none") }
    var interval by rememberSaveable { mutableStateOf("1") }
    var count by rememberSaveable { mutableStateOf("") }
    var until by rememberSaveable { mutableStateOf("") }
    var subtasks = remember { mutableStateOf<List<SubtaskRecord>>(emptyList()) }
    var subtaskDraft by rememberSaveable { mutableStateOf("") }
    var deletingId by rememberSaveable { mutableStateOf<String?>(null) }
    var statusMessage by rememberSaveable { mutableStateOf<Int?>(null) }

    val progress = progressForTasks(tasks)
    val visible = filterTasks(
        tasks,
        TaskFilters(
            view = view,
            query = query,
            priority = if (priorityFilter == "all") null else priorityFilter,
            category = categoryFilter.ifBlank { null },
            calendarMonth = calendarMonth,
        ),
    )
    val categories = tasks.map { it.category }.filter { it.isNotBlank() }.distinct().sorted()
    val openTasks = tasks.filterNot { it.completed }
    val distribution = priorityDistribution(openTasks)
    val weekly = completionSeries(tasks, 7)
    val monthly = monthlyCompletionSeries(tasks, 6)

    fun resetEditor() {
        editingId = null
        title = ""
        description = ""
        category = ""
        dueDate = ""
        startTime = ""
        endTime = ""
        reminder = ""
        priority = TaskPriority.MEDIUM.key
        frequency = "none"
        interval = "1"
        count = ""
        until = ""
        subtasks.value = emptyList()
        subtaskDraft = ""
    }

    fun openEditor(task: TaskEntity?) {
        resetEditor()
        if (task != null) {
            editingId = task.id
            title = task.title
            description = task.description
            category = task.category
            dueDate = task.dueDate
            startTime = task.startTime
            endTime = task.endTime
            reminder = task.reminderOffsetMinutes?.toString() ?: ""
            priority = task.priority
            frequency = task.recurrence?.frequency?.key ?: "none"
            interval = (task.recurrence?.interval ?: 1).toString()
            count = task.recurrence?.count?.toString() ?: ""
            until = task.recurrence?.until ?: ""
            subtasks.value = task.subtasks
        }
        composing = true
    }

    fun saveEditor() {
        val trimmed = title.trim()
        if (trimmed.isBlank()) return
        val rule = if (frequency == "none") null else RecurrenceRule(
            frequency = RecurrenceFrequency.entries.firstOrNull { it.key == frequency }
                ?: RecurrenceFrequency.DAILY,
            interval = interval.toIntOrNull()?.coerceAtLeast(1) ?: 1,
            count = count.toIntOrNull()?.coerceAtLeast(1),
            until = until.ifBlank { null },
        )
        val input = TaskInput(
            title = trimmed,
            description = description,
            priority = priority,
            category = category,
            dueDate = dueDate,
            startTime = startTime,
            endTime = endTime,
            subtasks = subtasks.value,
            recurrence = rule,
            reminderOffsetMinutes = reminder.toIntOrNull(),
        )
        val currentId = editingId
        composing = false
        resetEditor()
        scope.launch {
            if (currentId == null) {
                repository.create(input)
                statusMessage = R.string.task_saved
            } else {
                repository.update(currentId, input)
                statusMessage = R.string.task_updated
            }
        }
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
            records = dailyCompletionCount(tasks).toString(),
            done = if (progress.available) "${progress.completed}/${progress.total}" else "—",
            open = overdueCount(tasks).toString(),
        )
        statusMessage?.let { Text(stringResource(it), style = MaterialTheme.typography.bodySmall) }
        Text(stringResource(R.string.historical_note), style = MaterialTheme.typography.labelSmall)

        ModuleActions {
            if (composing) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text(stringResource(R.string.task_field_title)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text(stringResource(R.string.task_field_description)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text(stringResource(R.string.task_field_category)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = dueDate,
                        onValueChange = { dueDate = it },
                        label = { Text(stringResource(R.string.task_field_due_date)) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = startTime,
                        onValueChange = { startTime = it },
                        label = { Text(stringResource(R.string.task_field_start_time)) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = endTime,
                        onValueChange = { endTime = it },
                        label = { Text(stringResource(R.string.task_field_end_time)) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                }
                OutlinedTextField(
                    value = reminder,
                    onValueChange = { reminder = it },
                    label = { Text(stringResource(R.string.reminder_offset)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Text(stringResource(R.string.reminder_note), style = MaterialTheme.typography.labelSmall)

                Text(stringResource(R.string.task_field_priority), style = MaterialTheme.typography.labelMedium)
                Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    priorities.forEach { option ->
                        FilterChip(
                            selected = priority == option.key,
                            onClick = { priority = option.key },
                            label = { Text(stringResource(priorityLabel(option.key))) },
                        )
                    }
                }

                Text(stringResource(R.string.task_field_recurrence), style = MaterialTheme.typography.labelMedium)
                Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    (listOf("none") + RecurrenceFrequency.entries.map { it.key }).forEach { option ->
                        FilterChip(
                            selected = frequency == option,
                            onClick = { frequency = option },
                            label = { Text(stringResource(frequencyLabel(option))) },
                        )
                    }
                }
                if (frequency != "none") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = interval,
                            onValueChange = { interval = it },
                            label = { Text(stringResource(R.string.recurrence_interval)) },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = count,
                            onValueChange = { count = it },
                            label = { Text(stringResource(R.string.recurrence_count)) },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = until,
                            onValueChange = { until = it },
                            label = { Text(stringResource(R.string.recurrence_until)) },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                    }
                }

                Text(stringResource(R.string.task_field_subtasks), style = MaterialTheme.typography.labelMedium)
                subtasks.value.forEach { item ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = item.completed,
                            onCheckedChange = {
                                subtasks.value = subtasks.value.map {
                                    if (it.id == item.id) it.copy(completed = !it.completed) else it
                                }
                            },
                        )
                        Text(item.title, modifier = Modifier.weight(1f))
                        TextButton(
                            onClick = { subtasks.value = subtasks.value.filterNot { it.id == item.id } },
                        ) {
                            Text(stringResource(R.string.remove_subtask))
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = subtaskDraft,
                        onValueChange = { subtaskDraft = it },
                        label = { Text(stringResource(R.string.subtask_placeholder)) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    Button(
                        onClick = {
                            val label = subtaskDraft.trim()
                            if (label.isNotBlank()) {
                                subtasks.value = subtasks.value + SubtaskRecord("", label, false)
                                subtaskDraft = ""
                            }
                        },
                        enabled = subtaskDraft.isNotBlank(),
                    ) {
                        Text(stringResource(R.string.add_subtask))
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { saveEditor() }, enabled = title.isNotBlank()) {
                        Text(
                            stringResource(
                                if (editingId == null) R.string.save_action else R.string.save_changes,
                            ),
                        )
                    }
                    TextButton(onClick = { resetEditor(); composing = false }) {
                        Text(stringResource(R.string.cancel_action))
                    }
                }
            } else {
                Button(onClick = { openEditor(null) }) {
                    Text(stringResource(R.string.new_task))
                }
            }
        }

        ModuleFilters {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                views.forEach { option ->
                    FilterChip(
                        selected = view == option,
                        onClick = { view = option },
                        label = { Text(stringResource(viewLabel(option))) },
                    )
                }
            }
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text(stringResource(R.string.search_tasks)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = priorityFilter,
                    onValueChange = { priorityFilter = it },
                    label = { Text(stringResource(R.string.task_field_priority)) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = categoryFilter,
                    onValueChange = { categoryFilter = it },
                    label = { Text(stringResource(R.string.task_field_category)) },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }
            TextButton(onClick = { query = ""; priorityFilter = "all"; categoryFilter = "" }) {
                Text(stringResource(R.string.clear_filters))
            }
        }

        Text(
            text = stringResource(R.string.task_list_label),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        if (deletingId != null) {
            SectionCard(title = stringResource(R.string.delete_task)) {
                Text(stringResource(R.string.delete_task_confirm))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = {
                        val id = deletingId
                        deletingId = null
                        if (id != null) scope.launch { repository.delete(id); statusMessage = R.string.task_deleted }
                    }) {
                        Text(stringResource(R.string.delete_task))
                    }
                    TextButton(onClick = { deletingId = null }) {
                        Text(stringResource(R.string.cancel_action))
                    }
                }
            }
        }

        when {
            tasks.isEmpty() -> EmptyState(
                title = stringResource(R.string.empty_title),
                body = stringResource(R.string.module_empty_tasks),
            )

            view == TaskView.CALENDAR -> CalendarGrid(tasks, calendarMonth) {
                val parts = calendarMonth.split("-").map { it.toInt() }
                val date = YearMonth.of(parts[0], parts[1]).plusMonths(it.toLong())
                calendarMonth = "%04d-%02d".format(date.year, date.monthValue)
            }

            visible.isEmpty() -> EmptyState(
                title = stringResource(R.string.empty_title),
                body = stringResource(R.string.no_tasks_in_view),
            )

            else -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                visible.forEach { task ->
                    TaskRow(
                        task = task,
                        onToggle = { scope.launch { repository.toggle(task) } },
                        onEdit = { openEditor(task) },
                        onDelete = { deletingId = task.id },
                        onToggleSubtask = { scope.launch { repository.toggleSubtask(task.id, it) } },
                        onRemoveSubtask = { scope.launch { repository.removeSubtask(task.id, it) } },
                    )
                }
            }
        }

        SectionCard(title = stringResource(R.string.analytics_title)) {
            ValueRow(
                label = stringResource(R.string.daily_completion),
                value = dailyCompletionCount(tasks).toString(),
            )
            ValueRow(
                label = stringResource(R.string.completed_total),
                value = if (progress.available) "${progress.completed}/${progress.total}" else "—",
            )
            ValueRow(label = stringResource(R.string.overdue_tasks), value = overdueCount(tasks).toString())
            TaskPriority.entries.forEach { option ->
                ValueRow(
                    label = stringResource(priorityLabel(option.key)),
                    value = (distribution[option.key] ?: 0).toString(),
                )
            }
            ValueRow(
                label = stringResource(R.string.weekly_completion),
                value = weekly.sumOf { it.completed }.toString(),
            )
            ValueRow(
                label = stringResource(R.string.monthly_completion),
                value = monthly.sumOf { it.completed }.toString(),
            )
            Text(stringResource(R.string.historical_note), style = MaterialTheme.typography.labelSmall)
            Text(stringResource(R.string.unscheduled_note), style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun TaskRow(
    task: TaskEntity,
    onToggle: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onToggleSubtask: (String) -> Unit,
    onRemoveSubtask: (String) -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Checkbox(checked = task.completed, onCheckedChange = { onToggle() })
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                if (task.description.isNotBlank()) {
                    Text(task.description, style = MaterialTheme.typography.bodySmall)
                }
                val meta = mutableListOf<String>()
                meta.add(stringResource(if (task.completed) R.string.task_status_done else R.string.task_status_open))
                meta.add(stringResource(priorityLabel(task.priority)))
                if (task.category.isNotBlank()) meta.add(task.category)
                if (task.dueDate.isNotBlank()) {
                    meta.add("${stringResource(R.string.task_field_due_date)}: ${task.dueDate}")
                }
                if (task.startTime.isNotBlank()) {
                    meta.add("${stringResource(R.string.task_field_start_time)}: ${task.startTime}")
                }
                if (task.endTime.isNotBlank()) {
                    meta.add("${stringResource(R.string.task_field_end_time)}: ${task.endTime}")
                }
                if (task.recurrence != null) meta.add(stringResource(frequencyLabel(task.recurrence.frequency.key)))
                Text(meta.joinToString(" · "), style = MaterialTheme.typography.labelSmall)
                if (task.subtasks.isNotEmpty()) {
                    val snapshot = subtaskProgress(task.subtasks)
                    Text(
                        "${stringResource(R.string.task_field_subtasks)}: ${snapshot.completed}/${snapshot.total}",
                        style = MaterialTheme.typography.labelSmall,
                    )
                    task.subtasks.forEach { item ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = item.completed, onCheckedChange = { onToggleSubtask(item.id) })
                            Text(item.title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = { onRemoveSubtask(item.id) }) {
                                Text(stringResource(R.string.remove_subtask))
                            }
                        }
                    }
                }
                if (task.reminderOffsetMinutes != null) {
                    Text(stringResource(R.string.reminder_note), style = MaterialTheme.typography.labelSmall)
                }
                Row {
                    TextButton(onClick = onEdit) { Text(stringResource(R.string.edit_task)) }
                    TextButton(onClick = onToggle) {
                        Text(
                            stringResource(
                                if (task.completed) R.string.mark_open else R.string.mark_complete,
                            ),
                        )
                    }
                    TextButton(onClick = onDelete) { Text(stringResource(R.string.delete_task)) }
                }
            }
        }
    }
}

@Composable
private fun CalendarGrid(
    tasks: List<TaskEntity>,
    month: String,
    onShift: (Int) -> Unit,
) {
    val parts = month.split("-").map { it.toInt() }
    val first = LocalDate.of(parts[0], parts[1], 1)
    val start = first.minusDays((first.dayOfWeek.value % 7).toLong())
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            TextButton(onClick = { onShift(-1) }) { Text(stringResource(R.string.previous_month)) }
            Text(month, style = MaterialTheme.typography.titleMedium)
            TextButton(onClick = { onShift(1) }) { Text(stringResource(R.string.next_month)) }
        }
        for (week in 0 until 6) {
            Row(modifier = Modifier.fillMaxWidth()) {
                for (day in 0 until 7) {
                    val date = start.plusDays((week * 7 + day).toLong())
                    val deadlines = tasks.filter { it.dueDate == date.toString() }
                    Column(
                        modifier = Modifier.weight(1f).padding(2.dp),
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(if (date.monthValue == parts[1]) date.dayOfMonth.toString() else "")
                        if (week == 0) {
                            Text(stringResource(weekdayLabels[day]), style = MaterialTheme.typography.labelSmall)
                        }
                        deadlines.take(2).forEach { task ->
                            Text(task.title, style = MaterialTheme.typography.labelSmall, maxLines = 1)
                        }
                    }
                }
            }
        }
        Text(stringResource(R.string.calendar_empty), style = MaterialTheme.typography.labelSmall)
    }
}

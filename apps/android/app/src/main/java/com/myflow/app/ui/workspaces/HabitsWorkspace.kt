package com.myflow.app.ui.workspaces

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.HabitInput
import com.myflow.app.data.HabitLogStatus
import com.myflow.app.data.HabitRepository
import com.myflow.app.data.aggregateHabitCompletion
import com.myflow.app.data.calculateHabitStreaks
import com.myflow.app.data.habitHeatmap
import com.myflow.app.data.habitLogForDay
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.theme.GeneratedTokens
import kotlinx.coroutines.launch
import java.time.LocalDate

private val weekdayLabels = listOf(
    R.string.weekday_sun, R.string.weekday_mon, R.string.weekday_tue, R.string.weekday_wed,
    R.string.weekday_thu, R.string.weekday_fri, R.string.weekday_sat,
)

@Composable
fun HabitsWorkspace(repository: HabitRepository) {
    val habits by repository.observeHabits().collectAsState(initial = emptyList())
    val logs by repository.observeLogs().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val today = LocalDate.now()

    var editingId by rememberSaveable { mutableStateOf<String?>(null) }
    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var icon by rememberSaveable { mutableStateOf("🌱") }
    var scheduleType by rememberSaveable { mutableStateOf("daily") }
    var weekdays by remember { mutableStateOf(setOf(1, 2, 3, 4, 5)) }
    var target by rememberSaveable { mutableStateOf("") }
    var reminder by rememberSaveable { mutableStateOf("") }

    fun resetForm() {
        editingId = null; name = ""; description = ""; icon = "🌱"; scheduleType = "daily"
        weekdays = setOf(1, 2, 3, 4, 5); target = ""; reminder = ""
    }

    val active = habits.filter { !it.archived && !it.paused }
    val daily = aggregateHabitCompletion(active, logs, 1, today)
    val weekly = aggregateHabitCompletion(active, logs, 7, today)
    val monthly = aggregateHabitCompletion(active, logs, 30, today)
    val heatmapHabit = active.firstOrNull() ?: habits.firstOrNull()

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(stringResource(R.string.nav_habits), stringResource(R.string.workspace_subtitle_habits), AppDestinations.HABITS)
        ProgressStrip(snapshot = daily, routeId = AppDestinations.HABITS)
        ModuleStats(
            records = habits.size.toString(),
            done = daily.completed.toString(),
            open = (daily.total - daily.completed).coerceAtLeast(0).toString(),
        )

        SectionCard(title = stringResource(if (editingId == null) R.string.add_action else R.string.edit_action)) {
            OutlinedTextField(name, { name = it }, label = { Text(stringResource(R.string.habit_name)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(description, { description = it }, label = { Text(stringResource(R.string.habit_description)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(icon, { icon = it }, label = { Text(stringResource(R.string.habit_icon)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("daily" to R.string.schedule_daily, "weekdays" to R.string.schedule_weekdays, "custom" to R.string.schedule_custom).forEach { (key, label) ->
                    FilterChip(selected = scheduleType == key, onClick = { scheduleType = key }, label = { Text(stringResource(label)) })
                }
            }
            if (scheduleType != "daily") {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    weekdayLabels.forEachIndexed { index, label ->
                        FilterChip(selected = weekdays.contains(index), onClick = {
                            weekdays = if (weekdays.contains(index)) weekdays - index else weekdays + index
                        }, label = { Text(stringResource(label)) })
                    }
                }
            }
            OutlinedTextField(target, { target = it.filter(Char::isDigit) }, label = { Text(stringResource(R.string.habit_target)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(reminder, { reminder = it.filter(Char::isDigit) }, label = { Text(stringResource(R.string.habit_reminder)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Text(stringResource(R.string.habit_reminder_note), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(enabled = name.isNotBlank(), onClick = {
                    val input = HabitInput(name, description, icon, "", scheduleType, if (scheduleType == "daily") setOf(0,1,2,3,4,5,6) else weekdays, target.toIntOrNull(), reminder.toIntOrNull())
                    scope.launch {
                        if (editingId == null) repository.create(input) else repository.update(editingId!!, input)
                        resetForm()
                    }
                }) { Text(stringResource(R.string.save_action)) }
                if (editingId != null) TextButton(onClick = { resetForm() }) { Text(stringResource(R.string.cancel_action)) }
            }
        }

        SectionCard(title = stringResource(R.string.habit_today)) {
            if (habits.isEmpty()) {
                Text(stringResource(R.string.habit_no_data), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            habits.forEach { habit ->
                val status = habitLogForDay(logs, habit.id, today)?.status
                val streaks = calculateHabitStreaks(habit, logs, today)
                Column(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("${habit.icon.ifBlank { "•" }} ${habit.name}", style = MaterialTheme.typography.titleSmall)
                    Text("${stringResource(R.string.habit_streak)}: ${streaks.first} · ${stringResource(R.string.habit_longest_streak)}: ${streaks.second}", style = MaterialTheme.typography.bodySmall)
                    if (habit.paused) Text(stringResource(R.string.habit_paused), style = MaterialTheme.typography.labelSmall)
                    if (habit.archived) Text(stringResource(R.string.habit_archived), style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = status == "done", onClick = { scope.launch { repository.setLog(habit.id, today, HabitLogStatus.DONE) } }, label = { Text(stringResource(R.string.habit_done)) })
                        FilterChip(selected = status == "skipped", onClick = { scope.launch { repository.setLog(habit.id, today, HabitLogStatus.SKIPPED) } }, label = { Text(stringResource(R.string.habit_skipped)) })
                        FilterChip(selected = status == "rest", onClick = { scope.launch { repository.setLog(habit.id, today, HabitLogStatus.REST) } }, label = { Text(stringResource(R.string.habit_rest)) })
                        TextButton(onClick = { scope.launch { repository.clearLog(habit.id, today) } }) { Text(stringResource(R.string.habit_clear_log)) }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        TextButton(onClick = {
                            editingId = habit.id; name = habit.name; description = habit.description; icon = habit.icon.ifBlank { "🌱" }
                            scheduleType = habit.scheduleType; weekdays = habit.weekdays.split(',').mapNotNull { it.toIntOrNull() }.toSet()
                            target = habit.target?.toString() ?: ""; reminder = habit.reminderOffsetMinutes?.toString() ?: ""
                        }) { Text(stringResource(R.string.edit_action)) }
                        TextButton(onClick = { scope.launch { repository.setPaused(habit.id, !habit.paused) } }) { Text(stringResource(if (habit.paused) R.string.habit_resume else R.string.habit_pause)) }
                        TextButton(onClick = { scope.launch { repository.setArchived(habit.id, !habit.archived) } }) { Text(stringResource(if (habit.archived) R.string.habit_unarchive else R.string.habit_archive)) }
                        TextButton(onClick = { scope.launch { repository.delete(habit.id) } }) { Text(stringResource(R.string.delete_action)) }
                    }
                }
            }
        }

        SectionCard(title = stringResource(R.string.habit_stats)) {
            Text("${stringResource(R.string.habit_completion_daily)}: ${if (daily.available) "${daily.percent}%" else "—"}")
            Text("${stringResource(R.string.habit_completion_weekly)}: ${if (weekly.available) "${weekly.percent}%" else "—"}")
            Text("${stringResource(R.string.habit_completion_monthly)}: ${if (monthly.available) "${monthly.percent}%" else "—"}")
        }

        SectionCard(title = stringResource(R.string.habit_monthly_heatmap)) {
            if (heatmapHabit == null) {
                Text(stringResource(R.string.habit_no_data), style = MaterialTheme.typography.bodySmall)
            } else {
                val cells = habitHeatmap(heatmapHabit, logs, 28, today)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    cells.chunked(7).forEach { week ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            week.forEach { (_, status) ->
                                val color = when (status) {
                                    "done" -> MaterialTheme.colorScheme.primary
                                    "skipped", "rest" -> MaterialTheme.colorScheme.outline
                                    "missed" -> MaterialTheme.colorScheme.error.copy(alpha = 0.35f)
                                    else -> Color.Transparent
                                }
                                Box(
                                    Modifier.size(14.dp).background(color, RoundedCornerShape(2.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(2.dp))
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
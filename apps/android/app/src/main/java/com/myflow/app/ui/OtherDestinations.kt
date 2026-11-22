package com.myflow.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.DashboardRepository
import com.myflow.app.data.TaskRepository
import com.myflow.app.data.WidgetIds
import com.myflow.app.data.progressForTasks
import kotlinx.coroutines.launch
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.theme.GeneratedTokens
import com.myflow.app.ui.workspaces.ModuleHeader
import com.myflow.app.ui.workspaces.ModuleStats
import com.myflow.app.ui.workspaces.ProgressStrip
import com.myflow.app.ui.workspaces.SectionCard

private fun widgetLabelRes(id: String): Int = when (id) {
    WidgetIds.TODO_OVERVIEW -> R.string.widget_todo
    WidgetIds.HABIT_OVERVIEW -> R.string.widget_habits
    WidgetIds.CURRENT_STREAK -> R.string.widget_streak
    WidgetIds.MASCOT_GROWTH -> R.string.widget_mascot
    WidgetIds.GYM_OVERVIEW -> R.string.widget_gym
    WidgetIds.WALKING_OVERVIEW -> R.string.widget_walking
    WidgetIds.JUMP_ROPE_OVERVIEW -> R.string.widget_jump_rope
    WidgetIds.CYCLING_OVERVIEW -> R.string.widget_cycling
    WidgetIds.FOOD_OVERVIEW -> R.string.widget_food
    WidgetIds.READING_OVERVIEW -> R.string.widget_reading
    WidgetIds.JOURNAL_QUICK_ACCESS -> R.string.widget_journal
    WidgetIds.CALENDAR_OVERVIEW -> R.string.widget_calendar
    WidgetIds.FINANCE_OVERVIEW -> R.string.widget_finance
    WidgetIds.WEEKLY_STATISTICS -> R.string.widget_weekly
    WidgetIds.MONTHLY_STATISTICS -> R.string.widget_monthly
    WidgetIds.QUICK_CAPTURE -> R.string.widget_quick_capture
    else -> R.string.widget_todo
}

private fun widgetNoteRes(id: String): Int = when (id) {
    WidgetIds.TODO_OVERVIEW -> R.string.widget_note_todo
    WidgetIds.HABIT_OVERVIEW -> R.string.widget_note_habits
    WidgetIds.CURRENT_STREAK -> R.string.widget_note_streak
    WidgetIds.MASCOT_GROWTH -> R.string.widget_note_mascot
    WidgetIds.GYM_OVERVIEW -> R.string.widget_note_gym
    WidgetIds.WALKING_OVERVIEW -> R.string.widget_note_walking
    WidgetIds.JUMP_ROPE_OVERVIEW -> R.string.widget_note_jump_rope
    WidgetIds.CYCLING_OVERVIEW -> R.string.widget_note_cycling
    WidgetIds.FOOD_OVERVIEW -> R.string.widget_note_food
    WidgetIds.FINANCE_OVERVIEW -> R.string.widget_note_finance
    WidgetIds.WEEKLY_STATISTICS -> R.string.widget_note_weekly
    WidgetIds.MONTHLY_STATISTICS -> R.string.widget_note_monthly
    WidgetIds.QUICK_CAPTURE -> R.string.widget_note_quick_capture
    else -> R.string.widget_note_deferred
}

private fun <T> List<T>.swapped(first: Int, second: Int): List<T> = toMutableList().apply {
    val value = this[first]
    this[first] = this[second]
    this[second] = value
}

@Composable
fun DashboardScreen(repository: TaskRepository, dashboards: DashboardRepository) {
    val tasks by repository.observeTasks().collectAsState(initial = emptyList())
    val rows by dashboards.observe().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    var activeId by rememberSaveable { mutableStateOf<String?>(null) }
    var composing by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var draft by remember { mutableStateOf("") }

    LaunchedEffect(rows) {
        if (rows.isEmpty()) {
            dashboards.ensureDefault()
        } else if (activeId == null || rows.none { it.id == activeId }) {
            activeId = rows.firstOrNull { it.isDefault }?.id ?: rows.first().id
        }
    }

    val active = rows.firstOrNull { it.id == activeId } ?: rows.firstOrNull()
    val widgets = if (active != null) DashboardRepository.decode(active.widgets) else emptyList()
    val completed = tasks.count { it.completed }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(R.string.nav_dashboard),
            subtitle = stringResource(R.string.dashboard_subtitle),
            routeId = AppDestinations.DASHBOARD,
        )
        Surface(
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp),
        ) {
            Text(
                text = stringResource(R.string.local_first_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(12.dp),
            )
        }
        ModuleStats(
            records = tasks.size.toString(),
            done = completed.toString(),
            open = (tasks.size - completed).toString(),
        )
        ProgressStrip(
            snapshot = progressForTasks(tasks),
            routeId = AppDestinations.DASHBOARD,
        )

        SectionCard(title = stringResource(R.string.dashboard_selector)) {
            if (rows.isEmpty()) {
                Text(
                    text = stringResource(R.string.loading_label),
                    style = MaterialTheme.typography.bodySmall,
                )
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    rows.forEach { row ->
                        FilterChip(
                            selected = row.id == active?.id,
                            onClick = { activeId = row.id },
                            label = {
                                Text(
                                    if (row.isDefault) {
                                        "${row.name} · ${stringResource(R.string.default_badge)}"
                                    } else {
                                        row.name
                                    }
                                )
                            },
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { composing = true; renaming = false; draft = "" }) {
                        Text(stringResource(R.string.new_dashboard))
                    }
                    TextButton(onClick = {
                        active?.let { composing = true; renaming = true; draft = it.name }
                    }) {
                        Text(stringResource(R.string.rename_dashboard))
                    }
                    TextButton(onClick = {
                        active?.let { scope.launch { dashboards.duplicate(it.id) } }
                    }) {
                        Text(stringResource(R.string.duplicate_dashboard))
                    }
                    TextButton(onClick = {
                        active?.let { scope.launch { dashboards.delete(it.id) } }
                    }) {
                        Text(stringResource(R.string.delete_dashboard))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = {
                        active?.let { scope.launch { dashboards.setDefault(it.id) } }
                    }) {
                        Text(stringResource(R.string.set_default))
                    }
                    val index = rows.indexOfFirst { it.id == active?.id }
                    TextButton(
                        enabled = index > 0,
                        onClick = {
                            scope.launch { dashboards.reorder(rows.map { it.id }.swapped(index, index - 1)) }
                        },
                    ) {
                        Text(stringResource(R.string.move_up))
                    }
                    TextButton(
                        enabled = index >= 0 && index < rows.lastIndex,
                        onClick = {
                            scope.launch { dashboards.reorder(rows.map { it.id }.swapped(index, index + 1)) }
                        },
                    ) {
                        Text(stringResource(R.string.move_down))
                    }
                }
                if (composing) {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        label = { Text(stringResource(R.string.dashboard_name_placeholder)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            enabled = draft.isNotBlank(),
                            onClick = {
                                scope.launch {
                                    if (renaming && active != null) dashboards.rename(active.id, draft)
                                    else dashboards.create(draft)
                                    composing = false
                                    draft = ""
                                }
                            },
                        ) {
                            Text(stringResource(R.string.save_action))
                        }
                        TextButton(onClick = { composing = false; draft = "" }) {
                            Text(stringResource(R.string.cancel_action))
                        }
                    }
                }
                Text(
                    text = stringResource(R.string.layout_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        SectionCard(title = stringResource(R.string.add_widget)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                WidgetIds.ALL.forEach { id ->
                    FilterChip(
                        selected = widgets.any { it.id == id },
                        enabled = widgets.none { it.id == id },
                        onClick = { active?.let { scope.launch { dashboards.addWidget(it.id, id) } } },
                        label = { Text(stringResource(widgetLabelRes(id))) },
                    )
                }
            }
        }

        widgets.filter { it.visible }.forEach { widget ->
            SectionCard(title = stringResource(widgetLabelRes(widget.id))) {
                Text(
                    text = stringResource(widgetNoteRes(widget.id)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (widget.id == WidgetIds.TODO_OVERVIEW && tasks.isNotEmpty()) {
                    Text(
                        text = "${completed} / ${tasks.size}",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                if (widget.id == WidgetIds.WEEKLY_STATISTICS || widget.id == WidgetIds.MONTHLY_STATISTICS) {
                    val days = if (widget.id == WidgetIds.WEEKLY_STATISTICS) 7 else 30
                    val cutoff = java.time.Instant.now().minus(days, java.time.temporal.ChronoUnit.DAYS).toString()
                    val captured = tasks.count { it.createdAt >= cutoff }
                    Text(
                        text = "${stringResource(R.string.chart_captured)}: $captured",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    if (captured == 0) {
                        Text(
                            text = stringResource(R.string.no_data_for_range),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                TextButton(onClick = {
                    active?.let { row ->
                        val next = DashboardRepository.reorderWidgets(widgets, widget.id, widgets.first().id)
                        scope.launch { dashboards.saveWidgets(row.id, next) }
                    }
                }) {
                    Text(stringResource(R.string.move_up))
                }
                TextButton(onClick = {
                    active?.let { row ->
                        scope.launch {
                            dashboards.saveWidgets(row.id, widgets.filterNot { it.id == widget.id })
                        }
                    }
                }) {
                    Text(stringResource(R.string.remove_widget))
                }
            }
        }
    }
}

@Composable
fun AppearanceScreen(onOpenDesignSystem: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(R.string.nav_appearance),
            subtitle = stringResource(R.string.appearance_subtitle),
            routeId = AppDestinations.APPEARANCE,
        )
        SectionCard(title = stringResource(R.string.appearance_title)) {
            Text(
                text = stringResource(R.string.appearance_android_note),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = onOpenDesignSystem) {
                Text(stringResource(R.string.open_design_system))
            }
        }
    }
}

@Composable
fun ProfileScreen(onOpenAppearance: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(R.string.profile_title),
            subtitle = stringResource(R.string.profile_subtitle),
            routeId = AppDestinations.PROFILE,
        )
        SectionCard(title = stringResource(R.string.profile_single_title)) {
            Text(
                text = stringResource(R.string.profile_single_note),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = stringResource(R.string.profile_edit_later),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        SectionCard(title = stringResource(R.string.profile_preferences)) {
            Button(onClick = onOpenAppearance) {
                Text(stringResource(R.string.open_appearance))
            }
        }
        SectionCard(title = stringResource(R.string.section_deep_links)) {
            Text(
                text = stringResource(R.string.deeplink_app_pattern),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = stringResource(R.string.deeplink_web_pattern),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = stringResource(R.string.deeplink_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

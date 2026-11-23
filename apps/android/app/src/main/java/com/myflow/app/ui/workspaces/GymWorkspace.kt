package com.myflow.app.ui.workspaces

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.GymRepository
import com.myflow.app.data.WorkoutAggregate
import com.myflow.app.data.derivePersonalRecords
import com.myflow.app.data.gymSummary
import com.myflow.app.data.workoutCompletionProgress
import com.myflow.app.data.workoutVolume
import com.myflow.app.ui.navigation.AppDestinations
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun GymWorkspace(repository: GymRepository) {
    val exercises by repository.observeExercises().collectAsState(initial = emptyList())
    val workouts by repository.observeWorkouts().collectAsState(initial = emptyList())
    val prs by repository.observePersonalRecords().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    var aggregates by remember { mutableStateOf<List<WorkoutAggregate>>(emptyList()) }
    var filter by rememberSaveable { mutableStateOf("all") }
    var exerciseName by rememberSaveable { mutableStateOf("") }
    var exerciseGroups by remember { mutableStateOf(setOf("chest")) }
    var showExerciseForm by rememberSaveable { mutableStateOf(false) }
    val setDrafts = remember { mutableStateMapOf<String, Pair<String, String>>() }

    suspend fun refresh() {
        repository.ensureDefaults()
        aggregates = repository.allAggregates()
    }

    fun draftFor(set: com.myflow.app.data.GymSetEntity): Pair<String, String> =
        setDrafts[set.id] ?: (set.reps.toString() to if (set.weight % 1.0 == 0.0) set.weight.toInt().toString() else set.weight.toString())

    fun commitSetDraft(set: com.myflow.app.data.GymSetEntity) {
        val draft = setDrafts[set.id] ?: return
        val reps = draft.first.toIntOrNull()?.coerceAtLeast(0)
        val weight = draft.second.toDoubleOrNull()?.coerceAtLeast(0.0)
        val repsChanged = reps != null && reps != set.reps
        val weightChanged = weight != null && weight != set.weight
        if (!repsChanged && !weightChanged) return
        scope.launch {
            repository.updateSet(
                set,
                reps = if (repsChanged) reps else null,
                weight = if (weightChanged) weight else null,
                completed = null,
            )
            refresh()
        }
    }

    LaunchedEffect(workouts.size, exercises.size) { refresh() }

    val activeWorkout = aggregates.firstOrNull { it.workout.endedAt == null }
    val progress = workoutCompletionProgress(activeWorkout)
    val summary = gymSummary(aggregates, prs.ifEmpty { derivePersonalRecords(aggregates) })
    val filtered = when (filter) {
        "active" -> aggregates.filter { it.workout.endedAt == null }
        "completed" -> aggregates.filter { it.workout.endedAt != null }
        else -> aggregates
    }
    val exerciseById = exercises.associateBy { it.id }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(stringResource(R.string.nav_gym), stringResource(R.string.workspace_subtitle_gym), AppDestinations.GYM)
        ProgressStrip(snapshot = progress, routeId = AppDestinations.GYM)
        ModuleStats(summary.workoutCount.toString(), prs.size.toString(), aggregates.count { it.workout.endedAt == null }.toString())

        SectionCard(title = stringResource(R.string.gym_actions)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { scope.launch { repository.createWorkout(); refresh() } }) { Text(stringResource(R.string.gym_new_workout)) }
                TextButton(onClick = { showExerciseForm = !showExerciseForm }) { Text(stringResource(R.string.gym_new_exercise)) }
            }
            if (showExerciseForm) {
                OutlinedTextField(exerciseName, { exerciseName = it }, label = { Text(stringResource(R.string.gym_exercise_name)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Text(stringResource(R.string.gym_muscle_group), style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("chest", "back", "legs", "shoulders", "arms", "core", "fullBody").forEach { group ->
                        val selected = group in exerciseGroups
                        FilterChip(
                            selected = selected,
                            onClick = {
                                exerciseGroups = if (selected) (exerciseGroups - group).ifEmpty { exerciseGroups } else exerciseGroups + group
                            },
                            label = { Text(group.replaceFirstChar { c -> c.uppercase() }) },
                        )
                    }
                }
                Button(enabled = exerciseName.isNotBlank() && exerciseGroups.isNotEmpty(), onClick = {
                    scope.launch {
                        repository.createExercise(exerciseName, exerciseGroups.joinToString(","))
                        exerciseName = ""
                        exerciseGroups = setOf("chest")
                        showExerciseForm = false
                        refresh()
                    }
                }) { Text(stringResource(R.string.save_action)) }

                if (exercises.isNotEmpty()) {
                    Text(stringResource(R.string.gym_exercises), style = MaterialTheme.typography.labelMedium)
                    exercises.forEach { ex ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(ex.name, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = {
                                scope.launch {
                                    repository.deleteExercise(ex.id)
                                    refresh()
                                }
                            }) { Text(stringResource(R.string.delete_action)) }
                        }
                    }
                }
            }
        }

        SectionCard(title = stringResource(R.string.module_filters)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to R.string.filter_all, "active" to R.string.gym_filter_active, "completed" to R.string.gym_filter_completed).forEach { (key, label) ->
                    FilterChip(selected = filter == key, onClick = { filter = key }, label = { Text(stringResource(label)) })
                }
            }
        }

        if (prs.isNotEmpty()) {
            SectionCard(title = stringResource(R.string.gym_prs)) {
                PersonalRecordsGraph(prs = prs, exerciseById = exerciseById)
            }
        }

        if (filtered.isEmpty()) {
            EmptyState(stringResource(R.string.empty_title), stringResource(R.string.module_empty_gym))
        }

        filtered.forEach { workout ->
            SectionCard(title = workout.workout.startedAt.take(16).replace('T', ' ')) {
                Text(
                    "${stringResource(R.string.gym_volume)}: ${workoutVolume(workout).roundToInt()} · ${if (workout.workout.endedAt == null) stringResource(R.string.gym_filter_active) else stringResource(R.string.gym_filter_completed)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (workout.workout.endedAt == null) {
                        TextButton(onClick = { scope.launch { repository.finishWorkout(workout.workout.id); refresh() } }) { Text(stringResource(R.string.gym_finish_workout)) }
                    }
                    TextButton(onClick = { scope.launch { repository.deleteWorkout(workout.workout.id); refresh() } }) { Text(stringResource(R.string.delete_action)) }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    exercises.take(6).forEach { ex ->
                        TextButton(onClick = { scope.launch { repository.addExercise(workout.workout.id, ex.id); refresh() } }) { Text("+ ${ex.name.take(10)}") }
                    }
                }

                workout.exercises.forEach { ex ->
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(exerciseById[ex.exercise.exerciseId]?.name ?: ex.exercise.exerciseId, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                            TextButton(onClick = { scope.launch { repository.addSet(ex.exercise.id); refresh() } }) { Text(stringResource(R.string.gym_add_set)) }
                            TextButton(onClick = { scope.launch { repository.removeExercise(ex.exercise.id); refresh() } }) { Text(stringResource(R.string.delete_action)) }
                        }
                        ex.sets.forEach { set ->
                            val draft = draftFor(set)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Text("#${set.setNumber}", style = MaterialTheme.typography.bodySmall)
                                OutlinedTextField(
                                    value = draft.first,
                                    onValueChange = { v -> setDrafts[set.id] = v to draft.second },
                                    label = { Text(stringResource(R.string.gym_reps)) },
                                    modifier = Modifier.weight(1f).onFocusChanged { if (!it.isFocused) commitSetDraft(set) },
                                    singleLine = true,
                                )
                                OutlinedTextField(
                                    value = draft.second,
                                    onValueChange = { v -> setDrafts[set.id] = draft.first to v },
                                    label = { Text(stringResource(R.string.gym_weight)) },
                                    modifier = Modifier.weight(1f).onFocusChanged { if (!it.isFocused) commitSetDraft(set) },
                                    singleLine = true,
                                )
                                TextButton(
                                    onClick = {
                                        val next = !set.completed
                                        val d = draftFor(set)
                                        val reps = d.first.toIntOrNull()?.coerceAtLeast(0)
                                        val weight = d.second.toDoubleOrNull()?.coerceAtLeast(0.0)
                                        scope.launch {
                                            repository.updateSet(
                                                set,
                                                reps = if (reps != null && reps != set.reps) reps else null,
                                                weight = if (weight != null && weight != set.weight) weight else null,
                                                completed = next,
                                            )
                                            refresh()
                                        }
                                    },
                                ) {
                                    Text(if (set.completed) "✓" else "○")
                                }
                                TextButton(onClick = { scope.launch { repository.removeSet(set); refresh() } }) { Text("×") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PersonalRecordsGraph(
    prs: List<com.myflow.app.data.GymPersonalRecordEntity>,
    exerciseById: Map<String, com.myflow.app.data.GymExerciseEntity>,
) {
    val maxWeightPrs = prs.filter { it.metric == "maxWeight" }
        .groupBy { it.exerciseId }
        .mapNotNull { (exerciseId, records) -> records.maxByOrNull { it.value } }
        .sortedByDescending { it.value }
        .take(6)

    if (maxWeightPrs.isEmpty()) {
        Text(stringResource(R.string.gym_no_workouts), style = MaterialTheme.typography.bodySmall)
        return
    }

    val maxValue = maxWeightPrs.maxOf { it.value }.coerceAtLeast(1.0)
    val barColor = MaterialTheme.colorScheme.primary
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant

    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        maxWeightPrs.forEach { pr ->
            val name = exerciseById[pr.exerciseId]?.name ?: pr.exerciseId
            Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(name, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text("${pr.value.roundToInt()} kg", style = MaterialTheme.typography.labelMedium)
                }
                Box(modifier = Modifier.fillMaxWidth().height(10.dp)) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val w = size.width
                        val h = size.height
                        drawRect(color = barColor.copy(alpha = 0.15f), size = Size(w, h))
                        val barW = (w * (pr.value / maxValue)).toFloat().coerceAtLeast(2f)
                        drawRect(color = barColor, size = Size(barW, h))
                    }
                }
            }
        }
        Text("Max weight PR by exercise", style = MaterialTheme.typography.labelSmall, color = labelColor)
    }
}
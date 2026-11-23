package com.myflow.app.ui.workspaces

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
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
    var exerciseGroup by rememberSaveable { mutableStateOf("chest") }
    var showExerciseForm by rememberSaveable { mutableStateOf(false) }

    suspend fun refresh() {
        repository.ensureDefaults()
        aggregates = repository.allAggregates()
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
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("chest", "back", "legs", "shoulders", "arms", "core").forEach { group ->
                        FilterChip(selected = exerciseGroup == group, onClick = { exerciseGroup = group }, label = { Text(group.replaceFirstChar { it.uppercase() }) })
                    }
                }
                Button(enabled = exerciseName.isNotBlank(), onClick = {
                    scope.launch { repository.createExercise(exerciseName, exerciseGroup); exerciseName = ""; showExerciseForm = false; refresh() }
                }) { Text(stringResource(R.string.save_action)) }
            }
        }

        SectionCard(title = stringResource(R.string.module_filters)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to R.string.filter_all, "active" to R.string.gym_filter_active, "completed" to R.string.gym_filter_completed).forEach { (key, label) ->
                    FilterChip(selected = filter == key, onClick = { filter = key }, label = { Text(stringResource(label)) })
                }
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
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Text("#${set.setNumber}", style = MaterialTheme.typography.bodySmall)
                                OutlinedTextField(
                                    value = set.reps.toString(),
                                    onValueChange = { v -> v.toIntOrNull()?.let { scope.launch { repository.updateSet(set, reps = it, weight = null, completed = null); refresh() } } },
                                    label = { Text(stringResource(R.string.gym_reps)) },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                )
                                OutlinedTextField(
                                    value = if (set.weight % 1.0 == 0.0) set.weight.toInt().toString() else set.weight.toString(),
                                    onValueChange = { v -> v.toDoubleOrNull()?.let { scope.launch { repository.updateSet(set, reps = null, weight = it, completed = null); refresh() } } },
                                    label = { Text(stringResource(R.string.gym_weight)) },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                )
                                Checkbox(checked = set.completed, onCheckedChange = { c -> scope.launch { repository.updateSet(set, null, null, c); refresh() } })
                                TextButton(onClick = { scope.launch { repository.removeSet(set); refresh() } }) { Text("×") }
                            }
                        }
                    }
                }
            }
        }
    }
}
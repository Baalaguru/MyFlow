package com.myflow.app.ui.workspaces

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.HabitRepository
import com.myflow.app.data.calculateProgress
import com.myflow.app.data.mascotProgress
import com.myflow.app.data.unavailableProgress
import com.myflow.app.ui.navigation.AppDestinations
import kotlinx.coroutines.launch

@Composable
fun MascotWorkspace(repository: HabitRepository) {
    val habits by repository.observeHabits().collectAsState(initial = emptyList())
    val logs by repository.observeLogs().collectAsState(initial = emptyList())
    val mascot by repository.observeMascot().collectAsState(initial = null)
    val scope = rememberCoroutineScope()

    val active = habits.filter { !it.archived }
    val progress = mascotProgress(habits, logs)
    val stageRes = when (progress.stage) {
        "sprout" -> R.string.mascot_stage_sprout
        "bloom" -> R.string.mascot_stage_bloom
        "grove" -> R.string.mascot_stage_grove
        else -> R.string.mascot_stage_seed
    }
    val snapshot = if (active.isEmpty()) unavailableProgress else calculateProgress(progress.completedDays, progress.nextThreshold)

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(stringResource(R.string.nav_mascot), stringResource(R.string.workspace_subtitle_mascot), AppDestinations.MASCOT)
        ProgressStrip(snapshot = snapshot, routeId = AppDestinations.MASCOT)
        if (active.isEmpty()) {
            SectionCard(title = stringResource(R.string.nav_mascot)) {
                Text(stringResource(R.string.mascot_no_habits), style = MaterialTheme.typography.bodyMedium)
            }
        } else {
            SectionCard(title = stringResource(R.string.mascot_stage)) {
                Text(
                    when (progress.stage) { "sprout" -> "🌱"; "bloom" -> "🌼"; "grove" -> "🌳"; else -> "🌰" },
                    style = MaterialTheme.typography.displayMedium,
                )
                Text(stringResource(stageRes), style = MaterialTheme.typography.titleLarge)
                Text(stringResource(R.string.mascot_progress_note), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(stringResource(R.string.mascot_neutral_missed), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("${progress.completedDays} / ${progress.nextThreshold}", style = MaterialTheme.typography.titleMedium)
            }
            SectionCard(title = stringResource(R.string.mascot_companion)) {
                val current = mascot?.companion ?: "sprout"
                androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = current == "sprout", onClick = { scope.launch { repository.saveMascot("sprout", mascot?.plantStyle ?: "fern", mascot?.animationsEnabled ?: true) } }, label = { Text(stringResource(R.string.mascot_stage_sprout)) })
                    FilterChip(selected = current == "pixel", onClick = { scope.launch { repository.saveMascot("pixel", mascot?.plantStyle ?: "fern", mascot?.animationsEnabled ?: true) } }, label = { Text(stringResource(R.string.mascot_pixel)) })
                }
                Text(stringResource(R.string.mascot_plant), style = MaterialTheme.typography.labelLarge)
                val plant = mascot?.plantStyle ?: "fern"
                androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("fern", "bonsai", "flower").forEach { option ->
                        FilterChip(selected = plant == option, onClick = { scope.launch { repository.saveMascot(mascot?.companion ?: "sprout", option, mascot?.animationsEnabled ?: true) } }, label = { Text(option.replaceFirstChar { it.uppercase() }) })
                    }
                }
                val animations = mascot?.animationsEnabled ?: true
                Button(onClick = { scope.launch { repository.saveMascot(mascot?.companion ?: "sprout", mascot?.plantStyle ?: "fern", !animations) } }) {
                    Text(stringResource(if (animations) R.string.mascot_animations_off else R.string.mascot_animations_on))
                }
            }
        }
    }
}
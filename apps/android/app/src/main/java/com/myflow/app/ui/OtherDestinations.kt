package com.myflow.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.TaskRepository
import com.myflow.app.data.progressForTasks
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.theme.GeneratedTokens
import com.myflow.app.ui.workspaces.ModuleHeader
import com.myflow.app.ui.workspaces.ModuleStats
import com.myflow.app.ui.workspaces.ProgressStrip
import com.myflow.app.ui.workspaces.SectionCard

@Composable
fun DashboardScreen(repository: TaskRepository) {
    val tasks by repository.observeTasks().collectAsState(initial = emptyList())
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
        SectionCard(title = stringResource(R.string.tasks_in_local_store)) {
            Text(
                text = stringResource(R.string.module_empty_tasks),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        SectionCard(title = stringResource(R.string.foundation_ready)) {
            listOf(
                R.string.foundation_item_storage,
                R.string.foundation_item_themes,
                R.string.foundation_item_languages,
                R.string.foundation_item_status,
            ).forEach { itemRes ->
                Text(
                    text = stringResource(itemRes),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            Text(
                text = stringResource(R.string.foundation_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
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

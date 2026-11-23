package com.myflow.app.ui.workspaces

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.unavailableProgress
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.navigation.destinationColors
import com.myflow.app.ui.theme.GeneratedTokens

/**
 * Shared scaffolding for modules whose repositories do not exist yet. The body
 * slot is deliberately module-specific; no placeholder records are invented.
 */
@Composable
private fun EmptyModuleWorkspace(
    routeId: String,
    titleRes: Int,
    subtitleRes: Int,
    body: @Composable ColumnScope.() -> Unit,
) {
    val notRecorded = stringResource(R.string.not_recorded)
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(titleRes),
            subtitle = stringResource(subtitleRes),
            routeId = routeId,
        )
        ProgressStrip(snapshot = unavailableProgress, routeId = routeId)
        ModuleStats(records = notRecorded, done = notRecorded, open = notRecorded)
        ModuleActions {
            Text(
                text = stringResource(R.string.actions_available_later),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        ModuleFilters {
            Text(
                text = stringResource(R.string.filters_available_later),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        body()
    }
}

// HabitsWorkspace, MascotWorkspace, and GymWorkspace are implemented in dedicated files.

@Composable
private fun PlanColumn(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("sm").dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(text = label, style = MaterialTheme.typography.labelSmall)
        Text(text = value, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun FoodWorkspace() {
    val notRecorded = stringResource(R.string.not_recorded)
    EmptyModuleWorkspace(
        routeId = AppDestinations.FOOD,
        titleRes = R.string.nav_food,
        subtitleRes = R.string.workspace_subtitle_food,
    ) {
        SectionCard(title = stringResource(R.string.food_meals_label)) {
            ValueRow(label = stringResource(R.string.food_breakfast), value = notRecorded)
            ValueRow(label = stringResource(R.string.food_lunch), value = notRecorded)
            ValueRow(label = stringResource(R.string.food_dinner), value = notRecorded)
            Text(
                text = stringResource(R.string.module_empty_food),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun CardioWorkspace() {
    val notRecorded = stringResource(R.string.not_recorded)
    EmptyModuleWorkspace(
        routeId = AppDestinations.CARDIO,
        titleRes = R.string.nav_cardio,
        subtitleRes = R.string.workspace_subtitle_cardio,
    ) {
        SectionCard(title = stringResource(R.string.cardio_measure_label)) {
            ValueRow(label = stringResource(R.string.cardio_distance), value = notRecorded)
            ValueRow(label = stringResource(R.string.cardio_duration), value = notRecorded)
            Text(
                text = stringResource(R.string.cardio_sensor_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = stringResource(R.string.module_empty_cardio),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun FinanceWorkspace() {
    val notRecorded = stringResource(R.string.not_recorded)
    EmptyModuleWorkspace(
        routeId = AppDestinations.FINANCE,
        titleRes = R.string.nav_finance,
        subtitleRes = R.string.workspace_subtitle_finance,
    ) {
        SectionCard(title = stringResource(R.string.finance_ledger_label)) {
            ValueRow(label = stringResource(R.string.finance_income), value = notRecorded)
            ValueRow(label = stringResource(R.string.finance_expense), value = notRecorded)
            ValueRow(label = stringResource(R.string.finance_net), value = notRecorded)
            Text(
                text = stringResource(R.string.finance_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = stringResource(R.string.module_empty_finance),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

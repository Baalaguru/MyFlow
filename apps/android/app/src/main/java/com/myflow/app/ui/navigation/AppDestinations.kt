package com.myflow.app.ui.navigation

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.myflow.app.R
import com.myflow.app.ui.theme.GeneratedTokens

/** Stable route identifiers shared with the web client and all deep links. */
object AppDestinations {
    const val DASHBOARD = "dashboard"
    const val TASKS = "tasks"
    const val HABITS = "habits"
    const val MASCOT = "mascot"
    const val GYM = "gym"
    const val FOOD = "food"
    const val CARDIO = "cardio"
    const val FINANCE = "finance"
    const val APPEARANCE = "appearance"
    const val DESIGN_SYSTEM = "design-system"
    const val PROFILE = "profile"

    const val DEEP_LINK_APP_PREFIX = "myflow://app/"
    const val DEEP_LINK_WEB_PREFIX = "https://myflow.local/"

    val all: List<AppDestination> = listOf(
        AppDestination(DASHBOARD, R.string.nav_dashboard, isPrimary = true),
        AppDestination(TASKS, R.string.nav_tasks, isPrimary = true),
        AppDestination(HABITS, R.string.nav_habits, isPrimary = true),
        AppDestination(MASCOT, R.string.nav_mascot, isPrimary = true),
        AppDestination(GYM, R.string.nav_gym, isPrimary = true),
        AppDestination(FOOD, R.string.nav_food),
        AppDestination(CARDIO, R.string.nav_cardio),
        AppDestination(FINANCE, R.string.nav_finance),
        AppDestination(APPEARANCE, R.string.nav_appearance),
        AppDestination(DESIGN_SYSTEM, R.string.nav_design_system),
        AppDestination(PROFILE, R.string.nav_profile),
    )

    val primary: List<AppDestination> = all.filter { it.isPrimary }

    fun find(route: String?): AppDestination =
        all.firstOrNull { it.id == route } ?: all.first()

    fun isKnown(route: String?): Boolean = all.any { it.id == route }
}

data class AppDestination(
    val id: String,
    val labelRes: Int,
    val isPrimary: Boolean = false,
)

/** Resolves generated module accents and selected-state roles to theme colours. */
@Composable
fun destinationColors(routeId: String): Pair<Color, Color> {
    val role = GeneratedTokens.moduleAccents[routeId]
        ?: GeneratedTokens.stateRoles.getValue("selected")
    val scheme = MaterialTheme.colorScheme
    return when (role) {
        "growth" -> scheme.primaryContainer to scheme.onPrimaryContainer
        "highlight" -> scheme.secondary to scheme.onSecondary
        else -> scheme.primary to scheme.onPrimary
    }
}

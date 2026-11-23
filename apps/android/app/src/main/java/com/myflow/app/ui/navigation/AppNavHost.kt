package com.myflow.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navDeepLink
import com.myflow.app.data.DashboardRepository
import com.myflow.app.data.GymRepository
import com.myflow.app.data.HabitRepository
import com.myflow.app.data.TaskRepository
import com.myflow.app.ui.AppearanceScreen
import com.myflow.app.ui.DashboardScreen
import com.myflow.app.ui.DesignSystemScreen
import com.myflow.app.ui.ProfileScreen
import com.myflow.app.ui.workspaces.CardioWorkspace
import com.myflow.app.ui.workspaces.FinanceWorkspace
import com.myflow.app.ui.workspaces.FoodWorkspace
import com.myflow.app.ui.workspaces.GymWorkspace
import com.myflow.app.ui.workspaces.HabitsWorkspace
import com.myflow.app.ui.workspaces.MascotWorkspace
import com.myflow.app.ui.workspaces.TasksWorkspace

/** All eleven stable route ids are real Compose destinations and deep-link paths. */
@Composable
fun AppNavHost(
    navController: NavHostController,
    repository: TaskRepository,
    dashboards: DashboardRepository,
    habits: HabitRepository,
    gym: GymRepository,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = AppDestinations.DASHBOARD,
        modifier = modifier,
    ) {
        AppDestinations.all.forEach { destination ->
            composable(
                route = destination.id,
                deepLinks = listOf(
                    navDeepLink {
                        uriPattern = AppDestinations.DEEP_LINK_APP_PREFIX + destination.id
                    },
                    navDeepLink {
                        uriPattern = AppDestinations.DEEP_LINK_WEB_PREFIX + destination.id
                    },
                ),
            ) {
                when (destination.id) {
                    AppDestinations.DASHBOARD -> DashboardScreen(repository, dashboards, habits, gym)
                    AppDestinations.TASKS -> TasksWorkspace(repository)
                    AppDestinations.HABITS -> HabitsWorkspace(habits)
                    AppDestinations.MASCOT -> MascotWorkspace(habits)
                    AppDestinations.GYM -> GymWorkspace(gym)
                    AppDestinations.FOOD -> FoodWorkspace()
                    AppDestinations.CARDIO -> CardioWorkspace()
                    AppDestinations.FINANCE -> FinanceWorkspace()
                    AppDestinations.APPEARANCE -> AppearanceScreen(
                        onOpenDesignSystem = {
                            navController.navigate(AppDestinations.DESIGN_SYSTEM)
                        },
                    )

                    AppDestinations.DESIGN_SYSTEM -> DesignSystemScreen()
                    AppDestinations.PROFILE -> ProfileScreen(
                        onOpenAppearance = {
                            navController.navigate(AppDestinations.APPEARANCE)
                        },
                    )
                }
            }
        }
    }
}

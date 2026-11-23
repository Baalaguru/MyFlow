@file:OptIn(ExperimentalMaterial3Api::class)

package com.myflow.app.ui

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.myflow.app.R
import com.myflow.app.data.AppDatabase
import com.myflow.app.data.DashboardLabels
import com.myflow.app.data.DashboardRepository
import com.myflow.app.data.GymRepository
import com.myflow.app.data.HabitRepository
import com.myflow.app.data.SearchResult
import com.myflow.app.data.TaskRepository
import com.myflow.app.ui.navigation.AppDestinations
import com.myflow.app.ui.navigation.AppNavHost
import com.myflow.app.ui.navigation.destinationColors
import com.myflow.app.ui.theme.GeneratedTokens
import com.myflow.app.ui.theme.MyFlowTheme
import com.myflow.app.ui.theme.tokenColor
import com.myflow.app.ui.theme.tokenPalette
import com.myflow.app.ui.theme.tokenRoleColor
import kotlinx.coroutines.launch

private val semanticRoleLabels: List<Pair<String, Int>> = listOf(
    "background" to R.string.role_background,
    "surface" to R.string.role_surface,
    "surfaceAlt" to R.string.role_surface_alt,
    "primary" to R.string.role_primary,
    "growth" to R.string.role_growth,
    "highlight" to R.string.role_highlight,
    "text" to R.string.role_text,
    "muted" to R.string.role_muted,
    "border" to R.string.role_border,
    "success" to R.string.role_success,
    "warning" to R.string.role_warning,
    "danger" to R.string.role_danger,
    "disabled" to R.string.role_disabled,
    "focus" to R.string.role_focus,
    "widgetBackground" to R.string.role_widget_background,
    "panel" to R.string.role_panel,
)

@Composable
fun MyFlowApp(startIntent: Intent? = null) {
    val context = LocalContext.current
    val repository = remember(context.applicationContext) {
        TaskRepository(AppDatabase.get(context.applicationContext).taskDao())
    }
    val defaultDashboardName = stringResource(R.string.default_dashboard_name)
    val newDashboardName = stringResource(R.string.new_dashboard_name)
    val dashboardCopyName = stringResource(R.string.dashboard_copy_name)
    val dashboardRepository = remember(
        context.applicationContext,
        defaultDashboardName,
        newDashboardName,
        dashboardCopyName,
    ) {
        DashboardRepository(
            AppDatabase.get(context.applicationContext).dashboardDao(),
            DashboardLabels(defaultDashboardName, newDashboardName, dashboardCopyName),
        )
    }
    val habitRepository = remember(context.applicationContext) {
        HabitRepository(AppDatabase.get(context.applicationContext).habitDao())
    }
    val gymRepository = remember(context.applicationContext) {
        GymRepository(AppDatabase.get(context.applicationContext).gymDao())
    }
    val darkMode = isSystemInDarkTheme()
    val presetId = GeneratedTokens.presetIds.first()
    val fontPreference = GeneratedTokens.fontPreferenceIds.first()

    MyFlowTheme(
        presetId = presetId,
        darkMode = darkMode,
        fontPreference = fontPreference,
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            AppShell(
                repository = repository,
                dashboardRepository = dashboardRepository,
                habitRepository = habitRepository,
                gymRepository = gymRepository,
                startIntent = startIntent,
            )
        }
    }
}

@Composable
private fun AppShell(
    repository: TaskRepository,
    dashboardRepository: DashboardRepository,
    habitRepository: HabitRepository,
    gymRepository: GymRepository,
    startIntent: Intent?,
) {
    val navController = rememberNavController()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: AppDestinations.DASHBOARD
    val canGoBack = navController.previousBackStackEntry != null

    var searchOpen by rememberSaveable { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var results by remember { mutableStateOf(emptyList<SearchResult>()) }
    val handledIntents = remember { mutableSetOf<Intent>() }

    // Wait until the host has a graph and a start destination before dispatching links.
    LaunchedEffect(startIntent, backStackEntry) {
        if (startIntent != null && backStackEntry != null && handledIntents.add(startIntent)) {
            navController.handleDeepLink(startIntent)
        }
    }
    LaunchedEffect(query, repository) {
        results = if (query.isBlank()) emptyList() else repository.search(query)
    }

    fun navigateTo(route: String) {
        navController.navigate(route) {
            popUpTo(AppDestinations.DASHBOARD) { inclusive = false }
            launchSingleTop = true
            restoreState = true
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        text = stringResource(R.string.app_name),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text = stringResource(R.string.modules_label),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    AppDestinations.all.forEach { destination ->
                        val selected = destination.id == currentRoute
                        val (background, foreground) = destinationColors(destination.id)
                        NavigationDrawerItem(
                            label = {
                                Text(
                                    text = stringResource(destination.labelRes),
                                    color = if (selected) {
                                        foreground
                                    } else {
                                        MaterialTheme.colorScheme.onSurface
                                    },
                                )
                            },
                            selected = selected,
                            onClick = {
                                navigateTo(destination.id)
                                scope.launch { drawerState.close() }
                            },
                            modifier = Modifier
                                .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp))
                                .background(if (selected) background else Color.Transparent),
                        )
                    }
                }
            }
        },
    ) {
        Scaffold(
            topBar = {
                Column {
                    TopAppBar(
                        title = {
                            Column {
                                Text(
                                    text = stringResource(AppDestinations.find(currentRoute).labelRes),
                                    style = MaterialTheme.typography.titleLarge,
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("pill").dp))
                                        .background(
                                            destinationColors(currentRoute).first,
                                        )
                                        .padding(horizontal = 10.dp, vertical = 2.dp),
                                ) {
                                    Text(
                                        text = stringResource(R.string.state_selected),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = destinationColors(currentRoute).second,
                                    )
                                }
                            }
                        },
                        navigationIcon = {
                            if (canGoBack) {
                                TextButton(onClick = { navController.navigateUp() }) {
                                    Text(stringResource(R.string.action_back))
                                }
                            } else {
                                TextButton(onClick = { scope.launch { drawerState.open() } }) {
                                    Text(stringResource(R.string.action_menu))
                                }
                            }
                        },
                        actions = {
                            if (canGoBack) {
                                TextButton(onClick = { scope.launch { drawerState.open() } }) {
                                    Text(stringResource(R.string.action_menu))
                                }
                            }
                            TextButton(onClick = { searchOpen = !searchOpen }) {
                                Text(
                                    stringResource(
                                        if (searchOpen) R.string.action_close_search else R.string.action_search,
                                    ),
                                )
                            }
                        },
                    )
                    if (searchOpen) {
                        SearchPanel(
                            query = query,
                            onQueryChange = { query = it },
                            results = results,
                            onResultClick = { result ->
                                searchOpen = false
                                navigateTo(result.route)
                            },
                        )
                    }
                }
            },
            bottomBar = {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    AppDestinations.primary.forEach { destination ->
                        val selected = destination.id == currentRoute
                        val (background, foreground) = destinationColors(destination.id)
                        NavigationBarItem(
                            selected = selected,
                            onClick = { navigateTo(destination.id) },
                            icon = {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (selected) {
                                                foreground
                                            } else {
                                                MaterialTheme.colorScheme.outline
                                            },
                                        ),
                                )
                            },
                            label = {
                                Text(
                                    text = stringResource(destination.labelRes),
                                    color = if (selected) {
                                        foreground
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            },
                            modifier = Modifier
                                .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp))
                                .background(if (selected) background else Color.Transparent),
                        )
                    }
                }
            },
        ) { padding ->
            AppNavHost(
                navController = navController,
                repository = repository,
                dashboards = dashboardRepository,
                habits = habitRepository,
                gym = gymRepository,
                modifier = Modifier.padding(padding),
            )
        }
    }
}

@Composable
private fun SearchPanel(
    query: String,
    onQueryChange: (String) -> Unit,
    results: List<SearchResult>,
    onResultClick: (SearchResult) -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 4.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                label = { Text(stringResource(R.string.search_query_label)) },
                placeholder = { Text(stringResource(R.string.search_hint)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Text(
                text = stringResource(R.string.search_title),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            when {
                query.isBlank() -> Text(
                    text = stringResource(R.string.search_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                results.isEmpty() -> Text(
                    text = stringResource(R.string.search_no_matches),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                else -> Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 220.dp)
                        .verticalScroll(rememberScrollState()),
                ) {
                    Text(
                        text = stringResource(R.string.group_tasks),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    results.forEach { result ->
                        TextButton(onClick = { onResultClick(result) }) {
                            Text(
                                text = stringResource(
                                    if (result.completed) {
                                        R.string.search_result_done_format
                                    } else {
                                        R.string.search_result_open_format
                                    },
                                    result.title,
                                ),
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Token-driven parity showcase, now hosted by the design-system destination. */
@Composable
fun DesignSystemScreen() {
    val darkMode = isSystemInDarkTheme()
    val presetId = GeneratedTokens.presetIds.first()
    val palette = tokenPalette(presetId, darkMode)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Text(
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("pill").dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 14.dp, vertical = 8.dp),
        ) {
            Text(
                text = stringResource(R.string.status_phase4),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        SectionHeading(stringResource(R.string.section_primitives))
        GeneratedTokens.primitiveColors.forEach { (key, hex) ->
            ColorSwatch(
                name = primitiveColorLabel(key),
                color = tokenColor(hex),
            )
        }

        SectionHeading(stringResource(R.string.section_semantic_roles))
        semanticRoleLabels.forEach { (role, labelRes) ->
            ColorSwatch(
                name = stringResource(labelRes),
                color = tokenRoleColor(palette, role),
            )
        }

        SectionHeading(stringResource(R.string.section_typography))
        TypeSample(
            label = stringResource(R.string.label_app_title),
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.displayLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_heading),
            text = stringResource(R.string.sample_heading),
            style = MaterialTheme.typography.headlineLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_section),
            text = stringResource(R.string.sample_section),
            style = MaterialTheme.typography.titleLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_body),
            text = stringResource(R.string.sample_body),
            style = MaterialTheme.typography.bodyLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_statistics),
            text = stringResource(R.string.sample_statistics),
            style = MaterialTheme.typography.headlineMedium,
        )
    }
}

@Composable
private fun primitiveColorLabel(key: String): String = stringResource(
    when (key) {
        "parchment" -> R.string.color_parchment
        "paper" -> R.string.color_paper
        "leather" -> R.string.color_leather
        "sage" -> R.string.color_sage
        "terracotta" -> R.string.color_terracotta
        "ink" -> R.string.color_ink
        else -> R.string.color_custom
    }
)

@Composable
private fun SectionHeading(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.primary,
    )
}

@Composable
private fun ColorSwatch(name: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("sm").dp))
                .background(color),
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun TypeSample(label: String, text: String, style: TextStyle) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = text,
            style = style,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

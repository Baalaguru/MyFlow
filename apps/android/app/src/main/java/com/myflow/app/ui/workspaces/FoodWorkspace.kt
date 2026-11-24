package com.myflow.app.ui.workspaces

import android.app.AlertDialog
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.DEFAULT_MEAL_TYPE
import com.myflow.app.data.FoodEntity
import com.myflow.app.data.FoodRepository
import com.myflow.app.data.MacroProgress
import com.myflow.app.data.MealEntryEntity
import com.myflow.app.data.MealPlanEntity
import com.myflow.app.data.NutritionGoalEntity
import com.myflow.app.data.NutritionValues
import com.myflow.app.data.ProgressSnapshot
import com.myflow.app.data.RecipeEntity
import com.myflow.app.data.RecipeIngredientEntity
import com.myflow.app.data.RecipeStepEntity
import com.myflow.app.data.recipeNutritionPerServing
import com.myflow.app.data.entryNutrition
import com.myflow.app.data.foodSummary
import com.myflow.app.data.mealTypeDistribution
import com.myflow.app.data.mealTypeShares
import com.myflow.app.data.mealTypes
import com.myflow.app.data.monthlyNutritionSeries
import com.myflow.app.data.normalizeMealType
import com.myflow.app.data.normalizeQuantity
import com.myflow.app.data.normalizeServings
import com.myflow.app.data.nutritionSeries
import com.myflow.app.data.parseLocalDate
import com.myflow.app.data.round1
import com.myflow.app.data.unavailableProgress
import com.myflow.app.ui.navigation.AppDestinations
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID
import kotlin.math.roundToInt

private fun instantFor(date: String, time: String, fallback: String? = null): String {
    val localDate = parseLocalDate(date) ?: LocalDate.now()
    val localTime = try {
        LocalTime.parse(time)
    } catch (_: Exception) {
        LocalTime.MIDNIGHT
    }
    return fallback ?: LocalDateTime.of(localDate, localTime)
        .atZone(ZoneId.systemDefault()).toInstant().toString()
}

private fun dateMillis(date: String): Long? =
    parseLocalDate(date)?.atStartOfDay(ZoneId.systemDefault())?.toInstant()?.toEpochMilli()

private fun mealTypeLabelRes(type: String): Int = when (normalizeMealType(type)) {
    "breakfast" -> R.string.food_breakfast
    "lunch" -> R.string.food_lunch
    "dinner" -> R.string.food_dinner
    else -> R.string.food_snack
}

@Composable
private fun mealLabel(type: String): String = stringResource(mealTypeLabelRes(type))

@Composable
private fun nutritionLine(value: NutritionValues): String {
    val kcal = stringResource(R.string.food_unit_kcal)
    val gram = stringResource(R.string.food_unit_gram)
    return listOf(
        "${stringResource(R.string.food_calories)} ${value.calories.round1()} $kcal",
        "${stringResource(R.string.food_protein)} ${value.protein.round1()} $gram",
        "${stringResource(R.string.food_carbs)} ${value.carbs.round1()} $gram",
        "${stringResource(R.string.food_fat)} ${value.fat.round1()} $gram",
    ).joinToString(" · ")
}

@Composable
private fun FoodGoalStrip(
    label: String,
    progress: MacroProgress,
    unavailable: String,
    over: String,
    met: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
            Text(
                when {
                    !progress.available -> unavailable
                    progress.overGoal -> over
                    else -> met
                },
                style = MaterialTheme.typography.labelMedium,
                color = if (progress.available && progress.overGoal) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
        }
        if (progress.available) {
            LinearProgressIndicator(
                progress = { (progress.percent ?: 0).coerceAtMost(100) / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = if (progress.overGoal) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun TrendBars(values: List<Double>, color: Color) {
    val max = values.maxOrNull()?.coerceAtLeast(1.0) ?: 1.0
    Row(
        modifier = Modifier.fillMaxWidth().height(40.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        values.forEach { value ->
            Box(modifier = Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.BottomCenter) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height((40f * (value / max).toFloat()).dp.coerceAtLeast(2.dp))
                        .background(color.copy(alpha = 0.7f)),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FoodWorkspace(repository: FoodRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val foods by repository.observeFoods().collectAsState(initial = emptyList())
    val entries by repository.observeEntries().collectAsState(initial = emptyList())
    val plans by repository.observePlans().collectAsState(initial = emptyList())
    val goals by repository.observeGoals().collectAsState(initial = emptyList())
    val recipes by repository.observeRecipeAggregates().collectAsState(initial = emptyList())

    var selectedDate by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var showDatePicker by remember { mutableStateOf(false) }
    var mealFilter by rememberSaveable { mutableStateOf("all") }

    var editingEntryId by remember { mutableStateOf<String?>(null) }
    var showEntryForm by rememberSaveable { mutableStateOf(false) }
    var entryKind by rememberSaveable { mutableStateOf("food") }
    var entryRefId by rememberSaveable { mutableStateOf("") }
    var entryMealType by rememberSaveable { mutableStateOf(DEFAULT_MEAL_TYPE) }
    var entryQuantity by rememberSaveable { mutableStateOf("1") }
    var entryNotes by rememberSaveable { mutableStateOf("") }
    var entryImageRef by rememberSaveable { mutableStateOf("") }
    var entryTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }

    var showFoodForm by rememberSaveable { mutableStateOf(false) }
    var editingFoodId by remember { mutableStateOf<String?>(null) }
    var foodQuery by rememberSaveable { mutableStateOf("") }
    var foodName by rememberSaveable { mutableStateOf("") }
    var foodServingSize by rememberSaveable { mutableStateOf("") }
    var foodServingGrams by rememberSaveable { mutableStateOf("") }
    var foodCalories by rememberSaveable { mutableStateOf("0") }
    var foodProtein by rememberSaveable { mutableStateOf("0") }
    var foodCarbs by rememberSaveable { mutableStateOf("0") }
    var foodFat by rememberSaveable { mutableStateOf("0") }
    var foodSource by rememberSaveable { mutableStateOf("manual") }
    var foodSourceRef by rememberSaveable { mutableStateOf("") }
    var foodImageRef by rememberSaveable { mutableStateOf("") }
    var foodNotes by rememberSaveable { mutableStateOf("") }

    var showRecipeForm by rememberSaveable { mutableStateOf(false) }
    var editingRecipeId by remember { mutableStateOf<String?>(null) }
    var recipeName by rememberSaveable { mutableStateOf("") }
    var recipeServings by rememberSaveable { mutableStateOf("1") }
    var recipePrep by rememberSaveable { mutableStateOf("0") }
    var recipeCook by rememberSaveable { mutableStateOf("0") }
    var recipeFavorite by rememberSaveable { mutableStateOf(false) }
    var recipeNotes by rememberSaveable { mutableStateOf("") }
    var recipeImageRef by rememberSaveable { mutableStateOf("") }
    var recipeIngredients by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var recipeSteps by remember { mutableStateOf<List<String>>(emptyList()) }
    var activeIngredient by remember { mutableStateOf(-1) }

    var showPlanForm by rememberSaveable { mutableStateOf(false) }
    var editingPlanId by remember { mutableStateOf<String?>(null) }
    var planDate by rememberSaveable { mutableStateOf(selectedDate) }
    var showPlanDatePicker by remember { mutableStateOf(false) }
    var planKind by rememberSaveable { mutableStateOf("food") }
    var planRefId by rememberSaveable { mutableStateOf("") }
    var planMealType by rememberSaveable { mutableStateOf(DEFAULT_MEAL_TYPE) }
    var planQuantity by rememberSaveable { mutableStateOf("1") }
    var planNotes by rememberSaveable { mutableStateOf("") }

    var showGoalForm by rememberSaveable { mutableStateOf(false) }
    var goalCalories by rememberSaveable { mutableStateOf("") }
    var goalProtein by rememberSaveable { mutableStateOf("") }
    var goalCarbs by rememberSaveable { mutableStateOf("") }
    var goalFat by rememberSaveable { mutableStateOf("") }

    fun toast(messageRes: Int) {
        Toast.makeText(context, context.getString(messageRes), Toast.LENGTH_SHORT).show()
    }

    fun confirmDelete(messageRes: Int, action: () -> Unit) {
        AlertDialog.Builder(context)
            .setMessage(messageRes)
            .setPositiveButton(R.string.delete_action) { _, _ -> action() }
            .setNegativeButton(R.string.cancel_action, null)
            .show()
    }

    fun resetEntryForm() {
        editingEntryId = null
        showEntryForm = false
        entryKind = "food"
        entryRefId = ""
        entryMealType = DEFAULT_MEAL_TYPE
        entryQuantity = "1"
        entryNotes = ""
        entryImageRef = ""
        entryTime = LocalTime.now().toString().take(5)
    }

    fun resetFoodForm() {
        editingFoodId = null
        showFoodForm = false
        foodName = ""
        foodServingSize = ""
        foodServingGrams = ""
        foodCalories = "0"
        foodProtein = "0"
        foodCarbs = "0"
        foodFat = "0"
        foodSource = "manual"
        foodSourceRef = ""
        foodImageRef = ""
        foodNotes = ""
    }

    fun resetRecipeForm() {
        editingRecipeId = null
        showRecipeForm = false
        recipeName = ""
        recipeServings = "1"
        recipePrep = "0"
        recipeCook = "0"
        recipeFavorite = false
        recipeNotes = ""
        recipeImageRef = ""
        recipeIngredients = emptyList()
        recipeSteps = emptyList()
        activeIngredient = -1
    }

    fun resetPlanForm() {
        editingPlanId = null
        showPlanForm = false
        planKind = "food"
        planRefId = ""
        planMealType = DEFAULT_MEAL_TYPE
        planQuantity = "1"
        planNotes = ""
    }

    LaunchedEffect(selectedDate, goals) {
        val goal = goals.firstOrNull { it.localDate == selectedDate }
        goalCalories = goal?.calories?.takeIf { it > 0.0 }?.toString() ?: ""
        goalProtein = goal?.protein?.takeIf { it > 0.0 }?.toString() ?: ""
        goalCarbs = goal?.carbs?.takeIf { it > 0.0 }?.toString() ?: ""
        goalFat = goal?.fat?.takeIf { it > 0.0 }?.toString() ?: ""
    }

    LaunchedEffect(selectedDate) { planDate = selectedDate }

    val date = parseLocalDate(selectedDate) ?: LocalDate.now()
    val goalEntity = goals.firstOrNull { it.localDate == selectedDate }
    val summary = foodSummary(entries, plans, goalEntity, date, foods, recipes)
    val dayEntries = entries.filter {
        it.localDate == selectedDate && (mealFilter == "all" || normalizeMealType(it.mealType) == mealFilter)
    }
    val dayPlans = plans.filter { it.localDate == selectedDate }
    val visibleFoods = foods.filter { it.name.contains(foodQuery.trim(), ignoreCase = true) }
    val entryOptions = if (entryKind == "food") foods.map { it.id to it.name } else recipes.map { it.recipe.id to it.recipe.name }
    val planOptions = if (planKind == "food") foods.map { it.id to it.name } else recipes.map { it.recipe.id to it.recipe.name }

    val stripPercent = summary.progress.percent?.coerceAtMost(100)
    val strip = if (stripPercent == null) unavailableProgress else ProgressSnapshot(
        completed = summary.nutrition.calories.roundToInt(),
        total = summary.goal?.calories?.roundToInt()?.coerceAtLeast(1) ?: 1,
        percent = stripPercent,
        available = true,
    )

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(R.string.nav_food),
            subtitle = stringResource(R.string.workspace_subtitle_food),
            routeId = AppDestinations.FOOD,
        )
        ProgressStrip(snapshot = strip, routeId = AppDestinations.FOOD)
        ModuleStats(
            records = summary.entryCount.toString(),
            done = "${summary.nutrition.calories.round1()} ${stringResource(R.string.food_unit_kcal)}",
            open = summary.plannedCount.toString(),
        )

        SectionCard(title = stringResource(R.string.food_section_log)) {
            Text(stringResource(R.string.food_daily_log), style = MaterialTheme.typography.labelMedium)
            OutlinedTextField(
                value = selectedDate,
                onValueChange = { selectedDate = it },
                label = { Text(stringResource(R.string.food_date)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            TextButton(onClick = { showDatePicker = true }) {
                Text(stringResource(R.string.food_date_time))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "all" to R.string.filter_all,
                    "breakfast" to R.string.food_breakfast,
                    "lunch" to R.string.food_lunch,
                    "dinner" to R.string.food_dinner,
                    "snack" to R.string.food_snack,
                ).forEach { (key, label) ->
                    FilterChip(
                        selected = mealFilter == key,
                        onClick = { mealFilter = key },
                        label = { Text(stringResource(label)) },
                    )
                }
            }
            ValueRow(stringResource(R.string.food_daily_summary), nutritionLine(summary.nutrition))
            ValueRow(stringResource(R.string.food_consumed), nutritionLine(summary.consumed))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { showEntryForm = !showEntryForm }) {
                    Text(stringResource(R.string.food_new_entry))
                }
            }

            if (showEntryForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = entryKind == "food",
                            onClick = { entryKind = "food"; entryRefId = "" },
                            label = { Text(stringResource(R.string.food_section_foods)) },
                        )
                        FilterChip(
                            selected = entryKind == "recipe",
                            onClick = { entryKind = "recipe"; entryRefId = "" },
                            label = { Text(stringResource(R.string.food_section_recipes)) },
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        entryOptions.forEach { (id, name) ->
                            FilterChip(
                                selected = entryRefId == id,
                                onClick = { entryRefId = id },
                                label = { Text(name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        mealTypes.forEach { type ->
                            FilterChip(
                                selected = normalizeMealType(entryMealType) == type,
                                onClick = { entryMealType = type },
                                label = { Text(stringResource(mealTypeLabelRes(type))) },
                            )
                        }
                    }
                    OutlinedTextField(
                        value = entryQuantity,
                        onValueChange = { entryQuantity = it },
                        label = { Text(stringResource(R.string.food_quantity)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = entryTime,
                        onValueChange = { entryTime = it },
                        label = { Text(stringResource(R.string.food_date_time)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = entryNotes,
                        onValueChange = { entryNotes = it },
                        label = { Text(stringResource(R.string.food_notes)) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = entryImageRef,
                        onValueChange = { entryImageRef = it },
                        label = { Text(stringResource(R.string.food_image_ref)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    Text(
                        stringResource(R.string.food_image_note),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            enabled = entryRefId.isNotBlank(),
                            onClick = {
                                val existing = editingEntryId?.let { id -> entries.firstOrNull { it.id == id } }
                                val entry = MealEntryEntity(
                                    id = editingEntryId ?: UUID.randomUUID().toString(),
                                    localDate = selectedDate,
                                    mealType = entryMealType,
                                    foodId = if (entryKind == "food") entryRefId else null,
                                    recipeId = if (entryKind == "recipe") entryRefId else null,
                                    quantity = entryQuantity.toDoubleOrNull() ?: 1.0,
                                    notes = entryNotes,
                                    imageRef = entryImageRef,
                                    loggedAt = instantFor(selectedDate, entryTime, existing?.loggedAt),
                                )
                                scope.launch {
                                    val ok = repository.saveEntry(entry)
                                    if (ok) toast(if (editingEntryId == null) R.string.food_entry_saved else R.string.food_entry_updated)
                                    resetEntryForm()
                                }
                            },
                        ) { Text(stringResource(R.string.save_action)) }
                        TextButton(onClick = { resetEntryForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }

            if (dayEntries.isEmpty()) {
                EmptyState(stringResource(R.string.empty_title), stringResource(R.string.food_no_entries))
            }
            dayEntries.forEach { logged ->
                val name = if (!logged.foodId.isNullOrBlank()) {
                    foods.firstOrNull { it.id == logged.foodId }?.name ?: logged.foodId
                } else {
                    recipes.firstOrNull { it.recipe.id == logged.recipeId }?.recipe?.name ?: logged.recipeId.orEmpty()
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            "${mealLabel(logged.mealType)} · $name",
                            style = MaterialTheme.typography.titleSmall,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(nutritionLine(entryNutrition(logged, foods, recipes)), style = MaterialTheme.typography.bodySmall)
                        Text(
                            "${stringResource(R.string.food_quantity)}: ${normalizeQuantity(logged.quantity)} ${stringResource(R.string.food_servings)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    TextButton(onClick = {
                        editingEntryId = logged.id
                        showEntryForm = true
                        entryKind = if (!logged.foodId.isNullOrBlank()) "food" else "recipe"
                        entryRefId = logged.foodId ?: logged.recipeId.orEmpty()
                        entryMealType = logged.mealType
                        entryQuantity = logged.quantity.toString()
                        entryNotes = logged.notes.orEmpty()
                        entryImageRef = logged.imageRef.orEmpty()
                        entryTime = runCatching { Instant.parse(logged.loggedAt).atZone(ZoneId.systemDefault()).toLocalTime().toString().take(5) }
                            .getOrDefault(LocalTime.now().toString().take(5))
                    }) { Text(stringResource(R.string.food_edit_entry)) }
                    TextButton(onClick = {
                        confirmDelete(R.string.food_delete_entry_confirm) {
                            scope.launch {
                                repository.deleteEntry(logged.id)
                                toast(R.string.food_entry_deleted)
                            }
                        }
                    }) { Text(stringResource(R.string.food_delete_entry)) }
                }
            }
        }

        SectionCard(title = stringResource(R.string.food_section_foods)) {
            OutlinedTextField(
                value = foodQuery,
                onValueChange = { foodQuery = it },
                label = { Text(stringResource(R.string.food_search_foods)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            TextButton(onClick = { if (showFoodForm) resetFoodForm() else showFoodForm = true }) {
                Text(stringResource(if (showFoodForm) R.string.cancel_action else R.string.food_add_food))
            }
            if (showFoodForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(foodName, { foodName = it }, label = { Text(stringResource(R.string.food_name)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodServingSize, { foodServingSize = it }, label = { Text(stringResource(R.string.food_serving_size)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodServingGrams, { foodServingGrams = it }, label = { Text(stringResource(R.string.food_serving_grams)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodCalories, { foodCalories = it }, label = { Text(stringResource(R.string.food_calories)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodProtein, { foodProtein = it }, label = { Text(stringResource(R.string.food_protein)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodCarbs, { foodCarbs = it }, label = { Text(stringResource(R.string.food_carbs)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodFat, { foodFat = it }, label = { Text(stringResource(R.string.food_fat)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = foodSource == "manual",
                            onClick = { foodSource = "manual" },
                            label = { Text(stringResource(R.string.food_source_manual)) },
                        )
                        FilterChip(
                            selected = foodSource == "import",
                            onClick = { foodSource = "import" },
                            label = { Text(stringResource(R.string.food_source_import)) },
                        )
                    }
                    OutlinedTextField(foodSourceRef, { foodSourceRef = it }, label = { Text(stringResource(R.string.food_source_ref)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodImageRef, { foodImageRef = it }, label = { Text(stringResource(R.string.food_image_ref)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(foodNotes, { foodNotes = it }, label = { Text(stringResource(R.string.food_notes)) }, modifier = Modifier.fillMaxWidth())
                    Text(stringResource(R.string.food_image_note), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            val existing = editingFoodId?.let { id -> foods.firstOrNull { it.id == id } }
                            val entity = FoodEntity(
                                id = editingFoodId ?: UUID.randomUUID().toString(),
                                name = foodName,
                                servingSize = foodServingSize,
                                servingGrams = foodServingGrams.toDoubleOrNull(),
                                calories = foodCalories.toDoubleOrNull() ?: 0.0,
                                protein = foodProtein.toDoubleOrNull() ?: 0.0,
                                carbs = foodCarbs.toDoubleOrNull() ?: 0.0,
                                fat = foodFat.toDoubleOrNull() ?: 0.0,
                                source = foodSource,
                                sourceRef = foodSourceRef,
                                imageRef = foodImageRef,
                                notes = foodNotes,
                                createdAt = existing?.createdAt.orEmpty(),
                                updatedAt = Instant.now().toString(),
                            )
                            scope.launch {
                                val ok = repository.saveFood(entity)
                                if (ok) toast(if (editingFoodId == null) R.string.food_food_saved else R.string.food_food_updated)
                                resetFoodForm()
                            }
                        }) { Text(stringResource(R.string.food_save_food)) }
                        TextButton(onClick = { resetFoodForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }
            if (visibleFoods.isEmpty()) {
                EmptyState(stringResource(R.string.empty_title), stringResource(R.string.food_no_foods))
            }
            visibleFoods.forEach { item ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(item.name, style = MaterialTheme.typography.titleSmall)
                        Text(
                            "${stringResource(R.string.food_serving_size)}: ${item.servingSize}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(nutritionLine(NutritionValues(item.calories, item.protein, item.carbs, item.fat)), style = MaterialTheme.typography.bodySmall)
                    }
                    TextButton(onClick = {
                        editingFoodId = item.id
                        showFoodForm = true
                        foodName = item.name
                        foodServingSize = item.servingSize
                        foodServingGrams = item.servingGrams?.toString().orEmpty()
                        foodCalories = item.calories.toString()
                        foodProtein = item.protein.toString()
                        foodCarbs = item.carbs.toString()
                        foodFat = item.fat.toString()
                        foodSource = item.source
                        foodSourceRef = item.sourceRef.orEmpty()
                        foodImageRef = item.imageRef.orEmpty()
                        foodNotes = item.notes.orEmpty()
                    }) { Text(stringResource(R.string.food_edit_food)) }
                    TextButton(onClick = {
                        scope.launch {
                            val ok = repository.deleteFood(item.id)
                            toast(if (ok) R.string.food_food_deleted else R.string.food_food_in_use)
                        }
                    }) { Text(stringResource(R.string.food_delete_food)) }
                }
            }
        }

        SectionCard(title = stringResource(R.string.food_section_recipes)) {
            TextButton(onClick = { if (showRecipeForm) resetRecipeForm() else showRecipeForm = true }) {
                Text(stringResource(if (showRecipeForm) R.string.cancel_action else R.string.food_recipe_new))
            }
            if (showRecipeForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(recipeName, { recipeName = it }, label = { Text(stringResource(R.string.food_recipe_name)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(recipeServings, { recipeServings = it }, label = { Text(stringResource(R.string.food_recipe_servings)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(recipePrep, { recipePrep = it }, label = { Text(stringResource(R.string.food_recipe_prep_minutes)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(recipeCook, { recipeCook = it }, label = { Text(stringResource(R.string.food_recipe_cook_minutes)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    FilterChip(
                        selected = recipeFavorite,
                        onClick = { recipeFavorite = !recipeFavorite },
                        label = { Text(stringResource(R.string.food_recipe_favorite)) },
                    )
                    OutlinedTextField(recipeNotes, { recipeNotes = it }, label = { Text(stringResource(R.string.food_recipe_notes)) }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(recipeImageRef, { recipeImageRef = it }, label = { Text(stringResource(R.string.food_recipe_image_ref)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)

                    Text(stringResource(R.string.food_recipe_ingredients), style = MaterialTheme.typography.labelMedium)
                    recipeIngredients.forEachIndexed { index, draft ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(onClick = { activeIngredient = if (activeIngredient == index) -1 else index }) {
                                    Text(foods.firstOrNull { it.id == draft.first }?.name ?: stringResource(R.string.food_recipe_add_ingredient), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                                OutlinedTextField(
                                    value = draft.second,
                                    onValueChange = { value -> recipeIngredients = recipeIngredients.mapIndexed { i, item -> if (i == index) item.first to value else item } },
                                    label = { Text(stringResource(R.string.food_quantity)) },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                )
                                TextButton(onClick = {
                                    recipeIngredients = recipeIngredients.filterIndexed { i, _ -> i != index }
                                    activeIngredient = -1
                                }) { Text(stringResource(R.string.food_recipe_remove_step)) }
                            }
                            if (activeIngredient == index) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    foods.forEach { food ->
                                        FilterChip(
                                            selected = draft.first == food.id,
                                            onClick = {
                                                recipeIngredients = recipeIngredients.mapIndexed { i, item -> if (i == index) food.id to item.second else item }
                                                activeIngredient = -1
                                            },
                                            label = { Text(food.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                        )
                                    }
                                }
                            }
                        }
                    }
                    TextButton(onClick = { recipeIngredients = recipeIngredients + ("" to "1") }) {
                        Text(stringResource(R.string.food_recipe_add_ingredient))
                    }

                    Text(stringResource(R.string.food_recipe_steps), style = MaterialTheme.typography.labelMedium)
                    recipeSteps.forEachIndexed { index, text ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${index + 1}", style = MaterialTheme.typography.labelMedium)
                            OutlinedTextField(
                                value = text,
                                onValueChange = { value -> recipeSteps = recipeSteps.mapIndexed { i, step -> if (i == index) value else step } },
                                label = { Text(stringResource(R.string.food_recipe_step)) },
                                modifier = Modifier.weight(1f),
                            )
                            TextButton(onClick = { recipeSteps = recipeSteps.filterIndexed { i, _ -> i != index } }) {
                                Text(stringResource(R.string.food_recipe_remove_step))
                            }
                        }
                    }
                    TextButton(onClick = { recipeSteps = recipeSteps + "" }) {
                        Text(stringResource(R.string.food_recipe_add_step))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            val existing = editingRecipeId?.let { id -> recipes.firstOrNull { it.recipe.id == id } }
                            val id = editingRecipeId ?: UUID.randomUUID().toString()
                            val entity = RecipeEntity(
                                id = id,
                                name = recipeName,
                                servings = recipeServings.toIntOrNull() ?: 1,
                                prepMinutes = recipePrep.toIntOrNull() ?: 0,
                                cookMinutes = recipeCook.toIntOrNull() ?: 0,
                                favorite = recipeFavorite,
                                notes = recipeNotes,
                                imageRef = recipeImageRef,
                                createdAt = existing?.recipe?.createdAt.orEmpty(),
                                updatedAt = Instant.now().toString(),
                            )
                            val ingredients = recipeIngredients.map { (foodId, quantity) ->
                                RecipeIngredientEntity(
                                    id = UUID.randomUUID().toString(),
                                    recipeId = id,
                                    foodId = foodId,
                                    quantity = quantity.toDoubleOrNull() ?: 1.0,
                                )
                            }
                            val steps = recipeSteps.filter { it.isNotBlank() }.mapIndexed { index, text ->
                                RecipeStepEntity(
                                    id = UUID.randomUUID().toString(),
                                    recipeId = id,
                                    order = index + 1,
                                    text = text.trim(),
                                )
                            }
                            scope.launch {
                                val ok = repository.saveRecipe(entity, ingredients, steps)
                                if (ok) toast(if (editingRecipeId == null) R.string.food_recipe_saved else R.string.food_recipe_updated)
                                resetRecipeForm()
                            }
                        }) { Text(stringResource(R.string.save_action)) }
                        TextButton(onClick = { resetRecipeForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }
            if (recipes.isEmpty()) {
                EmptyState(stringResource(R.string.empty_title), stringResource(R.string.food_no_recipes))
            }
            recipes.forEach { aggregate ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(aggregate.recipe.name, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            "${stringResource(R.string.food_recipe_servings)}: ${normalizeServings(aggregate.recipe.servings)}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            "${stringResource(R.string.food_recipe_nutrition_per_serving)}: ${nutritionLine(recipeNutritionPerServing(aggregate, foods))}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    TextButton(onClick = {
                        editingRecipeId = aggregate.recipe.id
                        showRecipeForm = true
                        recipeName = aggregate.recipe.name
                        recipeServings = aggregate.recipe.servings.toString()
                        recipePrep = aggregate.recipe.prepMinutes.toString()
                        recipeCook = aggregate.recipe.cookMinutes.toString()
                        recipeFavorite = aggregate.recipe.favorite
                        recipeNotes = aggregate.recipe.notes.orEmpty()
                        recipeImageRef = aggregate.recipe.imageRef.orEmpty()
                        recipeIngredients = aggregate.ingredients.map { it.foodId to it.quantity.toString() }
                        recipeSteps = aggregate.steps.map { it.text }
                    }) { Text(stringResource(R.string.food_recipe_edit)) }
                    TextButton(onClick = {
                        scope.launch {
                            val ok = repository.deleteRecipe(aggregate.recipe.id)
                            toast(if (ok) R.string.food_recipe_deleted else R.string.food_recipe_in_use)
                        }
                    }) { Text(stringResource(R.string.food_recipe_delete)) }
                }
            }
        }

        SectionCard(title = stringResource(R.string.food_section_plan)) {
            Text(stringResource(R.string.food_meal_calendar), style = MaterialTheme.typography.labelMedium)
            OutlinedTextField(
                value = planDate,
                onValueChange = { planDate = it },
                label = { Text(stringResource(R.string.food_plan_date)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            TextButton(onClick = { showPlanDatePicker = true }) {
                Text(stringResource(R.string.food_meal_calendar))
            }
            TextButton(onClick = { if (showPlanForm) resetPlanForm() else showPlanForm = true }) {
                Text(stringResource(if (showPlanForm) R.string.cancel_action else R.string.food_add_plan))
            }
            if (showPlanForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = planKind == "food",
                            onClick = { planKind = "food"; planRefId = "" },
                            label = { Text(stringResource(R.string.food_section_foods)) },
                        )
                        FilterChip(
                            selected = planKind == "recipe",
                            onClick = { planKind = "recipe"; planRefId = "" },
                            label = { Text(stringResource(R.string.food_section_recipes)) },
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        planOptions.forEach { (id, name) ->
                            FilterChip(
                                selected = planRefId == id,
                                onClick = { planRefId = id },
                                label = { Text(name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        mealTypes.forEach { type ->
                            FilterChip(
                                selected = normalizeMealType(planMealType) == type,
                                onClick = { planMealType = type },
                                label = { Text(stringResource(mealTypeLabelRes(type))) },
                            )
                        }
                    }
                    OutlinedTextField(planQuantity, { planQuantity = it }, label = { Text(stringResource(R.string.food_quantity)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(planNotes, { planNotes = it }, label = { Text(stringResource(R.string.food_notes)) }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            enabled = planRefId.isNotBlank(),
                            onClick = {
                                val existing = editingPlanId?.let { id -> plans.firstOrNull { it.id == id } }
                                val plan = MealPlanEntity(
                                    id = editingPlanId ?: UUID.randomUUID().toString(),
                                    localDate = planDate,
                                    mealType = planMealType,
                                    foodId = if (planKind == "food") planRefId else null,
                                    recipeId = if (planKind == "recipe") planRefId else null,
                                    quantity = planQuantity.toDoubleOrNull() ?: 1.0,
                                    notes = planNotes,
                                    plannedAt = existing?.plannedAt.orEmpty(),
                                )
                                scope.launch {
                                    val ok = repository.savePlan(plan)
                                    if (ok) toast(R.string.food_plan_saved)
                                    resetPlanForm()
                                }
                            },
                        ) { Text(stringResource(R.string.save_action)) }
                        TextButton(onClick = { resetPlanForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }
            if (dayPlans.isEmpty()) {
                EmptyState(stringResource(R.string.empty_title), stringResource(R.string.food_no_plans))
            }
            dayPlans.forEach { planned ->
                val name = if (!planned.foodId.isNullOrBlank()) {
                    foods.firstOrNull { it.id == planned.foodId }?.name ?: planned.foodId
                } else {
                    recipes.firstOrNull { it.recipe.id == planned.recipeId }?.recipe?.name ?: planned.recipeId.orEmpty()
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("${mealLabel(planned.mealType)} · $name", style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            "${stringResource(R.string.food_quantity)}: ${normalizeQuantity(planned.quantity)} ${stringResource(R.string.food_servings)}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    TextButton(onClick = {
                        editingPlanId = planned.id
                        showPlanForm = true
                        planDate = planned.localDate
                        planKind = if (!planned.foodId.isNullOrBlank()) "food" else "recipe"
                        planRefId = planned.foodId ?: planned.recipeId.orEmpty()
                        planMealType = planned.mealType
                        planQuantity = planned.quantity.toString()
                        planNotes = planned.notes.orEmpty()
                    }) { Text(stringResource(R.string.edit_action)) }
                    TextButton(onClick = {
                        confirmDelete(R.string.food_delete_plan_confirm) {
                            scope.launch {
                                repository.deletePlan(planned.id)
                                toast(R.string.food_plan_deleted)
                            }
                        }
                    }) { Text(stringResource(R.string.delete_action)) }
                }
            }

            Text(stringResource(R.string.food_planned_vs_consumed), style = MaterialTheme.typography.labelMedium)
            ValueRow(stringResource(R.string.food_planned), nutritionLine(summary.planned))
            ValueRow(stringResource(R.string.food_consumed), nutritionLine(summary.consumed))

            Text(stringResource(R.string.food_goal_progress), style = MaterialTheme.typography.labelMedium)
            if (goalEntity == null) {
                Text(
                    stringResource(R.string.food_no_goal),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                FoodGoalStrip(
                    label = stringResource(R.string.food_goal_calories),
                    progress = summary.progress.calories,
                    unavailable = stringResource(R.string.food_no_goal),
                    over = stringResource(R.string.food_over_goal),
                    met = stringResource(R.string.food_goal_met),
                )
                FoodGoalStrip(
                    label = stringResource(R.string.food_goal_protein),
                    progress = summary.progress.protein,
                    unavailable = stringResource(R.string.food_no_goal),
                    over = stringResource(R.string.food_over_goal),
                    met = stringResource(R.string.food_goal_met),
                )
                FoodGoalStrip(
                    label = stringResource(R.string.food_goal_carbs),
                    progress = summary.progress.carbs,
                    unavailable = stringResource(R.string.food_no_goal),
                    over = stringResource(R.string.food_over_goal),
                    met = stringResource(R.string.food_goal_met),
                )
                FoodGoalStrip(
                    label = stringResource(R.string.food_goal_fat),
                    progress = summary.progress.fat,
                    unavailable = stringResource(R.string.food_no_goal),
                    over = stringResource(R.string.food_over_goal),
                    met = stringResource(R.string.food_goal_met),
                )
            }
            TextButton(onClick = { showGoalForm = !showGoalForm }) {
                Text(stringResource(R.string.food_set_goal))
            }
            if (showGoalForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(goalCalories, { goalCalories = it }, label = { Text(stringResource(R.string.food_goal_calories)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(goalProtein, { goalProtein = it }, label = { Text(stringResource(R.string.food_goal_protein)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(goalCarbs, { goalCarbs = it }, label = { Text(stringResource(R.string.food_goal_carbs)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(goalFat, { goalFat = it }, label = { Text(stringResource(R.string.food_goal_fat)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Button(onClick = {
                        val goal = NutritionGoalEntity(
                            id = goalEntity?.id ?: "goal:$selectedDate",
                            localDate = selectedDate,
                            calories = goalCalories.toDoubleOrNull() ?: 0.0,
                            protein = goalProtein.toDoubleOrNull() ?: 0.0,
                            carbs = goalCarbs.toDoubleOrNull() ?: 0.0,
                            fat = goalFat.toDoubleOrNull() ?: 0.0,
                            updatedAt = Instant.now().toString(),
                        )
                        scope.launch {
                            if (repository.saveGoal(goal)) toast(R.string.food_goal_saved)
                            showGoalForm = false
                        }
                    }) { Text(stringResource(R.string.save_action)) }
                }
            }
        }

        SectionCard(title = stringResource(R.string.food_section_analytics)) {
            val today = LocalDate.now()
            val daily = nutritionSeries(entries, foods, recipes, 7, today)
            val monthly = monthlyNutritionSeries(entries, foods, recipes, 3, today)
            val distribution = mealTypeDistribution(entries, foods, recipes)
            val shares = mealTypeShares(distribution)
            if (entries.isEmpty()) {
                EmptyState(stringResource(R.string.empty_title), stringResource(R.string.food_no_analytics))
            } else {
                Text(stringResource(R.string.food_daily_calories), style = MaterialTheme.typography.labelMedium)
                TrendBars(daily.map { it.nutrition.calories }, MaterialTheme.colorScheme.primary)
                daily.forEach { point ->
                    ValueRow(
                        point.localDate.toString(),
                        "${point.nutrition.calories.round1()} ${stringResource(R.string.food_unit_kcal)}",
                    )
                }
                ValueRow(
                    stringResource(R.string.food_weekly_calories),
                    "${daily.sumOf { it.nutrition.calories }.round1()} ${stringResource(R.string.food_unit_kcal)}",
                )

                Text(stringResource(R.string.food_monthly_trends), style = MaterialTheme.typography.labelMedium)
                monthly.forEach { point -> ValueRow(point.localDate.toString(), nutritionLine(point.nutrition)) }

                Text(stringResource(R.string.food_protein_trends), style = MaterialTheme.typography.labelMedium)
                TrendBars(daily.map { it.nutrition.protein }, MaterialTheme.colorScheme.tertiary)
                Text(stringResource(R.string.food_carb_trends), style = MaterialTheme.typography.labelMedium)
                TrendBars(daily.map { it.nutrition.carbs }, MaterialTheme.colorScheme.secondary)
                Text(stringResource(R.string.food_fat_trends), style = MaterialTheme.typography.labelMedium)
                TrendBars(daily.map { it.nutrition.fat }, MaterialTheme.colorScheme.error)

                Text(stringResource(R.string.food_meal_distribution), style = MaterialTheme.typography.labelMedium)
                mealTypes.forEach { type ->
                    val share = (shares[type] ?: 0.0) * 100
                    ValueRow(
                        mealLabel(type),
                        "${(distribution[type] ?: 0.0).round1()} ${stringResource(R.string.food_unit_kcal)} · ${share.roundToInt()}%",
                    )
                }
                Text(
                    stringResource(R.string.food_analytics_note),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }

    if (showDatePicker) {
        val state = rememberDatePickerState(initialSelectedDateMillis = dateMillis(selectedDate))
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        selectedDate = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate().toString()
                    }
                    showDatePicker = false
                }) { Text(stringResource(R.string.save_action)) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text(stringResource(R.string.cancel_action)) }
            },
        ) { androidx.compose.material3.DatePicker(state = state) }
    }

    if (showPlanDatePicker) {
        val state = rememberDatePickerState(initialSelectedDateMillis = dateMillis(planDate))
        DatePickerDialog(
            onDismissRequest = { showPlanDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        planDate = Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate().toString()
                    }
                    showPlanDatePicker = false
                }) { Text(stringResource(R.string.save_action)) }
            },
            dismissButton = {
                TextButton(onClick = { showPlanDatePicker = false }) { Text(stringResource(R.string.cancel_action)) }
            },
        ) { androidx.compose.material3.DatePicker(state = state) }
    }
}

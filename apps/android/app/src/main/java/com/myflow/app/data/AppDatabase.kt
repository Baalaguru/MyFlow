package com.myflow.app.data

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.migration.Migration
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.Upsert
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "settings")
data class SettingEntity(
    @PrimaryKey val key: String,
    val value: String,
)

@Dao
interface SettingDao {
    @Query("SELECT value FROM settings WHERE key = :key")
    suspend fun get(key: String): String?

    @Upsert
    suspend fun put(setting: SettingEntity)
}

/** Optional-by-example fields let Phase 3 rows survive the v4 migration unchanged. */
@Entity(tableName = "tasks")
data class TaskEntity(
    @PrimaryKey val id: String,
    val title: String,
    val completed: Boolean,
    val createdAt: String,
    val description: String = "",
    val priority: String = TaskPriority.MEDIUM.key,
    val category: String = "",
    val dueDate: String = "",
    val startTime: String = "",
    val endTime: String = "",
    val status: String = "open",
    val completedAt: String? = null,
    val subtasks: List<SubtaskRecord> = emptyList(),
    val recurrence: RecurrenceRule? = null,
    val recurrenceParentId: String? = null,
    val reminderOffsetMinutes: Int? = null,
)

@Dao
interface TaskDao {
    @Query("SELECT * FROM tasks ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<TaskEntity>>

    @Query("SELECT * FROM tasks ORDER BY createdAt DESC")
    suspend fun all(): List<TaskEntity>

    @Query("SELECT * FROM tasks WHERE id = :id")
    suspend fun get(id: String): TaskEntity?

    @Insert
    suspend fun insert(task: TaskEntity)

    @Upsert
    suspend fun save(task: TaskEntity)

    @Query("DELETE FROM tasks WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE tasks SET completed = :completed WHERE id = :id")
    suspend fun setCompleted(id: String, completed: Boolean)
}

@Entity(tableName = "dashboards")
data class DashboardEntity(
    @PrimaryKey val id: String,
    val name: String,
    val sortOrder: Int,
    val isDefault: Boolean,
    /** Encoded widget layout: id:columns:rows:visible:background:accent separated by semicolons. */
    val widgets: String,
    val createdAt: String,
)

@Entity(tableName = "habits")
data class HabitEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String = "",
    val icon: String = "",
    val accent: String = "",
    val scheduleType: String = "daily",
    val weekdays: String = "0,1,2,3,4,5,6",
    val target: Int? = null,
    val reminderOffsetMinutes: Int? = null,
    val paused: Boolean = false,
    val archived: Boolean = false,
    val createdAt: String,
)

@Entity(tableName = "habit_logs")
data class HabitLogEntity(
    @PrimaryKey val id: String,
    val habitId: String,
    val localDate: String,
    val status: String,
    val value: Int? = null,
    val completedAt: String? = null,
    val createdAt: String,
)

@Entity(tableName = "mascot_state")
data class MascotStateEntity(
    @PrimaryKey val id: String = "default",
    val companion: String = "sprout",
    val plantStyle: String = "fern",
    val animationsEnabled: Boolean = true,
    val updatedAt: String,
)

@Entity(tableName = "gym_exercises")
data class GymExerciseEntity(
    @PrimaryKey val id: String,
    val name: String,
    val muscleGroup: String,
    val notes: String = "",
    val isCustom: Boolean = false,
    val createdAt: String,
)

@Entity(tableName = "gym_workouts")
data class GymWorkoutEntity(
    @PrimaryKey val id: String,
    val startedAt: String,
    val endedAt: String? = null,
    val note: String = "",
)

@Entity(tableName = "gym_workout_exercises")
data class GymWorkoutExerciseEntity(
    @PrimaryKey val id: String,
    val workoutId: String,
    val exerciseId: String,
    val sortOrder: Int,
)

@Entity(tableName = "gym_sets")
data class GymSetEntity(
    @PrimaryKey val id: String,
    val workoutExerciseId: String,
    val setNumber: Int,
    val reps: Int,
    val weight: Double,
    val completed: Boolean,
    val completedAt: String? = null,
)

@Entity(tableName = "gym_personal_records")
data class GymPersonalRecordEntity(
    @PrimaryKey val id: String,
    val exerciseId: String,
    val metric: String,
    val value: Double,
    val achievedAt: String,
    val workoutId: String,
    val setId: String,
)

/** Phase 9 canonical food record; nutrition values are per serving. */
@Entity(tableName = "foods", indices = [Index(value = ["name"])])
data class FoodEntity(
    @PrimaryKey val id: String,
    val name: String,
    val servingSize: String,
    val servingGrams: Double? = null,
    val calories: Double = 0.0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    val source: String = "manual",
    val sourceRef: String? = null,
    val imageRef: String? = null,
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Entity(
    tableName = "meal_entries",
    indices = [Index(value = ["localDate"]), Index(value = ["foodId"]), Index(value = ["recipeId"])],
)
data class MealEntryEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val mealType: String,
    val foodId: String? = null,
    val recipeId: String? = null,
    val quantity: Double,
    val notes: String? = null,
    val imageRef: String? = null,
    val loggedAt: String,
)

@Entity(
    tableName = "meal_plans",
    indices = [Index(value = ["localDate"]), Index(value = ["foodId"]), Index(value = ["recipeId"])],
)
data class MealPlanEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val mealType: String,
    val foodId: String? = null,
    val recipeId: String? = null,
    val quantity: Double,
    val notes: String? = null,
    val plannedAt: String,
)

@Entity(tableName = "recipes")
data class RecipeEntity(
    @PrimaryKey val id: String,
    val name: String,
    val servings: Int,
    val prepMinutes: Int = 0,
    val cookMinutes: Int = 0,
    val favorite: Boolean = false,
    val notes: String? = null,
    val imageRef: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Entity(tableName = "recipe_ingredients", indices = [Index(value = ["recipeId"]), Index(value = ["foodId"])])
data class RecipeIngredientEntity(
    @PrimaryKey val id: String,
    val recipeId: String,
    val foodId: String,
    val quantity: Double,
)

@Entity(tableName = "recipe_steps", indices = [Index(value = ["recipeId"])])
data class RecipeStepEntity(
    @PrimaryKey val id: String,
    val recipeId: String,
    @ColumnInfo(name = "stepOrder") val order: Int,
    val text: String,
)

@Entity(tableName = "nutrition_goals", indices = [Index(value = ["localDate"])])
data class NutritionGoalEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val calories: Double = 0.0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    val updatedAt: String,
)

/** Phase 10 canonical cardio records. Optional measurements stay null when never observed. */
@Entity(
    tableName = "walking_sessions",
    indices = [Index(value = ["localDate"]), Index(value = ["startedAt"])],
)
data class WalkingSessionEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val startedAt: String,
    val endedAt: String,
    val stepCount: Int = 0,
    val durationSeconds: Long = 0L,
    val distanceMeters: Double? = null,
    val calories: Double? = null,
    val bodyWeightKg: Double? = null,
    val calorieBasis: String = "none",
    val source: String = "manual",
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

/** Append-only step ledger: a (source, localDate, sourceEventId) triple is never overwritten. */
@Entity(
    tableName = "step_records",
    indices = [Index(value = ["source", "localDate", "sourceEventId"], unique = true)],
)
data class StepRecordEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val stepCount: Int,
    val source: String,
    val sourceEventId: String,
    val createdAt: String,
)

@Entity(tableName = "step_goals", indices = [Index(value = ["localDate"])])
data class StepGoalEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val stepGoal: Int,
    val updatedAt: String,
)

@Entity(
    tableName = "jump_rope_sessions",
    indices = [Index(value = ["localDate"]), Index(value = ["countSource"])],
)
data class JumpRopeSessionEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val startedAt: String,
    val endedAt: String,
    val durationSeconds: Long = 0L,
    val jumpCount: Int = 0,
    val countSource: String = "manual",
    val rounds: Int = 0,
    val restSeconds: Long = 0L,
    val calories: Double? = null,
    val bodyWeightKg: Double? = null,
    val calorieBasis: String = "none",
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

/** GPS samples are consumed live and filtered; no route point table is stored in v1. */
@Entity(
    tableName = "cycling_sessions",
    indices = [Index(value = ["localDate"]), Index(value = ["startedAt"])],
)
data class CyclingSessionEntity(
    @PrimaryKey val id: String,
    val localDate: String,
    val startedAt: String,
    val endedAt: String,
    val durationSeconds: Long = 0L,
    val movingSeconds: Long = 0L,
    val pauseSeconds: Long = 0L,
    val stationarySeconds: Long = 0L,
    val distanceMeters: Double? = null,
    val averageSpeedKmh: Double? = null,
    val maxSpeedKmh: Double? = null,
    val sourceQuality: String = "manual",
    val notes: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Dao
interface CardioDao {
    @Query("SELECT * FROM walking_sessions ORDER BY startedAt DESC")
    fun observeWalkingSessions(): Flow<List<WalkingSessionEntity>>

    @Query("SELECT * FROM walking_sessions ORDER BY startedAt DESC")
    suspend fun walkingSessions(): List<WalkingSessionEntity>

    @Query("SELECT * FROM walking_sessions WHERE id = :id")
    suspend fun walkingSession(id: String): WalkingSessionEntity?

    @Upsert
    suspend fun saveWalkingSession(session: WalkingSessionEntity)

    @Query("DELETE FROM walking_sessions WHERE id = :id")
    suspend fun deleteWalkingSession(id: String)

    @Query("SELECT * FROM step_records ORDER BY localDate ASC, createdAt ASC")
    fun observeStepRecords(): Flow<List<StepRecordEntity>>

    @Query("SELECT * FROM step_records ORDER BY localDate ASC, createdAt ASC")
    suspend fun stepRecords(): List<StepRecordEntity>

    @Query("SELECT * FROM step_records WHERE localDate = :localDate")
    suspend fun stepRecordsForDate(localDate: String): List<StepRecordEntity>

    @Query(
        "SELECT * FROM step_records WHERE source = :source AND localDate = :localDate " +
            "AND sourceEventId = :sourceEventId LIMIT 1",
    )
    suspend fun stepRecordForEvent(source: String, localDate: String, sourceEventId: String): StepRecordEntity?

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertStepRecord(record: StepRecordEntity)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertStepRecords(records: List<StepRecordEntity>)

    @Query("DELETE FROM step_records WHERE id = :id")
    suspend fun deleteStepRecord(id: String)

    @Query("SELECT * FROM step_goals ORDER BY localDate ASC")
    fun observeStepGoals(): Flow<List<StepGoalEntity>>

    @Query("SELECT * FROM step_goals ORDER BY localDate ASC")
    suspend fun stepGoals(): List<StepGoalEntity>

    @Query("SELECT * FROM step_goals WHERE localDate = :localDate LIMIT 1")
    suspend fun stepGoalForDate(localDate: String): StepGoalEntity?

    @Upsert
    suspend fun saveStepGoal(goal: StepGoalEntity)

    @Query("DELETE FROM step_goals WHERE id = :id")
    suspend fun deleteStepGoal(id: String)

    @Query("SELECT * FROM jump_rope_sessions ORDER BY startedAt DESC")
    fun observeJumpRopeSessions(): Flow<List<JumpRopeSessionEntity>>

    @Query("SELECT * FROM jump_rope_sessions ORDER BY startedAt DESC")
    suspend fun jumpRopeSessions(): List<JumpRopeSessionEntity>

    @Query("SELECT * FROM jump_rope_sessions WHERE id = :id")
    suspend fun jumpRopeSession(id: String): JumpRopeSessionEntity?

    @Upsert
    suspend fun saveJumpRopeSession(session: JumpRopeSessionEntity)

    @Query("DELETE FROM jump_rope_sessions WHERE id = :id")
    suspend fun deleteJumpRopeSession(id: String)

    @Query("SELECT * FROM cycling_sessions ORDER BY startedAt DESC")
    fun observeCyclingSessions(): Flow<List<CyclingSessionEntity>>

    @Query("SELECT * FROM cycling_sessions ORDER BY startedAt DESC")
    suspend fun cyclingSessions(): List<CyclingSessionEntity>

    @Query("SELECT * FROM cycling_sessions WHERE id = :id")
    suspend fun cyclingSession(id: String): CyclingSessionEntity?

    @Upsert
    suspend fun saveCyclingSession(session: CyclingSessionEntity)

    @Query("DELETE FROM cycling_sessions WHERE id = :id")
    suspend fun deleteCyclingSession(id: String)
}

@Dao
interface DashboardDao {
    @Query("SELECT * FROM dashboards ORDER BY sortOrder ASC, createdAt ASC")
    fun observeAll(): Flow<List<DashboardEntity>>

    @Query("SELECT * FROM dashboards ORDER BY sortOrder ASC, createdAt ASC")
    suspend fun all(): List<DashboardEntity>

    @Query("SELECT * FROM dashboards WHERE id = :id")
    suspend fun get(id: String): DashboardEntity?

    @Upsert
    suspend fun upsert(dashboard: DashboardEntity)

    @Query("UPDATE dashboards SET name = :name WHERE id = :id")
    suspend fun rename(id: String, name: String)

    @Query("UPDATE dashboards SET widgets = :widgets WHERE id = :id")
    suspend fun saveWidgets(id: String, widgets: String)

    @Query("UPDATE dashboards SET sortOrder = :order WHERE id = :id")
    suspend fun setOrder(id: String, order: Int)

    @Query("UPDATE dashboards SET isDefault = :isDefault")
    suspend fun clearDefault(isDefault: Boolean = false)

    @Query("UPDATE dashboards SET isDefault = 1 WHERE id = :id")
    suspend fun makeDefault(id: String)

    @Query("DELETE FROM dashboards WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface HabitDao {
    @Query("SELECT * FROM habits ORDER BY createdAt ASC")
    fun observeAll(): Flow<List<HabitEntity>>

    @Query("SELECT * FROM habits ORDER BY createdAt ASC")
    suspend fun all(): List<HabitEntity>

    @Query("SELECT * FROM habits WHERE id = :id")
    suspend fun get(id: String): HabitEntity?

    @Upsert
    suspend fun save(habit: HabitEntity)

    @Query("DELETE FROM habits WHERE id = :id")
    suspend fun delete(id: String)

    @Query("SELECT * FROM habit_logs ORDER BY localDate ASC")
    fun observeLogs(): Flow<List<HabitLogEntity>>

    @Query("SELECT * FROM habit_logs ORDER BY localDate ASC")
    suspend fun logs(): List<HabitLogEntity>

    @Query("SELECT * FROM habit_logs WHERE habitId = :habitId AND localDate = :localDate LIMIT 1")
    suspend fun logForDay(habitId: String, localDate: String): HabitLogEntity?

    @Upsert
    suspend fun saveLog(log: HabitLogEntity)

    @Query("DELETE FROM habit_logs WHERE habitId = :habitId AND localDate = :localDate")
    suspend fun clearLog(habitId: String, localDate: String)

    @Query("DELETE FROM habit_logs WHERE habitId = :habitId")
    suspend fun deleteLogsForHabit(habitId: String)

    @Query("SELECT * FROM mascot_state WHERE id = 'default' LIMIT 1")
    fun observeMascot(): Flow<MascotStateEntity?>

    @Query("SELECT * FROM mascot_state WHERE id = 'default' LIMIT 1")
    suspend fun mascot(): MascotStateEntity?

    @Upsert
    suspend fun saveMascot(state: MascotStateEntity)
}

@Dao
interface GymDao {
    @Query("SELECT * FROM gym_exercises ORDER BY name ASC")
    fun observeExercises(): Flow<List<GymExerciseEntity>>

    @Query("SELECT * FROM gym_exercises ORDER BY name ASC")
    suspend fun exercises(): List<GymExerciseEntity>

    @Upsert
    suspend fun saveExercise(exercise: GymExerciseEntity)

    @Query("SELECT COUNT(*) FROM gym_workout_exercises WHERE exerciseId = :exerciseId")
    suspend fun exerciseUsageCount(exerciseId: String): Int

    @Query("DELETE FROM gym_exercises WHERE id = :id")
    suspend fun deleteExercise(id: String)

    @Query("DELETE FROM gym_personal_records WHERE exerciseId = :exerciseId")
    suspend fun deletePersonalRecordsForExercise(exerciseId: String)

    @Query("SELECT * FROM gym_workouts ORDER BY startedAt DESC")
    fun observeWorkouts(): Flow<List<GymWorkoutEntity>>

    @Query("SELECT * FROM gym_workouts ORDER BY startedAt DESC")
    suspend fun workouts(): List<GymWorkoutEntity>

    @Query("SELECT * FROM gym_workouts WHERE id = :id")
    suspend fun workout(id: String): GymWorkoutEntity?

    @Upsert
    suspend fun saveWorkout(workout: GymWorkoutEntity)

    @Query("DELETE FROM gym_workouts WHERE id = :id")
    suspend fun deleteWorkout(id: String)

    @Query("SELECT * FROM gym_workout_exercises WHERE workoutId = :workoutId ORDER BY sortOrder ASC")
    suspend fun workoutExercises(workoutId: String): List<GymWorkoutExerciseEntity>

    @Query("SELECT * FROM gym_workout_exercises ORDER BY sortOrder ASC")
    suspend fun allWorkoutExercises(): List<GymWorkoutExerciseEntity>

    @Upsert
    suspend fun saveWorkoutExercise(exercise: GymWorkoutExerciseEntity)

    @Query("DELETE FROM gym_workout_exercises WHERE id = :id")
    suspend fun deleteWorkoutExercise(id: String)

    @Query("DELETE FROM gym_workout_exercises WHERE workoutId = :workoutId")
    suspend fun deleteWorkoutExercises(workoutId: String)

    @Query("SELECT * FROM gym_sets WHERE workoutExerciseId = :workoutExerciseId ORDER BY setNumber ASC")
    suspend fun sets(workoutExerciseId: String): List<GymSetEntity>

    @Query("SELECT * FROM gym_sets ORDER BY setNumber ASC")
    suspend fun allSets(): List<GymSetEntity>

    @Upsert
    suspend fun saveSet(set: GymSetEntity)

    @Query("DELETE FROM gym_sets WHERE id = :id")
    suspend fun deleteSet(id: String)

    @Query("DELETE FROM gym_sets WHERE workoutExerciseId = :workoutExerciseId")
    suspend fun deleteSets(workoutExerciseId: String)

    @Query("SELECT * FROM gym_personal_records ORDER BY achievedAt DESC")
    fun observePersonalRecords(): Flow<List<GymPersonalRecordEntity>>

    @Query("SELECT * FROM gym_personal_records ORDER BY achievedAt DESC")
    suspend fun personalRecords(): List<GymPersonalRecordEntity>

    @Upsert
    suspend fun savePersonalRecord(record: GymPersonalRecordEntity)

    @Query("DELETE FROM gym_personal_records")
    suspend fun clearPersonalRecords()
}

@Dao
interface FoodDao {
    @Query("SELECT * FROM foods ORDER BY name ASC")
    fun observeFoods(): Flow<List<FoodEntity>>

    @Query("SELECT * FROM foods ORDER BY name ASC")
    suspend fun foods(): List<FoodEntity>

    @Query("SELECT * FROM foods WHERE name LIKE '%' || :query || '%' ORDER BY name ASC")
    suspend fun searchFoods(query: String): List<FoodEntity>

    @Query("SELECT * FROM foods WHERE id = :id")
    suspend fun food(id: String): FoodEntity?

    @Upsert
    suspend fun saveFood(food: FoodEntity)

    @Query("SELECT COUNT(*) FROM meal_entries WHERE foodId = :id")
    suspend fun foodEntryUsage(id: String): Int

    @Query("SELECT COUNT(*) FROM meal_plans WHERE foodId = :id")
    suspend fun foodPlanUsage(id: String): Int

    @Query("SELECT COUNT(*) FROM recipe_ingredients WHERE foodId = :id")
    suspend fun foodIngredientUsage(id: String): Int

    @Query("DELETE FROM foods WHERE id = :id")
    suspend fun deleteFood(id: String)

    @Query("SELECT * FROM meal_entries ORDER BY localDate ASC, loggedAt ASC")
    fun observeEntries(): Flow<List<MealEntryEntity>>

    @Query("SELECT * FROM meal_entries ORDER BY localDate ASC, loggedAt ASC")
    suspend fun entries(): List<MealEntryEntity>

    @Query("SELECT * FROM meal_entries WHERE localDate = :localDate ORDER BY loggedAt ASC")
    suspend fun entriesForDate(localDate: String): List<MealEntryEntity>

    @Query("SELECT * FROM meal_entries WHERE id = :id")
    suspend fun entry(id: String): MealEntryEntity?

    @Upsert
    suspend fun saveEntry(entry: MealEntryEntity)

    @Query("DELETE FROM meal_entries WHERE id = :id")
    suspend fun deleteEntry(id: String)

    @Query("SELECT * FROM meal_plans ORDER BY localDate ASC, plannedAt ASC")
    fun observePlans(): Flow<List<MealPlanEntity>>

    @Query("SELECT * FROM meal_plans ORDER BY localDate ASC, plannedAt ASC")
    suspend fun plans(): List<MealPlanEntity>

    @Query("SELECT * FROM meal_plans WHERE localDate = :localDate ORDER BY plannedAt ASC")
    suspend fun plansForDate(localDate: String): List<MealPlanEntity>

    @Query("SELECT * FROM meal_plans WHERE id = :id")
    suspend fun plan(id: String): MealPlanEntity?

    @Upsert
    suspend fun savePlan(plan: MealPlanEntity)

    @Query("DELETE FROM meal_plans WHERE id = :id")
    suspend fun deletePlan(id: String)

    @Query("SELECT * FROM recipes ORDER BY name ASC")
    fun observeRecipes(): Flow<List<RecipeEntity>>

    @Query("SELECT * FROM recipes ORDER BY name ASC")
    suspend fun recipes(): List<RecipeEntity>

    @Query("SELECT * FROM recipes WHERE id = :id")
    suspend fun recipe(id: String): RecipeEntity?

    @Upsert
    suspend fun saveRecipe(recipe: RecipeEntity)

    @Query("SELECT COUNT(*) FROM meal_entries WHERE recipeId = :id")
    suspend fun recipeEntryUsage(id: String): Int

    @Query("SELECT COUNT(*) FROM meal_plans WHERE recipeId = :id")
    suspend fun recipePlanUsage(id: String): Int

    @Query("DELETE FROM recipes WHERE id = :id")
    suspend fun deleteRecipe(id: String)

    @Query("SELECT * FROM recipe_ingredients ORDER BY recipeId ASC, id ASC")
    fun observeIngredients(): Flow<List<RecipeIngredientEntity>>

    @Query("SELECT * FROM recipe_ingredients WHERE recipeId = :recipeId ORDER BY id ASC")
    suspend fun ingredientsFor(recipeId: String): List<RecipeIngredientEntity>

    @Query("SELECT * FROM recipe_ingredients ORDER BY recipeId ASC, id ASC")
    suspend fun ingredients(): List<RecipeIngredientEntity>

    @Upsert
    suspend fun saveIngredient(ingredient: RecipeIngredientEntity)

    @Query("DELETE FROM recipe_ingredients WHERE id = :id")
    suspend fun deleteIngredient(id: String)

    @Query("DELETE FROM recipe_ingredients WHERE recipeId = :recipeId")
    suspend fun deleteIngredientsForRecipe(recipeId: String)

    @Query("SELECT * FROM recipe_steps ORDER BY recipeId ASC, stepOrder ASC")
    fun observeSteps(): Flow<List<RecipeStepEntity>>

    @Query("SELECT * FROM recipe_steps WHERE recipeId = :recipeId ORDER BY stepOrder ASC")
    suspend fun stepsFor(recipeId: String): List<RecipeStepEntity>

    @Query("SELECT * FROM recipe_steps ORDER BY recipeId ASC, stepOrder ASC")
    suspend fun steps(): List<RecipeStepEntity>

    @Upsert
    suspend fun saveStep(step: RecipeStepEntity)

    @Query("DELETE FROM recipe_steps WHERE id = :id")
    suspend fun deleteStep(id: String)

    @Query("DELETE FROM recipe_steps WHERE recipeId = :recipeId")
    suspend fun deleteStepsForRecipe(recipeId: String)

    @Query("SELECT * FROM nutrition_goals ORDER BY localDate ASC")
    fun observeGoals(): Flow<List<NutritionGoalEntity>>

    @Query("SELECT * FROM nutrition_goals ORDER BY localDate ASC")
    suspend fun goals(): List<NutritionGoalEntity>

    @Query("SELECT * FROM nutrition_goals WHERE localDate = :localDate LIMIT 1")
    suspend fun goalForDate(localDate: String): NutritionGoalEntity?

    @Upsert
    suspend fun saveGoal(goal: NutritionGoalEntity)

    @Query("DELETE FROM nutrition_goals WHERE id = :id")
    suspend fun deleteGoal(id: String)
}

/**
 * Adds only the tasks table. The existing settings table and its rows are untouched.
 */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `tasks` (" +
                "`id` TEXT NOT NULL, " +
                "`title` TEXT NOT NULL, " +
                "`completed` INTEGER NOT NULL, " +
                "`createdAt` TEXT NOT NULL, " +
                "PRIMARY KEY(`id`))",
        )
    }
}

/** Adds only the dashboards table. Settings, tasks, and their rows are untouched. */
val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `dashboards` (" +
                "`id` TEXT NOT NULL, " +
                "`name` TEXT NOT NULL, " +
                "`sortOrder` INTEGER NOT NULL, " +
                "`isDefault` INTEGER NOT NULL, " +
                "`widgets` TEXT NOT NULL, " +
                "`createdAt` TEXT NOT NULL, " +
                "PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_dashboards_sortOrder` ON `dashboards` (`sortOrder`)")
    }
}

/** Adds task fields only. Settings, dashboards, and all existing rows are untouched. */
val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `description` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `priority` TEXT NOT NULL DEFAULT 'medium'")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `category` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `dueDate` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `startTime` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `endTime` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `status` TEXT NOT NULL DEFAULT 'open'")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `completedAt` TEXT")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `subtasks` TEXT NOT NULL DEFAULT '[]'")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `recurrence` TEXT")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `recurrenceParentId` TEXT")
        db.execSQL("ALTER TABLE `tasks` ADD COLUMN `reminderOffsetMinutes` INTEGER")
        // Derived from the existing boolean; no completion instant is invented.
        db.execSQL("UPDATE `tasks` SET `status` = 'completed' WHERE `completed` = 1")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_tasks_priority` ON `tasks` (`priority`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_tasks_category` ON `tasks` (`category`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_tasks_recurrenceParentId` ON `tasks` (`recurrenceParentId`)")
    }
}

/** Adds habits, habit logs, and mascot state. Existing tables and rows are untouched. */
val MIGRATION_4_5 = object : Migration(4, 5) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `habits` (" +
                "`id` TEXT NOT NULL, `name` TEXT NOT NULL, `description` TEXT NOT NULL DEFAULT '', " +
                "`icon` TEXT NOT NULL DEFAULT '', `accent` TEXT NOT NULL DEFAULT '', " +
                "`scheduleType` TEXT NOT NULL DEFAULT 'daily', `weekdays` TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6', " +
                "`target` INTEGER, `reminderOffsetMinutes` INTEGER, `paused` INTEGER NOT NULL DEFAULT 0, " +
                "`archived` INTEGER NOT NULL DEFAULT 0, `createdAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `habit_logs` (" +
                "`id` TEXT NOT NULL, `habitId` TEXT NOT NULL, `localDate` TEXT NOT NULL, " +
                "`status` TEXT NOT NULL, `value` INTEGER, `completedAt` TEXT, `createdAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_habit_logs_habitId` ON `habit_logs` (`habitId`)")
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_habit_logs_habitId_localDate` ON `habit_logs` (`habitId`, `localDate`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `mascot_state` (" +
                "`id` TEXT NOT NULL, `companion` TEXT NOT NULL DEFAULT 'sprout', " +
                "`plantStyle` TEXT NOT NULL DEFAULT 'fern', `animationsEnabled` INTEGER NOT NULL DEFAULT 1, " +
                "`updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
    }
}

/** Adds gym tables. Existing tables and rows are untouched. */
val MIGRATION_5_6 = object : Migration(5, 6) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `gym_exercises` (" +
                "`id` TEXT NOT NULL, `name` TEXT NOT NULL, `muscleGroup` TEXT NOT NULL, " +
                "`notes` TEXT NOT NULL DEFAULT '', `isCustom` INTEGER NOT NULL DEFAULT 0, " +
                "`createdAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `gym_workouts` (" +
                "`id` TEXT NOT NULL, `startedAt` TEXT NOT NULL, `endedAt` TEXT, " +
                "`note` TEXT NOT NULL DEFAULT '', PRIMARY KEY(`id`))",
        )
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `gym_workout_exercises` (" +
                "`id` TEXT NOT NULL, `workoutId` TEXT NOT NULL, `exerciseId` TEXT NOT NULL, " +
                "`sortOrder` INTEGER NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_gym_workout_exercises_workoutId` ON `gym_workout_exercises` (`workoutId`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `gym_sets` (" +
                "`id` TEXT NOT NULL, `workoutExerciseId` TEXT NOT NULL, `setNumber` INTEGER NOT NULL, " +
                "`reps` INTEGER NOT NULL, `weight` REAL NOT NULL, `completed` INTEGER NOT NULL, " +
                "`completedAt` TEXT, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_gym_sets_workoutExerciseId` ON `gym_sets` (`workoutExerciseId`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `gym_personal_records` (" +
                "`id` TEXT NOT NULL, `exerciseId` TEXT NOT NULL, `metric` TEXT NOT NULL, " +
                "`value` REAL NOT NULL, `achievedAt` TEXT NOT NULL, `workoutId` TEXT NOT NULL, " +
                "`setId` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_gym_personal_records_exerciseId_metric` ON `gym_personal_records` (`exerciseId`, `metric`)")
    }
}

/** Adds only Phase 9 food tables and indexes. No existing table or row is dropped or rewritten. */
val MIGRATION_6_7 = object : Migration(6, 7) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `foods` (" +
                "`id` TEXT NOT NULL, `name` TEXT NOT NULL, `servingSize` TEXT NOT NULL, " +
                "`servingGrams` REAL, `calories` REAL NOT NULL, `protein` REAL NOT NULL, " +
                "`carbs` REAL NOT NULL, `fat` REAL NOT NULL, `source` TEXT NOT NULL, " +
                "`sourceRef` TEXT, `imageRef` TEXT, `notes` TEXT, " +
                "`createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_foods_name` ON `foods` (`name`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `meal_entries` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `mealType` TEXT NOT NULL, " +
                "`foodId` TEXT, `recipeId` TEXT, `quantity` REAL NOT NULL, `notes` TEXT, " +
                "`imageRef` TEXT, `loggedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_entries_localDate` ON `meal_entries` (`localDate`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_entries_foodId` ON `meal_entries` (`foodId`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_entries_recipeId` ON `meal_entries` (`recipeId`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `meal_plans` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `mealType` TEXT NOT NULL, " +
                "`foodId` TEXT, `recipeId` TEXT, `quantity` REAL NOT NULL, `notes` TEXT, " +
                "`plannedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_plans_localDate` ON `meal_plans` (`localDate`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_plans_foodId` ON `meal_plans` (`foodId`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_plans_recipeId` ON `meal_plans` (`recipeId`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `recipes` (" +
                "`id` TEXT NOT NULL, `name` TEXT NOT NULL, `servings` INTEGER NOT NULL, " +
                "`prepMinutes` INTEGER NOT NULL, `cookMinutes` INTEGER NOT NULL, " +
                "`favorite` INTEGER NOT NULL, `notes` TEXT, `imageRef` TEXT, " +
                "`createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `recipe_ingredients` (" +
                "`id` TEXT NOT NULL, `recipeId` TEXT NOT NULL, `foodId` TEXT NOT NULL, " +
                "`quantity` REAL NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_recipe_ingredients_recipeId` ON `recipe_ingredients` (`recipeId`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_recipe_ingredients_foodId` ON `recipe_ingredients` (`foodId`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `recipe_steps` (" +
                "`id` TEXT NOT NULL, `recipeId` TEXT NOT NULL, `stepOrder` INTEGER NOT NULL, " +
                "`text` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_recipe_steps_recipeId` ON `recipe_steps` (`recipeId`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `nutrition_goals` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `calories` REAL NOT NULL, " +
                "`protein` REAL NOT NULL, `carbs` REAL NOT NULL, `fat` REAL NOT NULL, " +
                "`updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_nutrition_goals_localDate` ON `nutrition_goals` (`localDate`)")
    }
}

/** Adds only Phase 10 cardio tables and indexes. No existing table or row is dropped or rewritten. */
val MIGRATION_7_8 = object : Migration(7, 8) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `walking_sessions` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `startedAt` TEXT NOT NULL, " +
                "`endedAt` TEXT NOT NULL, `stepCount` INTEGER NOT NULL, `durationSeconds` INTEGER NOT NULL, " +
                "`distanceMeters` REAL, `calories` REAL, `bodyWeightKg` REAL, " +
                "`calorieBasis` TEXT NOT NULL, `source` TEXT NOT NULL, `notes` TEXT, " +
                "`createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_walking_sessions_localDate` ON `walking_sessions` (`localDate`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_walking_sessions_startedAt` ON `walking_sessions` (`startedAt`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `step_records` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `stepCount` INTEGER NOT NULL, " +
                "`source` TEXT NOT NULL, `sourceEventId` TEXT NOT NULL, `createdAt` TEXT NOT NULL, " +
                "PRIMARY KEY(`id`))",
        )
        db.execSQL(
            "CREATE UNIQUE INDEX IF NOT EXISTS `index_step_records_source_localDate_sourceEventId` " +
                "ON `step_records` (`source`, `localDate`, `sourceEventId`)",
        )
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `step_goals` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `stepGoal` INTEGER NOT NULL, " +
                "`updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_step_goals_localDate` ON `step_goals` (`localDate`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `jump_rope_sessions` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `startedAt` TEXT NOT NULL, " +
                "`endedAt` TEXT NOT NULL, `durationSeconds` INTEGER NOT NULL, `jumpCount` INTEGER NOT NULL, " +
                "`countSource` TEXT NOT NULL, `rounds` INTEGER NOT NULL, `restSeconds` INTEGER NOT NULL, " +
                "`calories` REAL, `bodyWeightKg` REAL, `calorieBasis` TEXT NOT NULL, `notes` TEXT, " +
                "`createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_jump_rope_sessions_localDate` ON `jump_rope_sessions` (`localDate`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_jump_rope_sessions_countSource` ON `jump_rope_sessions` (`countSource`)")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `cycling_sessions` (" +
                "`id` TEXT NOT NULL, `localDate` TEXT NOT NULL, `startedAt` TEXT NOT NULL, " +
                "`endedAt` TEXT NOT NULL, `durationSeconds` INTEGER NOT NULL, `movingSeconds` INTEGER NOT NULL, " +
                "`pauseSeconds` INTEGER NOT NULL, `stationarySeconds` INTEGER NOT NULL, " +
                "`distanceMeters` REAL, `averageSpeedKmh` REAL, `maxSpeedKmh` REAL, " +
                "`sourceQuality` TEXT NOT NULL, `notes` TEXT, " +
                "`createdAt` TEXT NOT NULL, `updatedAt` TEXT NOT NULL, PRIMARY KEY(`id`))",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_cycling_sessions_localDate` ON `cycling_sessions` (`localDate`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_cycling_sessions_startedAt` ON `cycling_sessions` (`startedAt`)")
    }
}

@Database(
    entities = [
        SettingEntity::class, TaskEntity::class, DashboardEntity::class,
        HabitEntity::class, HabitLogEntity::class, MascotStateEntity::class,
        GymExerciseEntity::class, GymWorkoutEntity::class, GymWorkoutExerciseEntity::class,
        GymSetEntity::class, GymPersonalRecordEntity::class,
        FoodEntity::class, MealEntryEntity::class, MealPlanEntity::class,
        RecipeEntity::class, RecipeIngredientEntity::class, RecipeStepEntity::class,
        NutritionGoalEntity::class,
        WalkingSessionEntity::class, StepRecordEntity::class, StepGoalEntity::class,
        JumpRopeSessionEntity::class, CyclingSessionEntity::class,
    ],
    version = 8,
    exportSchema = true,
)
@TypeConverters(TaskJsonConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun settingDao(): SettingDao
    abstract fun taskDao(): TaskDao
    abstract fun dashboardDao(): DashboardDao
    abstract fun habitDao(): HabitDao
    abstract fun gymDao(): GymDao
    abstract fun foodDao(): FoodDao
    abstract fun cardioDao(): CardioDao

    companion object {
        @Volatile
        private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "myflow.db",
                )
                    .addMigrations(
                        MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4,
                        MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7,
                        MIGRATION_7_8,
                    )
                    .build().also { instance = it }
            }
    }
}

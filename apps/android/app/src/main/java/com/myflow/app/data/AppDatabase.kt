package com.myflow.app.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
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

@Database(
    entities = [
        SettingEntity::class, TaskEntity::class, DashboardEntity::class,
        HabitEntity::class, HabitLogEntity::class, MascotStateEntity::class,
        GymExerciseEntity::class, GymWorkoutEntity::class, GymWorkoutExerciseEntity::class,
        GymSetEntity::class, GymPersonalRecordEntity::class,
    ],
    version = 6,
    exportSchema = true,
)
@TypeConverters(TaskJsonConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun settingDao(): SettingDao
    abstract fun taskDao(): TaskDao
    abstract fun dashboardDao(): DashboardDao
    abstract fun habitDao(): HabitDao
    abstract fun gymDao(): GymDao

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
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
                    .build().also { instance = it }
            }
    }
}

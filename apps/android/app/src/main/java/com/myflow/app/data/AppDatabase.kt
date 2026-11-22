package com.myflow.app.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.Migration
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

@Database(
    entities = [SettingEntity::class, TaskEntity::class, DashboardEntity::class],
    version = 4,
    exportSchema = true,
)
@TypeConverters(TaskJsonConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun settingDao(): SettingDao
    abstract fun taskDao(): TaskDao
    abstract fun dashboardDao(): DashboardDao

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
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
                    .build().also { instance = it }
            }
    }
}

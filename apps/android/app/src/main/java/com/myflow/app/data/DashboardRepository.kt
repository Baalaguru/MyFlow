package com.myflow.app.data

import java.time.Instant
import java.util.UUID

/** Stable widget identifiers shared with the web widget registry. */
object WidgetIds {
    const val TODO_OVERVIEW = "todoOverview"
    const val HABIT_OVERVIEW = "habitOverview"
    const val CURRENT_STREAK = "currentStreak"
    const val MASCOT_GROWTH = "mascotGrowth"
    const val GYM_OVERVIEW = "gymOverview"
    const val WALKING_OVERVIEW = "walkingOverview"
    const val JUMP_ROPE_OVERVIEW = "jumpRopeOverview"
    const val CYCLING_OVERVIEW = "cyclingOverview"
    const val FOOD_OVERVIEW = "foodOverview"
    const val READING_OVERVIEW = "readingOverview"
    const val JOURNAL_QUICK_ACCESS = "journalQuickAccess"
    const val CALENDAR_OVERVIEW = "calendarOverview"
    const val FINANCE_OVERVIEW = "financeOverview"
    const val WEEKLY_STATISTICS = "weeklyStatistics"
    const val MONTHLY_STATISTICS = "monthlyStatistics"
    const val QUICK_CAPTURE = "quickCapture"

    val ALL = listOf(
        TODO_OVERVIEW,
        HABIT_OVERVIEW,
        CURRENT_STREAK,
        MASCOT_GROWTH,
        GYM_OVERVIEW,
        WALKING_OVERVIEW,
        JUMP_ROPE_OVERVIEW,
        CYCLING_OVERVIEW,
        FOOD_OVERVIEW,
        READING_OVERVIEW,
        JOURNAL_QUICK_ACCESS,
        CALENDAR_OVERVIEW,
        FINANCE_OVERVIEW,
        WEEKLY_STATISTICS,
        MONTHLY_STATISTICS,
        QUICK_CAPTURE,
    )

    /** Widgets with a real local repository in this phase. */
    val SEEDED = listOf(TODO_OVERVIEW, WEEKLY_STATISTICS, MONTHLY_STATISTICS, QUICK_CAPTURE)
}

data class WidgetConfig(
    val id: String,
    val columns: Int = 4,
    val rows: Int = 1,
    val visible: Boolean = true,
    val background: String = "widgetBackground",
    val accent: String = "primary",
)

/** Local-only dashboard operations mirroring the web contract. */
class DashboardRepository(
    private val dao: DashboardDao,
    private val labels: DashboardLabels,
) {
    fun observe() = dao.observeAll()

    suspend fun ensureDefault(): List<DashboardEntity> {
        val rows = dao.all()
        if (rows.isEmpty()) {
            val seed = newDashboard(labels.defaultName, 0, true)
            dao.upsert(seed)
            return listOf(seed)
        }
        if (rows.none { it.isDefault }) {
            rows.firstOrNull()?.let { dao.makeDefault(it.id) }
        }
        return dao.all()
    }

    suspend fun create(name: String): DashboardEntity {
        val rows = dao.all()
        val dashboard = newDashboard(name.ifBlank { labels.newName }, rows.size, rows.isEmpty())
        dao.upsert(dashboard)
        return dashboard
    }

    suspend fun rename(id: String, name: String) {
        if (name.isNotBlank()) dao.rename(id, name.trim())
    }

    suspend fun duplicate(id: String): DashboardEntity? {
        val source = dao.get(id) ?: return null
        val rows = dao.all()
        val copy = DashboardEntity(
            id = UUID.randomUUID().toString(),
            name = "${source.name} — ${labels.copyLabel}",
            sortOrder = rows.size,
            isDefault = false,
            widgets = source.widgets,
            createdAt = Instant.now().toString(),
        )
        dao.upsert(copy)
        return copy
    }

    suspend fun delete(id: String): List<DashboardEntity> {
        dao.delete(id)
        val rows = dao.all()
        if (rows.isEmpty()) {
            dao.upsert(newDashboard(labels.defaultName, 0, true))
            return dao.all()
        }
        if (rows.none { it.isDefault }) rows.firstOrNull()?.let { dao.makeDefault(it.id) }
        return reindex(dao.all())
    }

    suspend fun reorder(ids: List<String>): List<DashboardEntity> {
        val rows = dao.all()
        val byId = rows.associateBy { it.id }
        val ordered = ids.mapNotNull { byId[it] }.toMutableList()
        rows.forEach { row -> if (ordered.none { it.id == row.id }) ordered.add(row) }
        return reindex(ordered)
    }

    suspend fun setDefault(id: String) {
        dao.clearDefault(false)
        dao.makeDefault(id)
    }

    suspend fun saveWidgets(id: String, widgets: List<WidgetConfig>) {
        dao.saveWidgets(id, encode(widgets.distinctBy { it.id }))
    }

    suspend fun addWidget(id: String, widgetId: String) {
        if (widgetId !in WidgetIds.ALL) return
        val dashboard = dao.get(id) ?: return
        val widgets = decode(dashboard.widgets)
        if (widgets.any { it.id == widgetId }) return
        dao.saveWidgets(id, encode(widgets + WidgetConfig(id = widgetId)))
    }

    suspend fun reset(id: String) {
        dao.saveWidgets(id, encode(seedWidgets()))
    }

    private suspend fun reindex(rows: List<DashboardEntity>): List<DashboardEntity> {
        rows.forEachIndexed { index, row -> dao.setOrder(row.id, index) }
        return dao.all()
    }

    private fun newDashboard(name: String, order: Int, isDefault: Boolean) = DashboardEntity(
        id = UUID.randomUUID().toString(),
        name = name,
        sortOrder = order,
        isDefault = isDefault,
        widgets = encode(seedWidgets()),
        createdAt = Instant.now().toString(),
    )

    companion object {
        fun seedWidgets(): List<WidgetConfig> = WidgetIds.SEEDED.map { WidgetConfig(id = it) }

        fun decode(value: String): List<WidgetConfig> = value.split(';').mapNotNull { part ->
            val fields = part.split(':')
            if (fields.size != 6 || fields[0] !in WidgetIds.ALL) return@mapNotNull null
            WidgetConfig(
                id = fields[0],
                columns = fields[1].toIntOrNull()?.coerceIn(3, 12) ?: 4,
                rows = fields[2].toIntOrNull()?.coerceIn(1, 2) ?: 1,
                visible = fields[3] != "0",
                background = fields[4],
                accent = fields[5],
            )
        }

        fun encode(widgets: List<WidgetConfig>): String = widgets.joinToString(";") { widget ->
            listOf(
                widget.id,
                widget.columns.coerceIn(3, 12).toString(),
                widget.rows.coerceIn(1, 2).toString(),
                if (widget.visible) "1" else "0",
                widget.background,
                widget.accent,
            ).joinToString(":")
        }

        fun reorderWidgets(widgets: List<WidgetConfig>, fromId: String, toId: String): List<WidgetConfig> {
            val from = widgets.indexOfFirst { it.id == fromId }
            val to = widgets.indexOfFirst { it.id == toId }
            if (from < 0 || to < 0 || from == to) return widgets
            return widgets.toMutableList().apply { add(to, removeAt(from)) }
        }
    }
}

data class DashboardLabels(val defaultName: String, val newName: String, val copyLabel: String)

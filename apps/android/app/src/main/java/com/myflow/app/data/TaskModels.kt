package com.myflow.app.data

import androidx.room.TypeConverter
import org.json.JSONArray
import org.json.JSONObject

data class SubtaskRecord(
    val id: String,
    val title: String,
    val completed: Boolean,
)

enum class TaskPriority(val key: String) {
    VERY_HIGH("veryHigh"),
    HIGH("high"),
    MEDIUM("medium"),
    LOW("low"),
}

enum class RecurrenceFrequency(val key: String) {
    DAILY("daily"),
    WEEKLY("weekly"),
    MONTHLY("monthly"),
}

data class RecurrenceRule(
    val frequency: RecurrenceFrequency,
    val interval: Int,
    val count: Int? = null,
    val until: String? = null,
)

/** JSON keeps embedded task values readable and avoids ad-hoc separators in user titles. */
object TaskJsonConverters {
    @JvmStatic
    @TypeConverter
    fun encodeSubtasks(value: List<SubtaskRecord>): String {
        val array = JSONArray()
        value.forEach { item ->
            array.put(
                JSONObject()
                    .put("id", item.id)
                    .put("title", item.title)
                    .put("completed", item.completed),
            )
        }
        return array.toString()
    }

    @JvmStatic
    @TypeConverter
    fun decodeSubtasks(value: String): List<SubtaskRecord> {
        if (value.isBlank()) return emptyList()
        val array = JSONArray(value)
        return (0 until array.length()).map { index ->
            val row = array.getJSONObject(index)
            SubtaskRecord(
                id = row.getString("id"),
                title = row.getString("title"),
                completed = row.getBoolean("completed"),
            )
        }
    }

    @JvmStatic
    @TypeConverter
    fun encodeRecurrence(value: RecurrenceRule?): String? {
        if (value == null) return null
        return JSONObject()
            .put("frequency", value.frequency.key)
            .put("interval", value.interval)
            .put("count", value.count)
            .put("until", value.until)
            .toString()
    }

    @JvmStatic
    @TypeConverter
    fun decodeRecurrence(value: String?): RecurrenceRule? {
        if (value.isNullOrBlank()) return null
        val row = JSONObject(value)
        val frequency = RecurrenceFrequency.entries.firstOrNull { it.key == row.optString("frequency") }
            ?: RecurrenceFrequency.DAILY
        return RecurrenceRule(
            frequency = frequency,
            interval = row.optInt("interval", 1).coerceAtLeast(1),
            count = if (row.isNull("count")) null else row.optInt("count"),
            until = if (row.isNull("until")) null else row.optString("until"),
        )
    }
}

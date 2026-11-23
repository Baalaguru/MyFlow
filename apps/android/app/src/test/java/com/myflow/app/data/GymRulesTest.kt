package com.myflow.app.data

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GymRulesTest {

    private fun workout(
        id: String = "w1",
        startedAt: String = "2026-11-23T08:00:00Z",
        endedAt: String? = null,
        exercises: List<WorkoutExerciseWithSets> = emptyList(),
    ) = WorkoutAggregate(
        workout = GymWorkoutEntity(id = id, startedAt = startedAt, endedAt = endedAt),
        exercises = exercises,
    )

    private fun ex(
        id: String,
        exerciseId: String,
        sets: List<GymSetEntity>,
        sortOrder: Int = 0,
    ) = WorkoutExerciseWithSets(
        exercise = GymWorkoutExerciseEntity(id = id, workoutId = "w1", exerciseId = exerciseId, sortOrder = sortOrder),
        sets = sets,
    )

    private fun set(
        id: String,
        reps: Int,
        weight: Double,
        completed: Boolean,
        completedAt: String? = if (completed) "2026-11-23T08:10:00Z" else null,
        setNumber: Int = 1,
    ) = GymSetEntity(
        id = id,
        workoutExerciseId = "we1",
        setNumber = setNumber,
        reps = reps,
        weight = weight,
        completed = completed,
        completedAt = completedAt,
    )

    @Test
    fun setVolume_counts_only_completed_sets() {
        assertEquals(500.0, setVolume(set("s1", reps = 5, weight = 100.0, completed = true)))
        assertEquals(0.0, setVolume(set("s2", reps = 5, weight = 100.0, completed = false)))
    }

    @Test
    fun workoutVolume_sums_completed_sets_across_exercises() {
        val aggregate = workout(
            exercises = listOf(
                ex("we1", "bench", listOf(
                    set("s1", 5, 100.0, true),
                    set("s2", 8, 50.0, false),
                )),
                ex("we2", "squat", listOf(
                    set("s3", 3, 120.0, true),
                ), sortOrder = 1),
            ),
        )
        assertEquals(860.0, workoutVolume(aggregate))
    }

    @Test
    fun derivePersonalRecords_keeps_highest_per_metric() {
        val w1 = workout("w1", startedAt = "2026-11-01T08:00:00Z", endedAt = "2026-11-01T09:00:00Z", exercises = listOf(
            ex("we1", "bench", listOf(set("s1", 5, 100.0, true, completedAt = "2026-11-01T08:10:00Z"))),
        ))
        val w2 = workout("w2", startedAt = "2026-11-03T08:00:00Z", endedAt = "2026-11-03T09:00:00Z", exercises = listOf(
            ex("we2", "bench", listOf(set("s2", 5, 110.0, true, completedAt = "2026-11-03T08:10:00Z"))),
        ))

        val prs = derivePersonalRecords(listOf(w1, w2))
        val weightPr = prs.first { it.exerciseId == "bench" && it.metric == "maxWeight" }
        val repsPr = prs.first { it.exerciseId == "bench" && it.metric == "maxReps" }
        val volumePr = prs.first { it.exerciseId == "bench" && it.metric == "maxVolume" }
        assertEquals(110.0, weightPr.value)
        assertEquals(5.0, repsPr.value)
        assertEquals(550.0, volumePr.value)
    }

    @Test
    fun derivePersonalRecords_ignores_incomplete_sets() {
        val w1 = workout("w1", exercises = listOf(
            ex("we1", "bench", listOf(set("s1", 5, 200.0, false, completedAt = null))),
        ))
        assertTrue(derivePersonalRecords(listOf(w1)).isEmpty())
    }

    @Test
    fun workoutCompletionProgress_reports_ratio_and_unavailable() {
        val unavailable = workoutCompletionProgress(null)
        assertEquals(false, unavailable.available)
        assertNull(unavailable.percent)

        val aggregate = workout(exercises = listOf(ex("we1", "bench", listOf(
            set("s1", 5, 100.0, true),
            set("s2", 5, 100.0, false, completedAt = null, setNumber = 2),
        ))))
        val progress = workoutCompletionProgress(aggregate)
        assertEquals(true, progress.available)
        assertEquals(1, progress.completed)
        assertEquals(2, progress.total)
        assertEquals(50, progress.percent)
    }

    @Test
    fun gymSummary_aggregates_counts_volume_and_latest_started_workout() {
        val w1 = workout("w1", startedAt = "2026-11-01T08:00:00Z", endedAt = "2026-11-01T09:00:00Z", exercises = listOf(
            ex("we1", "bench", listOf(set("s1", 5, 100.0, true))),
        ))
        val w2 = workout("w2", startedAt = "2026-11-03T08:00:00Z", endedAt = null, exercises = emptyList())
        val summary = gymSummary(listOf(w1, w2), derivePersonalRecords(listOf(w1, w2)))
        assertEquals(2, summary.workoutCount)
        assertEquals(500.0, summary.totalVolume)
        assertTrue(summary.prCount > 0)
        assertEquals("2026-11-03T08:00:00Z", summary.lastWorkoutAt)
        assertNull(gymSummary(emptyList(), emptyList()).lastWorkoutAt)
    }
}

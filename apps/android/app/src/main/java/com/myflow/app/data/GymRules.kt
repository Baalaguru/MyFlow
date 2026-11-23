package com.myflow.app.data

import kotlin.math.roundToInt

data class GymSummary(val workoutCount: Int, val totalVolume: Double, val prCount: Int, val lastWorkoutAt: String?)

data class WorkoutExerciseWithSets(
    val exercise: GymWorkoutExerciseEntity,
    val sets: List<GymSetEntity>,
)

data class WorkoutAggregate(
    val workout: GymWorkoutEntity,
    val exercises: List<WorkoutExerciseWithSets>,
)

fun setVolume(set: GymSetEntity): Double = if (set.completed) set.reps * set.weight else 0.0

fun workoutVolume(workout: WorkoutAggregate): Double =
    workout.exercises.sumOf { ex -> ex.sets.sumOf { setVolume(it) } }

fun derivePersonalRecords(workouts: List<WorkoutAggregate>): List<GymPersonalRecordEntity> {
    val best = linkedMapOf<String, GymPersonalRecordEntity>()
    val ordered = workouts.sortedBy { it.workout.startedAt }
    for (w in ordered) {
        for (ex in w.exercises) {
            for (set in ex.sets) {
                if (!set.completed) continue
                val achievedAt = set.completedAt ?: w.workout.endedAt ?: w.workout.startedAt
                val candidates = listOf(
                    Triple("maxWeight", set.weight, set.weight > 0),
                    Triple("maxReps", set.reps.toDouble(), true),
                    Triple("maxVolume", setVolume(set), setVolume(set) > 0),
                )
                for ((metric, value, eligible) in candidates) {
                    if (!eligible) continue
                    val key = "${ex.exercise.exerciseId}:$metric"
                    val current = best[key]
                    if (current == null || value > current.value) {
                        best[key] = GymPersonalRecordEntity(
                            id = "${ex.exercise.exerciseId}:$metric",
                            exerciseId = ex.exercise.exerciseId,
                            metric = metric,
                            value = value,
                            achievedAt = achievedAt,
                            workoutId = w.workout.id,
                            setId = set.id,
                        )
                    }
                }
            }
        }
    }
    return best.values.sortedByDescending { it.achievedAt }
}

fun gymSummary(workouts: List<WorkoutAggregate>, prs: List<GymPersonalRecordEntity>): GymSummary =
    GymSummary(
        workoutCount = workouts.size,
        totalVolume = workouts.sumOf { workoutVolume(it) },
        prCount = prs.size,
        lastWorkoutAt = workouts.maxByOrNull { it.workout.startedAt }?.workout?.startedAt,
    )

fun workoutCompletionProgress(workout: WorkoutAggregate?): ProgressSnapshot {
    if (workout == null) return unavailableProgress
    val sets = workout.exercises.flatMap { it.sets }
    if (sets.isEmpty()) return unavailableProgress
    return calculateProgress(sets.count { it.completed }, sets.size)
}
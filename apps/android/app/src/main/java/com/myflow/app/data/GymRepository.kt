package com.myflow.app.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Instant
import java.util.UUID

class GymRepository(private val dao: GymDao) {
    fun observeExercises(): Flow<List<GymExerciseEntity>> = dao.observeExercises()
    fun observeWorkouts(): Flow<List<GymWorkoutEntity>> = dao.observeWorkouts()
    fun observePersonalRecords(): Flow<List<GymPersonalRecordEntity>> = dao.observePersonalRecords()

    suspend fun ensureDefaults() {
        if (dao.exercises().isNotEmpty()) return
        val now = Instant.now().toString()
        val defaults = listOf(
            Triple("bench-press", "Bench Press", "chest"),
            Triple("squat", "Squat", "legs"),
            Triple("deadlift", "Deadlift", "back"),
            Triple("overhead-press", "Overhead Press", "shoulders"),
            Triple("barbell-row", "Barbell Row", "back"),
            Triple("pull-up", "Pull-up", "back"),
            Triple("bicep-curl", "Bicep Curl", "arms"),
            Triple("tricep-extension", "Tricep Extension", "arms"),
            Triple("plank", "Plank", "core"),
        )
        defaults.forEach { (id, name, group) ->
            dao.saveExercise(GymExerciseEntity(id = id, name = name, muscleGroup = group, isCustom = false, createdAt = now))
        }
    }

    suspend fun createExercise(name: String, muscleGroups: String) {
        val trimmed = name.trim()
        if (trimmed.isBlank()) return
        val groups = muscleGroups.split(',').map { it.trim() }.filter { it.isNotBlank() }.distinct().joinToString(",")
        dao.saveExercise(
            GymExerciseEntity(
                id = UUID.randomUUID().toString(),
                name = trimmed,
                muscleGroup = groups.ifBlank { "other" },
                isCustom = true,
                createdAt = Instant.now().toString(),
            ),
        )
    }

    suspend fun deleteExercise(id: String): Boolean {
        if (dao.exerciseUsageCount(id) > 0) return false
        dao.deleteExercise(id)
        dao.deletePersonalRecordsForExercise(id)
        return true
    }

    suspend fun createWorkout(): GymWorkoutEntity {
        val workout = GymWorkoutEntity(id = UUID.randomUUID().toString(), startedAt = Instant.now().toString())
        dao.saveWorkout(workout)
        return workout
    }

    suspend fun deleteWorkout(id: String) {
        val exs = dao.workoutExercises(id)
        exs.forEach { dao.deleteSets(it.id) }
        dao.deleteWorkoutExercises(id)
        dao.deleteWorkout(id)
        rebuildPersonalRecords()
    }

    suspend fun addExercise(workoutId: String, exerciseId: String) {
        val existing = dao.workoutExercises(workoutId)
        val exId = UUID.randomUUID().toString()
        dao.saveWorkoutExercise(GymWorkoutExerciseEntity(id = exId, workoutId = workoutId, exerciseId = exerciseId, sortOrder = existing.size))
        dao.saveSet(GymSetEntity(id = UUID.randomUUID().toString(), workoutExerciseId = exId, setNumber = 1, reps = 0, weight = 0.0, completed = false))
    }

    suspend fun removeExercise(workoutExerciseId: String) {
        dao.deleteSets(workoutExerciseId)
        dao.deleteWorkoutExercise(workoutExerciseId)
        rebuildPersonalRecords()
    }

    suspend fun addSet(workoutExerciseId: String) {
        val sets = dao.sets(workoutExerciseId)
        dao.saveSet(GymSetEntity(id = UUID.randomUUID().toString(), workoutExerciseId = workoutExerciseId, setNumber = sets.size + 1, reps = 0, weight = 0.0, completed = false))
    }

    suspend fun updateSet(set: GymSetEntity, reps: Int?, weight: Double?, completed: Boolean?) {
        val nextCompleted = completed ?: set.completed
        dao.saveSet(
            set.copy(
                reps = reps?.coerceAtLeast(0) ?: set.reps,
                weight = weight?.coerceAtLeast(0.0) ?: set.weight,
                completed = nextCompleted,
                completedAt = if (nextCompleted) set.completedAt ?: Instant.now().toString() else null,
            ),
        )
        rebuildPersonalRecords()
    }

    suspend fun removeSet(set: GymSetEntity) {
        dao.deleteSet(set.id)
        val remaining = dao.sets(set.workoutExerciseId).sortedBy { it.setNumber }
        remaining.forEachIndexed { i, s -> if (s.setNumber != i + 1) dao.saveSet(s.copy(setNumber = i + 1)) }
        rebuildPersonalRecords()
    }

    suspend fun finishWorkout(id: String) {
        dao.workout(id)?.let { if (it.endedAt == null) dao.saveWorkout(it.copy(endedAt = Instant.now().toString())) }
    }

    suspend fun workoutAggregate(workoutId: String): WorkoutAggregate? {
        val workout = dao.workout(workoutId) ?: return null
        val exs = dao.workoutExercises(workoutId).map { ex -> WorkoutExerciseWithSets(ex, dao.sets(ex.id)) }
        return WorkoutAggregate(workout, exs)
    }

    suspend fun allAggregates(): List<WorkoutAggregate> {
        val workouts = dao.workouts()
        val exs = dao.allWorkoutExercises().groupBy { it.workoutId }
        val sets = dao.allSets().groupBy { it.workoutExerciseId }
        return workouts.map { w ->
            WorkoutAggregate(w, (exs[w.id] ?: emptyList()).map { ex -> WorkoutExerciseWithSets(ex, sets[ex.id] ?: emptyList()) })
        }
    }

    suspend fun rebuildPersonalRecords() {
        val records = derivePersonalRecords(allAggregates())
        dao.clearPersonalRecords()
        records.forEach { dao.savePersonalRecord(it) }
    }
}
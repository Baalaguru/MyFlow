import { describe, expect, it } from 'vitest'
import volumeFixture from '../../../../contracts/fixtures/workout.volume.json'
import { derivePersonalRecords, progressiveOverloadDelta, setVolume, workoutVolume } from './gym'
import type { WorkoutRecord } from './db'

interface VolumeCase {
  rule: string
  case: string
  input: { sets: Array<{ reps: number; weight: number; completed: boolean }> }
  expected: number
}

const volumeCases = volumeFixture as unknown as VolumeCase[]

function workout(id: string, startedAt: string, exerciseId: string, sets: Array<{ reps: number; weight: number; completed: boolean }>): WorkoutRecord {
  return {
    id,
    startedAt,
    exercises: [
      {
        id: `${id}-ex`,
        workoutId: id,
        exerciseId,
        order: 0,
        sets: sets.map((s, i) => ({ id: `${id}-s${i + 1}`, workoutExerciseId: `${id}-ex`, setNumber: i + 1, ...s })),
      },
    ],
  }
}

describe('gym rules', () => {
  it('matches workout volume fixture', () => {
    for (const item of volumeCases) {
      const total = item.input.sets.reduce((sum, s) => sum + setVolume(s), 0)
      expect(total, item.case).toBe(item.expected)
      expect(
        workoutVolume({
          exercises: [
            {
              id: 'e',
              workoutId: 'w',
              exerciseId: 'x',
              order: 0,
              sets: item.input.sets.map((s, i) => ({ id: String(i), workoutExerciseId: 'e', setNumber: i + 1, ...s })),
            },
          ],
        }),
        item.case,
      ).toBe(item.expected)
    }
  })

  it('keeps PR earliest on tie and uses completed sets only', () => {
    const prs = derivePersonalRecords([
      workout('w1', '2026-01-01T10:00:00.000Z', 'bench', [{ reps: 5, weight: 100, completed: true }]),
      workout('w2', '2026-01-02T10:00:00.000Z', 'bench', [{ reps: 5, weight: 100, completed: true }, { reps: 1, weight: 120, completed: false }]),
    ])
    const maxWeight = prs.find((p) => p.exerciseId === 'bench' && p.metric === 'maxWeight')
    expect(maxWeight?.value).toBe(100)
    expect(maxWeight?.achievedAt).toBe('2026-01-01T10:00:00.000Z')
  })

  it('computes progressive overload against immediately preceding completed occurrence', () => {
    const delta = progressiveOverloadDelta(
      [
        workout('w1', '2026-01-01T10:00:00.000Z', 'squat', [{ reps: 5, weight: 100, completed: true }]),
        workout('w2', '2026-01-08T10:00:00.000Z', 'squat', [{ reps: 5, weight: 105, completed: true }]),
      ],
      'squat',
    )
    expect(delta).toEqual({ volumeDelta: 25, weightDelta: 5 })
    expect(progressiveOverloadDelta([workout('w1', '2026-01-01T10:00:00.000Z', 'squat', [{ reps: 5, weight: 100, completed: true }])], 'squat')).toBeNull()
  })
})
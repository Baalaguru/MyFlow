import { describe, expect, it } from 'vitest'
import type { MealType } from './db'
import {
  addNutrition,
  aggregateNutritionSeries,
  dailyNutrition,
  emptyNutrition,
  entryNutrition,
  foodNutrition,
  foodSummary,
  goalProgress,
  mealTypeDistribution,
  mealTypes,
  nutritionSeries,
  planNutrition,
  plannedVsConsumed,
  recipeNutritionPerServing,
  roundDisplay,
  type FoodNutritionSource,
  type MealReference,
  type NutritionValues,
  type RecipeNutritionSource,
} from './food'

function food(id: string, values: NutritionValues): FoodNutritionSource {
  return { id, ...values }
}

function recipe(id: string, servings: number, ingredients: ReadonlyArray<{ foodId: string; quantity: number }>): RecipeNutritionSource {
  return { id, servings, ingredients }
}

function entry(id: string, localDate: string, mealType: MealType, quantity: number, ref: { foodId?: string; recipeId?: string }): MealReference {
  return { id, localDate, mealType, quantity, ...ref } as MealReference
}

const oats = food('oats', { calories: 380, protein: 13, carbs: 67, fat: 6 })
const yogurt = food('yogurt', { calories: 100, protein: 10, carbs: 8, fat: 0 })
const bowl = recipe('bowl', 2, [{ foodId: 'oats', quantity: 1 }, { foodId: 'yogurt', quantity: 2 }])

describe('food and nutrition rules', () => {
  it('exposes the four meal categories and a fresh empty nutrition object', () => {
    expect(mealTypes).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
    const first = emptyNutrition()
    first.calories = 10
    expect(emptyNutrition()).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('adds unrounded values and rounds only for display', () => {
    const total = addNutrition(
      { calories: 100.25, protein: 4.55, carbs: 10, fat: 1 },
      { calories: 50.25, protein: 0, carbs: 5.55, fat: 2 },
    )
    expect(total).toEqual({ calories: 150.5, protein: 4.55, carbs: 15.55, fat: 3 })
    expect(roundDisplay(4.55)).toBe(4.6)
    expect(roundDisplay(0)).toBe(0)
    expect(roundDisplay(Number.NaN)).toBe(0)
  })

  it('scales food nutrition by servings and treats missing or zero quantity as zero', () => {
    expect(foodNutrition(oats, 1.5)).toEqual({ calories: 570, protein: 19.5, carbs: 100.5, fat: 9 })
    expect(foodNutrition(oats, 0)).toEqual(emptyNutrition())
    expect(foodNutrition(undefined, 2)).toEqual(emptyNutrition())
    expect(foodNutrition(oats, Number.NaN)).toEqual(emptyNutrition())
  })

  it('divides recipe ingredients by servings and handles invalid or missing data', () => {
    expect(recipeNutritionPerServing(bowl, [oats, yogurt])).toEqual({
      calories: 290, protein: 16.5, carbs: 41.5, fat: 3,
    })
    expect(recipeNutritionPerServing(recipe('zero', 0, bowl.ingredients), [oats, yogurt])).toEqual(emptyNutrition())
    expect(recipeNutritionPerServing(recipe('none', 2, []), [oats, yogurt])).toEqual(emptyNutrition())
    expect(recipeNutritionPerServing(recipe('unknown', 2, [{ foodId: 'missing', quantity: 1 }]), [oats])).toEqual(emptyNutrition())
    expect(recipeNutritionPerServing(bowl, [oats])).toEqual({
      calories: 190, protein: 6.5, carbs: 33.5, fat: 3,
    })
  })

  it('derives entry and plan nutrition from food or recipe references', () => {
    const logged = entry('e1', '2026-11-24', 'snack', 1.5, { recipeId: 'bowl' })
    expect(entryNutrition(logged, [oats, yogurt], [bowl])).toEqual({
      calories: 435, protein: 24.75, carbs: 62.25, fat: 4.5,
    })
    expect(planNutrition(logged, [oats, yogurt], [bowl])).toEqual(entryNutrition(logged, [oats, yogurt], [bowl]))
    expect(entryNutrition(entry('e2', '2026-11-24', 'snack', 1, {}), [oats], [bowl])).toEqual(emptyNutrition())
  })

  it('sums only entries on the requested local date', () => {
    const entries = [
      entry('e1', '2026-11-24', 'breakfast', 1, { foodId: 'oats' }),
      entry('e2', '2026-11-24', 'snack', 1, { recipeId: 'bowl' }),
      entry('e3', '2026-11-23', 'dinner', 5, { foodId: 'oats' }),
    ]
    expect(dailyNutrition(entries, '2026-11-24', [oats, yogurt], [bowl])).toEqual({
      calories: 670, protein: 29.5, carbs: 108.5, fat: 9,
    })
    expect(dailyNutrition(entries, '2026-11-22', [oats, yogurt], [bowl])).toEqual(emptyNutrition())
  })

  it('reports calories per meal type with every key present', () => {
    const entries = [
      entry('e1', '2026-11-24', 'breakfast', 1, { foodId: 'oats' }),
      entry('e2', '2026-11-24', 'snack', 1, { recipeId: 'bowl' }),
    ]
    expect(mealTypeDistribution(entries, [oats, yogurt], [bowl])).toEqual({
      breakfast: 380, lunch: 0, dinner: 0, snack: 290,
    })
    expect(mealTypeDistribution([], [oats], [])).toEqual({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 })
  })

  it('includes empty days as explicit zeros in a daily series', () => {
    const now = new Date(2026, 10, 24, 13, 30)
    const points = nutritionSeries(
      [entry('e1', '2026-11-24', 'breakfast', 1, { foodId: 'oats' })],
      [oats, yogurt],
      [bowl],
      3,
      now,
    )
    expect(points.map((point) => point.localDate)).toEqual(['2026-11-22', '2026-11-23', '2026-11-24'])
    expect(points[0]).toEqual({ label: '22', localDate: '2026-11-22', ...emptyNutrition() })
    expect(points.at(-1)).toMatchObject({ calories: 380, protein: 13, carbs: 67, fat: 6 })
    expect(nutritionSeries([], [oats], [], 0, now)).toEqual([])
  })

  it('aggregates daily points into local week and month buckets', () => {
    const now = new Date(2026, 10, 24, 13, 30)
    const points = nutritionSeries(
      [entry('e1', '2026-11-24', 'breakfast', 1, { foodId: 'oats' })],
      [oats],
      [],
      7,
      now,
    )
    const weeks = aggregateNutritionSeries(points, 'week')
    const months = aggregateNutritionSeries(points, 'month')
    expect(weeks.at(-1)).toMatchObject({ localDate: '2026-11-23', calories: 380 })
    expect(months.at(-1)).toMatchObject({ localDate: '2026-11', calories: 380 })
  })

  it('reports unclamped goal progress and unavailable states', () => {
    const goal: NutritionValues = { calories: 1000, protein: 120, carbs: 150, fat: 40 }
    const consumed: NutritionValues = { calories: 1270, protein: 109.5, carbs: 108.5, fat: 25 }
    expect(goalProgress(consumed, goal)).toEqual({ available: true, ratio: 1.27, percent: 127, overGoal: true })
    expect(goalProgress(emptyNutrition(), goal)).toEqual({ available: true, ratio: 0, percent: 0, overGoal: false })
    expect(goalProgress(consumed, null)).toEqual({ available: false, ratio: null, percent: null, overGoal: false })
    expect(goalProgress(consumed, { ...goal, fat: 0 })).toEqual({ available: false, ratio: null, percent: null, overGoal: false })
  })

  it('keeps planned and consumed nutrition independent for one local date', () => {
    const entries = [entry('e1', '2026-11-24', 'breakfast', 1, { foodId: 'oats' })]
    const plans = [
      entry('p1', '2026-11-24', 'breakfast', 2, { foodId: 'oats' }),
      entry('p2', '2026-11-25', 'dinner', 5, { foodId: 'oats' }),
    ]
    expect(plannedVsConsumed(plans, entries, '2026-11-24', [oats], [])).toEqual({
      planned: { calories: 760, protein: 26, carbs: 134, fat: 12 },
      consumed: { calories: 380, protein: 13, carbs: 67, fat: 6 },
    })
  })

  it('summarises a local date with entry count and goal progress', () => {
    const entries = [
      entry('e1', '2026-11-24', 'breakfast', 1, { foodId: 'oats' }),
      entry('e2', '2026-11-23', 'dinner', 1, { foodId: 'oats' }),
    ]
    const plans = [entry('p1', '2026-11-24', 'lunch', 1, { foodId: 'yogurt' })]
    const goal = { calories: 400, protein: 20, carbs: 80, fat: 10 }
    expect(foodSummary(entries, plans, goal, [oats, yogurt], [], '2026-11-24')).toEqual({
      entryCount: 1,
      consumed: { calories: 380, protein: 13, carbs: 67, fat: 6 },
      planned: { calories: 100, protein: 10, carbs: 8, fat: 0 },
      progress: { available: true, ratio: 0.95, percent: 95, overGoal: false },
    })
  })
})

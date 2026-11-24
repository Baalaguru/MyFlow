import { describe, expect, it } from 'vitest'
import fixture from '../../../../contracts/fixtures/food.nutrition.json'
import {
  dailyNutrition,
  entryNutrition,
  goalProgress,
  mealTypeDistribution,
  plannedVsConsumed,
  recipeNutritionPerServing,
  type FoodNutritionSource,
  type MealReference,
  type NutritionValues,
  type RecipeNutritionSource,
} from './food'

interface NutritionCase {
  rule: string
  case: string
  input: {
    foods?: FoodNutritionSource[]
    recipes?: RecipeNutritionSource[]
    entries?: MealReference[]
    plans?: MealReference[]
    consumed?: NutritionValues
    goal?: NutritionValues | null
  }
  expected: Record<string, unknown>
}

const cases = fixture.cases as unknown as NutritionCase[]

function requireFoods(item: NutritionCase): FoodNutritionSource[] {
  return item.input.foods ?? []
}

function requireRecipes(item: NutritionCase): RecipeNutritionSource[] {
  return item.input.recipes ?? []
}

function requireEntries(item: NutritionCase): MealReference[] {
  return item.input.entries ?? []
}

describe('shared food nutrition fixtures', () => {
  it('contains all seven contract cases', () => {
    expect(cases).toHaveLength(7)
  })

  for (const item of cases) {
    it(`${item.rule}: ${item.case}`, () => {
      const foods = requireFoods(item)
      const recipes = requireRecipes(item)
      const entries = requireEntries(item)
      switch (item.rule) {
        case 'food.entry.nutrition':
          expect(entryNutrition(entries[0], foods, recipes), item.case).toMatchObject(item.expected)
          break
        case 'recipe.perServing': {
          const expected = item.expected as {
            perServing: NutritionValues
            entry: NutritionValues
          }
          const recipe = recipes[0]
          expect(recipeNutritionPerServing(recipe, foods), item.case).toMatchObject(expected.perServing)
          expect(entryNutrition(entries[0], foods, recipes), item.case).toMatchObject(expected.entry)
          break
        }
        case 'daily.nutrition':
          expect(dailyNutrition(entries, '2026-11-24', foods, recipes), item.case).toMatchObject(item.expected)
          break
        case 'goal.progress':
        case 'goal.progress.unavailable':
          expect(goalProgress(item.input.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }, item.input.goal), item.case)
            .toMatchObject(item.expected)
          break
        case 'meal.distribution':
          expect(mealTypeDistribution(entries, foods, recipes), item.case).toMatchObject(item.expected)
          break
        case 'planned.vs.consumed': {
          const result = plannedVsConsumed(item.input.plans ?? [], entries, '2026-11-24', foods, recipes)
          expect(result, item.case).toMatchObject(item.expected)
          break
        }
        default:
          throw new Error(`unknown food fixture rule: ${item.rule}`)
      }
    })
  }
})

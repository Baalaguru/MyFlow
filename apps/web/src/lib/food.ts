import type { MealType } from './db'

/** Calories are kcal; protein/carbs/fat are grams. Values are always unrounded. */
export interface NutritionValues {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Minimal shapes keep fixtures and canonical DB records interchangeable in pure rules. */
export interface FoodNutritionSource {
  id: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface RecipeNutritionSource {
  id: string
  servings: number
  ingredients: ReadonlyArray<{ foodId: string; quantity: number }>
}

export interface MealReference {
  localDate: string
  mealType: MealType
  quantity: number
  foodId?: string | null
  recipeId?: string | null
}

export interface NutritionPoint extends NutritionValues {
  label: string
  localDate: string
}

export interface GoalProgress {
  available: boolean
  ratio: number | null
  percent: number | null
  overGoal: boolean
}

export interface FoodSummary {
  entryCount: number
  consumed: NutritionValues
  planned: NutritionValues
  progress: GoalProgress
}

export const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function safe(value: number | null | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0
}

export function emptyNutrition(): NutritionValues {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 }
}

export function addNutrition(a: NutritionValues, b: NutritionValues): NutritionValues {
  return {
    calories: safe(a?.calories) + safe(b?.calories),
    protein: safe(a?.protein) + safe(b?.protein),
    carbs: safe(a?.carbs) + safe(b?.carbs),
    fat: safe(a?.fat) + safe(b?.fat),
  }
}

/** Rounding is for display only; rules keep full-precision doubles. */
export function roundDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function foodNutrition(food: FoodNutritionSource | undefined, quantity: number): NutritionValues {
  if (!food) return emptyNutrition()
  const servings = safe(quantity)
  return {
    calories: safe(food.calories) * servings,
    protein: safe(food.protein) * servings,
    carbs: safe(food.carbs) * servings,
    fat: safe(food.fat) * servings,
  }
}

export function recipeNutritionPerServing(
  recipe: RecipeNutritionSource | undefined,
  foods: readonly FoodNutritionSource[],
): NutritionValues {
  if (!recipe || !Number.isFinite(recipe.servings) || recipe.servings <= 0) return emptyNutrition()
  const ingredients = recipe.ingredients
  if (!Array.isArray(ingredients) || ingredients.length === 0) return emptyNutrition()
  const byId = new Map(foods.map((food) => [food.id, food]))
  const total = ingredients.reduce((sum, ingredient) => {
    const food = byId.get(ingredient.foodId)
    return food ? addNutrition(sum, foodNutrition(food, ingredient.quantity)) : sum
  }, emptyNutrition())
  return {
    calories: total.calories / recipe.servings,
    protein: total.protein / recipe.servings,
    carbs: total.carbs / recipe.servings,
    fat: total.fat / recipe.servings,
  }
}

function referenceNutrition(
  reference: MealReference,
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
): NutritionValues {
  const quantity = safe(reference.quantity)
  if (reference.foodId) {
    const food = foods.find((item) => item.id === reference.foodId)
    return food ? foodNutrition(food, quantity) : emptyNutrition()
  }
  if (reference.recipeId) {
    const recipe = recipes.find((item) => item.id === reference.recipeId)
    if (!recipe) return emptyNutrition()
    const perServing = recipeNutritionPerServing(recipe, foods)
    return {
      calories: perServing.calories * quantity,
      protein: perServing.protein * quantity,
      carbs: perServing.carbs * quantity,
      fat: perServing.fat * quantity,
    }
  }
  return emptyNutrition()
}

export function entryNutrition(
  entry: MealReference,
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
): NutritionValues {
  return referenceNutrition(entry, foods, recipes)
}

export function planNutrition(
  plan: MealReference,
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
): NutritionValues {
  return referenceNutrition(plan, foods, recipes)
}

export function dailyNutrition(
  entries: readonly MealReference[],
  localDate: string,
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
): NutritionValues {
  return entries
    .filter((entry) => entry.localDate === localDate)
    .reduce((sum, entry) => addNutrition(sum, entryNutrition(entry, foods, recipes)), emptyNutrition())
}

export function mealTypeDistribution(
  entries: readonly MealReference[],
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
): Record<MealType, number> {
  const result: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  for (const entry of entries) {
    result[entry.mealType] = (result[entry.mealType] ?? 0) + entryNutrition(entry, foods, recipes).calories
  }
  return result
}

/** `days` completed local days ending today; missing days stay explicit zero points. */
export function nutritionSeries(
  entries: readonly MealReference[],
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
  days: number,
  now = new Date(),
): NutritionPoint[] {
  const count = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1 + index)
    const localDate = localDateKey(day)
    return {
      label: String(day.getDate()),
      localDate,
      ...dailyNutrition(entries, localDate, foods, recipes),
    }
  })
}

/** Groups completed daily points into local-calendar weeks or months for charts. */
export function aggregateNutritionSeries(points: readonly NutritionPoint[], mode: 'week' | 'month'): NutritionPoint[] {
  const buckets = new Map<string, NutritionPoint>()
  for (const point of points) {
    const date = new Date(`${point.localDate}T00:00:00`)
    if (Number.isNaN(date.getTime())) continue
    const key = mode === 'month'
      ? point.localDate.slice(0, 7)
      : localDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)))
    const label = mode === 'month' ? key : key.slice(5)
    const bucket = buckets.get(key) ?? { label, localDate: key, ...emptyNutrition() }
    buckets.set(key, { ...bucket, ...addNutrition(bucket, point) })
  }
  return [...buckets.values()].sort((a, b) => a.localDate.localeCompare(b.localDate))
}

/** Calories are the primary progress denominator; all targets must be positive. */
export function goalProgress(consumed: NutritionValues, goal: NutritionValues | null | undefined): GoalProgress {
  const unavailable: GoalProgress = { available: false, ratio: null, percent: null, overGoal: false }
  if (!goal) return unavailable
  const targets = [goal.calories, goal.protein, goal.carbs, goal.fat]
  if (targets.some((target) => !Number.isFinite(target) || target <= 0)) return unavailable
  const ratio = safe(consumed?.calories) / goal.calories
  return {
    available: true,
    ratio,
    percent: (safe(consumed?.calories) * 100) / goal.calories,
    overGoal: ratio > 1,
  }
}

/** Plans and entries are derived independently; a plan is never inferred from an entry. */
export function plannedVsConsumed(
  plans: readonly MealReference[],
  entries: readonly MealReference[],
  localDate: string,
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
): { planned: NutritionValues; consumed: NutritionValues } {
  return {
    planned: plans
      .filter((plan) => plan.localDate === localDate)
      .reduce((sum, plan) => addNutrition(sum, planNutrition(plan, foods, recipes)), emptyNutrition()),
    consumed: dailyNutrition(entries, localDate, foods, recipes),
  }
}

export function foodSummary(
  entries: readonly MealReference[],
  plans: readonly MealReference[],
  goal: NutritionValues | null | undefined,
  foods: readonly FoodNutritionSource[],
  recipes: readonly RecipeNutritionSource[],
  localDate: string,
): FoodSummary {
  const consumed = dailyNutrition(entries, localDate, foods, recipes)
  return {
    entryCount: entries.filter((entry) => entry.localDate === localDate).length,
    consumed,
    planned: plannedVsConsumed(plans, entries, localDate, foods, recipes).planned,
    progress: goalProgress(consumed, goal),
  }
}

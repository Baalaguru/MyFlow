import {
  db,
  type FoodRecord,
  type FoodSource,
  type MealEntryRecord,
  type MealPlanRecord,
  type MealType,
  type NutritionGoalRecord,
  type RecipeIngredientRecord,
  type RecipeRecord,
  type RecipeStepRecord,
} from '../db'
import { localDateKey, mealTypes } from '../food'

function newId(): string {
  return crypto.randomUUID()
}

function text(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function optionalText(value: string | null | undefined): string | undefined {
  return text(value) || undefined
}

function nonNegative(value: number | null | undefined, fallback = 0): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : fallback
}

function positive(value: number | null | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : 1
}

function servings(value: number | null | undefined): number {
  const raw = Number.isFinite(value) ? (value as number) : 1
  return Math.max(1, Math.round(raw))
}

function minutes(value: number | null | undefined): number {
  return Math.round(nonNegative(value))
}

function validDate(value: string | null | undefined): string {
  const raw = text(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDateKey(new Date())
}

function validMealType(value: MealType | null | undefined): MealType {
  return value && mealTypes.includes(value) ? value : 'snack'
}

function validTimestamp(value: string | null | undefined): string {
  if (!value) return new Date().toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function validSource(value: FoodSource | null | undefined): FoodSource {
  return value === 'import' ? 'import' : 'manual'
}

export interface FoodInput {
  name: string
  servingSize: string
  servingGrams?: number
  calories: number
  protein: number
  carbs: number
  fat: number
  source: FoodSource
  sourceRef?: string
  imageRef?: string
  notes?: string
}

function normaliseFood(row: FoodInput & Partial<Pick<FoodRecord, 'id' | 'createdAt' | 'updatedAt'>>): FoodRecord {
  const now = new Date().toISOString()
  return {
    id: row.id || newId(),
    name: text(row.name),
    servingSize: text(row.servingSize),
    servingGrams: row.servingGrams === undefined ? undefined : nonNegative(row.servingGrams),
    calories: nonNegative(row.calories),
    protein: nonNegative(row.protein),
    carbs: nonNegative(row.carbs),
    fat: nonNegative(row.fat),
    source: validSource(row.source),
    sourceRef: optionalText(row.sourceRef),
    imageRef: optionalText(row.imageRef),
    notes: optionalText(row.notes),
    createdAt: validTimestamp(row.createdAt),
    updatedAt: validTimestamp(row.updatedAt ?? now),
  }
}

export async function listFoods(): Promise<FoodRecord[]> {
  const rows = await db.foods.toArray()
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createFood(input: FoodInput): Promise<FoodRecord> {
  const name = text(input.name)
  if (!name) throw new Error('empty food name')
  const record = normaliseFood({ ...input, name })
  await db.foods.add(record)
  return record
}

export async function updateFood(id: string, patch: Partial<FoodInput>): Promise<void> {
  const existing = await db.foods.get(id)
  if (!existing) return
  await db.foods.put(normaliseFood({ ...existing, ...patch, id, updatedAt: new Date().toISOString() }))
}

export async function isFoodInUse(id: string): Promise<boolean> {
  const [entries, plans, recipes] = await Promise.all([
    db.mealEntries.toArray(),
    db.mealPlans.toArray(),
    db.recipes.toArray(),
  ])
  return entries.some((entry) => entry.foodId === id)
    || plans.some((plan) => plan.foodId === id)
    || recipes.some((recipe) => (recipe.ingredients ?? []).some((ingredient) => ingredient.foodId === id))
}

/** Returns false for in-use records; callers map that to the canonical 'in-use' error. */
export async function deleteFood(id: string): Promise<boolean> {
  if (await isFoodInUse(id)) return false
  await db.foods.delete(id)
  return true
}

export interface MealEntryInput {
  localDate: string
  mealType: MealType
  foodId?: string
  recipeId?: string
  quantity: number
  notes?: string
  imageRef?: string
  loggedAt?: string
}

function normaliseEntry(row: MealEntryInput & Partial<Pick<MealEntryRecord, 'id'>>): MealEntryRecord {
  const foodId = optionalText(row.foodId)
  const recipeId = foodId ? undefined : optionalText(row.recipeId)
  return {
    id: row.id || newId(),
    localDate: validDate(row.localDate),
    mealType: validMealType(row.mealType),
    foodId,
    recipeId,
    quantity: positive(row.quantity),
    notes: optionalText(row.notes),
    imageRef: optionalText(row.imageRef),
    loggedAt: validTimestamp(row.loggedAt),
  }
}

function requireReference(row: MealEntryInput | MealPlanInput): void {
  if (!optionalText(row.foodId) && !optionalText(row.recipeId)) throw new Error('missing food or recipe reference')
}

export async function listMealEntries(): Promise<MealEntryRecord[]> {
  const rows = await db.mealEntries.toArray()
  return rows.sort((a, b) => b.localDate.localeCompare(a.localDate) || a.loggedAt.localeCompare(b.loggedAt))
}

export async function listMealEntriesByDate(localDate: string): Promise<MealEntryRecord[]> {
  const rows = await db.mealEntries.where('localDate').equals(localDate).toArray()
  return rows.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
}

export async function createMealEntry(input: MealEntryInput): Promise<MealEntryRecord> {
  requireReference(input)
  const record = normaliseEntry(input)
  await db.mealEntries.add(record)
  return record
}

export async function updateMealEntry(id: string, patch: Partial<MealEntryInput>): Promise<void> {
  const existing = await db.mealEntries.get(id)
  if (!existing) return
  requireReference({ ...existing, ...patch })
  await db.mealEntries.put(normaliseEntry({ ...existing, ...patch, id }))
}

export async function deleteMealEntry(id: string): Promise<void> {
  await db.mealEntries.delete(id)
}

export interface MealPlanInput {
  localDate: string
  mealType: MealType
  foodId?: string
  recipeId?: string
  quantity: number
  notes?: string
}

function normalisePlan(row: MealPlanInput & Partial<Pick<MealPlanRecord, 'id' | 'plannedAt'>>): MealPlanRecord {
  const foodId = optionalText(row.foodId)
  return {
    id: row.id || newId(),
    localDate: validDate(row.localDate),
    mealType: validMealType(row.mealType),
    foodId,
    recipeId: foodId ? undefined : optionalText(row.recipeId),
    quantity: positive(row.quantity),
    notes: optionalText(row.notes),
    plannedAt: validTimestamp(row.plannedAt),
  }
}

export async function listMealPlans(): Promise<MealPlanRecord[]> {
  const rows = await db.mealPlans.toArray()
  return rows.sort((a, b) => b.localDate.localeCompare(a.localDate) || a.plannedAt.localeCompare(b.plannedAt))
}

export async function listMealPlansByDate(localDate: string): Promise<MealPlanRecord[]> {
  const rows = await db.mealPlans.where('localDate').equals(localDate).toArray()
  return rows.sort((a, b) => a.plannedAt.localeCompare(b.plannedAt))
}

export async function createMealPlan(input: MealPlanInput): Promise<MealPlanRecord> {
  requireReference(input)
  const record = normalisePlan(input)
  await db.mealPlans.add(record)
  return record
}

export async function updateMealPlan(id: string, patch: Partial<MealPlanInput>): Promise<void> {
  const existing = await db.mealPlans.get(id)
  if (!existing) return
  requireReference({ ...existing, ...patch })
  await db.mealPlans.put(normalisePlan({ ...existing, ...patch, id }))
}

export async function deleteMealPlan(id: string): Promise<void> {
  await db.mealPlans.delete(id)
}

export interface RecipeIngredientInput {
  id?: string
  foodId: string
  quantity: number
}

export interface RecipeStepInput {
  id?: string
  order?: number
  text: string
}

export interface RecipeInput {
  name: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  favorite: boolean
  notes?: string
  imageRef?: string
  ingredients: RecipeIngredientInput[]
  steps: RecipeStepInput[]
}

function normaliseRecipe(row: RecipeInput & Partial<Pick<RecipeRecord, 'id' | 'createdAt' | 'updatedAt'>>): RecipeRecord {
  const id = row.id || newId()
  const now = new Date().toISOString()
  const used = new Set<string>()
  const nextId = (value: string | undefined): string => {
    let candidate = optionalText(value) || newId()
    while (used.has(candidate)) candidate = newId()
    used.add(candidate)
    return candidate
  }
  const ingredients: RecipeIngredientRecord[] = (row.ingredients ?? [])
    .filter((ingredient) => !!optionalText(ingredient.foodId))
    .map((ingredient) => ({
      id: nextId(ingredient.id),
      recipeId: id,
      foodId: text(ingredient.foodId),
      quantity: positive(ingredient.quantity),
    }))
  const steps: RecipeStepRecord[] = (row.steps ?? [])
    .map((step) => ({ ...step, text: text(step.text) }))
    .filter((step) => !!step.text)
    .map((step, index) => ({
      id: nextId(step.id),
      recipeId: id,
      order: Number.isFinite(step.order) && (step.order as number) > 0 ? Math.round(step.order as number) : index + 1,
      text: step.text,
    }))
    .sort((a, b) => a.order - b.order)
    .map((step, index) => ({ ...step, order: index + 1 }))
  return {
    id,
    name: text(row.name),
    servings: servings(row.servings),
    prepMinutes: minutes(row.prepMinutes),
    cookMinutes: minutes(row.cookMinutes),
    favorite: row.favorite === true,
    notes: optionalText(row.notes),
    imageRef: optionalText(row.imageRef),
    ingredients,
    steps,
    createdAt: validTimestamp(row.createdAt),
    updatedAt: validTimestamp(row.updatedAt ?? now),
  }
}

export async function listRecipes(): Promise<RecipeRecord[]> {
  const rows = await db.recipes.toArray()
  return rows.map((row) => normaliseRecipe(row)).sort((a, b) => a.name.localeCompare(b.name))
}

export async function createRecipe(input: RecipeInput): Promise<RecipeRecord> {
  const name = text(input.name)
  if (!name) throw new Error('empty recipe name')
  const record = normaliseRecipe({ ...input, name })
  await db.recipes.add(record)
  return record
}

export async function updateRecipe(id: string, patch: Partial<RecipeInput>): Promise<void> {
  const existing = await db.recipes.get(id)
  if (!existing) return
  await db.recipes.put(normaliseRecipe({ ...existing, ...patch, id, updatedAt: new Date().toISOString() }))
}

export async function isRecipeInUse(id: string): Promise<boolean> {
  const [entries, plans] = await Promise.all([db.mealEntries.toArray(), db.mealPlans.toArray()])
  return entries.some((entry) => entry.recipeId === id) || plans.some((plan) => plan.recipeId === id)
}

/** Returns false for in-use records; callers map that to the canonical 'in-use' error. */
export async function deleteRecipe(id: string): Promise<boolean> {
  if (await isRecipeInUse(id)) return false
  await db.recipes.delete(id)
  return true
}

export function nutritionGoalId(localDate: string): string {
  return `goal:${validDate(localDate)}`
}

export async function getNutritionGoal(localDate: string): Promise<NutritionGoalRecord | undefined> {
  return db.nutritionGoals.get(nutritionGoalId(localDate))
}

export async function listNutritionGoals(): Promise<NutritionGoalRecord[]> {
  const rows = await db.nutritionGoals.toArray()
  return rows.sort((a, b) => a.localDate.localeCompare(b.localDate))
}

export async function setNutritionGoal(
  localDate: string,
  input: Pick<NutritionGoalRecord, 'calories' | 'protein' | 'carbs' | 'fat'>,
): Promise<NutritionGoalRecord> {
  const date = validDate(localDate)
  const record: NutritionGoalRecord = {
    id: nutritionGoalId(date),
    localDate: date,
    calories: nonNegative(input.calories),
    protein: nonNegative(input.protein),
    carbs: nonNegative(input.carbs),
    fat: nonNegative(input.fat),
    updatedAt: new Date().toISOString(),
  }
  await db.nutritionGoals.put(record)
  return record
}

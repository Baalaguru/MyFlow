import { useCallback, useEffect, useMemo, useState } from 'react'
import { ModuleFilterBar } from '../components/workspace/ModuleFilterBar'
import { ModuleHeader } from '../components/workspace/ModuleHeader'
import { ModuleProgress } from '../components/workspace/ModuleProgress'
import {
  BarGraph,
  Button,
  ConfirmDialog,
  DateField,
  Dialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  ResponsiveCard,
  SelectField,
  StatCard,
  TextArea,
  TextField,
  TimeField,
  Toast,
} from '../components/ui'
import { chartPalettes, type PresetId } from '../generated/tokens'
import type { TranslationKey } from '../i18n'
import type { Appearance } from '../lib/appearance'
import { resolveColorMode } from '../lib/appearance'
import type {
  FoodRecord,
  FoodSource,
  MealEntryRecord,
  MealPlanRecord,
  MealType,
  NutritionGoalRecord,
  RecipeRecord,
} from '../lib/db'
import {
  aggregateNutritionSeries,
  entryNutrition,
  foodSummary,
  localDateKey,
  mealTypeDistribution,
  mealTypes,
  nutritionSeries,
  planNutrition,
  recipeNutritionPerServing,
  roundDisplay,
  type NutritionPoint,
  type NutritionValues,
} from '../lib/food'
import {
  createFood,
  createMealEntry,
  createMealPlan,
  createRecipe,
  deleteFood,
  deleteMealEntry,
  deleteMealPlan,
  deleteRecipe,
  listFoods,
  listMealEntries,
  listMealPlans,
  listNutritionGoals,
  listRecipes,
  setNutritionGoal,
  updateFood,
  updateMealEntry,
  updateMealPlan,
  updateRecipe,
  type FoodInput,
  type MealEntryInput,
  type MealPlanInput,
  type RecipeIngredientInput,
  type RecipeInput,
  type RecipeStepInput,
} from '../lib/modules/food'
import { unavailableProgress } from '../lib/progress'

type Translate = (key: TranslationKey) => string
type Section = 'log' | 'foods' | 'recipes' | 'plan' | 'analytics'
type DeleteKind = 'entry' | 'food' | 'recipe' | 'plan'
type NutritionField = keyof NutritionValues

interface FoodWorkspaceProps {
  t: Translate
  appearance: Appearance
  revision: number
  onSaved: () => void
}

const sections: Section[] = ['log', 'foods', 'recipes', 'plan', 'analytics']

const sectionKeys: Record<Section, TranslationKey> = {
  log: 'foodSectionLog',
  foods: 'foodSectionFoods',
  recipes: 'foodSectionRecipes',
  plan: 'foodSectionPlan',
  analytics: 'foodSectionAnalytics',
}

const mealTypeKeys: Record<MealType, TranslationKey> = {
  breakfast: 'foodBreakfast',
  lunch: 'foodLunch',
  dinner: 'foodDinner',
  snack: 'foodSnack',
}

const macroKeys: Record<NutritionField, TranslationKey> = {
  calories: 'foodCalories',
  protein: 'foodProtein',
  carbs: 'foodCarbs',
  fat: 'foodFat',
}

const macroUnits: Record<NutritionField, TranslationKey> = {
  calories: 'foodUnitKcal',
  protein: 'foodUnitGram',
  carbs: 'foodUnitGram',
  fat: 'foodUnitGram',
}

const deleteCopy: Record<DeleteKind, { title: TranslationKey; body: TranslationKey; success: TranslationKey; inUse?: TranslationKey }> = {
  entry: { title: 'foodDeleteEntry', body: 'foodDeleteEntryConfirm', success: 'foodEntryDeleted' },
  food: { title: 'foodDeleteFood', body: 'dialogBody', success: 'foodFoodDeleted', inUse: 'foodFoodInUse' },
  recipe: { title: 'foodRecipeDelete', body: 'dialogBody', success: 'foodRecipeDeleted', inUse: 'foodRecipeInUse' },
  plan: { title: 'deleteAction', body: 'foodDeletePlanConfirm', success: 'foodPlanDeleted' },
}

interface EntryDraft {
  id: string
  localDate: string
  loggedTime: string
  mealType: MealType
  foodId: string
  recipeId: string
  quantity: string
  notes: string
  imageRef: string
}

interface FoodDraft {
  id: string
  name: string
  servingSize: string
  servingGrams: string
  calories: string
  protein: string
  carbs: string
  fat: string
  source: FoodSource
  sourceRef: string
  imageRef: string
  notes: string
}

interface IngredientDraft {
  id: string
  foodId: string
  quantity: string
}

interface StepDraft {
  id: string
  order: number
  text: string
}

interface RecipeDraft {
  id: string
  name: string
  servings: string
  prepMinutes: string
  cookMinutes: string
  favorite: boolean
  notes: string
  imageRef: string
  ingredients: IngredientDraft[]
  steps: StepDraft[]
}

interface PlanDraft {
  id: string
  localDate: string
  mealType: MealType
  foodId: string
  recipeId: string
  quantity: string
  notes: string
}

interface GoalDraft {
  calories: string
  protein: string
  carbs: string
  fat: string
}

function toNumber(value: string, fallback = 0): number {
  if (value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function timePart(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '09:00'
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
}

function combineDateTime(localDate: string, time: string): string {
  const parsed = new Date(`${localDate}T${time || '09:00'}:00`)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function emptyEntryDraft(localDate: string): EntryDraft {
  return {
    id: '',
    localDate,
    loggedTime: '09:00',
    mealType: 'breakfast',
    foodId: '',
    recipeId: '',
    quantity: '1',
    notes: '',
    imageRef: '',
  }
}

function entryDraft(row: MealEntryRecord): EntryDraft {
  return {
    id: row.id,
    localDate: row.localDate,
    loggedTime: timePart(row.loggedAt),
    mealType: row.mealType,
    foodId: row.foodId ?? '',
    recipeId: row.recipeId ?? '',
    quantity: String(row.quantity),
    notes: row.notes ?? '',
    imageRef: row.imageRef ?? '',
  }
}

function emptyFoodDraft(): FoodDraft {
  return {
    id: '', name: '', servingSize: '', servingGrams: '', calories: '', protein: '',
    carbs: '', fat: '', source: 'manual', sourceRef: '', imageRef: '', notes: '',
  }
}

function foodDraft(row: FoodRecord): FoodDraft {
  return {
    id: row.id,
    name: row.name,
    servingSize: row.servingSize,
    servingGrams: row.servingGrams === undefined ? '' : String(row.servingGrams),
    calories: String(row.calories),
    protein: String(row.protein),
    carbs: String(row.carbs),
    fat: String(row.fat),
    source: row.source,
    sourceRef: row.sourceRef ?? '',
    imageRef: row.imageRef ?? '',
    notes: row.notes ?? '',
  }
}

function foodPayload(draft: FoodDraft): FoodInput {
  return {
    name: draft.name,
    servingSize: draft.servingSize,
    servingGrams: draft.servingGrams === '' ? undefined : toNumber(draft.servingGrams),
    calories: toNumber(draft.calories),
    protein: toNumber(draft.protein),
    carbs: toNumber(draft.carbs),
    fat: toNumber(draft.fat),
    source: draft.source,
    sourceRef: draft.sourceRef,
    imageRef: draft.imageRef,
    notes: draft.notes,
  }
}

function emptyRecipeDraft(): RecipeDraft {
  return {
    id: '', name: '', servings: '1', prepMinutes: '0', cookMinutes: '0', favorite: false,
    notes: '', imageRef: '', ingredients: [], steps: [],
  }
}

function recipeDraft(row: RecipeRecord): RecipeDraft {
  return {
    id: row.id,
    name: row.name,
    servings: String(row.servings),
    prepMinutes: String(row.prepMinutes),
    cookMinutes: String(row.cookMinutes),
    favorite: row.favorite,
    notes: row.notes ?? '',
    imageRef: row.imageRef ?? '',
    ingredients: row.ingredients.map((ingredient) => ({
      id: ingredient.id, foodId: ingredient.foodId, quantity: String(ingredient.quantity),
    })),
    steps: row.steps.map((step) => ({ id: step.id, order: step.order, text: step.text })),
  }
}

function recipePayload(draft: RecipeDraft): RecipeInput {
  const ingredients: RecipeIngredientInput[] = draft.ingredients
    .filter((ingredient) => !!ingredient.foodId)
    .map((ingredient) => ({ id: ingredient.id, foodId: ingredient.foodId, quantity: toNumber(ingredient.quantity, 1) }))
  const steps: RecipeStepInput[] = draft.steps
    .filter((step) => !!step.text.trim())
    .map((step) => ({ id: step.id, order: step.order, text: step.text }))
  return {
    name: draft.name,
    servings: toNumber(draft.servings, 1),
    prepMinutes: toNumber(draft.prepMinutes),
    cookMinutes: toNumber(draft.cookMinutes),
    favorite: draft.favorite,
    notes: draft.notes,
    imageRef: draft.imageRef,
    ingredients,
    steps,
  }
}

function emptyPlanDraft(localDate: string): PlanDraft {
  return { id: '', localDate, mealType: 'breakfast', foodId: '', recipeId: '', quantity: '1', notes: '' }
}

function planDraft(row: MealPlanRecord): PlanDraft {
  return {
    id: row.id,
    localDate: row.localDate,
    mealType: row.mealType,
    foodId: row.foodId ?? '',
    recipeId: row.recipeId ?? '',
    quantity: String(row.quantity),
    notes: row.notes ?? '',
  }
}

function planPayload(draft: PlanDraft): MealPlanInput {
  return {
    localDate: draft.localDate,
    mealType: draft.mealType,
    foodId: draft.foodId || undefined,
    recipeId: draft.foodId ? undefined : (draft.recipeId || undefined),
    quantity: toNumber(draft.quantity, 1),
    notes: draft.notes,
  }
}

function entryPayload(draft: EntryDraft): MealEntryInput {
  return {
    localDate: draft.localDate,
    mealType: draft.mealType,
    foodId: draft.foodId || undefined,
    recipeId: draft.foodId ? undefined : (draft.recipeId || undefined),
    quantity: toNumber(draft.quantity, 1),
    notes: draft.notes,
    imageRef: draft.imageRef,
    loggedAt: combineDateTime(draft.localDate, draft.loggedTime),
  }
}

function nutritionLine(t: Translate, values: NutritionValues): string {
  return (['calories', 'protein', 'carbs', 'fat'] as NutritionField[])
    .map((field) => `${t(macroKeys[field])}: ${roundDisplay(values[field])} ${t(macroUnits[field])}`)
    .join(' · ')
}

function NutritionChart({
  title,
  description,
  points,
  field,
  palette,
}: {
  title: string
  description: string
  points: NutritionPoint[]
  field: NutritionField
  palette: string[]
}) {
  return (
    <ResponsiveCard title={title}>
      <BarGraph
        labels={points.map((point) => point.label)}
        values={points.map((point) => point[field])}
        colors={palette}
        description={description}
      />
    </ResponsiveCard>
  )
}

function GoalBar({
  label,
  consumed,
  target,
  unit,
  t,
}: {
  label: string
  consumed: number
  target: number | undefined
  unit: string
  t: Translate
}) {
  if (target === undefined || !Number.isFinite(target) || target <= 0) {
    return <p className="muted text-xs">{t('foodNoGoal')}</p>
  }
  const ratio = consumed / target
  const over = ratio > 1
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className="muted">
          {roundDisplay(consumed)} / {roundDisplay(target)} {unit} · {roundDisplay(ratio * 100)}% ·{' '}
          {t(over ? 'foodOverGoal' : 'foodGoalMet')}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-pill"
        style={{ backgroundColor: 'var(--mf-surfaceAlt)' }}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={roundDisplay(consumed)}
      >
        <div
          className="h-full rounded-pill"
          style={{
            width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
            backgroundColor: over ? 'var(--mf-danger)' : 'var(--mf-growth)',
          }}
        />
      </div>
    </div>
  )
}

export function FoodWorkspace({ t, appearance, revision, onSaved }: FoodWorkspaceProps) {
  const [foods, setFoods] = useState<FoodRecord[] | null>(null)
  const [entries, setEntries] = useState<MealEntryRecord[]>([])
  const [plans, setPlans] = useState<MealPlanRecord[]>([])
  const [recipes, setRecipes] = useState<RecipeRecord[]>([])
  const [goals, setGoals] = useState<NutritionGoalRecord[]>([])
  const [problem, setProblem] = useState(false)
  const [toast, setToast] = useState<TranslationKey | null>(null)
  const [section, setSection] = useState<Section>('log')
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()))
  const [mealFilter, setMealFilter] = useState<MealType | 'all'>('all')
  const [foodQuery, setFoodQuery] = useState('')
  const [entryDialog, setEntryDialog] = useState<EntryDraft | null>(null)
  const [foodDialog, setFoodDialog] = useState<FoodDraft | null>(null)
  const [recipeDialog, setRecipeDialog] = useState<RecipeDraft | null>(null)
  const [planDialog, setPlanDialog] = useState<PlanDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: DeleteKind; id: string } | null>(null)
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({ calories: '', protein: '', carbs: '', fat: '' })

  const load = useCallback(async () => {
    try {
      setProblem(false)
      const [localFoods, localEntries, localPlans, localRecipes, localGoals] = await Promise.all([
        listFoods(), listMealEntries(), listMealPlans(), listRecipes(), listNutritionGoals(),
      ])
      setFoods(localFoods)
      setEntries(localEntries)
      setPlans(localPlans)
      setRecipes(localRecipes)
      setGoals(localGoals)
    } catch {
      setProblem(true)
    }
  }, [])

  useEffect(() => { void load() }, [load, revision])

  const notify = (key: TranslationKey) => {
    setToast(key)
    window.setTimeout(() => setToast(null), 2400)
  }

  const run = async (action: () => Promise<unknown>, success: TranslationKey, inUse?: TranslationKey): Promise<boolean> => {
    try {
      await action()
      await load()
      onSaved()
      notify(success)
      return true
    } catch (error) {
      if (error instanceof Error && error.message === 'in-use' && inUse) {
        notify(inUse)
        return false
      }
      setProblem(true)
      return false
    }
  }

  useEffect(() => {
    const goal = goals.find((item) => item.localDate === selectedDate)
    setGoalDraft({
      calories: goal ? String(goal.calories) : '',
      protein: goal ? String(goal.protein) : '',
      carbs: goal ? String(goal.carbs) : '',
      fat: goal ? String(goal.fat) : '',
    })
  }, [goals, selectedDate])

  const allFoods = useMemo(() => foods ?? [], [foods])
  const goalRecord = useMemo(
    () => goals.find((item) => item.localDate === selectedDate) ?? null,
    [goals, selectedDate],
  )
  const goal = useMemo<NutritionValues | null>(
    () => goalRecord
      ? { calories: goalRecord.calories, protein: goalRecord.protein, carbs: goalRecord.carbs, fat: goalRecord.fat }
      : null,
    [goalRecord],
  )
  const foodById = useMemo(() => new Map(allFoods.map((item) => [item.id, item])), [allFoods])
  const recipeById = useMemo(() => new Map(recipes.map((item) => [item.id, item])), [recipes])
  const summary = useMemo(
    () => foodSummary(entries, plans, goal, allFoods, recipes, selectedDate),
    [entries, plans, goal, allFoods, recipes, selectedDate],
  )

  const visibleEntries = useMemo(
    () => entries
      .filter((entry) => entry.localDate === selectedDate && (mealFilter === 'all' || entry.mealType === mealFilter))
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [entries, selectedDate, mealFilter],
  )
  const visiblePlans = useMemo(
    () => plans
      .filter((plan) => plan.localDate === selectedDate && (mealFilter === 'all' || plan.mealType === mealFilter))
      .sort((a, b) => a.plannedAt.localeCompare(b.plannedAt)),
    [plans, selectedDate, mealFilter],
  )
  const filteredFoods = useMemo(() => {
    const query = foodQuery.trim().toLowerCase()
    return allFoods.filter((item) => !query || item.name.toLowerCase().includes(query))
  }, [allFoods, foodQuery])

  const dailyPoints = useMemo(
    () => nutritionSeries(entries, allFoods, recipes, 7),
    [entries, allFoods, recipes],
  )
  const weeklyPoints = useMemo(
    () => aggregateNutritionSeries(nutritionSeries(entries, allFoods, recipes, 28), 'week'),
    [entries, allFoods, recipes],
  )
  const monthlyPoints = useMemo(
    () => aggregateNutritionSeries(nutritionSeries(entries, allFoods, recipes, 180), 'month'),
    [entries, allFoods, recipes],
  )
  const trendPoints = useMemo(
    () => nutritionSeries(entries, allFoods, recipes, 30),
    [entries, allFoods, recipes],
  )
  const analyticsEntries = useMemo(
    () => entries.filter((entry) => entry.localDate >= (dailyPoints[0]?.localDate ?? selectedDate)),
    [entries, dailyPoints, selectedDate],
  )
  const distribution = useMemo(
    () => mealTypeDistribution(analyticsEntries, allFoods, recipes),
    [analyticsEntries, allFoods, recipes],
  )
  const hasAnalytics = analyticsEntries.length > 0

  const preset = (appearance.preset in chartPalettes ? appearance.preset : 'vintageLibrary') as PresetId
  const palette = chartPalettes[preset][resolveColorMode(appearance.mode)]

  const headerProgress = summary.progress.available
    ? {
      completed: Math.round(summary.consumed.calories),
      total: goal?.calories ?? 0,
      percent: summary.progress.percent,
      available: true,
    }
    : unavailableProgress

  const refName = (foodId?: string, recipeId?: string): string => {
    if (foodId) return foodById.get(foodId)?.name ?? t('notRecorded')
    if (recipeId) return recipeById.get(recipeId)?.name ?? t('notRecorded')
    return t('notRecorded')
  }

  const saveEntry = async (draft: EntryDraft) => {
    if (!draft.foodId && !draft.recipeId) return
    const ok = await run(
      () => draft.id ? updateMealEntry(draft.id, entryPayload(draft)) : createMealEntry(entryPayload(draft)),
      draft.id ? 'foodEntryUpdated' : 'foodEntrySaved',
    )
    if (ok) setEntryDialog(null)
  }

  const saveFood = async (draft: FoodDraft) => {
    if (!draft.name.trim() || !draft.servingSize.trim()) return
    const ok = await run(
      () => draft.id ? updateFood(draft.id, foodPayload(draft)) : createFood(foodPayload(draft)),
      draft.id ? 'foodFoodUpdated' : 'foodFoodSaved',
    )
    if (ok) setFoodDialog(null)
  }

  const saveRecipe = async (draft: RecipeDraft) => {
    if (!draft.name.trim() || draft.ingredients.length === 0) return
    const ok = await run(
      () => draft.id ? updateRecipe(draft.id, recipePayload(draft)) : createRecipe(recipePayload(draft)),
      draft.id ? 'foodRecipeUpdated' : 'foodRecipeSaved',
    )
    if (ok) setRecipeDialog(null)
  }

  const savePlan = async (draft: PlanDraft) => {
    if (!draft.foodId && !draft.recipeId) return
    const ok = await run(
      () => draft.id ? updateMealPlan(draft.id, planPayload(draft)) : createMealPlan(planPayload(draft)),
      'foodPlanSaved',
    )
    if (ok) setPlanDialog(null)
  }

  const confirmDelete = () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    const copy = deleteCopy[target.kind]
    const action = () => {
      switch (target.kind) {
        case 'entry': return deleteMealEntry(target.id).then(() => undefined)
        case 'plan': return deleteMealPlan(target.id).then(() => undefined)
        case 'food': return deleteFood(target.id).then((ok) => {
          if (!ok) throw new Error('in-use')
        })
        case 'recipe': return deleteRecipe(target.id).then((ok) => {
          if (!ok) throw new Error('in-use')
        })
      }
    }
    void run(action, copy.success, copy.inUse)
  }

  if (problem) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('modulesLabel')}</p><h1>{t('navFood')}</h1></header>
        <ErrorState title={t('errorTitle')} body={t('errorBody')} actionLabel={t('retryAction')} onRetry={() => void load()} />
      </div>
    )
  }

  if (!foods) {
    return (
      <div className="space-y-6">
        <header><p className="eyebrow">{t('modulesLabel')}</p><h1>{t('navFood')}</h1></header>
        <LoadingSkeleton label={t('loadingLabel')} lines={4} />
      </div>
    )
  }

  return (
    <ModuleHeader
      route="food"
      eyebrow={t('modulesLabel')}
      title={t('navFood')}
      subtitle={t('workspaceSubtitleFood')}
      progress={
        <ModuleProgress
          snapshot={headerProgress}
          label={`${t('foodGoalProgress')} (${t('foodUnitKcal')})`}
          completedLabel={t('progressCompletedOf')}
          unavailableLabel={t('foodNoGoal')}
        />
      }
      filters={
        <div className="space-y-3">
          <ModuleFilterBar
            label={t('foodSectionLog')}
            value={section}
            onChange={(value) => setSection(value as Section)}
            options={sections.map((item) => ({ value: item, label: t(sectionKeys[item]) }))}
          />
          <ModuleFilterBar
            label={t('foodMealType')}
            value={mealFilter}
            onChange={(value) => setMealFilter(value as MealType | 'all')}
            options={[
              { value: 'all', label: t('filterAll') },
              ...mealTypes.map((type) => ({ value: type, label: t(mealTypeKeys[type]) })),
            ]}
          />
        </div>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setFoodDialog(emptyFoodDraft())}>{t('foodAddFood')}</Button>
          <Button variant="secondary" onClick={() => setRecipeDialog(emptyRecipeDraft())}>{t('foodRecipeNew')}</Button>
          <Button variant="secondary" onClick={() => setPlanDialog(emptyPlanDraft(selectedDate))}>{t('foodAddPlan')}</Button>
          <Button onClick={() => setEntryDialog(emptyEntryDraft(selectedDate))}>{t('foodNewEntry')}</Button>
        </div>
      }
    >
      <section className="panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <DateField label={t('foodDate')} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          caption={t('foodDailySummary')}
          value={`${roundDisplay(summary.consumed.calories)} ${t('foodUnitKcal')}`}
          detail={nutritionLine(t, summary.consumed)}
        />
        <StatCard caption={t('recordsCount')} value={String(summary.entryCount)} detail={t('foodDailyLog')} />
        <StatCard
          caption={t('foodPlanned')}
          value={`${roundDisplay(summary.planned.calories)} ${t('foodUnitKcal')}`}
          detail={nutritionLine(t, summary.planned)}
        />
        <StatCard
          caption={t('foodGoalProgress')}
          value={summary.progress.percent === null ? t('notRecorded') : `${roundDisplay(summary.progress.percent)}%`}
          detail={summary.progress.overGoal ? t('foodOverGoal') : (summary.progress.available ? t('foodGoalMet') : t('foodNoGoal'))}
        />
      </div>

      {section === 'log' ? (
        <div className="space-y-4" data-testid="food-log">
          {mealTypes
            .filter((type) => mealFilter === 'all' || mealFilter === type)
            .map((type) => {
              const rows = visibleEntries.filter((entry) => entry.mealType === type)
              return (
                <section key={type} className="panel p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="eyebrow">{t(mealTypeKeys[type])}</p>
                    <Button variant="ghost" onClick={() => setEntryDialog({ ...emptyEntryDraft(selectedDate), mealType: type })}>
                      {t('foodNewEntry')}
                    </Button>
                  </div>
                  {rows.length === 0 ? (
                    <p className="muted text-sm">{t('foodNoEntries')}</p>
                  ) : (
                    rows.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--mf-border)' }} data-food-entry={row.id}>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{refName(row.foodId, row.recipeId)}</p>
                          <p className="muted text-xs">
                            {roundDisplay(row.quantity)} {t('foodServings')} · {nutritionLine(t, entryNutrition(row, allFoods, recipes))}
                          </p>
                          {row.notes ? <p className="muted mt-1 text-xs">{row.notes}</p> : null}
                        </div>
                        <div className="flex gap-1">
                          <IconButton label={t('editAction')} onClick={() => setEntryDialog(entryDraft(row))}>✎</IconButton>
                          <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'entry', id: row.id })}>×</IconButton>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              )
            })}
        </div>
      ) : null}

      {section === 'foods' ? (
        <div className="space-y-4" data-testid="food-database">
          <section className="panel p-4">
            <TextField
              label={t('foodSearchFoods')}
              type="search"
              value={foodQuery}
              onChange={(event) => setFoodQuery(event.target.value)}
            />
          </section>
          {filteredFoods.length === 0 ? (
            <EmptyState title={t('emptyTitle')} body={t('foodNoFoods')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredFoods.map((item) => (
                <section key={item.id} className="panel p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="muted text-xs">
                        {t('foodServingSize')}: {item.servingSize}
                        {item.servingGrams !== undefined ? ` · ${roundDisplay(item.servingGrams)} ${t('foodUnitGram')}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <IconButton label={t('editAction')} onClick={() => setFoodDialog(foodDraft(item))}>✎</IconButton>
                      <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'food', id: item.id })}>×</IconButton>
                    </div>
                  </div>
                  <p className="muted text-xs">
                    {nutritionLine(t, item)} · {t(item.source === 'import' ? 'foodSourceImport' : 'foodSourceManual')}
                  </p>
                  {item.sourceRef ? <p className="muted text-xs">{t('foodSourceRef')}: {item.sourceRef}</p> : null}
                  {item.imageRef ? <p className="muted text-xs">{t('foodImageRefNote')}: {item.imageRef}</p> : null}
                  {item.notes ? <p className="muted text-xs">{item.notes}</p> : null}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {section === 'recipes' ? (
        <div className="space-y-4" data-testid="food-recipes">
          {recipes.length === 0 ? (
            <EmptyState title={t('emptyTitle')} body={t('foodNoRecipes')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recipes.map((item) => (
                <section key={item.id} className="panel p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="muted text-xs">
                        {t('foodRecipeServings')}: {item.servings} · {t('foodRecipePrepMinutes')}: {item.prepMinutes} ·{' '}
                        {t('foodRecipeCookMinutes')}: {item.cookMinutes}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <IconButton label={t('editAction')} onClick={() => setRecipeDialog(recipeDraft(item))}>✎</IconButton>
                      <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'recipe', id: item.id })}>×</IconButton>
                    </div>
                  </div>
                  <p className="eyebrow">{t('foodRecipeNutritionPerServing')}</p>
                  <p className="muted text-xs">{nutritionLine(t, recipeNutritionPerServing(item, allFoods))}</p>
                  {item.favorite ? <p className="muted text-xs">{t('foodRecipeFavorite')}</p> : null}
                  {item.notes ? <p className="muted text-xs">{item.notes}</p> : null}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {section === 'plan' ? (
        <div className="space-y-4" data-testid="food-plan">
          <section className="panel p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">{t('foodMealCalendar')}</p>
              <Button variant="secondary" onClick={() => setPlanDialog(emptyPlanDraft(selectedDate))}>{t('foodAddPlan')}</Button>
            </div>
            <DateField label={t('foodPlanDate')} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            {mealTypes
              .filter((type) => mealFilter === 'all' || mealFilter === type)
              .map((type) => {
                const rows = visiblePlans.filter((plan) => plan.mealType === type)
                return (
                  <div key={type} className="space-y-1 rounded-lg border p-3" style={{ borderColor: 'var(--mf-border)' }}>
                    <p className="eyebrow">{t(mealTypeKeys[type])}</p>
                    {rows.length === 0 ? (
                      <p className="muted text-xs">{t('foodNoPlans')}</p>
                    ) : (
                      rows.map((row) => (
                        <div key={row.id} className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm">
                            {refName(row.foodId, row.recipeId)} · {roundDisplay(row.quantity)} {t('foodServings')} ·{' '}
                            {nutritionLine(t, planNutrition(row, allFoods, recipes))}
                          </p>
                          <div className="flex gap-1">
                            <IconButton label={t('editAction')} onClick={() => setPlanDialog(planDraft(row))}>✎</IconButton>
                            <IconButton label={t('deleteAction')} onClick={() => setDeleteTarget({ kind: 'plan', id: row.id })}>×</IconButton>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )
              })}
          </section>

          <section className="panel p-4 space-y-2">
            <p className="eyebrow">{t('foodPlannedVsConsumed')}</p>
            {(['calories', 'protein', 'carbs', 'fat'] as NutritionField[]).map((field) => (
              <div key={field} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm last:border-0" style={{ borderColor: 'var(--mf-border)' }}>
                <span>{t(macroKeys[field])}</span>
                <span className="muted">
                  {t('foodPlanned')}: {roundDisplay(summary.planned[field])} {t(macroUnits[field])} ·{' '}
                  {t('foodConsumed')}: {roundDisplay(summary.consumed[field])} {t(macroUnits[field])}
                </span>
              </div>
            ))}
          </section>

          <section className="panel p-4 space-y-3">
            <p className="eyebrow">{t('foodGoalProgress')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['calories', 'protein', 'carbs', 'fat'] as NutritionField[]).map((field) => (
                <GoalBar
                  key={field}
                  label={t(macroKeys[field])}
                  consumed={summary.consumed[field]}
                  target={goal?.[field]}
                  unit={t(macroUnits[field])}
                  t={t}
                />
              ))}
            </div>
            <form
              className="grid gap-3 border-t pt-3 sm:grid-cols-2"
              style={{ borderColor: 'var(--mf-border)' }}
              onSubmit={(event) => {
                event.preventDefault()
                void run(
                  () => setNutritionGoal(selectedDate, {
                    calories: toNumber(goalDraft.calories),
                    protein: toNumber(goalDraft.protein),
                    carbs: toNumber(goalDraft.carbs),
                    fat: toNumber(goalDraft.fat),
                  }),
                  'foodGoalSaved',
                )
              }}
            >
              {(['calories', 'protein', 'carbs', 'fat'] as NutritionField[]).map((field) => (
                <TextField
                  key={field}
                  label={t(field === 'calories' ? 'foodGoalCalories' : field === 'protein' ? 'foodGoalProtein' : field === 'carbs' ? 'foodGoalCarbs' : 'foodGoalFat')}
                  type="number"
                  min={0}
                  step="0.1"
                  value={goalDraft[field]}
                  onChange={(event) => setGoalDraft((current) => ({ ...current, [field]: event.target.value }))}
                />
              ))}
              <div className="sm:col-span-2">
                <Button type="submit">{t('foodSetGoal')}</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {section === 'analytics' ? (
        <div className="space-y-4" data-testid="food-analytics">
          {!hasAnalytics ? (
            <EmptyState title={t('analyticsEmptyTitle')} body={t('foodNoAnalytics')} />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <NutritionChart
                  title={t('foodDailyCalories')}
                  description={t('foodDailyCalories')}
                  points={dailyPoints}
                  field="calories"
                  palette={palette}
                />
                <NutritionChart
                  title={t('foodWeeklyCalories')}
                  description={t('foodWeeklyCalories')}
                  points={weeklyPoints}
                  field="calories"
                  palette={palette}
                />
                <NutritionChart
                  title={t('foodMonthlyTrends')}
                  description={t('foodMonthlyTrends')}
                  points={monthlyPoints}
                  field="calories"
                  palette={palette}
                />
                <NutritionChart
                  title={t('foodProteinTrends')}
                  description={t('foodProteinTrends')}
                  points={trendPoints}
                  field="protein"
                  palette={palette}
                />
                <NutritionChart
                  title={t('foodCarbTrends')}
                  description={t('foodCarbTrends')}
                  points={trendPoints}
                  field="carbs"
                  palette={palette}
                />
                <NutritionChart
                  title={t('foodFatTrends')}
                  description={t('foodFatTrends')}
                  points={trendPoints}
                  field="fat"
                  palette={palette}
                />
              </div>
              <ResponsiveCard title={t('foodMealDistribution')} span="wide">
                <BarGraph
                  labels={mealTypes.map((type) => t(mealTypeKeys[type]))}
                  values={mealTypes.map((type) => distribution[type])}
                  colors={palette}
                  description={t('foodMealDistribution')}
                />
              </ResponsiveCard>
              <p className="muted text-xs">{t('foodAnalyticsNote')}</p>
            </>
          )}
        </div>
      ) : null}

      <Dialog
        open={entryDialog !== null}
        onClose={() => setEntryDialog(null)}
        title={entryDialog?.id ? t('foodEditEntry') : t('foodNewEntry')}
        closeLabel={t('cancelAction')}
      >
        {entryDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveEntry(entryDialog) }}>
            <fieldset className="space-y-2">
              <legend className="eyebrow">{t('foodDateTime')}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateField label={t('foodDate')} value={entryDialog.localDate} onChange={(event) => setEntryDialog({ ...entryDialog, localDate: event.target.value })} />
                <TimeField label={t('timeLabel')} value={entryDialog.loggedTime} onChange={(event) => setEntryDialog({ ...entryDialog, loggedTime: event.target.value })} />
              </div>
            </fieldset>
            <SelectField
              label={t('foodMealType')}
              value={entryDialog.mealType}
              options={mealTypes.map((type) => ({ value: type, label: t(mealTypeKeys[type]) }))}
              onChange={(event) => setEntryDialog({ ...entryDialog, mealType: event.target.value as MealType })}
            />
            <SelectField
              label={t('foodName')}
              value={entryDialog.foodId}
              options={[{ value: '', label: t('selectLabel') }, ...allFoods.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(event) => setEntryDialog({ ...entryDialog, foodId: event.target.value, recipeId: '' })}
            />
            <SelectField
              label={t('foodSectionRecipes')}
              value={entryDialog.recipeId}
              options={[{ value: '', label: t('selectLabel') }, ...recipes.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(event) => setEntryDialog({ ...entryDialog, foodId: '', recipeId: event.target.value })}
            />
            <TextField
              label={t('foodQuantity')}
              type="number"
              min="0"
              step="0.25"
              value={entryDialog.quantity}
              onChange={(event) => setEntryDialog({ ...entryDialog, quantity: event.target.value })}
            />
            <TextField
              label={t('foodImageRef')}
              value={entryDialog.imageRef}
              hint={t('foodImageNote')}
              onChange={(event) => setEntryDialog({ ...entryDialog, imageRef: event.target.value })}
            />
            <TextArea label={t('foodNotes')} value={entryDialog.notes} onChange={(event) => setEntryDialog({ ...entryDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEntryDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit" disabled={!entryDialog.foodId && !entryDialog.recipeId}>{t('saveAction')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={foodDialog !== null}
        onClose={() => setFoodDialog(null)}
        title={foodDialog?.id ? t('foodEditFood') : t('foodAddFood')}
        closeLabel={t('cancelAction')}
      >
        {foodDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveFood(foodDialog) }}>
            <TextField label={t('foodName')} value={foodDialog.name} onChange={(event) => setFoodDialog({ ...foodDialog, name: event.target.value })} autoFocus />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label={t('foodServingSize')} value={foodDialog.servingSize} onChange={(event) => setFoodDialog({ ...foodDialog, servingSize: event.target.value })} />
              <TextField label={t('foodServingGrams')} type="number" min="0" step="0.1" value={foodDialog.servingGrams} onChange={(event) => setFoodDialog({ ...foodDialog, servingGrams: event.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['calories', 'protein', 'carbs', 'fat'] as NutritionField[]).map((field) => (
                <TextField
                  key={field}
                  label={t(macroKeys[field])}
                  type="number"
                  min="0"
                  step="0.1"
                  value={foodDialog[field]}
                  onChange={(event) => setFoodDialog({ ...foodDialog, [field]: event.target.value })}
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label={t('foodSource')}
                value={foodDialog.source}
                options={[
                  { value: 'manual', label: t('foodSourceManual') },
                  { value: 'import', label: t('foodSourceImport') },
                ]}
                onChange={(event) => setFoodDialog({ ...foodDialog, source: event.target.value as FoodSource })}
              />
              <TextField label={t('foodSourceRef')} value={foodDialog.sourceRef} onChange={(event) => setFoodDialog({ ...foodDialog, sourceRef: event.target.value })} />
            </div>
            <TextField label={t('foodImageRef')} value={foodDialog.imageRef} hint={t('foodImageNote')} onChange={(event) => setFoodDialog({ ...foodDialog, imageRef: event.target.value })} />
            <TextArea label={t('foodNotes')} value={foodDialog.notes} onChange={(event) => setFoodDialog({ ...foodDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFoodDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit" disabled={!foodDialog.name.trim() || !foodDialog.servingSize.trim()}>{t(foodDialog.id ? 'saveChanges' : 'foodSaveFood')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={recipeDialog !== null}
        onClose={() => setRecipeDialog(null)}
        title={recipeDialog?.id ? t('foodRecipeEdit') : t('foodRecipeNew')}
        closeLabel={t('cancelAction')}
      >
        {recipeDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void saveRecipe(recipeDialog) }}>
            <TextField label={t('foodRecipeName')} value={recipeDialog.name} onChange={(event) => setRecipeDialog({ ...recipeDialog, name: event.target.value })} autoFocus />
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label={t('foodRecipeServings')} type="number" min="1" step="1" value={recipeDialog.servings} onChange={(event) => setRecipeDialog({ ...recipeDialog, servings: event.target.value })} />
              <TextField label={t('foodRecipePrepMinutes')} type="number" min="0" step="1" value={recipeDialog.prepMinutes} onChange={(event) => setRecipeDialog({ ...recipeDialog, prepMinutes: event.target.value })} />
              <TextField label={t('foodRecipeCookMinutes')} type="number" min="0" step="1" value={recipeDialog.cookMinutes} onChange={(event) => setRecipeDialog({ ...recipeDialog, cookMinutes: event.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recipeDialog.favorite}
                onChange={(event) => setRecipeDialog({ ...recipeDialog, favorite: event.target.checked })}
              />
              {t('foodRecipeFavorite')}
            </label>

            <fieldset className="space-y-2">
              <legend className="eyebrow">{t('foodRecipeIngredients')}</legend>
              {recipeDialog.ingredients.map((ingredient, index) => (
                <div key={`${ingredient.id || 'new'}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                  <SelectField
                    label={t('foodName')}
                    value={ingredient.foodId}
                    options={[{ value: '', label: t('selectLabel') }, ...allFoods.map((item) => ({ value: item.id, label: item.name }))]}
                    onChange={(event) => setRecipeDialog({
                      ...recipeDialog,
                      ingredients: recipeDialog.ingredients.map((item, i) => i === index ? { ...item, foodId: event.target.value } : item),
                    })}
                  />
                  <TextField
                    label={t('foodQuantity')}
                    type="number"
                    min="0"
                    step="0.25"
                    value={ingredient.quantity}
                    onChange={(event) => setRecipeDialog({
                      ...recipeDialog,
                      ingredients: recipeDialog.ingredients.map((item, i) => i === index ? { ...item, quantity: event.target.value } : item),
                    })}
                  />
                  <div className="flex items-end">
                    <IconButton
                      label={t('deleteAction')}
                      onClick={() => setRecipeDialog({
                        ...recipeDialog,
                        ingredients: recipeDialog.ingredients.filter((_, i) => i !== index),
                      })}
                    >
                      ×
                    </IconButton>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={allFoods.length === 0}
                onClick={() => setRecipeDialog({
                  ...recipeDialog,
                  ingredients: [...recipeDialog.ingredients, { id: '', foodId: allFoods[0]?.id ?? '', quantity: '1' }],
                })}
              >
                {t('foodRecipeAddIngredient')}
              </Button>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="eyebrow">{t('foodRecipeSteps')}</legend>
              {recipeDialog.steps.map((step, index) => (
                <div key={`${step.id || 'new'}-${index}`} className="space-y-1">
                  <TextField
                    label={`${t('foodRecipeStep')} ${step.order}`}
                    value={step.text}
                    onChange={(event) => setRecipeDialog({
                      ...recipeDialog,
                      steps: recipeDialog.steps.map((item, i) => i === index ? { ...item, text: event.target.value } : item),
                    })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRecipeDialog({
                      ...recipeDialog,
                      steps: recipeDialog.steps.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 })),
                    })}
                  >
                    {t('foodRecipeRemoveStep')}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRecipeDialog({
                  ...recipeDialog,
                  steps: [...recipeDialog.steps, { id: '', order: recipeDialog.steps.length + 1, text: '' }],
                })}
              >
                {t('foodRecipeAddStep')}
              </Button>
            </fieldset>

            <p className="eyebrow">{t('foodRecipeNutritionPerServing')}</p>
            <p className="muted text-xs">
              {nutritionLine(t, recipeNutritionPerServing(
                {
                  id: recipeDialog.id || '',
                  servings: toNumber(recipeDialog.servings, 1),
                  ingredients: recipeDialog.ingredients.map((ingredient) => ({ foodId: ingredient.foodId, quantity: toNumber(ingredient.quantity, 1) })),
                },
                allFoods,
              ))}
            </p>
            <TextField label={t('foodRecipeImageRef')} value={recipeDialog.imageRef} hint={t('foodImageNote')} onChange={(event) => setRecipeDialog({ ...recipeDialog, imageRef: event.target.value })} />
            <TextArea label={t('foodRecipeNotes')} value={recipeDialog.notes} onChange={(event) => setRecipeDialog({ ...recipeDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRecipeDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit" disabled={!recipeDialog.name.trim() || recipeDialog.ingredients.length === 0}>{t('saveAction')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={planDialog !== null}
        onClose={() => setPlanDialog(null)}
        title={t('foodAddPlan')}
        closeLabel={t('cancelAction')}
      >
        {planDialog ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void savePlan(planDialog) }}>
            <DateField label={t('foodPlanDate')} value={planDialog.localDate} onChange={(event) => setPlanDialog({ ...planDialog, localDate: event.target.value })} />
            <SelectField
              label={t('foodMealType')}
              value={planDialog.mealType}
              options={mealTypes.map((type) => ({ value: type, label: t(mealTypeKeys[type]) }))}
              onChange={(event) => setPlanDialog({ ...planDialog, mealType: event.target.value as MealType })}
            />
            <SelectField
              label={t('foodName')}
              value={planDialog.foodId}
              options={[{ value: '', label: t('selectLabel') }, ...allFoods.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(event) => setPlanDialog({ ...planDialog, foodId: event.target.value, recipeId: '' })}
            />
            <SelectField
              label={t('foodSectionRecipes')}
              value={planDialog.recipeId}
              options={[{ value: '', label: t('selectLabel') }, ...recipes.map((item) => ({ value: item.id, label: item.name }))]}
              onChange={(event) => setPlanDialog({ ...planDialog, foodId: '', recipeId: event.target.value })}
            />
            <TextField label={t('foodQuantity')} type="number" min="0" step="0.25" value={planDialog.quantity} onChange={(event) => setPlanDialog({ ...planDialog, quantity: event.target.value })} />
            <TextArea label={t('foodNotes')} value={planDialog.notes} onChange={(event) => setPlanDialog({ ...planDialog, notes: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPlanDialog(null)}>{t('cancelAction')}</Button>
              <Button type="submit" disabled={!planDialog.foodId && !planDialog.recipeId}>{t('saveAction')}</Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={deleteTarget ? t(deleteCopy[deleteTarget.kind].title) : t('deleteAction')}
        body={deleteTarget ? t(deleteCopy[deleteTarget.kind].body) : t('dialogBody')}
        confirmLabel={t('deleteAction')}
        cancelLabel={t('cancelAction')}
        closeLabel={t('cancelAction')}
      />

      {toast ? <Toast message={t(toast)} visible={!!toast} /> : null}
    </ModuleHeader>
  )
}

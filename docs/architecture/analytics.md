# Analytics and calculation rules

All statistics are derived from source records in the local database. No table stores "the answer" as competing truth. Definitions below are shared by web, Android, dashboards, and reports, and are verified by JSON fixtures in `contracts/fixtures/`.

## 1. General rules

- Date ranges use the user's configured timezone and first day of week.
- Zero-data states show an explicit empty state, not a zero-valued chart that implies data.
- Missing sensor data is never interpolated into a measurement; unavailable means unavailable.
- Charts use the active theme palette and provide accessible descriptions.
- Weekly/monthly/yearly aggregation uses the same boundary rules everywhere.
- All percentage calculations define and document their denominator.

## 2. Rule catalog

| Domain | Metric | Definition / edge cases |
| --- | --- | --- |
| Tasks | Completion percentage | Completed tasks ÷ tasks scheduled in the selected range. Unscheduled or unrelated tasks are excluded; recurring occurrences count as separate instances. |
| Tasks | Daily / weekly / monthly completions | Count by completion instant, attributed to the user's local date. Reopened tasks decrement the count for the original completion date. |
| Tasks | Priority distribution | Count of open tasks per priority level. |
| Habits | Daily completion % | Completed scheduled habits ÷ habits scheduled that day. Skipped and rest days follow the schedule rules, not the generic denominator. |
| Habits | Current / longest streak | Consecutive scheduled days completed; skipped days and rest days do not break a streak, but a missed scheduled day does. Schedule changes recompute from history, not from the new schedule alone. |
| Habits | Consistency | Completed ÷ scheduled per week/month; heatmaps color by completion ratio. |
| Gym | Set volume | `reps × weight` for a **completed** set only. |
| Gym | Workout volume | Sum of all completed set volumes in the workout; unfinished sets contribute zero. |
| Gym | Personal record | Highest completed value for an exercise/metric in its history; ties keep the earliest date. |
| Gym | Progressive overload | Comparison of a set/exercise's volume or weight against its immediately preceding completed occurrence, using correct historical order. |
| Food | Entry nutrition | Food values are per serving and multiply by entry quantity (servings). Recipe nutrition per serving is `sum(ingredient quantity × food per-serving value) / recipe servings`; a recipe entry multiplies that by entry quantity. |
| Food | Daily nutrition | Sum of logged entries by local date and meal type. Empty days are explicit empty states, never zero-valued charts. |
| Food | Planned versus consumed | `MealPlan` rows and `MealEntry` rows are summed separately for the same local date; no plan is inferred from a consumed entry. |
| Food | Meal distribution | Share of calories by breakfast/lunch/dinner/snack; denominator is total calories in the selected range, and a zero total yields an empty state. |
| Food | Food trends | Daily, weekly, and monthly series sum calories/protein/carbs/fat over local dates using the shared boundary rules. |
| Food | Goal progress | Consumed ÷ goal for calories/protein/carbs/fat; a missing or zero goal is unavailable. Over-goal is shown as a distinct state, not clamped. |
| Cardio | Steps | Sum of deduplicated `StepRecord` values for the local date; multiple sources never double-count. |
| Cardio | Cycling speed | Distance ÷ moving time, excluding pauses and stationary periods; max speed only from accepted GPS points. |
| Cardio | Jump rope | Jump count as recorded; sensor-assisted counts labelled with source and never presented as verified measurement. |
| Reading | Reading progress | Pages read ÷ total pages, clamped for display; goal progress counts completed books in the period. |
| Journal | Activity | Entry counts by date/mood/tag; content itself excluded from global search unless unlocked. |
| Finance | Spending | Sum of `amount_minor` by local date, category, and payment method; displayed with INR formatting. |
| Finance | Category share | Category spend ÷ total spend in range; zero total yields an empty state. |
| Dashboard | Module progress | Uses the owning module's rule above; no progress indicator is shown when no goal or schedule exists. |

## 3. Fixture format

```json
{
  "rule": "workout.volume",
  "case": "unfinished set is excluded",
  "input": {
    "sets": [
      { "reps": 10, "weight": 40, "completed": true },
      { "reps": 8, "weight": 55, "completed": false }
    ]
  },
  "expected": 400
}
```

Each rule has fixtures for: normal case, empty input, zero values, boundary dates, timezone/DST transition, conflicting/offline-created records where relevant, and over-goal states. Both clients consume the identical file set.

## 4. Reporting

Weekly, monthly, and yearly summaries reuse the same rule functions. Exports (JSON, CSV where appropriate, chart images) serialize the already-computed values with the rule name and parameters so a report can be independently verified. Data accuracy verification is a release gate, not an ad-hoc check.

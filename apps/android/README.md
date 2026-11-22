# Android client

Kotlin + Jetpack Compose client with Room persistence and a Glance home-screen widget foundation.

## Prerequisites

- Android Studio or Android SDK command-line tools with API 35 installed
- JDK 17+ (JDK 21 is present on this machine)
- `ANDROID_HOME` pointing at the SDK root

The Gradle wrapper properties are checked in. The wrapper JAR is not, because the Gradle distribution was not available when this scaffold was created. Generate it once with a local Gradle install:

```powershell
gradle wrapper --gradle-version 8.9
```

Then:

```powershell
.\gradlew :app:assembleDebug
.\gradlew :app:installDebug
```

## Phase 4 status (static implementation)

The Android client now has a real Compose navigation shell rather than a single parity screen:

- All eleven stable destination ids from the web contract are Compose routes: `dashboard`, `tasks`, `habits`, `mascot`, `gym`, `food`, `cardio`, `finance`, `appearance`, `design-system`, `profile`.
- Each route is also a deep link: `myflow://app/<route-id>` and `https://myflow.local/<route-id>`. Both URI patterns are declared in the manifest and registered with Navigation Compose. Navigation back-stack behaviour is preserved with `navigateUp()` for the top-bar back action and single-top, state-restoring navigation for shell destinations.
- The shell consists of a top app bar with the selected destination title and token-driven selected-state styling, a five-item bottom bar for primary modules, and a drawer exposing every destination. System back works through the `NavController`.
- Distinct workspaces exist for Tasks, Habits, Mascot, Gym, Food, Cardio, and Finance. They share header, progress, statistics, actions, and filters primitives, but each has its own body layout. Modules without local repositories show honest empty states and **unavailable** progress, never 0%.
- Tasks are real local records: a minimal Room `tasks` table was added in database v2 with a non-destructive `MIGRATION_1_2` that only creates the new table. Existing `settings` rows are untouched; there is no `fallbackToDestructiveMigration`. Adding, toggling, listing, task progress, and title-only search all use pure Kotlin helpers. Task progress follows the web rule: zero total means progress is unavailable.
- Global search is a local, read-only projection over task titles, grouped under Tasks. Profile states that this installation has one personal profile and points to Appearance; no multi-user model is implemented.
- The Phase 3 token-driven parity showcase remains available at the `design-system` destination. The theme still reads generated tokens; generated artifacts were not hand-edited.
- Every user-facing string lives in `res/values/strings.xml` and `res/values-ta/strings.xml` with Tamil translations.

## Verification

Runtime verification is **NOT APPLICABLE** in this environment: `ANDROID_HOME` is unset and no Android SDK, emulator, or device is available, so no Gradle build, instrumentation, or on-device check could be run. The implementation was reviewed statically for imports, resource parity between locales, migration SQL, and navigation/deep-link consistency. Run `./gradlew :app:assembleDebug` and exercise deep links, back navigation, task completion, search, both locales, and both themes once an SDK and device are available.

No sync engine, biometric auth, or richer module repositories are part of this phase. No sample data is presented as real.

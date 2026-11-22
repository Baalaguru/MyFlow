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

## Status

Phase 2 scaffold only. No module workspaces, sync engine, or biometric auth yet. No sample data is presented as real.

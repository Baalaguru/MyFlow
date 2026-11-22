# ADR-0014: Notifications and background work

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-08, [ADR-0006](0006-time-model.md)

## Context

The app needs task, habit, gym, reading, calendar, and optional finance reminders, quiet hours, snooze, widget refresh, and background sync. Browser and Android background capabilities differ substantially.

## Decision

- **Android:** WorkManager schedules local notifications, sync, and widget refreshes with battery-conscious constraints; exact alarms only where the platform permits and the user granted permission.
- **Web:** Service Worker and Notification API where available; documented as best-effort when the tab or browser is closed. Android is the primary reliable reminder surface.
- Reminder times are computed in the user's timezone and regenerated on DST/timezone changes ([ADR-0006](0006-time-model.md)).
- Notification categories map to settings toggles; quiet hours, snooze duration, sound, and vibration are respected.
- Deduplication key: `(entity_type, entity_id, reminder_type, scheduled_local_date/time)` so a reminder never fires twice after a reschedule or sync.
- Lock-screen privacy is configurable; journal content never appears in previews by default.
- Widgets read local data, refresh on system schedules and explicit actions, show stale-data states, and never depend on a successful sync to render.
- No continuous polling; events, OS scheduling, and network transitions trigger work.

## Consequences

**Positive**

- Battery-efficient and platform-appropriate behavior.
- Permission-denied and unsupported states are explicit rather than silently broken.
- Privacy controls are consistent with the security model.

**Negative**

- Web users cannot rely on reminders when the browser is closed; this must be communicated in settings and docs.
- Android OEM battery restrictions require testing on physical devices.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Server push notifications for all reminders | Requires server availability and third-party push services; conflicts with self-hosted/offline goals |
| Polling loops | Battery drain and OS restrictions |
| Identical behavior assumptions on both platforms | Would produce false promises on web |

## Verification

Timezone/DST reminder fixtures, duplicate-firing tests, permission-denied UI tests, quiet-hours/snooze tests, and physical-device battery/background tests.

@file:OptIn(ExperimentalMaterial3Api::class)

package com.myflow.app.ui.workspaces

import android.Manifest
import android.app.AlertDialog
import android.os.SystemClock
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.data.CardioRepository
import com.myflow.app.data.CyclingSessionEntity
import com.myflow.app.data.JumpRopeSessionEntity
import com.myflow.app.data.QUALITY_GPS_ACCEPTED
import com.myflow.app.data.QUALITY_MANUAL
import com.myflow.app.data.QUALITY_UNAVAILABLE
import com.myflow.app.data.STEP_SOURCE_MANUAL
import com.myflow.app.data.STEP_SOURCE_SENSOR
import com.myflow.app.data.COUNT_SOURCE_MANUAL
import com.myflow.app.data.COUNT_SOURCE_SENSOR_ASSISTED
import com.myflow.app.data.calculateProgress
import com.myflow.app.data.StepRecordEntity
import com.myflow.app.data.WalkingSessionEntity
import com.myflow.app.data.combinedCardioSummary
import com.myflow.app.data.cyclingAverageSpeedKmh
import com.myflow.app.data.cyclingMovingSeconds
import com.myflow.app.data.cyclingSpeedSeries
import com.myflow.app.data.cyclingSummary
import com.myflow.app.data.dailySteps
import com.myflow.app.data.jumpRopePerformanceSeries
import com.myflow.app.data.jumpRopeSummary
import com.myflow.app.data.metCalories
import com.myflow.app.data.monthlyDistance
import com.myflow.app.data.monthlyDuration
import com.myflow.app.data.monthlySteps
import com.myflow.app.data.parseLocalDate
import com.myflow.app.data.stepGoalProgress
import com.myflow.app.data.unavailableProgress
import com.myflow.app.data.walkingSummary
import com.myflow.app.data.weeklyDistance
import com.myflow.app.data.weeklyDuration
import com.myflow.app.data.weeklySteps
import com.myflow.app.sensor.CardioSensors
import com.myflow.app.sensor.CyclingGpsState
import com.myflow.app.sensor.CyclingGpsTracker
import com.myflow.app.sensor.GPS_PERMISSION_DENIED
import com.myflow.app.sensor.GPS_SIGNAL_LOST
import com.myflow.app.sensor.GPS_TRACKING
import com.myflow.app.sensor.JUMP_MOTION_AVAILABLE
import com.myflow.app.sensor.STEP_SENSOR_AVAILABLE
import com.myflow.app.sensor.STEP_SENSOR_PERMISSION_DENIED
import com.myflow.app.sensor.STEP_SENSOR_UNAVAILABLE
import com.myflow.app.sensor.StepDelta
import com.myflow.app.ui.navigation.AppDestinations
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.util.UUID

private fun instantFor(date: String, time: String, fallback: String? = null): String {
    val localDate = parseLocalDate(date) ?: LocalDate.now()
    val localTime = try {
        LocalTime.parse(time)
    } catch (_: Exception) {
        LocalTime.MIDNIGHT
    }
    return fallback ?: LocalDateTimeOf(localDate, localTime)
}

private fun LocalDateTimeOf(date: LocalDate, time: LocalTime): String =
    java.time.LocalDateTime.of(date, time).atZone(ZoneId.systemDefault()).toInstant().toString()

private fun dateMillis(date: String): Long? =
    parseLocalDate(date)?.atStartOfDay(ZoneId.systemDefault())?.toInstant()?.toEpochMilli()

private class ElapsedTimer {
    var running by mutableStateOf(false)
        private set
    var seconds by mutableStateOf(0L)
        private set
    private var accumulated = 0L
    private var startedAt = 0L

    fun start() {
        accumulated = 0L
        startedAt = SystemClock.elapsedRealtime()
        seconds = 0L
        running = true
    }

    fun pause() {
        if (!running) return
        accumulated = seconds
        running = false
    }

    fun resume() {
        if (running) return
        startedAt = SystemClock.elapsedRealtime()
        running = true
    }

    fun stop() {
        if (running) accumulated = seconds
        running = false
    }

    fun reset() {
        running = false
        accumulated = 0L
        startedAt = 0L
        seconds = 0L
    }

    fun tick() {
        if (running) seconds = accumulated + (SystemClock.elapsedRealtime() - startedAt) / 1000L
    }
}

@Composable
private fun rememberElapsedTimer(): ElapsedTimer = remember { ElapsedTimer() }

@Composable
private fun TickWhileRunning(timer: ElapsedTimer) {
    LaunchedEffect(timer.running) {
        while (timer.running) {
            timer.tick()
            delay(1000L)
        }
    }
}

@Composable
private fun CardioTrendBars(values: List<Double?>, color: Color) {
    val max = values.mapNotNull { it }.maxOrNull()?.coerceAtLeast(1.0) ?: 1.0
    Row(
        modifier = Modifier.fillMaxWidth().height(40.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        values.forEach { value ->
            Box(modifier = Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.BottomCenter) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height((40f * ((value ?: 0.0) / max).toFloat()).dp.coerceAtLeast(2.dp))
                        .background(color.copy(alpha = if (value == null) 0.2f else 0.7f)),
                )
            }
        }
    }
}

@Composable
private fun cardioSourceLabel(source: String): String = stringResource(
    when (source.lowercase()) {
        STEP_SOURCE_SENSOR -> R.string.cardio_source_sensor
        else -> R.string.cardio_source_manual
    },
)

@Composable
private fun countSourceLabel(source: String): String = stringResource(
    when (source.lowercase()) {
        COUNT_SOURCE_SENSOR_ASSISTED -> R.string.cardio_count_source_sensor_assisted
        else -> R.string.cardio_count_source_manual
    },
)

@Composable
private fun qualityLabel(quality: String): String = stringResource(
    when (quality.lowercase()) {
        QUALITY_GPS_ACCEPTED -> R.string.cardio_quality_gps_accepted
        com.myflow.app.data.QUALITY_GPS_FILTERED -> R.string.cardio_quality_gps_filtered
        QUALITY_UNAVAILABLE -> R.string.cardio_quality_unavailable
        else -> R.string.cardio_quality_manual
    },
)

@Composable
private fun gpsStatusLabel(status: String): String = stringResource(
    when (status) {
        GPS_TRACKING -> R.string.cardio_quality_gps_accepted
        GPS_SIGNAL_LOST -> R.string.cardio_gps_signal_lost
        GPS_PERMISSION_DENIED -> R.string.cardio_permission_denied
        else -> R.string.cardio_gps_inaccurate
    },
)

@Composable
fun CardioWorkspace(repository: CardioRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val cardioSensors = remember(context.applicationContext) { CardioSensors(context.applicationContext) }
    val gpsTracker = remember(cardioSensors) { CyclingGpsTracker(cardioSensors) }
    val gpsState by gpsTracker.state.collectAsState()
    DisposableEffect(gpsTracker) {
        onDispose { gpsTracker.dispose() }
    }

    val walkingSessions by repository.observeWalkingSessions().collectAsState(initial = emptyList())
    val stepRecords by repository.observeStepRecords().collectAsState(initial = emptyList())
    val stepGoals by repository.observeStepGoals().collectAsState(initial = emptyList())
    val jumpSessions by repository.observeJumpRopeSessions().collectAsState(initial = emptyList())
    val cyclingSessions by repository.observeCyclingSessions().collectAsState(initial = emptyList())

    val initialSensorState = remember(cardioSensors) { cardioSensors.stepSensorState() }
    var stepCollectionEnabled by rememberSaveable { mutableStateOf(initialSensorState == STEP_SENSOR_AVAILABLE) }
    var stepPermissionDenied by rememberSaveable {
        mutableStateOf(initialSensorState == STEP_SENSOR_PERMISSION_DENIED)
    }
    var locationDenied by rememberSaveable { mutableStateOf(!cardioSensors.hasLocationPermission()) }

    val stepPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        stepCollectionEnabled = granted
        stepPermissionDenied = !granted
    }
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        val granted = results.values.any { it }
        locationDenied = !granted
        if (granted) gpsTracker.resume() else gpsTracker.stop()
    }

    var selectedDate by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var showDatePicker by remember { mutableStateOf(false) }
    var analyticsRange by rememberSaveable { mutableStateOf("week") }

    var showWalkingForm by rememberSaveable { mutableStateOf(false) }
    var editingWalkingId by remember { mutableStateOf<String?>(null) }
    var walkStartTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }
    var walkEndTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }
    var walkStartInstant by remember { mutableStateOf<String?>(null) }
    var walkEndInstant by remember { mutableStateOf<String?>(null) }
    var walkSteps by rememberSaveable { mutableStateOf("") }
    var walkDuration by rememberSaveable { mutableStateOf("") }
    var walkDistance by rememberSaveable { mutableStateOf("") }
    var walkWeight by rememberSaveable { mutableStateOf("") }
    var walkEstimate by rememberSaveable { mutableStateOf(false) }
    var walkSource by rememberSaveable { mutableStateOf(STEP_SOURCE_MANUAL) }
    var walkNotes by rememberSaveable { mutableStateOf("") }

    var showStepForm by rememberSaveable { mutableStateOf(false) }
    var stepCount by rememberSaveable { mutableStateOf("") }
    var stepSource by rememberSaveable { mutableStateOf(STEP_SOURCE_MANUAL) }
    var stepEventId by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }

    var showGoalForm by rememberSaveable { mutableStateOf(false) }
    var goalValue by rememberSaveable { mutableStateOf("") }

    var showJumpForm by rememberSaveable { mutableStateOf(false) }
    var editingJumpId by remember { mutableStateOf<String?>(null) }
    var jumpStartTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }
    var jumpEndTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }
    var jumpStartInstant by remember { mutableStateOf<String?>(null) }
    var jumpEndInstant by remember { mutableStateOf<String?>(null) }
    var jumpCount by rememberSaveable { mutableStateOf("") }
    var advisoryPeaks by rememberSaveable { mutableStateOf(0) }
    var jumpDuration by rememberSaveable { mutableStateOf("") }
    var jumpRounds by rememberSaveable { mutableStateOf("") }
    var jumpRest by rememberSaveable { mutableStateOf("") }
    var jumpWeight by rememberSaveable { mutableStateOf("") }
    var jumpEstimate by rememberSaveable { mutableStateOf(false) }
    var jumpCountSource by rememberSaveable { mutableStateOf(COUNT_SOURCE_MANUAL) }
    var jumpNotes by rememberSaveable { mutableStateOf("") }

    var showCyclingForm by rememberSaveable { mutableStateOf(false) }
    var editingCyclingId by remember { mutableStateOf<String?>(null) }
    var rideStartTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }
    var rideEndTime by rememberSaveable { mutableStateOf(LocalTime.now().toString().take(5)) }
    var rideStartInstant by remember { mutableStateOf<String?>(null) }
    var rideEndInstant by remember { mutableStateOf<String?>(null) }
    var rideDuration by rememberSaveable { mutableStateOf("") }
    var rideDistance by rememberSaveable { mutableStateOf("") }
    var ridePause by rememberSaveable { mutableStateOf("") }
    var rideStationary by rememberSaveable { mutableStateOf("") }
    var rideNotes by rememberSaveable { mutableStateOf("") }

    val walkTimer = rememberElapsedTimer()
    val jumpTimer = rememberElapsedTimer()
    val restTimer = rememberElapsedTimer()
    val rideTimer = rememberElapsedTimer()
    TickWhileRunning(walkTimer)
    TickWhileRunning(jumpTimer)
    TickWhileRunning(restTimer)
    TickWhileRunning(rideTimer)

    if (showJumpForm && cardioSensors.jumpMotionState() == JUMP_MOTION_AVAILABLE) {
        LaunchedEffect(showJumpForm) {
            cardioSensors.observeAdvisoryMotion().collect { advisoryPeaks++ }
        }
    }

    fun toast(messageRes: Int) {
        Toast.makeText(context, context.getString(messageRes), Toast.LENGTH_SHORT).show()
    }

    fun confirmDelete(action: () -> Unit) {
        AlertDialog.Builder(context)
            .setMessage(R.string.delete_action)
            .setPositiveButton(R.string.delete_action) { _, _ -> action() }
            .setNegativeButton(R.string.cancel_action, null)
            .show()
    }

    fun resetWalkingForm() {
        editingWalkingId = null
        showWalkingForm = false
        walkStartTime = LocalTime.now().toString().take(5)
        walkEndTime = LocalTime.now().toString().take(5)
        walkStartInstant = null
        walkEndInstant = null
        walkSteps = ""
        walkDuration = ""
        walkDistance = ""
        walkWeight = ""
        walkEstimate = false
        walkSource = STEP_SOURCE_MANUAL
        walkNotes = ""
        walkTimer.reset()
    }

    fun resetStepForm() {
        showStepForm = false
        stepCount = ""
        stepSource = STEP_SOURCE_MANUAL
        stepEventId = UUID.randomUUID().toString()
    }

    fun resetGoalForm() {
        showGoalForm = false
        goalValue = ""
    }

    fun resetJumpForm() {
        editingJumpId = null
        showJumpForm = false
        jumpStartTime = LocalTime.now().toString().take(5)
        jumpEndTime = LocalTime.now().toString().take(5)
        jumpStartInstant = null
        jumpEndInstant = null
        jumpCount = ""
        advisoryPeaks = 0
        jumpDuration = ""
        jumpRounds = ""
        jumpRest = ""
        jumpWeight = ""
        jumpEstimate = false
        jumpCountSource = COUNT_SOURCE_MANUAL
        jumpNotes = ""
        jumpTimer.reset()
        restTimer.reset()
    }

    fun resetCyclingForm() {
        editingCyclingId = null
        showCyclingForm = false
        rideStartTime = LocalTime.now().toString().take(5)
        rideEndTime = LocalTime.now().toString().take(5)
        rideStartInstant = null
        rideEndInstant = null
        rideDuration = ""
        rideDistance = ""
        ridePause = ""
        rideStationary = ""
        rideNotes = ""
        rideTimer.reset()
        gpsTracker.stop()
    }

    if (stepCollectionEnabled && initialSensorState == STEP_SENSOR_AVAILABLE) {
        LaunchedEffect(stepCollectionEnabled) {
            cardioSensors.observeStepCounter().collect { delta: StepDelta ->
                repository.addStepRecord(
                    StepRecordEntity(
                        id = UUID.randomUUID().toString(),
                        localDate = LocalDate.now().toString(),
                        stepCount = delta.steps,
                        source = STEP_SOURCE_SENSOR,
                        sourceEventId = delta.sourceEventId,
                        createdAt = Instant.now().toString(),
                    ),
                )
            }
        }
    }

    val date = parseLocalDate(selectedDate) ?: LocalDate.now()
    val dayWalks = walkingSessions.filter { it.localDate == selectedDate }
    val dayStepRecords = stepRecords.filter { it.localDate == selectedDate }
    val dayJumps = jumpSessions.filter { it.localDate == selectedDate }
    val dayRides = cyclingSessions.filter { it.localDate == selectedDate }
    val goalEntity = stepGoals.firstOrNull { it.localDate == selectedDate }
    val walking = walkingSummary(walkingSessions, stepRecords, goalEntity, date)
    val jump = jumpRopeSummary(jumpSessions, date)
    val cycling = cyclingSummary(cyclingSessions, date)
    val combined = combinedCardioSummary(
        walkingSessions,
        stepRecords,
        goalEntity,
        jumpSessions,
        cyclingSessions,
        date,
    )
    val strip = if (walking.goalProgress.available && walking.stepGoal != null) {
        calculateProgress(walking.steps ?: 0, walking.stepGoal)
    } else {
        unavailableProgress
    }
    val stepsToday = dailySteps(stepRecords, selectedDate)
    val weekly = analyticsRange == "week"
    val stepSeries = if (weekly) weeklySteps(stepRecords, date, 7) else monthlySteps(stepRecords, date, 6)
    val distanceSeries = if (weekly) weeklyDistance(cyclingSessions, date, 7) else monthlyDistance(cyclingSessions, date, 6)
    val durationSeries = if (weekly) {
        weeklyDuration(walkingSessions, jumpSessions, cyclingSessions, date, 7)
    } else {
        monthlyDuration(walkingSessions, jumpSessions, cyclingSessions, date, 6)
    }
    val speedSeries = cyclingSpeedSeries(cyclingSessions, date, if (weekly) 7 else 30)
    val jumpSeries = jumpRopePerformanceSeries(jumpSessions, date, if (weekly) 7 else 30)
    val stepTotal = stepSeries.mapNotNull { it.value }.sum().takeIf { stepSeries.any { it.value != null } }
    val distanceTotal = distanceSeries.mapNotNull { it.value }.sum().takeIf { distanceSeries.any { it.value != null } }
    val durationTotal = durationSeries.mapNotNull { it.value }.sum().takeIf { durationSeries.any { it.value != null } }
    val estimatedWalkCalories = metCalories(
        "walking",
        walkWeight.toDoubleOrNull(),
        walkDuration.toLongOrNull() ?: walkTimer.seconds,
    )
    val estimatedJumpCalories = metCalories(
        "jump_rope",
        jumpWeight.toDoubleOrNull(),
        jumpDuration.toLongOrNull() ?: jumpTimer.seconds,
    )
    val rideDurationValue = rideDuration.toLongOrNull() ?: rideTimer.seconds
    val gpsDistance = gpsState.distanceMeters.takeIf { gpsState.acceptedPoints > 0 }
    val rideDistanceValue = gpsDistance ?: rideDistance.toDoubleOrNull()
    val rideMoving = cyclingMovingSeconds(
        rideDurationValue,
        ridePause.toLongOrNull(),
        rideStationary.toLongOrNull() ?: (gpsState.stationaryMillis / 1000L),
    )
    val rideAverage = cyclingAverageSpeedKmh(rideDistanceValue, rideMoving)
    val rideQuality = when {
        gpsDistance != null && gpsState.sourceQuality != QUALITY_UNAVAILABLE -> gpsState.sourceQuality
        locationDenied || !cardioSensors.hasLocationPermission() -> QUALITY_UNAVAILABLE
        else -> QUALITY_MANUAL
    }

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ModuleHeader(
            title = stringResource(R.string.nav_cardio),
            subtitle = stringResource(R.string.workspace_subtitle_cardio),
            routeId = AppDestinations.CARDIO,
        )
        ProgressStrip(snapshot = strip, routeId = AppDestinations.CARDIO)
        ModuleStats(
            records = stepsToday?.toString() ?: stringResource(R.string.cardio_quality_unavailable),
            done = jump.jumpCount?.toString() ?: stringResource(R.string.cardio_quality_unavailable),
            open = cycling.distanceMeters?.let { stringResource(R.string.cardio_combined_distance, it / 1000.0) }
                ?: stringResource(R.string.cardio_quality_unavailable),
        )

        SectionCard(title = stringResource(R.string.cardio_section_walking)) {
            OutlinedTextField(
                value = selectedDate,
                onValueChange = { selectedDate = it },
                label = { Text(stringResource(R.string.cardio_field_date)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            TextButton(onClick = { showDatePicker = true }) {
                Text(stringResource(R.string.cardio_field_date))
            }
            stepsToday?.let { Text(stringResource(R.string.cardio_daily_steps, it)) }
            walking.durationSeconds?.let { Text(stringResource(R.string.cardio_daily_duration, it / 60L)) }
            walking.distanceMeters?.let { Text(stringResource(R.string.cardio_daily_distance, it / 1000.0)) }
            walking.calories?.let { Text(stringResource(R.string.cardio_daily_calories, it)) }
            if (goalEntity == null) {
                Text(stringResource(R.string.cardio_no_step_goal), style = MaterialTheme.typography.bodySmall)
            } else {
                Text(
                    stringResource(
                        R.string.cardio_step_goal_progress,
                        walking.steps ?: 0,
                        walking.stepGoal ?: 0,
                        walking.goalProgress.percent ?: 0,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                )
                if (walking.goalProgress.available) {
                    LinearProgressIndicator(
                        progress = { (walking.goalProgress.percent ?: 0).coerceAtMost(100) / 100f },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (walking.goalProgress.overGoal) {
                    Text(
                        stringResource(R.string.cardio_over_step_goal),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }

            Text(
                text = when (initialSensorState) {
                    STEP_SENSOR_AVAILABLE -> stringResource(R.string.cardio_sensor_note)
                    STEP_SENSOR_PERMISSION_DENIED -> stringResource(R.string.cardio_permission_denied)
                    STEP_SENSOR_UNAVAILABLE -> stringResource(R.string.cardio_sensor_unavailable)
                    else -> stringResource(R.string.cardio_sensor_unavailable)
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            TextButton(onClick = { stepPermissionLauncher.launch(Manifest.permission.ACTIVITY_RECOGNITION) }) {
                Text(stringResource(R.string.cardio_request_step_permission))
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { showWalkingForm = !showWalkingForm }) {
                    Text(stringResource(R.string.cardio_new_walking_session))
                }
                TextButton(onClick = { showStepForm = !showStepForm }) {
                    Text(stringResource(R.string.cardio_new_step_record))
                }
                TextButton(onClick = { showGoalForm = !showGoalForm }) {
                    Text(stringResource(R.string.cardio_new_step_goal))
                }
            }

            if (showWalkingForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TimerControls(
                        timer = walkTimer,
                        startLabel = R.string.cardio_start_session,
                        pauseLabel = R.string.cardio_pause_session,
                        resumeLabel = R.string.cardio_resume_session,
                        stopLabel = R.string.cardio_stop_session,
                        onStart = { walkStartInstant = Instant.now().toString() },
                        onStop = {
                            walkEndInstant = Instant.now().toString()
                            walkDuration = walkTimer.seconds.toString()
                        },
                    )
                    OutlinedTextField(walkStartTime, { walkStartTime = it }, label = { Text(stringResource(R.string.cardio_field_start_time)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(walkEndTime, { walkEndTime = it }, label = { Text(stringResource(R.string.cardio_field_end_time)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(walkSteps, { walkSteps = it }, label = { Text(stringResource(R.string.cardio_field_steps)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(walkDuration, { walkDuration = it }, label = { Text(stringResource(R.string.cardio_field_duration)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(walkDistance, { walkDistance = it }, label = { Text(stringResource(R.string.cardio_field_distance)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(walkWeight, { walkWeight = it }, label = { Text(stringResource(R.string.cardio_field_body_weight)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    FilterChip(
                        selected = walkEstimate,
                        onClick = { walkEstimate = !walkEstimate },
                        label = { Text(stringResource(R.string.cardio_estimate_calories)) },
                    )
                    Text(stringResource(R.string.cardio_calorie_assumption), style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = walkSource == STEP_SOURCE_MANUAL,
                            onClick = { walkSource = STEP_SOURCE_MANUAL },
                            label = { Text(stringResource(R.string.cardio_source_manual)) },
                        )
                        FilterChip(
                            selected = walkSource == STEP_SOURCE_SENSOR,
                            onClick = { walkSource = STEP_SOURCE_SENSOR },
                            label = { Text(stringResource(R.string.cardio_source_sensor)) },
                        )
                    }
                    OutlinedTextField(walkNotes, { walkNotes = it }, label = { Text(stringResource(R.string.cardio_field_notes)) }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            val existing = editingWalkingId?.let { id -> walkingSessions.firstOrNull { it.id == id } }
                            val calories = if (walkEstimate) estimatedWalkCalories else null
                            val session = WalkingSessionEntity(
                                id = editingWalkingId ?: UUID.randomUUID().toString(),
                                localDate = selectedDate,
                                startedAt = walkStartInstant ?: instantFor(selectedDate, walkStartTime, existing?.startedAt),
                                endedAt = walkEndInstant ?: instantFor(selectedDate, walkEndTime, existing?.endedAt),
                                stepCount = walkSteps.toIntOrNull() ?: 0,
                                durationSeconds = walkDuration.toLongOrNull() ?: 0L,
                                distanceMeters = walkDistance.toDoubleOrNull(),
                                calories = calories,
                                bodyWeightKg = walkWeight.toDoubleOrNull(),
                                calorieBasis = if (calories != null) "met" else "none",
                                source = walkSource,
                                notes = walkNotes,
                                createdAt = existing?.createdAt.orEmpty(),
                                updatedAt = Instant.now().toString(),
                            )
                            scope.launch {
                                val ok = repository.saveWalkingSession(session)
                                toast(if (!ok) R.string.cardio_invalid else if (editingWalkingId == null) R.string.cardio_saved else R.string.cardio_updated)
                                if (ok) resetWalkingForm()
                            }
                        }) { Text(stringResource(if (editingWalkingId == null) R.string.cardio_save_session else R.string.save_action)) }
                        TextButton(onClick = { resetWalkingForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }

            if (showStepForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(stepCount, { stepCount = it }, label = { Text(stringResource(R.string.cardio_field_steps)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(stepEventId, { stepEventId = it }, label = { Text(stringResource(R.string.cardio_field_source)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = stepSource == STEP_SOURCE_MANUAL,
                            onClick = { stepSource = STEP_SOURCE_MANUAL },
                            label = { Text(stringResource(R.string.cardio_source_manual)) },
                        )
                        FilterChip(
                            selected = stepSource == STEP_SOURCE_SENSOR,
                            onClick = { stepSource = STEP_SOURCE_SENSOR },
                            label = { Text(stringResource(R.string.cardio_source_sensor)) },
                        )
                    }
                    Button(
                        onClick = {
                            scope.launch {
                                val ok = repository.addStepRecord(
                                    localDate = selectedDate,
                                    stepCount = stepCount.toIntOrNull() ?: 0,
                                    source = stepSource,
                                    sourceEventId = stepEventId,
                                )
                                toast(if (ok) R.string.cardio_saved else R.string.cardio_invalid)
                                if (ok) resetStepForm()
                            }
                        },
                    ) { Text(stringResource(R.string.save_action)) }
                }
            }

            if (showGoalForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(goalValue, { goalValue = it }, label = { Text(stringResource(R.string.cardio_field_steps)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Button(onClick = {
                        scope.launch {
                            val ok = repository.setStepGoal(selectedDate, goalValue.toIntOrNull() ?: 0)
                            toast(if (ok) R.string.cardio_saved else R.string.cardio_invalid)
                            if (ok) resetGoalForm()
                        }
                    }) { Text(stringResource(R.string.save_action)) }
                }
            }

            if (dayWalks.isEmpty()) EmptyState(stringResource(R.string.empty_title), stringResource(R.string.cardio_no_walking_sessions))
            dayWalks.forEach { session ->
                RecordRow(
                    title = stringResource(R.string.cardio_field_steps) + ": " + session.stepCount,
                    detail = stringResource(R.string.cardio_field_duration) + ": " + (session.durationSeconds / 60L) + " " + stringResource(R.string.cardio_unit_minutes),
                    onEdit = {
                        showWalkingForm = true
                        editingWalkingId = session.id
                        walkStartTime = runCatching { Instant.parse(session.startedAt).atZone(ZoneId.systemDefault()).toLocalTime().toString().take(5) }.getOrDefault(LocalTime.MIDNIGHT.toString().take(5))
                        walkEndTime = runCatching { Instant.parse(session.endedAt).atZone(ZoneId.systemDefault()).toLocalTime().toString().take(5) }.getOrDefault(LocalTime.MIDNIGHT.toString().take(5))
                        walkSteps = session.stepCount.toString()
                        walkDuration = session.durationSeconds.toString()
                        walkDistance = session.distanceMeters?.toString().orEmpty()
                        walkWeight = session.bodyWeightKg?.toString().orEmpty()
                        walkNotes = session.notes.orEmpty()
                        walkSource = session.source
                    },
                    onDelete = {
                        confirmDelete {
                            scope.launch {
                                repository.deleteWalkingSession(session.id)
                                toast(R.string.cardio_deleted)
                            }
                        }
                    },
                )
            }
            if (dayStepRecords.isEmpty()) EmptyState(stringResource(R.string.empty_title), stringResource(R.string.cardio_no_step_records))
            dayStepRecords.forEach { record ->
                RecordRow(
                    title = stringResource(R.string.cardio_daily_steps, record.stepCount),
                    detail = cardioSourceLabel(record.source),
                    showEdit = false,
                    onEdit = {},
                    onDelete = {
                        confirmDelete {
                            scope.launch {
                                repository.deleteStepRecord(record.id)
                                toast(R.string.cardio_deleted)
                            }
                        }
                    },
                )
            }
        }

        SectionCard(title = stringResource(R.string.cardio_section_jump_rope)) {
            jump.jumpCount?.let { Text(stringResource(R.string.cardio_jump_rope_count, it)) }
            jump.durationSeconds?.let { Text(stringResource(R.string.cardio_daily_duration, it / 60L)) }
            jump.jumpsPerMinute?.let { Text(stringResource(R.string.cardio_jump_rope_performance, it)) }
            jump.rounds?.let { Text(stringResource(R.string.cardio_jump_rope_rounds, it)) }
            jump.restSeconds?.let { Text(stringResource(R.string.cardio_jump_rope_rest, it / 60L)) }
            Text(stringResource(R.string.cardio_sensor_note), style = MaterialTheme.typography.labelSmall)
            TextButton(onClick = { showJumpForm = !showJumpForm }) {
                Text(stringResource(if (showJumpForm) R.string.cancel_action else R.string.cardio_new_jump_rope_session))
            }
            if (showJumpForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TimerControls(
                        timer = jumpTimer,
                        startLabel = R.string.cardio_start_timer,
                        pauseLabel = R.string.cardio_pause_timer,
                        resumeLabel = R.string.cardio_resume_timer,
                        stopLabel = R.string.cardio_stop_timer,
                        onStart = { jumpStartInstant = Instant.now().toString() },
                        onStop = {
                            jumpEndInstant = Instant.now().toString()
                            jumpDuration = jumpTimer.seconds.toString()
                        },
                    )
                    OutlinedTextField(jumpStartTime, { jumpStartTime = it }, label = { Text(stringResource(R.string.cardio_field_start_time)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(jumpEndTime, { jumpEndTime = it }, label = { Text(stringResource(R.string.cardio_field_end_time)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(jumpCount, { jumpCount = it }, label = { Text(stringResource(R.string.cardio_field_steps)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    if (cardioSensors.jumpMotionState() == JUMP_MOTION_AVAILABLE) {
                        Text(
                            text = stringResource(R.string.cardio_jump_advisory_label, advisoryPeaks),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        TextButton(onClick = {
                            jumpCount = ((jumpCount.toIntOrNull() ?: 0) + 1).toString()
                            jumpCountSource = COUNT_SOURCE_SENSOR_ASSISTED
                        }) {
                            Text(stringResource(R.string.cardio_jump_add_advisory))
                        }
                    } else {
                        Text(
                            text = stringResource(R.string.cardio_jump_motion_unavailable),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    OutlinedTextField(jumpDuration, { jumpDuration = it }, label = { Text(stringResource(R.string.cardio_field_duration)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(jumpRounds, { jumpRounds = it }, label = { Text(stringResource(R.string.cardio_field_rounds)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(jumpRest, { jumpRest = it }, label = { Text(stringResource(R.string.cardio_field_rest)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    TimerControls(
                        timer = restTimer,
                        startLabel = R.string.cardio_rest_timer,
                        pauseLabel = R.string.cardio_pause_timer,
                        resumeLabel = R.string.cardio_resume_timer,
                        stopLabel = R.string.cardio_stop_timer,
                        onStart = {},
                        onStop = { jumpRest = restTimer.seconds.toString() },
                    )
                    OutlinedTextField(jumpWeight, { jumpWeight = it }, label = { Text(stringResource(R.string.cardio_field_body_weight)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    FilterChip(
                        selected = jumpEstimate,
                        onClick = { jumpEstimate = !jumpEstimate },
                        label = { Text(stringResource(R.string.cardio_estimate_calories)) },
                    )
                    Text(stringResource(R.string.cardio_calorie_assumption), style = MaterialTheme.typography.labelSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = jumpCountSource == COUNT_SOURCE_MANUAL,
                            onClick = { jumpCountSource = COUNT_SOURCE_MANUAL },
                            label = { Text(stringResource(R.string.cardio_count_source_manual)) },
                        )
                        FilterChip(
                            selected = jumpCountSource == COUNT_SOURCE_SENSOR_ASSISTED,
                            onClick = { jumpCountSource = COUNT_SOURCE_SENSOR_ASSISTED },
                            label = { Text(stringResource(R.string.cardio_count_source_sensor_assisted)) },
                        )
                    }
                    OutlinedTextField(jumpNotes, { jumpNotes = it }, label = { Text(stringResource(R.string.cardio_field_notes)) }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            val existing = editingJumpId?.let { id -> jumpSessions.firstOrNull { it.id == id } }
                            val calories = if (jumpEstimate) estimatedJumpCalories else null
                            val session = JumpRopeSessionEntity(
                                id = editingJumpId ?: UUID.randomUUID().toString(),
                                localDate = selectedDate,
                                startedAt = jumpStartInstant ?: instantFor(selectedDate, jumpStartTime, existing?.startedAt),
                                endedAt = jumpEndInstant ?: instantFor(selectedDate, jumpEndTime, existing?.endedAt),
                                durationSeconds = jumpDuration.toLongOrNull() ?: 0L,
                                jumpCount = jumpCount.toIntOrNull() ?: 0,
                                countSource = jumpCountSource,
                                rounds = jumpRounds.toIntOrNull() ?: 0,
                                restSeconds = jumpRest.toLongOrNull() ?: 0L,
                                calories = calories,
                                bodyWeightKg = jumpWeight.toDoubleOrNull(),
                                calorieBasis = if (calories != null) "met" else "none",
                                notes = jumpNotes,
                                createdAt = existing?.createdAt.orEmpty(),
                                updatedAt = Instant.now().toString(),
                            )
                            scope.launch {
                                val ok = repository.saveJumpRopeSession(session)
                                toast(if (!ok) R.string.cardio_invalid else if (editingJumpId == null) R.string.cardio_saved else R.string.cardio_updated)
                                if (ok) resetJumpForm()
                            }
                        }) { Text(stringResource(if (editingJumpId == null) R.string.cardio_save_session else R.string.save_action)) }
                        TextButton(onClick = { resetJumpForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }
            if (dayJumps.isEmpty()) EmptyState(stringResource(R.string.empty_title), stringResource(R.string.cardio_no_jump_rope_sessions))
            dayJumps.forEach { session ->
                RecordRow(
                    title = stringResource(R.string.cardio_jump_rope_count, session.jumpCount),
                    detail = listOf(
                        stringResource(R.string.cardio_field_duration) + ": " + (session.durationSeconds / 60L),
                        countSourceLabel(session.countSource),
                    ).joinToString(" · "),
                    onEdit = {
                        showJumpForm = true
                        editingJumpId = session.id
                        jumpCount = session.jumpCount.toString()
                        jumpDuration = session.durationSeconds.toString()
                        jumpRounds = session.rounds.toString()
                        jumpRest = session.restSeconds.toString()
                        jumpWeight = session.bodyWeightKg?.toString().orEmpty()
                        jumpNotes = session.notes.orEmpty()
                        jumpCountSource = session.countSource
                    },
                    onDelete = {
                        confirmDelete {
                            scope.launch {
                                repository.deleteJumpRopeSession(session.id)
                                toast(R.string.cardio_deleted)
                            }
                        }
                    },
                )
            }
        }

        SectionCard(title = stringResource(R.string.cardio_section_cycling)) {
            Text(
                text = when {
                    locationDenied || !cardioSensors.hasLocationPermission() -> stringResource(R.string.cardio_permission_denied)
                    gpsState.status == GPS_SIGNAL_LOST -> stringResource(R.string.cardio_gps_signal_lost)
                    gpsState.rejectedPoints > 0 -> stringResource(R.string.cardio_gps_inaccurate)
                    else -> stringResource(R.string.cardio_sensor_note)
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            TextButton(onClick = {
                locationPermissionLauncher.launch(cardioSensors.locationPermissions())
            }) { Text(stringResource(R.string.cardio_request_location_permission)) }
            ValueRow(
                label = stringResource(R.string.cardio_field_source),
                value = qualityLabel(gpsState.sourceQuality),
            )
            gpsState.currentSpeedKmh?.let {
                Text(stringResource(R.string.cardio_cycling_current_speed, it))
            }
            gpsState.distanceMeters?.let {
                Text(stringResource(R.string.cardio_daily_distance, it / 1000.0))
            }
            if (gpsState.acceptedPoints == 0) {
                Text(stringResource(R.string.cardio_manual_fallback), style = MaterialTheme.typography.labelSmall)
            }
            TextButton(onClick = { showCyclingForm = !showCyclingForm }) {
                Text(stringResource(if (showCyclingForm) R.string.cancel_action else R.string.cardio_new_cycling_session))
            }
            if (showCyclingForm) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    TimerControls(
                        timer = rideTimer,
                        startLabel = R.string.cardio_start_session,
                        pauseLabel = R.string.cardio_pause_session,
                        resumeLabel = R.string.cardio_resume_session,
                        stopLabel = R.string.cardio_stop_session,
                        onStart = {
                            rideStartInstant = Instant.now().toString()
                            gpsTracker.start()
                        },
                        onPause = { gpsTracker.pause() },
                        onResume = { gpsTracker.resume() },
                        onStop = {
                            rideEndInstant = Instant.now().toString()
                            rideDuration = rideTimer.seconds.toString()
                            gpsDistance?.let { rideDistance = (it / 1000.0).toString() }
                            rideStationary = (gpsState.stationaryMillis / 1000L).toString()
                            gpsTracker.stop()
                        },
                    )
                    OutlinedTextField(rideStartTime, { rideStartTime = it }, label = { Text(stringResource(R.string.cardio_field_start_time)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(rideEndTime, { rideEndTime = it }, label = { Text(stringResource(R.string.cardio_field_end_time)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(rideDuration, { rideDuration = it }, label = { Text(stringResource(R.string.cardio_field_duration)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(rideDistance, { rideDistance = it }, label = { Text(stringResource(R.string.cardio_field_distance)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(ridePause, { ridePause = it }, label = { Text(stringResource(R.string.cardio_field_pause)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    OutlinedTextField(rideStationary, { rideStationary = it }, label = { Text(stringResource(R.string.cardio_field_stationary)) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    rideAverage?.let { Text(stringResource(R.string.cardio_cycling_avg_speed, it)) }
                    gpsState.maxSpeedKmh?.takeIf { gpsState.acceptedPoints > 0 }?.let {
                        Text(stringResource(R.string.cardio_cycling_max_speed, it))
                    }
                    ValueRow(label = stringResource(R.string.cardio_field_source), value = qualityLabel(rideQuality))
                    OutlinedTextField(rideNotes, { rideNotes = it }, label = { Text(stringResource(R.string.cardio_field_notes)) }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = {
                            val existing = editingCyclingId?.let { id -> cyclingSessions.firstOrNull { it.id == id } }
                            val session = CyclingSessionEntity(
                                id = editingCyclingId ?: UUID.randomUUID().toString(),
                                localDate = selectedDate,
                                startedAt = rideStartInstant ?: instantFor(selectedDate, rideStartTime, existing?.startedAt),
                                endedAt = rideEndInstant ?: instantFor(selectedDate, rideEndTime, existing?.endedAt),
                                durationSeconds = rideDurationValue,
                                movingSeconds = rideMoving ?: 0L,
                                pauseSeconds = ridePause.toLongOrNull() ?: 0L,
                                stationarySeconds = rideStationary.toLongOrNull() ?: 0L,
                                distanceMeters = rideDistanceValue,
                                averageSpeedKmh = rideAverage,
                                maxSpeedKmh = gpsState.maxSpeedKmh.takeIf { gpsState.acceptedPoints > 0 },
                                sourceQuality = rideQuality,
                                notes = rideNotes,
                                createdAt = existing?.createdAt.orEmpty(),
                                updatedAt = Instant.now().toString(),
                            )
                            scope.launch {
                                val ok = repository.saveCyclingSession(session)
                                toast(if (!ok) R.string.cardio_invalid else if (editingCyclingId == null) R.string.cardio_saved else R.string.cardio_updated)
                                if (ok) resetCyclingForm()
                            }
                        }) { Text(stringResource(if (editingCyclingId == null) R.string.cardio_save_session else R.string.save_action)) }
                        TextButton(onClick = { resetCyclingForm() }) { Text(stringResource(R.string.cancel_action)) }
                    }
                }
            }
            if (dayRides.isEmpty()) EmptyState(stringResource(R.string.empty_title), stringResource(R.string.cardio_no_cycling_sessions))
            dayRides.forEach { session ->
                RecordRow(
                    title = session.distanceMeters?.let { stringResource(R.string.cardio_combined_distance, it / 1000.0) }
                        ?: stringResource(R.string.cardio_quality_unavailable),
                    detail = listOfNotNull(
                        session.movingSeconds.takeIf { it > 0L }?.let { (it / 60L).toString() + " " + stringResource(R.string.cardio_unit_minutes) },
                        qualityLabel(session.sourceQuality),
                    ).joinToString(" · "),
                    onEdit = {
                        showCyclingForm = true
                        editingCyclingId = session.id
                        rideDuration = session.durationSeconds.toString()
                        rideDistance = session.distanceMeters?.toString().orEmpty()
                        ridePause = session.pauseSeconds.toString()
                        rideStationary = session.stationarySeconds.toString()
                        rideNotes = session.notes.orEmpty()
                    },
                    onDelete = {
                        confirmDelete {
                            scope.launch {
                                repository.deleteCyclingSession(session.id)
                                toast(R.string.cardio_deleted)
                            }
                        }
                    },
                )
            }
        }

        SectionCard(title = stringResource(R.string.cardio_section_analytics)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = weekly,
                    onClick = { analyticsRange = "week" },
                    label = { Text(stringResource(R.string.recurrence_weekly)) },
                )
                FilterChip(
                    selected = !weekly,
                    onClick = { analyticsRange = "month" },
                    label = { Text(stringResource(R.string.recurrence_monthly)) },
                )
            }
            combined.durationSeconds?.let { Text(stringResource(R.string.cardio_combined_duration, it / 60L)) }
            combined.distanceMeters?.let { Text(stringResource(R.string.cardio_combined_distance, it / 1000.0)) }
            combined.calories?.let { Text(stringResource(R.string.cardio_combined_calories, it)) }
            stepTotal?.let {
                Text(stringResource(if (weekly) R.string.cardio_week_steps else R.string.cardio_month_steps, it.toInt()))
            }
            distanceTotal?.let {
                Text(stringResource(if (weekly) R.string.cardio_week_distance else R.string.cardio_month_distance, it / 1000.0))
            }
            durationTotal?.let {
                Text(stringResource(if (weekly) R.string.cardio_week_duration else R.string.cardio_month_duration, it.toLong() / 60L))
            }
            if (!combined.available) {
                EmptyState(stringResource(R.string.empty_title), stringResource(R.string.cardio_no_analytics))
            } else {
                Text(stringResource(R.string.cardio_cycling_speed_trend), style = MaterialTheme.typography.labelMedium)
                CardioTrendBars(speedSeries.map { it.value }, MaterialTheme.colorScheme.primary)
                Text(stringResource(R.string.cardio_cycling_distance_trend), style = MaterialTheme.typography.labelMedium)
                CardioTrendBars(distanceSeries.map { it.value }, MaterialTheme.colorScheme.tertiary)
                Text(
                    stringResource(R.string.cardio_section_jump_rope) + " · " + stringResource(R.string.cardio_field_duration),
                    style = MaterialTheme.typography.labelMedium,
                )
                CardioTrendBars(jumpSeries.map { it.value }, MaterialTheme.colorScheme.secondary)
                Text(
                    stringResource(R.string.cardio_section_walking) + " · " + stringResource(R.string.cardio_field_steps),
                    style = MaterialTheme.typography.labelMedium,
                )
                CardioTrendBars(stepSeries.map { it.value }, MaterialTheme.colorScheme.primary)
                Text(stringResource(R.string.cardio_field_duration), style = MaterialTheme.typography.labelMedium)
                CardioTrendBars(durationSeries.map { it.value }, MaterialTheme.colorScheme.secondary)
            }
            Text(stringResource(R.string.cardio_analytics_note), style = MaterialTheme.typography.labelSmall)
        }
    }

    if (showDatePicker) {
        val state = rememberDatePickerState(initialSelectedDateMillis = dateMillis(selectedDate))
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        selectedDate = Instant.ofEpochMilli(millis)
                            .atZone(ZoneId.systemDefault()).toLocalDate().toString()
                    }
                    showDatePicker = false
                }) { Text(stringResource(R.string.save_action)) }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text(stringResource(R.string.cancel_action)) }
            },
        ) {
            DatePicker(state = state)
        }
    }
}

@Composable
private fun TimerControls(
    timer: ElapsedTimer,
    startLabel: Int,
    pauseLabel: Int,
    resumeLabel: Int,
    stopLabel: Int,
    onStart: () -> Unit,
    onPause: () -> Unit = {},
    onResume: () -> Unit = {},
    onStop: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Button(onClick = {
            if (!timer.running && timer.seconds == 0L) onStart()
            timer.start()
        }) { Text(stringResource(startLabel)) }
        TextButton(
            enabled = timer.running,
            onClick = { timer.pause(); onPause() },
        ) { Text(stringResource(pauseLabel)) }
        TextButton(
            enabled = !timer.running && timer.seconds > 0L,
            onClick = { timer.resume(); onResume() },
        ) { Text(stringResource(resumeLabel)) }
        TextButton(
            enabled = timer.seconds > 0L,
            onClick = { timer.stop(); onStop() },
        ) { Text(stringResource(stopLabel)) }
        Text(stringResource(R.string.cardio_field_duration) + ": " + (timer.seconds / 60L) + " " + stringResource(R.string.cardio_unit_minutes))
    }
}

@Composable
private fun RecordRow(
    title: String,
    detail: String,
    showEdit: Boolean = true,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(detail, style = MaterialTheme.typography.bodySmall)
        }
        if (showEdit) {
            TextButton(onClick = onEdit) { Text(stringResource(R.string.edit_action)) }
        }
        TextButton(onClick = onDelete) { Text(stringResource(R.string.delete_action)) }
    }
}

package com.myflow.app.sensor

import android.Manifest
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import com.myflow.app.data.CyclingGpsSample
import com.myflow.app.data.QUALITY_GPS_ACCEPTED
import com.myflow.app.data.QUALITY_GPS_FILTERED
import com.myflow.app.data.QUALITY_UNAVAILABLE
import com.myflow.app.data.accuracyAccepted
import com.myflow.app.data.haversineMeters
import com.myflow.app.data.speedAccepted
import com.myflow.app.data.stationarySpeed
import com.myflow.app.data.timeDeltaAccepted
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import java.time.LocalDate
import kotlin.math.sqrt

const val STEP_SENSOR_AVAILABLE: String = "available"
const val STEP_SENSOR_UNAVAILABLE: String = "unavailable"
const val STEP_SENSOR_PERMISSION_DENIED: String = "permission_denied"
const val STEP_SENSOR_UNSUPPORTED_API: String = "unsupported_api"

const val JUMP_MOTION_AVAILABLE: String = "available"
const val JUMP_MOTION_UNAVAILABLE: String = "unavailable"
const val JUMP_MOTION_MAGNITUDE_THRESHOLD: Float = 12f
const val JUMP_MOTION_MIN_INTERVAL_NANOS: Long = 250_000_000L

const val GPS_TRACKING: String = "tracking"
const val GPS_SIGNAL_LOST: String = "signal_lost"
const val GPS_PERMISSION_DENIED: String = "permission_denied"
const val GPS_FILTERED: String = "filtered"

/** A positive delta from Android's cumulative step counter. The first event is a baseline only. */
data class StepDelta(
    val steps: Int,
    val sensorTimestampNanos: Long,
    val localDate: String = LocalDate.now().toString(),
) {
    val sourceEventId: String = "sensor:$sensorTimestampNanos"
}

class CardioSensors(private val context: Context) {
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

    private val stepCounter: Sensor? =
        sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)?.takeIf { it.type == Sensor.TYPE_STEP_COUNTER }

    private val accelerometer: Sensor? =
        sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.takeIf { it.type == Sensor.TYPE_ACCELEROMETER }

    fun jumpMotionState(): String = if (accelerometer == null) {
        JUMP_MOTION_UNAVAILABLE
    } else {
        JUMP_MOTION_AVAILABLE
    }

    fun hasStepPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            context.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED

    fun stepSensorState(): String = when {
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q -> STEP_SENSOR_UNSUPPORTED_API
        !hasStepPermission() -> STEP_SENSOR_PERMISSION_DENIED
        stepCounter == null -> STEP_SENSOR_UNAVAILABLE
        else -> STEP_SENSOR_AVAILABLE
    }

    /**
     * Emits only positive deltas computed from the device's cumulative counter. No steps are
     * invented when permission is denied or the sensor is absent, and the listener is removed
     * when collection stops.
     */
    fun observeStepCounter(): Flow<StepDelta> = callbackFlow {
        if (!hasStepPermission() || stepCounter == null) {
            close()
            return@callbackFlow
        }
        var lastTotal: Long? = null
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.sensor?.type != Sensor.TYPE_STEP_COUNTER || event.values.isEmpty()) return
                val total = event.values[0].toLong()
                val previous = lastTotal
                lastTotal = total
                if (previous == null || total <= previous) return
                val delta = (total - previous).toInt().coerceAtLeast(1)
                trySend(StepDelta(delta, event.timestamp)).isSuccess
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }
        val registered = sensorManager?.registerListener(
            listener,
            stepCounter,
            SensorManager.SENSOR_DELAY_NORMAL,
        ) ?: false
        if (!registered) {
            close()
            return@callbackFlow
        }
        awaitClose { sensorManager?.unregisterListener(listener) }
    }

    /**
     * Advisory accelerometer peaks only. These are candidates for a user to review, never a
     * verified jump count: device placement and attachments change the signal. The listener is
     * removed as soon as collection stops.
     */
    fun observeAdvisoryMotion(): Flow<Long> = callbackFlow {
        val sensor = accelerometer
        if (sensor == null) {
            close()
            return@callbackFlow
        }
        var lastPeakNanos: Long? = null
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.sensor?.type != Sensor.TYPE_ACCELEROMETER || event.values.size < 3) return
                val magnitude = sqrt(
                    event.values[0] * event.values[0] +
                        event.values[1] * event.values[1] +
                        event.values[2] * event.values[2],
                )
                val last = lastPeakNanos
                if (magnitude < JUMP_MOTION_MAGNITUDE_THRESHOLD ||
                    (last != null && event.timestamp - last < JUMP_MOTION_MIN_INTERVAL_NANOS)
                ) {
                    return
                }
                lastPeakNanos = event.timestamp
                trySend(event.timestamp).isSuccess
            }

            override fun onAccuracyChanged(s: Sensor?, accuracy: Int) = Unit
        }
        val registered = sensorManager?.registerListener(
            listener,
            sensor,
            SensorManager.SENSOR_DELAY_NORMAL,
        ) ?: false
        if (!registered) {
            close()
            return@callbackFlow
        }
        awaitClose { sensorManager?.unregisterListener(listener) }
    }

    fun locationPermissions(): Array<String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        } else {
            arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION)
        }

    fun hasLocationPermission(): Boolean {
        val granted = android.content.pm.PackageManager.PERMISSION_GRANTED
        return context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == granted ||
            context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == granted
    }

    fun gpsProviderAvailable(): Boolean =
        locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true

    internal fun locationManagerForTracker(): LocationManager? = locationManager
}

data class CyclingGpsState(
    val status: String = QUALITY_UNAVAILABLE,
    val currentSpeedKmh: Double? = null,
    val distanceMeters: Double? = null,
    val maxSpeedKmh: Double? = null,
    val acceptedPoints: Int = 0,
    val rejectedPoints: Int = 0,
    val stationaryMillis: Long = 0L,
) {
    /** Stored quality label; a denied or filtered fix is never labelled as accepted GPS. */
    val sourceQuality: String = when {
        status == GPS_PERMISSION_DENIED || status == GPS_SIGNAL_LOST -> QUALITY_UNAVAILABLE
        acceptedPoints > 0 && rejectedPoints == 0 -> QUALITY_GPS_ACCEPTED
        acceptedPoints > 0 -> QUALITY_GPS_FILTERED
        rejectedPoints > 0 -> QUALITY_GPS_FILTERED
        else -> QUALITY_UNAVAILABLE
    }
}

/**
 * Foreground-only GPS listener. Registration exists strictly between start/resume and pause/stop;
 * there is no background service, no Play Services dependency and no stored route history.
 */
class CyclingGpsTracker(private val sensors: CardioSensors) {
    private val _state = MutableStateFlow(CyclingGpsState())
    val state: StateFlow<CyclingGpsState> = _state

    private var listener: LocationListener? = null
    private var active = false
    private var lastAccepted: CyclingGpsSample? = null
    private var distanceMeters = 0.0
    private var maxSpeedKmh: Double? = null
    private var acceptedPoints = 0
    private var rejectedPoints = 0
    private var stationaryMillis = 0L
    private var hasDistance = false

    fun start() {
        if (active) return
        reset()
        if (!sensors.hasLocationPermission()) {
            _state.value = CyclingGpsState(status = GPS_PERMISSION_DENIED)
            return
        }
        if (!sensors.gpsProviderAvailable()) {
            _state.value = CyclingGpsState(status = GPS_SIGNAL_LOST)
            return
        }
        register()
    }

    fun resume() {
        if (active) return
        if (!sensors.hasLocationPermission()) {
            _state.value = currentState(status = GPS_PERMISSION_DENIED)
            return
        }
        if (!sensors.gpsProviderAvailable()) {
            _state.value = currentState(status = GPS_SIGNAL_LOST)
            return
        }
        register()
    }

    fun pause() {
        unregister()
        _state.value = currentState(status = GPS_FILTERED)
    }

    fun stop() {
        unregister()
        _state.value = currentState(status = QUALITY_GPS_FILTERED, forceQuality = true)
    }

    fun dispose() {
        unregister()
        reset()
        _state.value = CyclingGpsState()
    }

    private fun reset() {
        lastAccepted = null
        distanceMeters = 0.0
        maxSpeedKmh = null
        acceptedPoints = 0
        rejectedPoints = 0
        stationaryMillis = 0L
        hasDistance = false
    }

    private fun currentState(
        status: String = _state.value.status,
        forceQuality: Boolean = false,
        currentSpeed: Double? = null,
    ): CyclingGpsState {
        val base = CyclingGpsState(
            status = status,
            currentSpeedKmh = currentSpeed,
            distanceMeters = distanceMeters.takeIf { hasDistance },
            maxSpeedKmh = maxSpeedKmh,
            acceptedPoints = acceptedPoints,
            rejectedPoints = rejectedPoints,
            stationaryMillis = stationaryMillis,
        )
        if (!forceQuality) return base
        return base.copy(status = base.sourceQuality)
    }

    private fun register() {
        val manager = sensors.locationManagerForTracker() ?: run {
            _state.value = currentState(status = GPS_SIGNAL_LOST)
            return
        }
        val callback = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                onFix(location)
            }

            override fun onProviderDisabled(provider: String) {
                _state.value = currentState(status = GPS_SIGNAL_LOST)
            }

            override fun onProviderEnabled(provider: String) = Unit

            @Suppress("DEPRECATION")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
        }
        val registered = runCatching {
            manager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1_000L,
                5f,
                callback,
            )
        }.isSuccess
        if (!registered) {
            _state.value = currentState(status = GPS_SIGNAL_LOST)
            return
        }
        listener = callback
        active = true
        _state.value = currentState(status = GPS_TRACKING)
    }

    private fun onFix(location: Location) {
        val speedKmh = if (location.hasSpeed()) location.speed * 3.6 else null
        val sample = CyclingGpsSample(
            accuracyMeters = location.accuracy.toDouble(),
            speedKmh = speedKmh,
            timeMillis = location.time,
            latitude = location.latitude,
            longitude = location.longitude,
        )
        // A fix with no speed reading can still contribute distance, but never a speed value.
        val usable = accuracyAccepted(sample.accuracyMeters) &&
            (sample.speedKmh == null || speedAccepted(sample.speedKmh))
        if (!usable) {
            rejectedPoints += 1
            _state.value = currentState(status = QUALITY_GPS_FILTERED)
            return
        }
        acceptedPoints += 1
        val previous = lastAccepted
        val delta = if (previous?.timeMillis != null && sample.timeMillis != null) {
            sample.timeMillis - previous.timeMillis
        } else {
            null
        }
        if (delta != null && delta >= 0L && !timeDeltaAccepted(delta)) {
            lastAccepted = sample
            _state.value = currentState(status = QUALITY_GPS_FILTERED, currentSpeed = sample.speedKmh)
            return
        }
        val stationary = stationarySpeed(sample.speedKmh)
        if (stationary && delta != null && delta > 0L) stationaryMillis += delta
        if (previous != null && !stationary) {
            val step = haversineMeters(
                previous.latitude,
                previous.longitude,
                sample.latitude,
                sample.longitude,
            )
            if (step != null) {
                distanceMeters += step
                hasDistance = true
            }
        }
        if (sample.speedKmh != null) {
            val currentMax = maxSpeedKmh
            if (currentMax == null || sample.speedKmh > currentMax) maxSpeedKmh = sample.speedKmh
        }
        lastAccepted = sample
        _state.value = currentState(status = GPS_TRACKING, currentSpeed = sample.speedKmh)
    }

    private fun unregister() {
        listener?.let { callback -> sensors.locationManagerForTracker()?.removeUpdates(callback) }
        listener = null
        active = false
    }
}

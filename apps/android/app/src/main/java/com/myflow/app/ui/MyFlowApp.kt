package com.myflow.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.myflow.app.R
import com.myflow.app.ui.theme.GeneratedTokens
import com.myflow.app.ui.theme.MyFlowTheme
import com.myflow.app.ui.theme.tokenColor
import com.myflow.app.ui.theme.tokenPalette
import com.myflow.app.ui.theme.tokenRoleColor

private val semanticRoleLabels: List<Pair<String, Int>> = listOf(
    "background" to R.string.role_background,
    "surface" to R.string.role_surface,
    "surfaceAlt" to R.string.role_surface_alt,
    "primary" to R.string.role_primary,
    "growth" to R.string.role_growth,
    "highlight" to R.string.role_highlight,
    "text" to R.string.role_text,
    "muted" to R.string.role_muted,
    "border" to R.string.role_border,
    "success" to R.string.role_success,
    "warning" to R.string.role_warning,
    "danger" to R.string.role_danger,
    "disabled" to R.string.role_disabled,
    "focus" to R.string.role_focus,
    "widgetBackground" to R.string.role_widget_background,
    "panel" to R.string.role_panel,
)

@Composable
fun MyFlowApp() {
    val darkMode = isSystemInDarkTheme()
    val presetId = GeneratedTokens.presetIds.first()
    val fontPreference = GeneratedTokens.fontPreferenceIds.first()

    MyFlowTheme(
        presetId = presetId,
        darkMode = darkMode,
        fontPreference = fontPreference,
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            ParityScreen(presetId = presetId, darkMode = darkMode)
        }
    }
}

@Composable
private fun ParityScreen(presetId: String, darkMode: Boolean) {
    val palette = tokenPalette(presetId, darkMode)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Text(
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.displayLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("pill").dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 14.dp, vertical = 8.dp),
        ) {
            Text(
                text = stringResource(R.string.status_phase3),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        SectionHeading(stringResource(R.string.section_primitives))
        GeneratedTokens.primitiveColors.forEach { (key, hex) ->
            ColorSwatch(
                name = primitiveColorLabel(key),
                color = tokenColor(hex),
            )
        }

        SectionHeading(stringResource(R.string.section_semantic_roles))
        semanticRoleLabels.forEach { (role, labelRes) ->
            ColorSwatch(
                name = stringResource(labelRes),
                color = tokenRoleColor(palette, role),
            )
        }

        SectionHeading(stringResource(R.string.section_typography))
        TypeSample(
            label = stringResource(R.string.label_app_title),
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.displayLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_heading),
            text = stringResource(R.string.sample_heading),
            style = MaterialTheme.typography.headlineLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_section),
            text = stringResource(R.string.sample_section),
            style = MaterialTheme.typography.titleLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_body),
            text = stringResource(R.string.sample_body),
            style = MaterialTheme.typography.bodyLarge,
        )
        TypeSample(
            label = stringResource(R.string.label_statistics),
            text = stringResource(R.string.sample_statistics),
            style = MaterialTheme.typography.headlineMedium,
        )
    }
}

@Composable
private fun primitiveColorLabel(key: String): String = stringResource(
    when (key) {
        "parchment" -> R.string.color_parchment
        "paper" -> R.string.color_paper
        "leather" -> R.string.color_leather
        "sage" -> R.string.color_sage
        "terracotta" -> R.string.color_terracotta
        "ink" -> R.string.color_ink
        else -> R.string.color_custom
    }
)

@Composable
private fun SectionHeading(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleLarge,
        color = MaterialTheme.colorScheme.primary,
    )
}

@Composable
private fun ColorSwatch(name: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("md").dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(GeneratedTokens.radii.getValue("sm").dp))
                .background(color),
        )
        Spacer(Modifier.width(12.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun TypeSample(label: String, text: String, style: TextStyle) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = text,
            style = style,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

package com.myflow.app.ui.theme

import android.graphics.Color as AndroidColor
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Parses a six-digit token hex value into a Compose color. */
fun tokenColor(hex: String): Color = Color(AndroidColor.parseColor(hex))

/** Resolves a preset + mode to the generated role -> hex map. */
fun tokenPalette(presetId: String, darkMode: Boolean): Map<String, String> {
    val byMode = GeneratedTokens.colors[presetId]
        ?: GeneratedTokens.colors.getValue(GeneratedTokens.presetIds.first())
    val mode = if (darkMode) "dark" else "light"
    return byMode[mode] ?: byMode.getValue("light")
}

/** Resolves one semantic role from a token palette, with safe generated fallbacks. */
fun tokenRoleColor(palette: Map<String, String>, role: String): Color {
    val fallback = GeneratedTokens.colors
        .getValue(GeneratedTokens.presetIds.first())
        .getValue("light")
    val hex = palette[role] ?: fallback[role] ?: GeneratedTokens.primitiveColors.getValue("ink")
    return tokenColor(hex)
}

private fun familyKeyFor(slot: String, fontPreference: String): String {
    val preference = GeneratedTokens.fontPreferences[fontPreference]
        ?: GeneratedTokens.fontPreferences.getValue(GeneratedTokens.fontPreferenceIds.first())
    return preference[slot] ?: slot
}

/**
 * Maps generated font family names onto platform fallbacks. We deliberately avoid
 * anything Google/Inter/Roboto-like as the identity: display and heading slots
 * resolve to the generic serif fallback, while body slots use sans-serif.
 */
private fun fontFamilyFor(slot: String, fontPreference: String): FontFamily {
    val familyKey = familyKeyFor(slot, fontPreference)
    val names = GeneratedTokens.fontFamilies[familyKey].orEmpty()
    return when {
        names.any { it.contains("sans", ignoreCase = true) } -> FontFamily.SansSerif
        names.any {
            it.equals("serif", ignoreCase = true) ||
                it.equals("Georgia", ignoreCase = true) ||
                it.equals("Cormorant Garamond", ignoreCase = true) ||
                it.equals("Libre Baskerville", ignoreCase = true) ||
                it.equals("Lora", ignoreCase = true)
        } -> FontFamily.Serif

        slot == "body" -> FontFamily.SansSerif
        else -> FontFamily.Serif
    }
}

private fun textStyle(
    slot: String,
    sizeKey: String,
    weightKey: String,
    lineHeightKey: String,
    fontPreference: String,
): TextStyle {
    val size = GeneratedTokens.fontSizeScale.getValue(sizeKey).toFloat()
    val lineHeight = GeneratedTokens.lineHeight.getValue(lineHeightKey).toFloat()
    return TextStyle(
        fontFamily = fontFamilyFor(slot, fontPreference),
        fontSize = size.sp,
        fontWeight = FontWeight(GeneratedTokens.weights.getValue(weightKey)),
        lineHeight = (size * lineHeight).sp,
    )
}

private fun tokenTypography(fontPreference: String): Typography {
    fun style(slot: String, size: String, weight: String, lineHeight: String): TextStyle =
        textStyle(slot, size, weight, lineHeight, fontPreference)

    return Typography(
        displayLarge = style("appTitle", "4xl", "strong", "compact"),
        displayMedium = style("heading", "3xl", "strong", "normal"),
        headlineLarge = style("heading", "3xl", "strong", "normal"),
        headlineMedium = style("statistics", "2xl", "strong", "compact"),
        headlineSmall = style("heading", "xl", "strong", "normal"),
        titleLarge = style("section", "xl", "medium", "normal"),
        titleMedium = style("section", "lg", "medium", "normal"),
        titleSmall = style("section", "base", "medium", "normal"),
        bodyLarge = style("body", "base", "regular", "normal"),
        bodyMedium = style("body", "sm", "regular", "normal"),
        bodySmall = style("body", "xs", "regular", "normal"),
        labelLarge = style("body", "sm", "medium", "normal"),
        labelMedium = style("body", "xs", "medium", "normal"),
        labelSmall = style("body", "xs", "regular", "compact"),
    )
}

private fun tokenColorScheme(palette: Map<String, String>, darkMode: Boolean): ColorScheme {
    val primary = tokenRoleColor(palette, "primary")
    val onPrimary = tokenRoleColor(palette, "onPrimary")
    val growth = tokenRoleColor(palette, "growth")
    val onGrowth = tokenRoleColor(palette, "onGrowth")
    val highlight = tokenRoleColor(palette, "highlight")
    val onHighlight = tokenRoleColor(palette, "onHighlight")
    val background = tokenRoleColor(palette, "background")
    val text = tokenRoleColor(palette, "text")
    val surface = tokenRoleColor(palette, "surface")
    val surfaceAlt = tokenRoleColor(palette, "surfaceAlt")
    val muted = tokenRoleColor(palette, "muted")
    val border = tokenRoleColor(palette, "border")
    val danger = tokenRoleColor(palette, "danger")
    val disabled = tokenRoleColor(palette, "disabled")

    return if (darkMode) {
        darkColorScheme(
            primary = primary,
            onPrimary = onPrimary,
            primaryContainer = growth,
            onPrimaryContainer = onGrowth,
            secondary = highlight,
            onSecondary = onHighlight,
            secondaryContainer = surfaceAlt,
            onSecondaryContainer = text,
            tertiary = growth,
            onTertiary = onGrowth,
            background = background,
            onBackground = text,
            surface = surface,
            onSurface = text,
            surfaceVariant = surfaceAlt,
            onSurfaceVariant = muted,
            error = danger,
            onError = onPrimary,
            outline = border,
            outlineVariant = disabled,
            scrim = background,
        )
    } else {
        lightColorScheme(
            primary = primary,
            onPrimary = onPrimary,
            primaryContainer = growth,
            onPrimaryContainer = onGrowth,
            secondary = highlight,
            onSecondary = onHighlight,
            secondaryContainer = surfaceAlt,
            onSecondaryContainer = text,
            tertiary = growth,
            onTertiary = onGrowth,
            background = background,
            onBackground = text,
            surface = surface,
            onSurface = text,
            surfaceVariant = surfaceAlt,
            onSurfaceVariant = muted,
            error = danger,
            onError = onPrimary,
            outline = border,
            outlineVariant = disabled,
            scrim = background,
        )
    }
}

/**
 * Single entry point for the generated design tokens. Callers choose a preset id,
 * a light/dark mode and a font preference; all colors and type come from
 * [GeneratedTokens].
 */
@Composable
fun MyFlowTheme(
    presetId: String = GeneratedTokens.presetIds.first(),
    darkMode: Boolean = false,
    fontPreference: String = GeneratedTokens.fontPreferenceIds.first(),
    content: @Composable () -> Unit,
) {
    val palette = tokenPalette(presetId, darkMode)
    MaterialTheme(
        colorScheme = tokenColorScheme(palette, darkMode),
        typography = tokenTypography(fontPreference),
        content = content,
    )
}

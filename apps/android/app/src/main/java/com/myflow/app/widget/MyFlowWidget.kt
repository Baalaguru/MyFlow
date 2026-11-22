package com.myflow.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.padding
import androidx.glance.stringResource
import androidx.glance.text.Text
import androidx.glance.unit.Dimension
import com.myflow.app.R

class MyFlowWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            Column(modifier = GlanceModifier.padding(Dimension.dp(12))) {
                Text(text = stringResource(id = R.string.app_name))
                Text(text = stringResource(id = R.string.widget_status))
            }
        }
    }
}

class MyFlowWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MyFlowWidget()
}

package com.myflow.app.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun MyFlowApp() {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    text = "My Flow",
                    style = MaterialTheme.typography.displayMedium,
                )
                Text(
                    text = "Offline-first foundation. Module workspaces arrive in later phases.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

package com.kaistore.printers.ui

import android.graphics.BitmapFactory
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kaistore.printers.KaiPrintersApp
import com.kaistore.printers.R
import com.kaistore.printers.data.PrintLogoSettings
import kotlinx.coroutines.launch

@Composable
fun LogoBrandingScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val app = remember { context.applicationContext as KaiPrintersApp }
    val logoRepo = remember { app.container.printLogoRepository }
    val settings by logoRepo.settings.collectAsState(initial = PrintLogoSettings())

    val logoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                val ok = logoRepo.saveLogoFromUri(uri)
                Toast.makeText(
                    context,
                    context.getString(if (ok) R.string.print_logo_saved else R.string.print_logo_error),
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.tab_logo), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(R.string.print_logo_subtitle),
            style = MaterialTheme.typography.bodyMedium,
        )

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(stringResource(R.string.print_logo_preview_title), style = MaterialTheme.typography.titleMedium)
                LogoPreview(settings = settings)
                Text(
                    text = if (settings.logoPath != null) {
                        stringResource(R.string.print_logo_custom_label)
                    } else {
                        stringResource(R.string.print_logo_default_label)
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Text(
                            stringResource(R.string.print_logo_show),
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            stringResource(R.string.print_logo_show_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = settings.logoEnabled,
                        onCheckedChange = { enabled ->
                            scope.launch { logoRepo.setLogoEnabled(enabled) }
                        },
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { logoPicker.launch("image/*") },
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.print_logo_pick))
                    }
                    if (settings.logoPath != null) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    logoRepo.clearLogo()
                                    Toast.makeText(context, R.string.print_logo_saved, Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Text(stringResource(R.string.print_logo_restore_default))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LogoPreview(settings: PrintLogoSettings) {
    val customBitmap = remember(settings.logoPath) {
        settings.logoPath?.let { path ->
            BitmapFactory.decodeFile(path)?.asImageBitmap()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (!settings.logoEnabled) {
            Text(
                stringResource(R.string.print_logo_hidden_preview),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@Column
        }

        if (customBitmap != null) {
            Image(
                bitmap = customBitmap,
                contentDescription = stringResource(R.string.print_logo_preview_title),
                modifier = Modifier.size(120.dp),
                contentScale = ContentScale.Fit,
            )
        } else {
            Image(
                painter = painterResource(R.mipmap.ic_launcher_foreground),
                contentDescription = stringResource(R.string.print_logo_default_label),
                modifier = Modifier.size(120.dp),
                contentScale = ContentScale.Fit,
            )
        }
    }
}

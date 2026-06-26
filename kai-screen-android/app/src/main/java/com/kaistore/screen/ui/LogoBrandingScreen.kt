package com.kaistore.screen.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kaistore.screen.KaiScreenApp
import com.kaistore.screen.R
import com.kaistore.screen.data.DisplayBranding
import kotlinx.coroutines.launch

@Composable
fun LogoBrandingScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val app = remember { context.applicationContext as KaiScreenApp }
    val brandingRepo = remember { app.container.brandingRepository }
    val branding by brandingRepo.branding.collectAsState(initial = DisplayBranding())

    var businessName by remember { mutableStateOf("") }
    var welcomeMessage by remember { mutableStateOf("") }

    val logoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                val ok = brandingRepo.saveLogoFromUri(uri)
                Toast.makeText(
                    context,
                    context.getString(if (ok) R.string.branding_saved else R.string.branding_logo_error),
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }
    }

    LaunchedEffect(branding) {
        businessName = branding.businessName
        welcomeMessage = branding.welcomeMessage
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
            stringResource(R.string.branding_section_subtitle),
            style = MaterialTheme.typography.bodyMedium,
        )

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(stringResource(R.string.branding_preview_title), style = MaterialTheme.typography.titleMedium)
                LogoPreview(branding = branding)
                Text(
                    text = if (branding.logoPath != null) {
                        stringResource(R.string.branding_custom_logo_label)
                    } else {
                        stringResource(R.string.branding_default_logo_label)
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Text(
                            stringResource(R.string.branding_show_logo),
                            style = MaterialTheme.typography.titleSmall,
                        )
                        Text(
                            stringResource(R.string.branding_show_logo_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = branding.logoEnabled,
                        onCheckedChange = { enabled ->
                            scope.launch { brandingRepo.setLogoEnabled(enabled) }
                        },
                    )
                }

                OutlinedTextField(
                    value = businessName,
                    onValueChange = { businessName = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.branding_business_name)) },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = welcomeMessage,
                    onValueChange = { welcomeMessage = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.branding_welcome_message)) },
                    minLines = 2,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { logoPicker.launch("image/*") },
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.branding_pick_logo))
                    }
                    if (branding.logoPath != null) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    brandingRepo.clearLogo()
                                    Toast.makeText(context, R.string.branding_saved, Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Text(stringResource(R.string.branding_restore_default_logo))
                        }
                    }
                }

                Button(
                    onClick = {
                        scope.launch {
                            brandingRepo.setBusinessName(businessName)
                            brandingRepo.setWelcomeMessage(welcomeMessage)
                            Toast.makeText(context, R.string.branding_saved, Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.branding_saved))
                }
            }
        }
    }
}

@Composable
private fun LogoPreview(branding: DisplayBranding) {
    val customBitmap = remember(branding.logoPath) {
        branding.logoPath?.let { path ->
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
        if (!branding.logoEnabled) {
            Text(
                stringResource(R.string.branding_logo_hidden_preview),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@Column
        }

        if (customBitmap != null) {
            Image(
                bitmap = customBitmap,
                contentDescription = stringResource(R.string.branding_preview_title),
                modifier = Modifier.size(120.dp),
                contentScale = ContentScale.Fit,
            )
        } else {
            Image(
                painter = painterResource(R.mipmap.ic_launcher_foreground),
                contentDescription = stringResource(R.string.branding_default_logo_label),
                modifier = Modifier.size(120.dp),
                contentScale = ContentScale.Fit,
            )
        }
    }
}

package com.kaistore.screen.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaistore.screen.R
import com.kaistore.screen.display.DisplayStateHolder
import java.text.NumberFormat
import java.util.Locale

private val ScreenBg = Color(0xFF0F172A)
private val TextPrimary = Color(0xFFF8FAFC)
private val TextMuted = Color(0xFF94A3B8)
private val Accent = Color(0xFF38BDF8)

@Composable
fun CustomerCartScreen() {
    val snapshot by DisplayStateHolder.snapshot.collectAsState()
    val money = NumberFormat.getCurrencyInstance(Locale("es", "CL")).apply {
        maximumFractionDigits = 0
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ScreenBg)
            .padding(24.dp),
    ) {
        when (snapshot.state) {
            "thank_you" -> {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = stringResource(R.string.thank_you_title),
                        color = TextPrimary,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = money.format(snapshot.total),
                        color = Accent,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            "active_sale" -> {
                Text(
                    text = snapshot.storeName ?: stringResource(R.string.app_name),
                    color = TextMuted,
                    fontSize = 20.sp,
                )
                Spacer(modifier = Modifier.height(12.dp))
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(snapshot.lines, key = { it.lineId }) { line ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(line.name, color = TextPrimary, fontSize = 22.sp)
                                Text(
                                    "${line.quantity.toInt()} × ${money.format(line.unitPrice)}",
                                    color = TextMuted,
                                    fontSize = 16.sp,
                                )
                            }
                            Text(
                                money.format(line.lineTotal),
                                color = TextPrimary,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            text = stringResource(R.string.total_label),
                            color = TextMuted,
                            fontSize = 18.sp,
                        )
                        Text(
                            text = stringResource(R.string.items_count, snapshot.itemCount),
                            color = TextMuted,
                            fontSize = 14.sp,
                        )
                    }
                    Text(
                        text = money.format(snapshot.total),
                        color = Accent,
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            else -> {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = snapshot.storeName ?: stringResource(R.string.app_name),
                        color = TextPrimary,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.welcome_title),
                        color = TextMuted,
                        fontSize = 24.sp,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

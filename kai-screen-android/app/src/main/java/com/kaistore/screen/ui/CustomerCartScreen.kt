package com.kaistore.screen.ui

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaistore.screen.KaiScreenApp
import com.kaistore.screen.R
import com.kaistore.screen.data.DisplayBranding
import com.kaistore.screen.display.CustomerDisplayLine
import com.kaistore.screen.display.CustomerDisplayPaymentLine
import com.kaistore.screen.display.CustomerDisplayPaymentSummary
import com.kaistore.screen.display.CustomerDisplaySnapshot
import com.kaistore.screen.display.DisplayStateHolder
import java.text.NumberFormat
import java.util.Locale

private val ScreenBg = Color(0xFF0F172A)
private val PanelBg = Color(0xFF1E293B)
private val TextPrimary = Color(0xFFF8FAFC)
private val TextMuted = Color(0xFF94A3B8)
private val Accent = Color(0xFF38BDF8)
private val Success = Color(0xFF34D399)
private val Warning = Color(0xFFFBBF24)

@Composable
fun CustomerCartScreen() {
    val snapshot by DisplayStateHolder.snapshot.collectAsState()
    val context = LocalContext.current
    val brandingRepo = remember {
        (context.applicationContext as KaiScreenApp).container.brandingRepository
    }
    val branding by brandingRepo.branding.collectAsState(initial = DisplayBranding())
    val money = remember {
        NumberFormat.getCurrencyInstance(Locale("es", "CL")).apply {
            maximumFractionDigits = 0
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ScreenBg)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        when (snapshot.state) {
            "thank_you" -> ThankYouView(snapshot, money)
            "payment" -> PaymentView(snapshot, money)
            "active_sale" -> ActiveSaleView(snapshot, money)
            else -> IdleView(snapshot, branding)
        }
    }
}

@Composable
private fun IdleView(
    snapshot: CustomerDisplaySnapshot,
    branding: DisplayBranding,
) {
    val logoBitmap = remember(branding.logoPath) {
        branding.logoPath?.let { path ->
            BitmapFactory.decodeFile(path)?.asImageBitmap()
        }
    }
    val title = branding.businessName.trim().ifEmpty {
        snapshot.storeName?.trim().orEmpty()
    }.ifEmpty { stringResource(R.string.app_name) }
    val message = branding.welcomeMessage.trim().ifEmpty {
        stringResource(R.string.welcome_title)
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (logoBitmap != null) {
            Image(
                bitmap = logoBitmap,
                contentDescription = null,
                modifier = Modifier
                    .size(120.dp)
                    .padding(bottom = 16.dp),
                contentScale = ContentScale.Fit,
            )
        }
        Text(
            text = title,
            color = TextPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = message,
            color = TextMuted,
            fontSize = 18.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 24.dp),
        )
    }
}

@Composable
private fun ActiveSaleView(snapshot: CustomerDisplaySnapshot, money: NumberFormat) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = snapshot.storeName ?: stringResource(R.string.app_name),
            color = TextMuted,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(8.dp))
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            items(snapshot.lines, key = { it.lineId }) { line ->
                CartLineRow(line, money)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        TotalFooter(snapshot, money)
    }
}

@Composable
private fun PaymentView(snapshot: CustomerDisplaySnapshot, money: NumberFormat) {
    val payment = snapshot.payment
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = stringResource(R.string.payment_screen_title),
            color = TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
        )
        snapshot.customer?.name?.trim()?.takeIf { it.isNotEmpty() }?.let { name ->
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.payment_customer_label, name),
                color = TextMuted,
                fontSize = 13.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (payment != null) {
            Spacer(modifier = Modifier.height(10.dp))
            PaymentSummaryRow(payment, money)
        }
        if (snapshot.payments.isNotEmpty()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.payment_methods_label),
                color = TextMuted,
                fontSize = 12.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            snapshot.payments.forEach { line ->
                PaymentMethodRow(line, money)
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        HorizontalDivider(color = PanelBg)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.payment_cart_label),
            color = TextMuted,
            fontSize = 12.sp,
        )
        Spacer(modifier = Modifier.height(4.dp))
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            items(snapshot.lines, key = { it.lineId }) { line ->
                CartLineRow(line, money)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        TotalFooter(snapshot, money)
    }
}

@Composable
private fun ThankYouView(snapshot: CustomerDisplaySnapshot, money: NumberFormat) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.thank_you_title),
            color = TextPrimary,
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = money.format(snapshot.total),
            color = Accent,
            fontSize = 40.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun CartLineRow(line: CustomerDisplayLine, money: NumberFormat) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
            Text(
                line.name,
                color = TextPrimary,
                fontSize = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                "${line.quantity.toInt()} × ${money.format(line.unitPrice)}",
                color = TextMuted,
                fontSize = 11.sp,
            )
        }
        Text(
            money.format(line.lineTotal),
            color = TextPrimary,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun PaymentMethodRow(line: CustomerDisplayPaymentLine, money: NumberFormat) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(line.label, color = TextPrimary, fontSize = 13.sp)
        Text(money.format(line.amount), color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun PaymentSummaryRow(summary: CustomerDisplayPaymentSummary, money: NumberFormat) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        SummaryChip(summary.amountDueLabel, money.format(summary.amountToPay), Accent)
        SummaryChip(stringResource(R.string.payment_received_label), money.format(summary.appliedTotal), Accent)
        if (summary.remaining > 0.01) {
            SummaryChip(stringResource(R.string.payment_remaining_label), money.format(summary.remaining), Warning)
        }
        if (summary.overpay > 0.01) {
            SummaryChip(stringResource(R.string.payment_change_label), money.format(summary.overpay), Success)
        }
        SummaryChip(stringResource(R.string.payment_status_label), summary.statusLabel, TextPrimary)
    }
}

@Composable
private fun SummaryChip(label: String, value: String, valueColor: Color) {
    Column(
        modifier = Modifier
            .background(PanelBg)
            .padding(horizontal = 8.dp, vertical = 6.dp),
    ) {
        Text(label, color = TextMuted, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(value, color = valueColor, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
private fun TotalFooter(snapshot: CustomerDisplaySnapshot, money: NumberFormat) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(stringResource(R.string.total_label), color = TextMuted, fontSize = 12.sp)
            Text(
                stringResource(R.string.items_count, snapshot.itemCount),
                color = TextMuted,
                fontSize = 11.sp,
            )
        }
        Text(
            money.format(snapshot.total),
            color = Accent,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

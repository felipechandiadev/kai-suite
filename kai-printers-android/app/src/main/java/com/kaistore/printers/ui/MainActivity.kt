package com.kaistore.printers.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.kaistore.printers.ui.permissions.PermissionsScreen
import com.kaistore.printers.ui.prefs.OnboardingPrefs
import com.kaistore.printers.ui.printers.PrintersSetupScreen
import com.kaistore.printers.ui.service.ServiceSettingsScreen
import com.kaistore.printers.ui.theme.KaiPrintersTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContent {
            KaiPrintersTheme {
                KaiPrintersNav()
            }
        }
    }
}

private object Routes {
    const val PERMISSIONS = "permissions"
    const val PRINTERS = "printers"
    const val SERVICE = "service"
}

@Composable
private fun KaiPrintersNav() {
    val navController = rememberNavController()
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = remember { OnboardingPrefs(context) }
    var startDestination by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        startDestination = if (prefs.isPermissionsOnboardingDone()) Routes.PRINTERS else Routes.PERMISSIONS
    }

    val start = startDestination ?: return

    NavHost(navController = navController, startDestination = start) {
        composable(Routes.PERMISSIONS) {
            PermissionsScreen(
                onContinue = { navController.navigate(Routes.PRINTERS) { popUpTo(Routes.PERMISSIONS) { inclusive = true } } },
            )
        }
        composable(Routes.PRINTERS) {
            PrintersSetupScreen(
                onContinue = { navController.navigate(Routes.SERVICE) },
                onOpenPosConnection = { navController.navigate(Routes.SERVICE) },
            )
        }
        composable(Routes.SERVICE) {
            ServiceSettingsScreen(
                onBackToPrinters = { navController.popBackStack() },
            )
        }
    }
}

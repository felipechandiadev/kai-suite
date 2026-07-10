package com.kaistore.printers.print

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CashDrawerPolicyTest {
    @Test
    fun saleOpensOn80mmWhenMappingEnabled() {
        assertTrue(
            CashDrawerPolicy.shouldOpenDrawer("pos-sale-ticket", 48, drawerEnabledInMapping = true),
        )
    }

    @Test
    fun saleDoesNotOpenWhenMappingDisabled() {
        assertFalse(
            CashDrawerPolicy.shouldOpenDrawer("pos-sale-ticket", 48, drawerEnabledInMapping = false),
        )
    }

    @Test
    fun businessDocumentTypeDoesNotOpen() {
        assertFalse(
            CashDrawerPolicy.shouldOpenDrawer("SALE", 48, drawerEnabledInMapping = true),
        )
    }

    @Test
    fun hubMovementOpensWhenEnabled() {
        assertTrue(
            CashDrawerPolicy.shouldOpenDrawer(
                "pos-cash-hub-movement-ticket",
                48,
                drawerEnabledInMapping = true,
            ),
        )
    }

    @Test
    fun quotationDoesNotOpen() {
        assertFalse(
            CashDrawerPolicy.shouldOpenDrawer(
                "pos-quotation-ticket",
                48,
                drawerEnabledInMapping = true,
            ),
        )
    }

    @Test
    fun neverOn58mm() {
        assertFalse(
            CashDrawerPolicy.shouldOpenDrawer("pos-sale-ticket", 32, drawerEnabledInMapping = true),
        )
    }
}

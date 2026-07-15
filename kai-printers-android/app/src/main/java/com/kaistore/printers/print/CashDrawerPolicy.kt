package com.kaistore.printers.print

/**
 * Política de gaveta alineada con Kai Printers desktop (`cash_drawer_policy.rs`)
 * y `@kai/print-service-client` (`cash-drawer-policy.ts`).
 */
object CashDrawerPolicy {
    private val ELIGIBLE_TYPES = setOf(
        "pos-sale-ticket",
        "fiscal-boleta-preview",
        "pos-cash-session-opening-ticket",
        "pos-cash-count-sheet-ticket",
        "pos-cash-hub-movement-ticket",
        "pos-supplier-payment-ticket",
        "pos-payment-in-ticket",
        "test_print",
        "test_escpos_qa",
        "test_escpos_qa_nocut",
    )

    fun agentTypeMayOpenDrawer(agentType: String?): Boolean {
        val t = agentType?.trim().orEmpty()
        if (t.isEmpty()) return false
        if (t == "test_drawer") return true
        return ELIGIBLE_TYPES.contains(t)
    }

    /**
     * @param drawerEnabledInMapping switch «Apertura de gaveta» de la línea Tickets (si no hay mapeo, false).
     */
    fun shouldOpenDrawer(
        agentType: String?,
        widthChars: Int,
        drawerEnabledInMapping: Boolean = false,
    ): Boolean {
        if (!EscPosTail.shouldOpenCashDrawer(widthChars)) return false
        val t = agentType?.trim().orEmpty()
        if (t == "test_drawer") return true
        if (!drawerEnabledInMapping) return false
        return agentTypeMayOpenDrawer(t)
    }
}

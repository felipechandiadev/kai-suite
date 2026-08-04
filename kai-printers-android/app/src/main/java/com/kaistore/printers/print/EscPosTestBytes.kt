package com.kaistore.printers.print

import android.content.Context
import com.kaistore.printers.data.PrintLogoSettings
import com.kaistore.printers.data.TicketHeaderPrefs

object EscPosTestBytes {
    fun testPage(
        paperProfile: PaperProfile = PaperProfile.MM80,
        context: Context? = null,
        logoSettings: PrintLogoSettings? = null,
        headerPrefs: TicketHeaderPrefs = TicketHeaderPrefs(),
    ): ByteArray {
        val width = PosSaleTicketDemo.widthCharsForPaper(paperProfile)
        return PosSaleTicketEscPos.fromTicketJson(
            PosSaleTicketDemo.ticketJson(),
            width,
            context,
            logoSettings,
            headerPrefs,
        )
    }

    fun testPage(): ByteArray = testPage(PaperProfile.MM80)
}

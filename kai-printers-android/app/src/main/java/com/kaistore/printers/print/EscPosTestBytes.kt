package com.kaistore.printers.print

object EscPosTestBytes {
    fun testPage(paperProfile: PaperProfile = PaperProfile.MM80): ByteArray {
        val width = PosSaleTicketDemo.widthCharsForPaper(paperProfile)
        return PosSaleTicketEscPos.fromTicketJson(PosSaleTicketDemo.ticketJson(), width)
    }

    fun testPage(): ByteArray = testPage(PaperProfile.MM80)
}

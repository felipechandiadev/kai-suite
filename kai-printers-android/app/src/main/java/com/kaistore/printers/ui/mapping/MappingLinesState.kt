package com.kaistore.printers.ui.mapping

import android.content.Context
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.kaistore.printers.R
import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.data.MappingLineEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

@Stable
class MappingLinesState(
    private val context: Context,
    val repository: AgentRepository,
    private val scope: CoroutineScope,
) {
    var lines by mutableStateOf<List<MappingLineEntity>>(emptyList())
        private set
    var testingLineId by mutableStateOf<String?>(null)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    fun refresh() {
        scope.launch {
            lines = repository.listMappingLines()
        }
    }

    fun addLine(purpose: String, systemPrinterName: String, displayLabel: String, paperProfile: String) {
        scope.launch {
            runCatching {
                repository.upsertMappingLine(
                    purpose = purpose,
                    systemPrinterName = systemPrinterName,
                    displayLabel = displayLabel,
                    paperProfile = paperProfile,
                )
                lines = repository.listMappingLines()
                message = null
            }.onFailure { message = it.message }
        }
    }

    fun deleteLine(id: String) {
        scope.launch {
            repository.deleteMappingLine(id)
            lines = repository.listMappingLines()
        }
    }

    fun testLine(line: MappingLineEntity) {
        scope.launch {
            testingLineId = line.id
            message = null
            val result = MappingLineTestPrint.run(context, repository, line)
            testingLineId = null
            message = result.exceptionOrNull()?.message
                ?: context.getString(R.string.test_print_sent)
        }
    }

    fun linesForTransport(transportKind: String): List<MappingLineEntity> =
        lines.filter { com.kaistore.printers.data.MappingLineUtils.lineMatchesTransport(it.systemPrinterName, transportKind) }
}

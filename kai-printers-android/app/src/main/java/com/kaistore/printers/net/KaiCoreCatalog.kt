package com.kaistore.printers.net

import com.kaistore.printers.data.AgentRepository
import com.kaistore.printers.data.AgentSettingsKeys
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Catálogo/presencia en Kai Core. La impresión sigue por WebSocket LAN.
 */
object KaiCoreCatalog {
    suspend fun pair(repository: AgentRepository, pairingToken: String): Result<PairResult> =
        withContext(Dispatchers.IO) {
            runCatching {
                val base = repository.getSetting(AgentSettingsKeys.KAI_CORE_BASE_URL)
                    ?.trim()
                    ?.trimEnd('/')
                    ?.takeIf { it.isNotEmpty() }
                    ?: error("Configurá la URL de Kai Core")
                val tok = pairingToken.trim().lowercase()
                require(tok.length >= 32) { "Token inválido" }
                val url = URL("$base/api/print-agents/pair")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    doOutput = true
                    connectTimeout = 12_000
                    readTimeout = 12_000
                }
                OutputStreamWriter(conn.outputStream).use { w ->
                    w.write(JSONObject().put("pairingToken", tok).toString())
                }
                val code = conn.responseCode
                val body = readBody(conn)
                if (code !in 200..299) error("HTTP $code: $body")
                val json = JSONObject(body)
                val id = json.getString("id")
                val tokenOut = json.optString("pairingToken", tok)
                repository.setSetting(AgentSettingsKeys.KAI_CORE_AGENT_ID, id)
                repository.setSetting(AgentSettingsKeys.KAI_CORE_AGENT_TOKEN, tokenOut)
                val name = json.optString("displayName", "")
                if (name.isNotBlank()) {
                    repository.setSetting(AgentSettingsKeys.AGENT_DISPLAY_NAME, name.trim())
                }
                val companyName = json.optString("companyName", "").trim()
                repository.setSetting(AgentSettingsKeys.KAI_CORE_COMPANY_NAME, companyName)
                PairResult(id, name.ifBlank { id }, companyName.takeIf { it.isNotEmpty() })
            }
        }

    suspend fun heartbeat(repository: AgentRepository): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val base = repository.getSetting(AgentSettingsKeys.KAI_CORE_BASE_URL)
                    ?.trim()
                    ?.trimEnd('/')
                    ?: return@runCatching
                val token = repository.getSetting(AgentSettingsKeys.KAI_CORE_AGENT_TOKEN)
                    ?.trim()
                    ?: return@runCatching
                if (token.isEmpty()) return@runCatching
                val lan = LanAddressResolver.ipv4NonLoopback().firstOrNull() ?: "127.0.0.1"
                val body = JSONObject()
                    .put("displayName", repository.agentDisplayName())
                    .put("lanHost", lan)
                    .put("wsPort", repository.listenPort())
                    .put("wssPort", repository.wssListenPort())
                    .put("useTls", repository.wssEnabled())
                    .put("platform", "android")
                val url = URL("$base/api/print-agents/heartbeat")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("X-Print-Agent-Token", token)
                    doOutput = true
                    connectTimeout = 10_000
                    readTimeout = 10_000
                }
                OutputStreamWriter(conn.outputStream).use { w -> w.write(body.toString()) }
                val code = conn.responseCode
                if (code !in 200..299) {
                    error("heartbeat HTTP $code: ${readBody(conn)}")
                }
            }
        }

    suspend fun clearPair(repository: AgentRepository) {
        repository.setSetting(AgentSettingsKeys.KAI_CORE_AGENT_TOKEN, "")
        repository.setSetting(AgentSettingsKeys.KAI_CORE_AGENT_ID, "")
        repository.setSetting(AgentSettingsKeys.KAI_CORE_COMPANY_NAME, "")
    }

    private fun readBody(conn: HttpURLConnection): String {
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        return stream?.use { BufferedReader(InputStreamReader(it)).readText() }.orEmpty()
    }

    data class PairResult(val agentId: String, val displayName: String, val companyName: String?)
}

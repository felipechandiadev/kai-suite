package com.kaistore.screen.service

import java.net.URL
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/** Resultado de comprobar el servidor HTTPS local (diagnóstico en la app). */
data class WssProbeResult(
    val ok: Boolean,
    val message: String,
)

/**
 * Comprueba que el agente responde en `https://127.0.0.1:puerto/`.
 * No valida si Chrome ya confió el certificado (eso solo lo ve el navegador del POS).
 */
object WssLocalProbe {
    private const val MARKER = "Kai CFD"

    fun probe(port: Int, timeoutMs: Int = 4000): WssProbeResult {
        if (port !in 1..65535) {
            return WssProbeResult(false, "Puerto inválido")
        }
        return try {
            val trustAll = object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>?, authType: String?) {}
                override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>?, authType: String?) {}
                override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = emptyArray()
            }
            val ssl = SSLContext.getInstance("TLS").apply {
                init(null, arrayOf<TrustManager>(trustAll), null)
            }
            val conn = (URL("https://127.0.0.1:$port/").openConnection() as HttpsURLConnection).apply {
                sslSocketFactory = ssl.socketFactory
                hostnameVerifier = HostnameVerifier { _, _ -> true }
                connectTimeout = timeoutMs
                readTimeout = timeoutMs
                requestMethod = "GET"
            }
            val code = conn.responseCode
            val body = try {
                conn.inputStream.bufferedReader().readText()
            } catch (_: Exception) {
                ""
            } finally {
                conn.disconnect()
            }
            when {
                code == 200 && body.contains(MARKER) ->
                    WssProbeResult(true, "Servidor WSS activo en el puerto $port")
                code == 200 ->
                    WssProbeResult(true, "Servidor responde en el puerto $port")
                else ->
                    WssProbeResult(false, "HTTP $code — revise que el servicio esté iniciado")
            }
        } catch (e: java.net.ConnectException) {
            WssProbeResult(false, "Sin conexión — inicie el servicio y espere unos segundos")
        } catch (e: java.net.SocketTimeoutException) {
            WssProbeResult(false, "Tiempo de espera agotado")
        } catch (e: Exception) {
            WssProbeResult(false, e.message ?: "Error al comprobar WSS")
        }
    }
}

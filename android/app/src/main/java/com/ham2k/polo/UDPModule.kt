package com.ham2k.polo

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

class UDPModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "UDPModule"
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun send(host: String, port: Int, payload: String, options: ReadableMap?, promise: Promise) {
    val broadcast = options?.let {
      it.hasKey("broadcast") && !it.isNull("broadcast") && it.getBoolean("broadcast")
    } ?: false

    sendDatagram(
      host = host,
      port = port,
      bytes = payload.toByteArray(Charsets.UTF_8),
      broadcast = broadcast,
      promise = promise
    )
  }

  @ReactMethod
  fun sendWSJTXLoggedADIF(
    host: String,
    port: Int,
    magicNumber: Double,
    schemaNumber: Double,
    messageType: Double,
    senderId: String,
    adifText: String,
    options: ReadableMap?,
    promise: Promise
  ) {
    val broadcast = options?.let {
      it.hasKey("broadcast") && !it.isNull("broadcast") && it.getBoolean("broadcast")
    } ?: false

    try {
      val packet = ByteArrayOutputStream()
      val writer = DataOutputStream(packet)

      writer.writeInt(magicNumber.toLong().toInt())
      writer.writeInt(schemaNumber.toLong().toInt())
      writer.writeInt(messageType.toLong().toInt())
      writeWSJTXUTF8(writer, senderId)
      writeWSJTXUTF8(writer, adifText)
      writer.flush()

      sendDatagram(
        host = host,
        port = port,
        bytes = packet.toByteArray(),
        broadcast = broadcast,
        promise = promise
      )
    } catch (error: Exception) {
      promise.reject("ERR_UDP_WSJTX", error.message, error)
    }
  }

  private fun sendDatagram(
    host: String,
    port: Int,
    bytes: ByteArray,
    broadcast: Boolean,
    promise: Promise
  ) {
    if (host.isBlank()) {
      promise.reject("ERR_UDP_HOST", "UDP host is required")
      return
    }

    if (port !in 1..65535) {
      promise.reject("ERR_UDP_PORT", "UDP port must be between 1 and 65535")
      return
    }

    Thread {
      var socket: DatagramSocket? = null

      try {
        val address = InetAddress.getByName(host)
        val packet = DatagramPacket(bytes, bytes.size, address, port)

        socket = DatagramSocket()
        socket.broadcast = true
        socket.send(packet)

        val result = Arguments.createMap().apply {
          putBoolean("broadcast", true)
          putString("host", host)
          putInt("port", port)
          putInt("bytesSent", bytes.size)
        }

        promise.resolve(result)
      } catch (error: Exception) {
        promise.reject("ERR_UDP_SEND", error.message, error)
      } finally {
        socket?.close()
      }
    }.start()
  }

  private fun writeWSJTXUTF8(writer: DataOutputStream, value: String?) {
    if (value == null) {
      writer.writeInt(-1)
      return
    }

    val bytes = value.toByteArray(Charsets.UTF_8)
    writer.writeInt(bytes.size)
    writer.write(bytes)
  }
}

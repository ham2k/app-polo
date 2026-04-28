package com.ham2k.polo

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
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
    if (host.isBlank()) {
      promise.reject("ERR_UDP_HOST", "UDP host is required")
      return
    }

    if (port !in 1..65535) {
      promise.reject("ERR_UDP_PORT", "UDP port must be between 1 and 65535")
      return
    }

    val broadcast = options?.let {
      it.hasKey("broadcast") && !it.isNull("broadcast") && it.getBoolean("broadcast")
    } ?: false

    Thread {
      var socket: DatagramSocket? = null

      try {
        val address = InetAddress.getByName(host)
        val bytes = payload.toByteArray(Charsets.UTF_8)
        val packet = DatagramPacket(bytes, bytes.size, address, port)

        socket = DatagramSocket()
        socket.broadcast = broadcast
        socket.send(packet)

        val result = Arguments.createMap().apply {
          putBoolean("broadcast", broadcast)
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
}

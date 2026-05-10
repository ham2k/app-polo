/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Buffer } from 'buffer'
import { Platform } from 'react-native'
import dgram from 'react-native-udp'

import {
  encodeWSJTXLoggedADIFMessage,
  encodeWSJTXQSOLoggedMessage
} from './liveQSJTXWireFormat'

const SUPPORTED_UDP_PLATFORMS = new Set(['android', 'ios'])

// Always ask the kernel for broadcast permission on IPv4. It does not change
// the UDP packet itself, is harmless on unicast targets, and saves the user
// from caring whether 192.168.0.127 is a /25 broadcast or just another host on
// a /24.
const UDP_BROADCAST_PERMISSION = true

export async function sendUDPMessage ({ url, payload, broadcast = false }) {
  assertUDPPlatformSupported()

  const { host, port } = parseUDPURL(url)

  return sendUDPBuffer({
    host,
    port,
    payload: Buffer.from(`${payload ?? ''}`, 'utf8'),
    broadcast: UDP_BROADCAST_PERMISSION || broadcast
  })
}

export async function sendWSJTXLoggedADIFMessage ({ url, message, broadcast = false }) {
  assertUDPPlatformSupported()

  const { host, port } = parseUDPURL(url)

  return sendUDPBuffer({
    host,
    port,
    payload: encodeWSJTXLoggedADIFMessage(message),
    broadcast: UDP_BROADCAST_PERMISSION || broadcast
  })
}

export async function sendWSJTXQSOLoggedMessage ({ url, message, broadcast = false }) {
  assertUDPPlatformSupported()

  const { host, port } = parseUDPURL(url)

  return sendUDPBuffer({
    host,
    port,
    payload: encodeWSJTXQSOLoggedMessage(message),
    broadcast: UDP_BROADCAST_PERMISSION || broadcast
  })
}

export function parseUDPURL (url) {
  const trimmed = `${url ?? ''}`.trim()
  const normalized = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `udp://${trimmed}`
  const match = normalized.match(/^udp:\/\/(\[[^\]]+\]|[^/?#:]+):(\d{1,5})(?:[/?#].*)?$/i)

  if (!match) {
    throw new Error(`Invalid UDP target URL: ${normalized}`)
  }

  const host = match[1].replace(/^\[(.*)\]$/, '$1')
  const port = Number(match[2])

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid UDP target URL: ${normalized}`)
  }

  return { host, port }
}

function socketTypeForHost (host) {
  return host.includes(':') ? 'udp6' : 'udp4'
}

function normalizeUDPError (error, fallback) {
  if (error instanceof Error) return error
  const message = error?.message ?? `${error ?? fallback}`
  return new Error(message)
}

function assertUDPPlatformSupported () {
  if (!SUPPORTED_UDP_PLATFORMS.has(Platform.OS)) {
    throw new Error('UDP sending is only available on Android and iPhone')
  }
}

async function sendUDPBuffer ({ host, port, payload, broadcast }) {
  const socketType = socketTypeForHost(host)
  const useBroadcast = Platform.OS === 'android' && Boolean(broadcast && socketType === 'udp4')

  if (Platform.OS === 'android') {
    return await sendUDPBufferViaDirectSocket({
      host,
      port,
      payload,
      useBroadcast,
      socketType
    })
  }

  return await sendUDPBufferViaBoundSocket({
    host,
    port,
    payload,
    socketType
  })
}

async function sendUDPBufferViaDirectSocket ({ host, port, payload, socketType, useBroadcast }) {
  return await new Promise((resolve, reject) => {
    const finish = (error, result) => {
      if (error) {
        reject(normalizeUDPError(error, 'UDP send failed'))
      } else {
        resolve(result)
      }
    }

    try {
      dgram.sendDirect(socketType, payload, port, host, { broadcast: useBroadcast }, (error) => {
        if (error) {
          finish(error)
          return
        }

        finish(undefined, {
          broadcast: useBroadcast,
          host,
          port,
          bytesSent: payload.length
        })
      })
    } catch (error) {
      finish(error)
    }
  })
}

async function sendUDPBufferViaBoundSocket ({ host, port, payload, socketType }) {
  const socket = dgram.createSocket(socketType)

  return await new Promise((resolve, reject) => {
    let settled = false

    const finish = (error, result) => {
      if (settled) return
      settled = true

      socket.removeAllListeners('error')
      socket.removeAllListeners('listening')

      try {
        socket.close(() => {})
      } catch {}

      if (error) {
        reject(normalizeUDPError(error, 'UDP send failed'))
      } else {
        resolve(result)
      }
    }

    socket.once('error', (error) => {
      finish(error)
    })

    socket.once('listening', () => {
      try {
        socket.send(payload, 0, payload.length, port, host, (error) => {
          if (error) {
            finish(error)
            return
          }

          finish(undefined, {
            broadcast: false,
            host,
            port,
            bytesSent: payload.length
          })
        })
      } catch (error) {
        finish(error)
      }
    })

    socket.bind(0, socketType === 'udp6' ? '::' : '0.0.0.0')
  })
}

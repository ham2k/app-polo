/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules, Platform } from 'react-native'

const { UDPModule } = NativeModules
// Always ask the kernel for broadcast permission. It does not change the UDP
// packet itself, is harmless on unicast targets, and saves the user from
// caring whether 192.168.0.127 is a /25 broadcast or just another host on a /24.
const UDP_BROADCAST_PERMISSION = true

export async function sendUDPMessage ({ url, payload, broadcast = false }) {
  if (Platform.OS !== 'android') {
    throw new Error('UDP sending is only available on Android')
  }

  if (!UDPModule?.send) {
    throw new Error('UDP native module is not available')
  }

  const { host, port } = parseUDPURL(url)

  return UDPModule.send(host, port, `${payload ?? ''}`, { broadcast: UDP_BROADCAST_PERMISSION || broadcast })
}

export async function sendWSJTXLoggedADIFMessage ({ url, message, broadcast = false }) {
  if (Platform.OS !== 'android') {
    throw new Error('UDP sending is only available on Android')
  }

  if (!UDPModule?.sendWSJTXLoggedADIF) {
    throw new Error('WSJT-X UDP native method is not available')
  }

  const { host, port } = parseUDPURL(url)

  return UDPModule.sendWSJTXLoggedADIF(
    host,
    port,
    message.magicNumber,
    message.schemaNumber,
    message.messageType,
    `${message.senderId ?? ''}`,
    `${message.adifText ?? ''}`,
    { broadcast: UDP_BROADCAST_PERMISSION || broadcast }
  )
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

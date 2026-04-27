/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NativeModules, Platform } from 'react-native'

const { UDPModule } = NativeModules

export async function sendUDPMessage ({ url, payload, broadcast = false }) {
  if (Platform.OS !== 'android') {
    throw new Error('UDP sending is only available on Android')
  }

  if (!UDPModule?.send) {
    throw new Error('UDP native module is not available')
  }

  const { host, port } = parseUDPURL(url)

  return UDPModule.send(host, port, `${payload ?? ''}`, { broadcast })
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

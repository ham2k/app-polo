/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'

import packageJson from '../../../../package.json'
import GLOBAL from '../../../GLOBAL'
import { setExtensionSettings } from '../../../store/settings'

export const Info = {
  key: 'ham2k-lofi',
  icon: 'account-search',
  name: 'Ham2k Log Filer Sync',
  description: 'Cloud backup and sync for Ham2K apps',
  shortName: 'LoFi',
  infoURL: 'https://ham2k.com/'
}

const Extension = {
  ...Info,
  category: 'sync',
  enabledByDefault: false,
  onActivation: ({ registerHook }) => {
    registerHook('sync', { hook: SyncHook, priority: -1 })
  }
}
export default Extension

const DEBUG = false
const SyncHook = {
  ...Info,
  sendChanges: async ({ qsos, operations, settings, dispatch }) => {
    let { server, secret, token } = settings?.extensions?.['ham2k-lofi']

    if (server.endsWith('/')) server = server.slice(0, -1)

    let retries = 2 // just so that we can re-authenticate if needed
    while (retries > 0) {
      retries--

      if (!token) {
        secret = secret || UUID.v4()
        if (DEBUG) console.log('Ham2K LoFi Authenticating')
        const response = await fetch(`${server}/v1/client`, {
          method: 'POST',
          headers: {
            'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client: {
              key: GLOBAL.deviceId,
              name: GLOBAL.deviceName,
              secret
            }
          })
        })

        if (response.status === 200) {
          const json = await response.json()
          if (DEBUG) console.log('-- auth ok', json)
          token = json.token
          dispatch(setExtensionSettings({ key: 'ham2k-lofi', token, secret }))
        } else {
          if (DEBUG) console.log('-- auth failed')
          dispatch(setExtensionSettings({ key: 'ham2k-lofi', token: null }))
          throw new Error('Authentication Failed')
        }
      }

      qsos = qsos ?? []
      operations = operations ?? []

      if (server) {
        if (DEBUG) console.log('Syncing', { token, server, qsos: qsos?.length, operations: operations?.length })
        if (qsos.length > 0) {
          const response = await fetch(`${server}/v1/sync`, {
            method: 'POST',
            headers: {
              'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              qsos,
              operations
            })
          })
          if (DEBUG) console.log(' -- response', response.status, await response.json())
          if (response.status === 401) {
            if (DEBUG) console.log(' -- auth failed')
            token = null
          }
          if (response.status === 200) return true
        }
      }
    }
    return false
  }
}

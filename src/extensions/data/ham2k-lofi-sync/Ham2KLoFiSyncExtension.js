/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Config from 'react-native-config'
import packageJson from '../../../../package.json'
import { logRemotely } from '../../../distro'
import GLOBAL from '../../../GLOBAL'
import { selectExtensionSettings, selectSettings } from '../../../store/settings'

export const Info = {
  key: 'ham2k-lofi',
  icon: 'account-search',
  name: 'Ham2k Log Filer Sync',
  hidden: true,
  alwaysEnabled: true,
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

const DEBUG = true

const SyncHook = {
  ...Info,
  sendChanges: ({ qsos, operations }) => async (dispatch, getState) => {
    console.log('sendChanges')
    console.log('settings', Object.keys(getState().settings.extensions))
    let { server } = selectExtensionSettings(getState(), Info.key) || {}
    const { operatorCall } = selectSettings(getState())
    let token = GLOBAL.syncLoFiToken
    const secret = Config.HAM2K_LOFI_SECRET || 'no-secret'

    if (server.endsWith('/')) server = server.slice(0, -1)

    let retries = 2 // just so that we can re-authenticate if needed
    while (retries > 0) {
      retries--
      logRemotely({ message: 'sending changes', qsos: qsos?.length, operations: operations?.length, server, token, secret })
      if (DEBUG) console.log('sending changes', { qsos: qsos?.length, operations: operations?.length, server, token, secret })

      if (!token) {
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
            },
            account: {
              call: operatorCall
            }
          })
        })

        const json = await response.json()
        processResponseMeta({ json, response, dispatch })

        if (response.status === 200) {
          if (DEBUG) console.log('-- auth ok', json)
          token = json.token
          GLOBAL.syncLoFiToken = token
        } else {
          if (DEBUG) console.log('-- auth failed')
          GLOBAL.syncLoFiToken = token
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

          const json = await response.json()
          if (DEBUG) console.log(' -- response', response.status, json)

          processResponseMeta({ json, response, dispatch })

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

function processResponseMeta ({ json, response, dispatch }) {
  try {
    if (json?.meta?.suggestedSyncBatchSize || json?.meta?.suggested_sync_batch_size) {
      GLOBAL.syncBatchSize = Number.parseInt(json.meta.suggestedSyncBatchSize || json.meta.suggested_sync_batch_size, 10)
      if (GLOBAL.syncBatchSize < 1) GLOBAL.syncBatchSize = undefined
      if (isNaN(GLOBAL.syncBatchSize)) GLOBAL.syncBatchSize = undefined
    }
    if (json?.meta?.suggestedSyncLoopDelay || json?.meta?.suggested_sync_loop_delay) {
      GLOBAL.syncLoopDelay = Number.parseInt(json.meta.suggestedSyncLoopDelay || json.meta.suggested_sync_loop_delay, 10) * 1000
      if (GLOBAL.syncLoopDelay < 1) GLOBAL.syncLoopDelay = undefined
      if (isNaN(GLOBAL.syncLoopDelay)) GLOBAL.syncLoopDelay = undefined
    }
    if (json?.meta?.suggestedSyncCheckPeriod || json?.meta?.suggested_sync_check_period) {
      GLOBAL.syncCheckPeriod = Number.parseInt(json.meta.suggestedSyncCheckPeriod || json.meta.suggested_sync_check_period, 10) * 1000
      if (GLOBAL.syncCheckPeriod < 1) GLOBAL.syncCheckPeriod = undefined
      if (isNaN(GLOBAL.syncCheckPeriod)) GLOBAL.syncCheckPeriod = undefined
    }
  } catch (e) {
    console.error('Error parsing sync meta', e, json)
  }
}

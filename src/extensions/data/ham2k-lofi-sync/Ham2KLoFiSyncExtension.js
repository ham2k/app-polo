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
import { selectSettings } from '../../../store/settings'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import { Platform } from 'react-native'

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

export const DEFAULT_LOFI_SERVER = 'https://lofi.ham2k.net'

const DEBUG = false

const SyncHook = {
  ...Info,
  sync: (params) => async (dispatch, getState) => {
    if (DEBUG) console.log('sync', { meta: params.meta })

    const body = JSON.stringify(params)
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/sync', method: 'POST', body })
    return response
  },

  linkClient: (email) => async (dispatch, getState) => {
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/client/link', method: 'POST', body: JSON.stringify({ email }) })
    return response
  },

  resetClient: (email) => async (dispatch, getState) => {
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/client/reset', method: 'POST', body: JSON.stringify({ email }) })
    return response
  },

  getAccountData: () => async (dispatch, getState) => {
    const results = await requestWithAuth({ dispatch, getState, url: 'v1/accounts', method: 'GET' })
    if (results.ok) {
      const updates = {}
      if (results.json.current_account) updates.account = results.json.current_account
      if (results.json.current_client) updates.client = results.json.current_client
      if (results.json.clients) updates.allClients = results.json.clients
      if (results.json.accounts) updates.allAccounts = results.json.accounts
      if (Object.keys(updates).length > 0) {
        dispatch(setLocalExtensionData({ key: Info.key, ...updates }))
      }
    }

    return results
  },

  setAccountData: (data) => async (dispatch, getState) => {
    const { account } = selectLocalExtensionData(getState(), Info.key) || {}
    const body = JSON.stringify(data)
    const results = await requestWithAuth({ dispatch, getState, url: `v1/accounts/${account?.uuid}`, method: 'PATCH', body })

    return results
  }
}

async function requestWithAuth ({ dispatch, getState, url, method, body, params }) {
  if (GLOBAL?.flags?.services?.lofi === false) return { ok: false, status: 500, json: {} }

  try {
    if (DEBUG) console.log('Ham2K LoFi request', { url, method })
    const settings = selectSettings(getState())

    let { server, account } = selectLocalExtensionData(getState(), Info.key) || {}
    server = server ?? DEFAULT_LOFI_SERVER

    let token = GLOBAL.syncLoFiToken
    const secret = Config.HAM2K_LOFI_SECRET || 'no-secret'

    if (server.endsWith('/')) server = server.slice(0, -1)

    let retries = 2 // just so that we can re-authenticate if needed
    while (retries > 0) {
      retries--
      if (!token) {
        if (DEBUG) console.log('-- Ham2K LoFi Authenticating', { server, token, secret })
        const response = await fetch(`${server}/v1/client`, {
          method: 'POST',
          headers: {
            'User-Agent': _buildUserAgent(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client: {
              key: GLOBAL.deviceId,
              name: GLOBAL.deviceName,
              secret
            },
            account: {
              call: settings.operatorCall
            }
          })
        })

        const responseBody = await response.text()
        // if (DEBUG) console.log(' -- auth response body', responseBody)
        // const json = await response.json()
        let json
        try {
          json = JSON.parse(responseBody)
        } catch (e) {
          json = {}
        }
        _processResponseMeta({ json, account, response, dispatch })

        if (response.status === 200) {
          if (DEBUG) console.log('-- auth ok', json)
          token = json.token
          GLOBAL.syncLoFiToken = token
        } else if (response.status === 401) {
          logRemotely({ message: '-- Ham2K LoFi Authentication failed', server, token, secret, url, body })
          if (DEBUG) console.log('-- auth failed')
          throw new Error('Authentication Failed')
        } else {
          logRemotely({ message: `-- Ham2K LoFi Server Error ${response.status}`, server, token, secret, url, body })
          if (DEBUG) console.log('-- auth failed')
          throw new Error(`Server Error ${response.status}`)
        }
      }

      if (DEBUG) console.log('-- request', { url, method, body })
      const response = await fetch(`${server}/${url}`, {
        method,
        headers: {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body
      })

      const responseBody = await response.text()
      // if (DEBUG) console.log(' -- main response body', responseBody)
      // const json = await response.json()
      let json
      try {
        json = JSON.parse(responseBody)
      } catch (e) {
        json = {}
      }

      _processResponseMeta({ json, account, response, dispatch })

      if (response.status === 401) {
        if (DEBUG) console.log(' -- auth failed')
        // Auth failed, do another loop
        token = null
      } else {
        return { ok: response.status >= 200 && response.status < 300, status: response.status, json }
      }
    }
  } catch (e) {
    if (DEBUG) console.log('Error in requestWithAuth', e)
    if (e.message === 'Network request failed') {
      return { ok: false, status: 0, json: { error: 'Network request failed' } }
    } else {
      throw e
    }
  }
  return { ok: false, status: 401, json: {} }
}

function _processResponseMeta ({ json, account, response, dispatch }) {
  try {
    if (json?.account && (!account || Object.keys(json.account).find(k => account[k] !== json.account[k]))) {
      dispatch(setLocalExtensionData({ key: Info.key, account: json.account }))
    }
  } catch (e) {
    console.log('Error parsing ham2k-lofi sync meta', e, json)
  }
}

function _buildUserAgent () {
  if (Platform.OS === 'ios') {
    return `Ham2K Portable Logger/${packageJson.version} iOS ${Platform.Version} ${[Platform.isIphone && 'iPhone', Platform.isIPad && 'iPad', Platform.isTV && 'TV', Platform.isMacCatalyst && 'Catalyst', Platform.isMac && 'Mac'].filter(Boolean).join(' ')}`
  } else if (Platform.OS === 'android') {
    return `Ham2K Portable Logger/${packageJson.version} Android ${Platform.Version} ${Platform.Manufacturer} ${Platform.Model} ${Platform.Fingerprint} `
  } else {
    return `Ham2K Portable Logger/${packageJson.version} ${Platform.OS}`
  }
}

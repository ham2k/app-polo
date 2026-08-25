// Copyright ©️ 2025-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import Config from 'react-native-config'
import { Platform } from 'react-native'
import * as Sentry from '@sentry/react-native'

import { selectSettings } from '../../../store/settings'
import { selectLocalExtensionData, setLocalExtensionData } from '../../../store/local'
import GLOBAL from '../../../GLOBAL'
import { fetchWithTimeout } from '../../../tools/fetchWithTimeout'
import { syncMetaForDistribution } from '../../../distro'

import packageJson from '../../../../package.json'

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
export const DEFAULT_BACKUP_SERVICE_URL = 'https://backup.ham2k.online'

const DEBUG = false

const SyncHook = {
  ...Info,
  sync: (params) => async (dispatch, getState) => {
    if (DEBUG) console.log('sync', { meta: params.meta })

    const body = JSON.stringify(params)
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/sync', method: 'POST', body })

    // LoFi is unreachable or erroring server-side: hand this sync payload to
    // the backup service so it isn't lost if this device is gone before LoFi
    // is back. Captured even without a cached auth token -- the token just
    // lets a later replay skip re-authenticating, it's not required to
    // preserve the data for manual recovery. Best-effort only -- never
    // changes what the caller sees.
    const failure = _captureableFailure(response)
    if (failure && _hasSomethingToPreserve(params)) {
      await _captureToBackupService({ params, failure })
    }

    return response
  },

  getOperations: (params) => async (dispatch, getState) => {
    if (DEBUG) console.log('getOperations', { meta: params.meta })

    const response = await requestWithAuth({ dispatch, getState, url: 'v1/operations', method: 'GET', params })
    return response
  },

  getQSOs: (params) => async (dispatch, getState) => {
    if (DEBUG) console.log('getQsos', { meta: params.meta })

    const response = await requestWithAuth({ dispatch, getState, url: 'v1/qsos', method: 'GET', params })
    return response
  },

  resetConnection: () => async (dispatch, getState) => {
    GLOBAL.syncLoFiToken = undefined
  },

  linkClient: (email) => async (dispatch, getState) => {
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/client/permissions', method: 'POST', body: JSON.stringify({ email }) })
    return response
  },

  linkClientWithEmail: (email) => async (dispatch, getState) => {
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/client/permissions', method: 'POST', body: JSON.stringify({ email, send_email: true }) })
    return response
  },

  getPermissions: (params) => async (dispatch, getState) => {
    const { account } = selectLocalExtensionData(getState(), Info.key) || {}
    const results = await requestWithAuth({ dispatch, getState, url: `v1/accounts/${account?.uuid}/permissions`, method: 'GET', params })

    return results
  },

  getPermission: (params) => async (dispatch, getState) => {
    const { account } = selectLocalExtensionData(getState(), Info.key) || {}
    const { id, ...otherParams } = params
    const results = await requestWithAuth({ dispatch, getState, url: `v1/accounts/${account?.uuid}/permissions/${id}`, method: 'GET', params: otherParams })

    return results
  },

  updatePermission: (permissionId, data) => async (dispatch, getState) => {
    const { account } = selectLocalExtensionData(getState(), Info.key) || {}
    const body = JSON.stringify(data)
    const results = await requestWithAuth({ dispatch, getState, url: `v1/accounts/${account?.uuid}/permissions/${permissionId}`, method: 'PATCH', body })

    return results
  },

  prepareBlankPermission: (data) => async (dispatch, getState) => {
    const body = JSON.stringify(data)
    const results = await requestWithAuth({ dispatch, getState, url: 'v1/client/permissions', method: 'POST', body })

    return results
  },

  resetClient: (email) => async (dispatch, getState) => {
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/client/reset', method: 'POST', body: JSON.stringify({ email }) })
    return response
  },

  getAccountData: () => async (dispatch, getState) => {
    const results = await requestWithAuth({ dispatch, getState, url: 'v1/accounts', method: 'GET' })

    if (results.ok) {
      // console.log('getAccountData', results.json)

      const currentData = selectLocalExtensionData(getState(), Info.key) || {}

      const updates = {}
      if (results.json.current_account?.uuid) {
        if (results.json.current_account.uuid !== currentData.account?.uuid) {
          updates.previousAccount = currentData.account
        }
        updates.account = results.json.current_account
      }
      if (results.json.current_client?.uuid) {
        if (results.json.current_client.uuid !== currentData.client?.uuid) {
          updates.previousClient = currentData.client
        }
        updates.client = results.json.current_client
      }
      if (results.json.clients) updates.allClients = results.json.clients
      if (results.json.accounts) updates.allAccounts = results.json.accounts
      if (results.json.subscription) updates.subscription = results.json.subscription
      if (results.json.operations) updates.operations = results.json.operations
      if (results.json.qsos) updates.qsos = results.json.qsos

      if (results.json.pending_challenges !== undefined) updates.pendingChallenges = results.json.pending_challenges

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
  },

  createSubscription: (data) => async (dispatch, getState) => {
    const { account } = selectLocalExtensionData(getState(), Info.key) || {}
    const body = JSON.stringify(data)
    const response = await requestWithAuth({ dispatch, getState, url: `v1/accounts/${account?.uuid}/subscriptions`, method: 'POST', body })

    return response
  },

  resendEmail: () => async (dispatch, getState) => {
    const { account } = selectLocalExtensionData(getState(), Info.key) || {}
    const response = await requestWithAuth({ dispatch, getState, url: `v1/accounts/${account?.uuid}/resend_email`, method: 'POST' })

    return response
  },

  uploadStashFile: ({ uri, type, fileName, format, source, groupUuid, groupTitle }) => async (dispatch, getState) => {
    const formData = new FormData()
    formData.append('stash_file[file]', { uri, type: type || 'text/plain', name: fileName })
    formData.append('stash_file[filename]', fileName)
    if (format) formData.append('stash_file[format]', format)
    formData.append('stash_file[source]', source || 'com.ham2k.polo/exports')
    if (groupUuid) formData.append('stash_file[group_uuid]', groupUuid)
    if (groupTitle) formData.append('stash_file[group_title]', groupTitle)

    const response = await requestWithAuth({ dispatch, getState, url: 'v1/stash_files', method: 'POST', body: formData })
    return response
  },

  getStashFiles: ({ limit, offset } = {}) => async (dispatch, getState) => {
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/stash_files', method: 'GET', params: { limit, offset } })
    return response
  },

  emailStashDownloadLink: ({ email } = {}) => async (dispatch, getState) => {
    const body = email ? JSON.stringify({ email }) : undefined
    const response = await requestWithAuth({ dispatch, getState, url: 'v1/stash_files/email_link', method: 'POST', body })
    return response
  }
}

// Exported for tests; not part of the extension's interface.
//
// What actually went wrong, as the client saw it. `requestWithAuth` labels the
// failures it synthesises; anything else that reaches here with a 5xx is LoFi
// answering badly rather than not answering at all. A deliberately disabled
// service is not a failure and must never be captured -- it would file one on
// every sync round for as long as the flag is off.
export function _captureableFailure (response) {
  if (response?.ok) return undefined
  if (response?.failure) {
    return response.failure.reason === 'disabled' ? undefined : response.failure
  }
  if (response?.status >= 500) return { reason: 'server_error', status: response.status }
  return undefined
}

// A capture exists to preserve data this device might hold the only copy of. A
// sync round with no logged work in it preserves nothing worth the cost of a
// round trip, a stored row and an alert: the Aug 2026 incident put 879 captures
// on the backup service in 28 hours, every one of them an empty poll with no
// unsynced work behind it.
//
// A settings-only round is deliberately not "something to preserve", even though
// it does carry data. `GLOBAL.settingsSynced` only clears on a successful sync,
// so through an outage every single round would carry the settings and every one
// would capture - the exact flood this guard exists to stop, for state the user
// can re-enter and that syncs itself the moment LoFi is back.
//
// The `meta` counts are defence in depth rather than a distinct case: the counts
// and the batch queries apply the same filters, so a non-zero count means the
// batch above is non-empty too.
export function _hasSomethingToPreserve (params) {
  const meta = params?.meta || {}

  return params?.qsos?.length > 0 ||
    params?.operations?.length > 0 ||
    meta.unsyncedQSOCount > 0 ||
    meta.unsyncedOperationCount > 0
}

async function _captureToBackupService ({ params, failure }) {
  const token = Config.HAM2K_BACKUP_TOKEN
  if (!token) return // not configured on this build, skip silently

  try {
    const url = Config.HAM2K_BACKUP_URL || DEFAULT_BACKUP_SERVICE_URL
    await fetchWithTimeout(`${url}/v1/capture`, {
      timeout: 5000,
      method: 'POST',
      headers: {
        'User-Agent': _buildUserAgent(),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        client_jwt: GLOBAL.syncLoFiToken,
        sync_body: params,
        client_timestamp: new Date().toISOString(),
        failure
      })
    })
    if (DEBUG) console.log('-- captured to backup service')
  } catch (e) {
    if (DEBUG) console.log('-- backup service capture failed', e)
    // LoFi *and* the backup service are both unreachable -- worth knowing about,
    // since the local device is now the only copy of this data.
    Sentry.captureMessage('LoFi backup service capture failed', 'warning')
  }
}

async function requestWithAuth ({ dispatch, getState, url, method, body, params }) {
  if (GLOBAL?.flags?.services?.lofi === false) return { ok: false, status: 500, json: {}, failure: { reason: 'disabled', status: 500 } }

  try {
    if (DEBUG) console.log('Ham2K LoFi request', { url, method })
    const settings = selectSettings(getState())

    let { server, account } = selectLocalExtensionData(getState(), Info.key) || {}
    server = server ?? DEFAULT_LOFI_SERVER

    let token = GLOBAL.syncLoFiToken
    const secret = Config.HAM2K_LOFI_SECRET || 'no-secret'

    if (server.endsWith('/')) server = server.slice(0, -1)

    if (params) {
      url = `${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(params).toString()}`
    }

    let retries = 2 // just so that we can re-authenticate if needed
    while (retries > 0) {
      retries--
      if (!token) {
        if (DEBUG) console.log('-- Ham2K LoFi Authenticating', { server, token, secret })
        const response = await fetchWithTimeout(`${server}/v1/client`, {
          timeout: 5000,
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
            },
            meta: {
              ...syncMetaForDistribution({ settings })
            }
          })
        })

        const responseBody = await response.text()
        if (DEBUG) console.log(' -- auth response body', responseBody)
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
          if (DEBUG) console.log('-- auth failed')
          throw new Error('Authentication Failed')
        } else {
          if (DEBUG) console.log('-- auth failed')
          throw new Error(`Server Error ${response.status}`)
        }
      }

      if (DEBUG) console.log('-- request', { url, method, body, token })
      // `fetch` sets its own multipart boundary in the Content-Type header when the
      // body is a `FormData` - setting it ourselves would drop that boundary and break the upload.
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
      const response = await fetchWithTimeout(`${server}/${url}`, {
        timeout: 30000,
        method,
        headers: {
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          Authorization: `Bearer ${token}`
        },
        body
      })

      const responseBody = await response.text()
      if (DEBUG) console.log(' -- main response body', responseBody)
      // const json = await response.json()
      // if (DEBUG)console.log(' -- body size: ', responseBody.length)
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
    // A `failure` label here is the only place a timed-out request stays
    // distinguishable from a gateway's own 504 further down the line.
    if (e.message === 'Network request failed') {
      return { ok: false, status: 0, json: { error: 'Network request failed' }, failure: { reason: 'network', status: 0 } }
    } else if (e.name === 'FetchTimeoutError') {
      return { ok: false, status: 504, json: { error: 'Request timed out' }, failure: { reason: 'timeout', status: 504 } }
    } else {
      throw e
    }
  }
  return { ok: false, status: 401, json: {} }
}

function _processResponseMeta ({ json, account, response, dispatch }) {
  try {
    if (json?.account && (!account || Object.keys(json.account).find(k => account[k] !== json.account[k]))) {
      const currentData = dispatch((_dispatch, getState) => selectLocalExtensionData(getState(), Info.key) || {})
      if (json.account?.uuid !== currentData.account?.uuid) {
        dispatch(setLocalExtensionData({ key: Info.key, account: json.account, previousAccount: currentData.account }))
      } else {
        dispatch(setLocalExtensionData({ key: Info.key, account: json.account }))
      }
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

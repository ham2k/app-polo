// Copyright ©️ 2026 Ronald de Heer <PA4R>
// SPDX-License-Identifier: MPL-2.0

import GLOBAL from '../../../GLOBAL'
import { apiQRZCALL } from '../../../store/apis/apiQRZCALL'
import { QRZCALLAccountSetting } from './QRZCALLAccount'

export const Info = {
  key: 'qrzcall',
  icon: 'web',
  name: 'QRZCALL.EU Callsign Lookups',
  description: 'QRZ-compatible European callsign database. Requires Data or Extra subscription.',
  shortName: 'QRZCALL',
  infoURL: 'https://qrzcall.eu/'
}

const Extension = {
  ...Info,
  category: 'lookup',
  onActivation: ({ registerHook }) => {
    // Priority 80 — between QRZ (99) and HamQTH (50). Adjust as we learn user
    // preference. Higher priority providers run first and short-circuit when
    // shouldSkipLookup returns true.
    registerHook('lookup', { hook: LookupHook, priority: 80 })
    registerHook('setting', {
      hook: {
        key: 'qrzcall-account',
        category: 'account',
        SettingItem: QRZCALLAccountSetting
      }
    })
  }
}
export default Extension

const EMPTY_RECORD = { name: '', city: '', state: '', grid: '', locationLabel: '', locationAccuracy: undefined, image: '' }

const LookupHook = {
  ...Info,
  shouldSkipLookup: ({ online, lookedUp }) => {
    if (GLOBAL?.flags?.services?.qrzcall === false) return true

    // Skip if we already have name + grid (location-quality fields)
    return !online || (lookedUp.name && lookedUp.grid && lookedUp.city)
  },
  lookupCallWithDispatch: (callInfo, { settings, online }) => async (dispatch) => {
    if (GLOBAL?.flags?.services?.qrzcall === false) return {}

    if (online && settings?.accounts?.qrzcall?.token && callInfo?.baseCall?.length > 2) {
      let promise = await dispatch(apiQRZCALL.endpoints.lookupCall.initiate({ call: callInfo.call }))
      await Promise.all(dispatch(apiQRZCALL.util.getRunningQueriesThunk()))
      let lookup = await dispatch((_dispatch, getState) => apiQRZCALL.endpoints.lookupCall.select({ call: callInfo.call })(getState()))
      promise.unsubscribe && promise.unsubscribe()

      // Modifier fallback: if /portable etc. wasn't found, try the base callsign
      if ((typeof lookup?.error === 'string' && lookup.error.indexOf('not found') > 0) && callInfo.baseCall && callInfo.baseCall !== callInfo.call) {
        promise = await dispatch(apiQRZCALL.endpoints.lookupCall.initiate({ call: callInfo.baseCall }))
        await Promise.all(dispatch(apiQRZCALL.util.getRunningQueriesThunk()))
        lookup = await dispatch((_dispatch, getState) => apiQRZCALL.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
        promise.unsubscribe && promise.unsubscribe()
      }

      let matchingCall = lookup?.data?.allCalls?.find(call => call === callInfo.call)
      if (!matchingCall && callInfo.baseCall) matchingCall = lookup?.data?.allCalls?.find(call => call === callInfo.baseCall)

      if (matchingCall) {
        return { ...lookup.data, call: matchingCall, source: 'qrzcall.eu' }
      } else if (lookup?.error) {
        const errorMessage = lookup.error.error || lookup.error
        return { ...EMPTY_RECORD, error: `QRZCALL: ${errorMessage}`, call: callInfo.call, source: 'qrzcall.eu' }
      }
    }
    return {}
  }
}

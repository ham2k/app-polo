/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { apiQRZ } from '../../../store/apis/apiQRZ'

export const Info = {
  key: 'qrz',
  icon: 'web',
  name: 'QRZ.com Callsign Lookups',
  description: 'Requires free account for names, and paid account for locations',
  shortName: 'QRZ',
  infoURL: 'https://qrz.com/'
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook, priority: 100 })
    registerHook('account', { hook: AccountHook })
  }
}
export default Extension

const LookupHook = {
  ...Info,
  shouldSkipLookup: ({ online, lookedUp }) => {
    return !online || (lookedUp.name && lookedUp.grid)
  },
  lookupCallWithDispatch: async (callInfo, { settings, online, dispatch }) => {
    let qrzPromise
    let qrzLookup
    if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && callInfo?.baseCall?.length > 2) {
      qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: callInfo.call }))
      await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
      qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: callInfo.call })(getState()))
      qrzPromise.unsubscribe && qrzPromise.unsubscribe()

      // If not found and the call had modifiers, try the base call
      if (!qrzLookup?.error?.indexOf('not found') >= 0 && callInfo.baseCall !== callInfo.call) {
        qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: callInfo.baseCall }))
        await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
        qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
        qrzPromise.unsubscribe && qrzPromise.unsubscribe()
      }

      let matchingQRZCall = qrzLookup?.data?.allCalls?.find(call => call === callInfo.call)
      if (!matchingQRZCall && callInfo.baseCall) matchingQRZCall = qrzLookup?.data?.allCalls?.find(call => call === callInfo.baseCall)

      if (matchingQRZCall) {
        return { ...qrzLookup.data, call: matchingQRZCall, source: 'qrz.com' }
      } else if (qrzLookup?.error) {
        return { error: qrzLookup.error, call: callInfo.call, source: 'qrz.com' }
      }
    }
    return {}
  }
}

const AccountHook = {
  ...Info,
  fetchSpots: async ({ online, settings, dispatch }) => {
  }
}

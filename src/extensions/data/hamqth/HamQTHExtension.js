/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GLOBAL from '../../../GLOBAL'
import { apiHamQTH } from '../../../store/apis/apiHamQTH'
import { HamQTHAccountSetting } from './HamQTHAccount'

export const Info = {
  key: 'hamqth',
  icon: 'account-search',
  name: 'HamQTH.com Callsign Lookups',
  description: 'Requires free account for lookups',
  shortName: 'HamQTH',
  infoURL: 'https://www.hamqth.com/'
}

const Extension = {
  ...Info,
  category: 'lookup',
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook, priority: 50 })
    registerHook('setting', {
      hook: {
        key: 'hamqth-account',
        category: 'account',
        SettingItem: HamQTHAccountSetting
      }
    })
  }
}
export default Extension

const LookupHook = {
  ...Info,
  shouldSkipLookup: ({ online, lookedUp }) => {
    if (GLOBAL?.flags?.services?.hamqth === false) return true

    return !online || (lookedUp.name && lookedUp.grid)
  },
  lookupCallWithDispatch: (callInfo, { settings, online }) => async (dispatch) => {
    if (GLOBAL?.flags?.services?.hamqth === false) return {}

    if (online && settings?.accounts?.hamqth?.login && settings?.accounts?.hamqth?.password && callInfo?.baseCall?.length > 2) {
      const promise = await dispatch(apiHamQTH.endpoints.lookupCall.initiate({ call: callInfo.call }))
      await Promise.all(dispatch(apiHamQTH.util.getRunningQueriesThunk()))
      const lookup = await dispatch((_dispatch, getState) => apiHamQTH.endpoints.lookupCall.select({ call: callInfo.call })(getState()))
      promise.unsubscribe && promise.unsubscribe()

      if (lookup?.data?.call) {
        return { ...lookup.data, source: 'hamqth' }
      }
    }
    return {}
  }
}

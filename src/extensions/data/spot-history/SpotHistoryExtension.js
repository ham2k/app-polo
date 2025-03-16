/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { selectStateForComponent } from '../../../store/ui'

export const Info = {
  key: 'spot-history',
  icon: 'web',
  hidden: true,
  alwaysEnabled: true,
  name: 'Spot History',
  description: 'Include information from recent spots'
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook, priority: 0 })
    registerHook('setting', { hook: SettingHook })
  }
}
export default Extension

const MAX_SPOT_AGE = 1000 * 60 * 10 // 10 minutes

const LookupHook = {
  ...Info,

  lookupCallWithDispatch: (callInfo, { settings, operation, online, mode }) => async (dispatch, getState) => {
    if (mode === 'spots') return // Don't search spots when doing lookups for spots

    const state = getState()
    // The next two lines depend on the implementation of `useUIState` and the names used in `SpotsPanel`
    const componentData = selectStateForComponent(state, 'OpSpotsTab') || {}
    const spots = componentData?.spotsState?.spots || {}

    const refs = []
    for (const key in spots) {
      (spots[key] || []).forEach(s => {
        if (s.their.call === callInfo?.call && s.spot.timeInMillis > Date.now() - MAX_SPOT_AGE) {
          refs.push(...s.refs)
        }
      })
    }

    if (refs.length > 0) {
      return { call: callInfo?.call, source: 'Spots History', refs }
    }
  }
}

const SettingHook = {
  ...Info
}

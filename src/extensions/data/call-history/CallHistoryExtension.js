/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { findQSOHistory } from '../../../store/qsos/actions/findQSOHistory'
import { capitalizeString } from '../../../tools/capitalizeString'

export const Info = {
  key: 'call-history',
  icon: 'web',
  name: 'Call History',
  description: 'Upload historic ADIF and use for offline lookups'
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook, priority: -1 })
    registerHook('setting', { hook: SettingHook })
  }
}
export default Extension

const LookupHook = {
  ...Info,
  lookupCallWithDispatch: async (callInfo, { settings, operation, online, dispatch }) => {
    const history = await findQSOHistory(callInfo?.call)
    const lookup = { call: callInfo.call }
    if (history && history[0] && (history[0].theirCall === callInfo?.call || history[0].theirCall === callInfo?.baseCall)) {
      const historyData = JSON.parse(history[0].data)
      if (historyData.their) {
        // Capture the lookup call, not the QSO, because the original guess and lookup might have been for different modifiers
        lookup.call = historyData.their.guess?.call ?? historyData.their.call

        lookup.name = capitalizeString(historyData.their.name ?? historyData.their.guess?.name, { content: 'name', force: false })
        lookup.state = historyData.their.state ?? historyData.their.guess?.state
        lookup.city = capitalizeString(historyData.their.city ?? historyData.their.guess?.city, { content: 'address', force: false })
        lookup.postal = historyData.their.postal ?? historyData.their.guess?.postal
        lookup.grid = historyData.their.grid ?? historyData.their.guess?.grid
        lookup.cqZone = historyData.their.cqZone ?? historyData.their.guess?.cqZone
        lookup.ituZone = historyData.their.ituZone ?? historyData.their.guess?.ituZone
        Object.keys(lookup).forEach(key => {
          if (!lookup[key]) delete lookup[key]
        })
        lookup.source = 'Call History'
      }
    }
    return { ...lookup, history }
  }
}

const SettingHook = {
  ...Info
}

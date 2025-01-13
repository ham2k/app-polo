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
    registerHook('lookup', { hook: LookupHook, priority: 100 })
    registerHook('setting', { hook: SettingHook })
  }
}
export default Extension

const LookupHook = {
  ...Info,
  lookupCallWithDispatch: async (callInfo, { settings, operation, online, dispatch }) => {
    const { history, mostRecentQSO } = await findQSOHistory(callInfo?.call, { baseCall: callInfo?.baseCall })
    // console.log('History lookup', { call: callInfo.call, history: history.length, name: mostRecentQSO?.their?.name, guessName: mostRecentQSO?.their?.guess?.name })
    // console.log('-- ', mostRecentQSO)
    if (mostRecentQSO?.their?.call) {
      const lookup = { call: callInfo?.call, source: 'Call History' }

      lookup.name = capitalizeString(mostRecentQSO?.their?.name ?? mostRecentQSO?.their?.guess?.name, { content: 'name', force: false })

      // If modifiers match, and the guess was not for a different location, use the location
      if (mostRecentQSO.their.call === callInfo?.call && !mostRecentQSO.their.guess?.locationLabel) {
        lookup.state = mostRecentQSO.their.state ?? mostRecentQSO.their.guess?.state
        lookup.city = capitalizeString(mostRecentQSO.their.city ?? mostRecentQSO.their.guess?.city, { content: 'address', force: false })
        lookup.postal = mostRecentQSO.their.postal ?? mostRecentQSO.their.guess?.postal
        lookup.grid = mostRecentQSO.their.grid ?? mostRecentQSO.their.guess?.grid
        lookup.cqZone = mostRecentQSO.their.cqZone ?? mostRecentQSO.their.guess?.cqZone
        lookup.ituZone = mostRecentQSO.their.ituZone ?? mostRecentQSO.their.guess?.ituZone
      }
      lookup.source = 'Call History'

      Object.keys(lookup).forEach(key => {
        if (!lookup[key]) delete lookup[key]
      })
      return { ...lookup, history }
    } else {
      return { history: [] }
    }
  }
}

const SettingHook = {
  ...Info
}

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
  name: 'Call History'
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook })
    registerHook('setting', { hook: SettingHook })
  }
}
export default Extension

const LookupHook = {
  ...Info,
  lookupCallWithDispatch: async (callInfo, { settings, operation, online, dispatch }) => {
    const history = await findQSOHistory(callInfo?.call)
    const lookup = {}
    if (history && history[0] && (history[0].theirCall === callInfo?.call || history[0].theirCall === callInfo?.baseCall)) {
      const historyData = JSON.parse(history[0].data)
      if (historyData?.their?.qrzInfo) { // Old data was stored this way
        historyData.their.lookup = historyData.their?.qrzInfo
      }

      if (historyData.their) {
        lookup.name = capitalizeString(historyData.their.name ?? historyData.their.lookup?.name, { content: 'name', force: false })
        lookup.state = historyData.their.state ?? historyData.their.lookup?.state
        lookup.city = capitalizeString(historyData.their.city ?? historyData.their.lookup?.city, { content: 'address', force: false })
        lookup.postal = historyData.their.postal ?? historyData.their.lookup?.postal
        lookup.grid = historyData.their.grid ?? historyData.their.lookup?.grid
        lookup.cqZone = historyData.their.cqZone ?? historyData.their.lookup?.cqZone
        lookup.ituZone = historyData.their.ituZone ?? historyData.their.lookup?.ituZone
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

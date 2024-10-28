/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../../../package.json'
import { capitalizeString } from '../../../tools/capitalizeString'

export const Info = {
  key: 'hamdb',
  icon: 'account-search',
  name: 'HamDB.org Callsign Loookups',
  description: 'Free service, but limited to USA, Canada and Germany calls',
  shortName: 'HamDB',
  infoURL: 'https://hamdb.org/'
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook, priority: 1 }) // Use other lookup services first
  }
}
export default Extension

const LookupHook = {
  ...Info,
  shouldSkipLookup: ({ online, lookedUp }) => {
    return !online || (lookedUp.name && lookedUp.grid)
  },
  lookupCallWithDispatch: async (callInfo, { settings, online, dispatch }) => {
    const call = callInfo?.baseCall ?? ''
    if (online && call.length > 2) {
      try {
        const response = await fetch(`https://api.hamdb.org/v1/${call}/json/ham2k-polo-${packageJson.version}`, {
          method: 'GET',
          headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` }
        })
        if (response.status === 200) {
          const body = await response.text()
          const json = JSON.parse(body)

          const data = json?.hamdb?.callsign ?? {}
          if (data.call === call) {
            return {
              name: [
                capitalizeString(data.fname, { content: 'name', force: false }),
                data.mi ? data.mi.toUpperCase() + '.' : '',
                capitalizeString(data.name, { content: 'name', force: false })
              ].filter(x => x).join(' '),
              call: castString(data.call),
              firstName: castString(data.fname),
              middleName: data.mi ? castString(data.mi) + '.' : '',
              lastName: castString(data.name),
              city: capitalizeString(data.addr2, { content: 'address', force: false }),
              state: castString(data.state),
              country: capitalizeString(data.country, { force: false }),
              postal: castString(data.zip),
              county: capitalizeString(data.county, { force: false }),
              grid: castString(data.grid),
              lat: castNumber(data.lat),
              lon: castNumber(data.lon)
            }
          }
        }
      } catch (e) {
        console.info(`Error fetching HamDB data from https://api.hamdb.org/v1/${call}/json/ham2k-polo-${packageJson.version}`, e)
      }

      return {}
    }
  }
}

function castString (value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

function castNumber (value) {
  if (value === undefined || value === null) return 0
  const number = Number(value)
  if (isNaN(number)) return null
  return number
}

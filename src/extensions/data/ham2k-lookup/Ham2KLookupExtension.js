// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { capitalizeString } from '@ham2k/lib-format-tools'

import packageJson from '../../../../package.json'
import GLOBAL from '../../../GLOBAL'

export const Info = {
  key: 'ham2k-lookup',
  icon: 'account-search',
  name: 'Ham2K Lookup Service',
  description: 'Free service, but only covering US, Canada and Germany calls',
  shortName: 'Ham2K Lookup',
  infoURL: 'https://ham2k.com/'
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
    if (GLOBAL?.flags?.services?.['ham2k-lookup'] === false) return true

    return !online || (lookedUp.name && lookedUp.grid)
  },
  lookupCallWithDispatch: (callInfo, { settings, online }) => async (dispatch) => {
    if (GLOBAL?.flags?.services?.['ham2k-lookup'] === false) return {}

    const call = callInfo?.baseCall ?? ''
    if (online && call.length > 2) {
      try {
        const response = await fetch(`https://services.ham2k.net/lookups/calls/${call.toLowerCase()}.json`, {
          method: 'GET',
          headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` }
        })
        if (response.status === 200) {
          const data = await response.json()
          if (data.call === call) {
            return {
              name: formatName(data.name),
              call: castString(data.call),
              city: capitalizeString(data.city, { content: 'address', force: false }),
              state: castString(data.state),
              postal: castString(data.zip),
              county: capitalizeString(data.county, { force: false }),
              grid: castString(data.grid)
            }
          }
        }
      } catch (e) {
        console.info(`Error fetching Ham2K Lookup data from https://services.ham2k.net/lookups/calls/${call.toLowerCase()}.json`, e)
      }

      return {}
    }
  }
}

// The service files a suffix after a second comma ("CURTIS, OSCAR A, JR",
// "SMITH, JOHN, MD"), so it comes off before "Last, First" is flipped and goes
// back on the end. Only a known suffix: other names with two commas (clubs,
// "ACME RADIO CLUB, INC., THE") keep their order, as before.
const GENERATIONAL_SUFFIXES = {
  JR: 'Jr', SR: 'Sr', II: 'II', III: 'III', IV: 'IV', V: 'V', VI: 'VI', VII: 'VII', VIII: 'VIII', IX: 'IX'
}
const CREDENTIAL_SUFFIXES = {
  MD: 'MD', DO: 'DO', PHD: 'PhD', EDD: 'EdD', DDS: 'DDS', DMD: 'DMD', DVM: 'DVM', DC: 'DC', OD: 'OD', DPM: 'DPM', ND: 'ND',
  PE: 'PE', ESQ: 'Esq.', JD: 'JD', CPA: 'CPA', RN: 'RN', LPN: 'LPN', LVN: 'LVN', PA: 'PA', MBA: 'MBA', MPH: 'MPH', MSW: 'MSW'
}

export function formatName (name) {
  if (!name) return ''

  let parts = name.split(',').map(part => part.trim())
  let suffix = ''
  if (parts.length === 3) {
    const key = parts[2].toUpperCase().replace(/[.\s]/g, '')
    if (GENERATIONAL_SUFFIXES[key]) suffix = ` ${GENERATIONAL_SUFFIXES[key]}`
    else if (CREDENTIAL_SUFFIXES[key]) suffix = `, ${CREDENTIAL_SUFFIXES[key]}`
    if (suffix) parts = parts.slice(0, 2)
  }
  const reordered = parts.length === 2 ? `${parts[1]} ${parts[0]}` : name

  return capitalizeString(reordered, { content: 'name', force: false }) + suffix
}

function castString (value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

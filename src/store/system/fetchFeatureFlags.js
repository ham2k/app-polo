/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Config from 'react-native-config'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import deepmerge from 'deepmerge'

import { selectRawSettings } from '../settings'
import { selectRuntimeOnline } from '../runtime'
import { setFeatureFlags } from './systemSlice'

const DEBUG = false

export const fetchFeatureFlags = () => async (dispatch, getState) => {
  const state = getState()
  const online = selectRuntimeOnline(state)

  if (DEBUG) console.log('Fetching feature flags', { online, server: Config.POLO_FLAGS_BASE_URL })
  if (!online) return
  if (!Config.POLO_FLAGS_BASE_URL || Config.POLO_FLAGS_BASE_URL.indexOf('example.com') !== -1) return

  const settings = selectRawSettings(state)

  const call = settings?.operatorCall ?? ''

  const locations = []

  locations.push('defaults.json')

  if (call) {
    const callInfo = parseCallsign(call)
    annotateFromCountryFile(callInfo)
    const baseCall = callInfo.baseCall

    const cleanCall = call.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const cleanBaseCall = baseCall.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const cleanEntityPrefix = callInfo.entityPrefix.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const callFolder = cleanBaseCall.slice(0, 2)

    if (cleanEntityPrefix) locations.push(`entities/${cleanEntityPrefix}.json`)
    if (cleanCall !== cleanBaseCall) locations.push(`${callFolder}/${cleanBaseCall}.json`)
    locations.push(`${callFolder}/${cleanCall}.json`)
  }

  let flags = {}
  const fetchedLocations = {}
  while (locations.length > 0) {
    const location = locations.pop()
    try {
      const response = await fetch(`${Config.POLO_FLAGS_BASE_URL}/${location}`)
      fetchedLocations[location] = true

      if (DEBUG) console.log('Fetching flags from', `${Config.POLO_FLAGS_BASE_URL}/${location}`)

      if (response.ok) {
        const data = await response.json()
        if (DEBUG) console.log('-- data', data)

        if (typeof data?.more === 'string') {
          if (!fetchedLocations[data.more]) {
            locations.push(data.more)
          }
        } else if (Array.isArray(data?.more)) {
          data.more.forEach(item => {
            if (typeof item === 'string' && !fetchedLocations[item]) {
              locations.push(item)
            }
          })
        }

        flags = deepmerge(flags, data)
      } else {
        if (DEBUG) console.log('-- status', response.status)
      }
    } catch (error) {
      if (DEBUG) console.log('Error fetching flags from', location, error)
    }
  }
  console.log('Flags', flags)
  dispatch(setFeatureFlags(flags))
}

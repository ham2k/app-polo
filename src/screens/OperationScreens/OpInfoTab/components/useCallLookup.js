/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import emojiRegex from 'emoji-regex'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

import { selectRuntimeOnline } from '../../../../store/runtime'
import { selectSettings } from '../../../../store/settings'

import { findHooks } from '../../../../extensions/registry'
import { LOCATION_ACCURACY } from '../../../../extensions/constants'
import { removeEmptyValues } from '../../../../tools/objectTools'

const EMOJI_REGEX = emojiRegex()

const DEBUG = false

export const useCallLookup = (qso) => {
  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()

  const [cachedLookups, origsetCachedLookups] = useState({})
  const setCachedLookups = (newLookups) => {
    if (DEBUG) console.log('* setCachedLookups', Object.keys(newLookups).map(k => `${k}:${newLookups[k].status}`).join(', '))
    origsetCachedLookups(newLookups)
  }

  const { call, theirInfo, cacheKey, baseCacheKey } = useMemo(() => _extractCallInfo(qso), [qso])

  if (DEBUG) console.log('\n\nuseCallLookup', { call, cacheKey })

  useEffect(() => {
    if (DEBUG) console.log('-- useCallLookup effect', { call, cacheKey, cached: Object.keys(cachedLookups) })

    if (call && call.length > 2 && (!cachedLookups[cacheKey] || cachedLookups[cacheKey].status === 'prefilled')) {
      if (DEBUG) console.log('  -- useCallLookup effect not cached', { cacheKey, source: cachedLookups[cacheKey]?.status })

      setCachedLookups({ ...cachedLookups, [cacheKey]: { ...cachedLookups[cacheKey], status: 'looking' } })

      setTimeout(async () => {
        // First do an offline lookup, to use things like local history as fast as possible
        const offlineLookup = await _performLookup({ qso, call, theirInfo, online: false, skipLookup: true, settings, dispatch })

        if (offlineLookup?.guess?.name || offlineLookup?.guess?.city || offlineLookup?.guess?.grid || offlineLookup?.guess?.locationLabel) {
          if (DEBUG) console.log('  -- filling cachedLookups with offline lookup', { name: offlineLookup.guess.name, locationLabel: offlineLookup.guess.locationLabel, state: offlineLookup.guess.state })
          setCachedLookups({ ...cachedLookups, [cacheKey]: { call, cacheKey, ...offlineLookup, status: 'offline' } })
        }

        // And then a full lookup for slower online sources
        const onlineLookup = await _performLookup({ qso, call, theirInfo, online, settings, dispatch })

        if (onlineLookup?.guess?.name || onlineLookup?.guess?.city || onlineLookup?.guess?.grid || onlineLookup?.guess?.locationLabel) {
          if (DEBUG) console.log('  -- filling cachedLookups with online lookup', { name: onlineLookup.guess.name, locationLabel: onlineLookup.guess.locationLabel, state: onlineLookup.guess.state })
          setCachedLookups({ ...cachedLookups, [cacheKey]: { call, cacheKey, ...onlineLookup, status: 'online' } })
        } else {
          setCachedLookups({ ...cachedLookups, [cacheKey]: { ...cachedLookups[cacheKey], status: 'looked' } })
        }
      }, 0)
    } else {
      if (DEBUG) console.log('  -- useCallLookup effect cached', { cacheKey })
    }
  }, [call, online, settings, dispatch, cachedLookups, qso, cacheKey, theirInfo])

  if (cachedLookups[cacheKey]) {
    if (DEBUG) console.log('-- useCallLookup returns', cacheKey, { city: cachedLookups[cacheKey]?.guess?.city, locationLabel: cachedLookups[cacheKey]?.guess?.locationLabel, status: cachedLookups[cacheKey]?.status })

    return cachedLookups[cacheKey]
  } else if (cachedLookups[baseCacheKey]) {
    if (DEBUG) console.log('-- useCallLookup returns without refs', baseCacheKey, { city: cachedLookups[baseCacheKey]?.guess?.city, locationLabel: cachedLookups[baseCacheKey]?.guess?.locationLabel, status: 'newly prefilled' })
    setCachedLookups({ ...cachedLookups, [cacheKey]: { ...cachedLookups[`${call}-no-refs`], status: 'prefilled' } })

    return cachedLookups[`${call}-no-refs`]
  } else {
    if (DEBUG) console.log('-- useCallLookup returns barebones', cacheKey, { city: theirInfo?.city, locationLabel: undefined, status: 'newly prefilled' })
    const lookupInfo = { call, cacheKey, theirInfo, guess: theirInfo, lookup: {}, lookups: {}, status: 'prefilled' }
    setCachedLookups({ ...cachedLookups, [cacheKey]: lookupInfo })

    return lookupInfo
  }
}

export async function annotateQSO ({ qso, online, settings, dispatch, skipLookup = false }) {
  const { call, theirInfo } = _extractCallInfo(qso)

  const { guess, lookup } = await _performLookup({ qso, call, theirInfo, online, settings, dispatch })

  return { ...qso, their: { ...qso.their, ...theirInfo, guess, lookup } }
}

function _extractCallInfo (qso) {
  // Pick the last call in the list, and ignore any under 3 characters or with a question mark
  const calls = qso?.their?.call?.split(',')?.filter(x => x && x.length > 2 && x.indexOf('?') < 0) ?? []
  let call = calls[calls.length - 1]

  // Remove any trailing slash
  if (call?.endsWith('/')) call = call.slice(0, -1)

  // if (!call || call.length < 3) return { call: '', theirInfo: {}, cacheKey: 'no-call' }

  let theirInfo = parseCallsign(call)
  if (theirInfo?.baseCall) {
    theirInfo = annotateFromCountryFile(theirInfo)
  } else if (call) {
    theirInfo = annotateFromCountryFile({ prefix: call, baseCall: call })
  }

  const cacheKey = `${call}-${qso?.refs?.map(r => `${r.type || r.key}:${r.ref}`).join(',') || 'no-refs'}`
  const baseCacheKey = `${call}-no-refs`

  return { call, theirInfo, cacheKey, baseCacheKey }
}

async function _performLookup ({ qso, call, theirInfo, online, settings, dispatch, skipLookup = false }) {
  const { lookups } = await _lookupCall(theirInfo, { online, settings, dispatch, skipLookup: false })
  const { refs } = await _lookupRefs(qso?.refs, { online, settings, dispatch, skipLookup: false })

  const { guess, lookup } = _mergeData({ theirInfo, lookups, refs })

  return { guess, lookup, lookups, theirInfo }
}

async function _lookupCall (theirInfo, { online, settings, dispatch, skipLookup = false }) {
  const lookups = {}
  if (!skipLookup) {
    const lookupHooks = findHooks('lookup')
    const lookedUp = {}
    for (const hook of lookupHooks) {
      if (!hook?.shouldSkipLookup || !hook.shouldSkipLookup({ online, lookedUp })) {
        let data
        if (hook?.lookupCallWithDispatch) {
          data = await hook.lookupCallWithDispatch(theirInfo, { settings, dispatch, online })
        } else if (hook?.lookupCall) {
          data = hook.lookupCall(hook.lookupCall(theirInfo, { settings, online }))
        }
        if (data) {
          lookups[hook.key] = removeEmptyValues(data)
          Object.keys(lookups[hook.key]).forEach(key => { lookedUp[key] = true })
        }
      }
    }
  }

  return { lookups }
}

async function _lookupRefs (refs, { online, settings, dispatch, skipLookup = false }) {
  let newRefs = []
  for (const ref of (refs || [])) {
    const hooks = findHooks(`ref:${ref.type}`)
    for (const hook of hooks) {
      if (hook?.decorateRefWithDispatch && dispatch) {
        newRefs.push(await dispatch(hook.decorateRefWithDispatch(ref)))
      } else if (hook?.decorateRef) {
        newRefs.push(hook.decorateRef(ref))
      }
    }
  }
  newRefs = newRefs.sort((a, b) => (a.accuracy ?? LOCATION_ACCURACY.NO_LOCATION) - (b.accuracy ?? LOCATION_ACCURACY.NO_LOCATION))

  return { refs: newRefs }
}

function _mergeData ({ theirInfo, lookups, refs }) {
  let mergedLookup = {}
  const newGuess = { ...theirInfo }

  for (const key in lookups) { // High to low priority
    if (lookups[key].call === theirInfo.call || lookups[key].call === theirInfo.baseCall) {
      mergedLookup = {
        sources: [],
        ...lookups[key],
        ...mergedLookup,
        notes: [...mergedLookup.notes ?? [], ...lookups[key].notes ?? []],
        history: [...mergedLookup.history ?? [], ...lookups[key].history ?? []]
      }
      if (lookups[key].source) {
        mergedLookup.sources.push(lookups[key].source)
      }
    }
  }

  if (mergedLookup?.name) {
    // Use their name in any case
    newGuess.name = mergedLookup.name
    if (theirInfo.indicators && theirInfo.indicators.find(ind => ['P', 'M', 'AM', 'MM'].indexOf(ind) >= 0)) {
      // If operating Portable, Maritime Mobile, or Mobile, ignore location
    } else if (mergedLookup.call === theirInfo.call || !mergedLookup.call) {
      // If the lookup call is the same as the guess call, then use the lookup location
      newGuess.state = mergedLookup.state
      newGuess.city = mergedLookup.city
      newGuess.grid = mergedLookup.grid
    }
  }

  if (mergedLookup.notes?.length > 0 && (mergedLookup.notes[0]?.call === undefined || mergedLookup.notes[0]?.call === theirInfo.baseCall || mergedLookup.notes[0]?.call === theirInfo?.call)) {
    newGuess.note = mergedLookup.notes[0].note
    const matches = newGuess.note && newGuess.note.match(EMOJI_REGEX)
    if (matches) {
      newGuess.emoji = matches[0]
    } else {
      newGuess.emoji = '⭐️'
    }
  } else {
    newGuess.emoji = undefined
  }

  if (refs) {
    for (const ref of refs) {
      if (ref.grid) {
        if ((newGuess.locationAccuracy ?? LOCATION_ACCURACY.NO_LOCATION) > (ref.accuracy ?? LOCATION_ACCURACY.VAGUE)) {
          newGuess.locationAccuracy = (ref.accuracy ?? LOCATION_ACCURACY.VAGUE)
          newGuess.locationLabel = ref.label ?? ref.name
          newGuess.grid = ref.grid
        }
      }
      if (ref.state) {
        newGuess.city = undefined
        newGuess.state = ref.state
      }
    }
  }

  return { guess: newGuess, lookup: mergedLookup }
}

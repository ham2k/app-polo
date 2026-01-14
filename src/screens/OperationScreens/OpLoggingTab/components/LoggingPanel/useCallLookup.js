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

import { selectRuntimeOnline } from '../../../../../store/runtime'
import { selectSettings } from '../../../../../store/settings'

import { findHooks } from '../../../../../extensions/registry'
import { LOCATION_ACCURACY } from '../../../../../extensions/constants'
import { removeEmptyValues } from '../../../../../tools/objectTools'

import { reportError } from '../../../../../distro'
import { parseStackedCalls } from '../../../../../tools/callsignTools'

const EMOJI_REGEX = emojiRegex()

const DEBUG = false

const CACHE = {
  lookups: {} // Use a global cache
}

export const resetCallLookupCache = () => (dispatch, getState) => {
  CACHE.lookups = {}
}

export const useCallLookup = (qso) => {
  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()

  // We don't really use `currentLookup`, but it's here to trigger a re-render when it changes
  // eslint-disable-next-line no-unused-vars
  const [currentLookup, setCurrentLookup] = useState({})

  const { call, theirInfo, cacheKey, baseCacheKey } = useMemo(() => _extractCallInfo(qso?.their?.call, qso?.refs), [qso?.their?.call, qso?.refs])

  if (DEBUG) console.log('\n\nuseCallLookup', { call, cacheKey, baseCacheKey })

  useEffect(() => {
    if (DEBUG) console.log('-- useCallLookup effect', { call, cacheKey, cached: Object.keys(CACHE.lookups) })

    if (call && call.length > 2 && (!CACHE.lookups[cacheKey] || CACHE.lookups[cacheKey].status === 'prefilled')) {
      if (DEBUG) console.log('  -- useCallLookup effect not cached', { cacheKey, source: CACHE.lookups[cacheKey]?.status })

      CACHE.lookups[cacheKey] = { ...CACHE.lookups[cacheKey], status: 'looking', when: new Date() }
      setCurrentLookup(CACHE.lookups[cacheKey])

      setImmediate(async () => {
        // First do an offline lookup, to use things like local history as fast as possible
        const offlineLookup = await _performLookup({ call, refs: qso?.refs, theirInfo, online: false, settings, dispatch })

        if (offlineLookup?.guess?.name || offlineLookup?.guess?.city || offlineLookup?.guess?.grid || offlineLookup?.guess?.locationLabel || offlineLookup?.guess?.note) {
          if (DEBUG) console.log('  -- filling CACHE.lookups with offline lookup', { name: offlineLookup.guess.name })
          CACHE.lookups[cacheKey] = { call, cacheKey, ...offlineLookup, status: 'offline', when: new Date() }
          setCurrentLookup(CACHE.lookups[cacheKey])
        }

        if (online) {
          // And then a full lookup for slower online sources
          const onlineLookup = await _performLookup({ call, refs: qso?.refs, theirInfo, online, settings, dispatch })

          if (onlineLookup?.guess?.name || onlineLookup?.guess?.city || onlineLookup?.guess?.grid || onlineLookup?.guess?.locationLabel || onlineLookup?.guess?.note || onlineLookup?.lookup?.image || onlineLookup?.lookup?.error) {
            if (DEBUG) console.log('  -- filling CACHE.lookups with online lookup', { name: onlineLookup.guess.name })
            CACHE.lookups[cacheKey] = { call, cacheKey, ...onlineLookup, status: 'online', when: new Date() }
            setCurrentLookup(CACHE.lookups[cacheKey])
          } else {
            if (DEBUG) console.log('  -- keeping CACHE.lookups as is but marking as "looked"', { name: onlineLookup.guess.name })
            CACHE.lookups[cacheKey] = { ...CACHE.lookups[cacheKey], status: 'looked', when: new Date() } // Nothing changed
            setCurrentLookup(CACHE.lookups[cacheKey])
          }
        }
      })
    } else {
      if (DEBUG) console.log('  -- useCallLookup effect cached', { cacheKey })
    }
  }, [call, online, dispatch, cacheKey, theirInfo, qso?.refs, settings])

  if (CACHE.lookups[cacheKey]) {
    if (DEBUG) console.log('-- useCallLookup returns', cacheKey, { name: CACHE.lookups[cacheKey]?.guess?.name, status: CACHE.lookups[cacheKey]?.status })

    return CACHE.lookups[cacheKey]
  } else if (CACHE.lookups[baseCacheKey]) {
    if (DEBUG) console.log('-- useCallLookup returns without refs', baseCacheKey, { name: CACHE.lookups[baseCacheKey]?.guess?.name, status: 'newly prefilled' })
    const prefill = { ...CACHE.lookups[baseCacheKey], status: 'prefilled', when: new Date() }
    CACHE.lookups[cacheKey] = prefill
    setCurrentLookup(CACHE.lookups[cacheKey])

    return prefill
  } else {
    if (DEBUG) console.log('-- useCallLookup returns barebones', cacheKey, { name: theirInfo?.name, locationLabel: undefined, status: 'newly prefilled' })
    const prefill = { call, cacheKey, theirInfo, guess: theirInfo, lookup: {}, lookups: {}, status: 'prefilled', when: new Date() }
    CACHE.lookups[cacheKey] = prefill
    setCurrentLookup(CACHE.lookups[cacheKey])

    return prefill
  }
}

export async function annotateQSO({ qso, online, settings, dispatch, mode = 'full' }) {
  const { call, theirInfo } = _extractCallInfo(qso?.their?.call, qso?.refs)

  const { guess, lookup } = await _performLookup({ qso, call, theirInfo, online, settings, dispatch, mode })

  return { ...qso, their: { ...qso.their, ...theirInfo, guess, lookup } }
}

function _extractCallInfo(call, refs) {
  // Pick the last call in the list, and ignore any under 3 characters or with a question mark
  const { allCalls } = parseStackedCalls(call)
  const calls = allCalls.filter(x => x && x.length > 2 && x.indexOf('?') < 0) ?? []
  let oneCall = calls[calls.length - 1]

  // Remove any trailing slash
  if (oneCall?.endsWith('/')) oneCall = oneCall.slice(0, -1)

  // if (!call || call.length < 3) return { call: '', theirInfo: {}, cacheKey: 'no-call' }

  let theirInfo = parseCallsign(oneCall)
  if (theirInfo?.baseCall) {
    theirInfo = annotateFromCountryFile(theirInfo)
  } else if (oneCall) {
    theirInfo = annotateFromCountryFile({ prefix: oneCall, baseCall: oneCall })
  }

  if (theirInfo?.indicators?.includes('QRP')) {
    theirInfo.power = 5
  }

  const cacheKey = `${oneCall}-${refs?.map(r => `${r.type || r.key}:${r.ref}`).join(',') || 'no-refs'}`
  const baseCacheKey = `${oneCall}-no-refs`

  return { call: oneCall, theirInfo, cacheKey, baseCacheKey }
}

async function _performLookup({ refs, call, theirInfo, online, settings, dispatch, mode = 'full' }) {
  const { lookups } = await _lookupCall(theirInfo, { online, settings, dispatch, mode })
  const { refs: lookedUpRefs } = await _lookupRefs(refs, { lookups, online, settings, dispatch, mode })
  const { guess, lookup } = _mergeData({ theirInfo, lookups, refs: lookedUpRefs })
  if (DEBUG) console.log('  -- performLookup', { call, keys: Object.keys(lookups), guess, lookup })

  return { guess, lookup, lookups, theirInfo }
}

async function _lookupCall(theirInfo, { online, settings, dispatch, mode = 'full' }) {
  const lookups = {}
  const lookupHooks = findHooks('lookup')
  const lookedUp = {}
  for (const hook of lookupHooks) {
    if (DEBUG) console.log('  -- lookupCall', hook.key, { online, lookedUp })
    if (!hook?.shouldSkipLookup || !hook.shouldSkipLookup({ online, lookedUp })) {
      let data
      try {
        if (hook?.lookupCallWithDispatch) {
          data = await dispatch(hook.lookupCallWithDispatch(theirInfo, { settings, online, mode }))
        } else if (hook?.lookupCall) {
          data = hook.lookupCall(theirInfo, { settings, online, mode })
        }

        if (data) {
          if (DEBUG) console.log('  -- lookupCall data', hook.key, { data })
          lookups[hook.key] = removeEmptyValues(data)
          Object.keys(lookups[hook.key]).forEach(key => { lookedUp[key] = true })
        }
      } catch (error) {
        reportError(`Error looking up call ${theirInfo?.call} on ${hook?.key}`, error)
      }
    }
  }

  return { lookups }
}

async function _lookupRefs(refs, { online, settings, dispatch, mode = 'full' }) {
  let newRefs = []
  for (const ref of (refs || [])) {
    if (!ref.type) continue

    const hooks = findHooks(`ref:${ref.type}`)
    for (const hook of hooks) {
      try {
        if (hook?.decorateRefWithDispatch && dispatch) {
          newRefs.push(await dispatch(hook.decorateRefWithDispatch(ref, { online, settings, mode })))
        } else if (hook?.decorateRef) {
          newRefs.push(hook.decorateRef(ref))
        }
      } catch (error) {
        reportError(`Error decorating ref ${ref?.type} ${ref?.ref} on ${hook?.key}`, error)
      }
    }
  }
  newRefs = newRefs.sort((a, b) => (a.accuracy ?? LOCATION_ACCURACY.NO_LOCATION) - (b.accuracy ?? LOCATION_ACCURACY.NO_LOCATION))

  return { refs: newRefs }
}

function _mergeData({ theirInfo, lookups, refs }) {
  let mergedLookup = {}
  const newGuess = { ...theirInfo }

  for (const key in lookups) { // High to low priority
    if (DEBUG) console.log('mergeData', key)
    if (lookups[key].call === theirInfo.call || lookups[key].call === theirInfo.baseCall) {
      mergedLookup = {
        sources: [],
        ...lookups[key], // Use new data from this key's lookup
        ...mergedLookup, // But override with any data already present, based on priority
        notes: [...mergedLookup.notes ?? [], ...lookups[key].notes ?? []],
        history: [...mergedLookup.history ?? [], ...lookups[key].history ?? []]
      }
      if (DEBUG) console.log('-- data matches', { key, lookupName: lookups[key]?.name, mergedName: mergedLookup?.name })
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

  const refsFromLookups = Object.keys(lookups || {}).map(key => lookups[key].refs).filter(x => x).flat()
  const newRefs = refsFromLookups.filter(ref => !refs.find(r => r.type === ref.type))
  if (newRefs.length > 0) {
    newGuess.refs = newRefs
  }

  return { guess: newGuess, lookup: mergedLookup }
}

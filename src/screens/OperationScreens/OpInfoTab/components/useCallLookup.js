/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import emojiRegex from 'emoji-regex'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

import { selectRuntimeOnline } from '../../../../store/runtime'
import { selectSettings } from '../../../../store/settings'

import { findHooks } from '../../../../extensions/registry'
import { LOCATION_ACCURACY } from '../../../../extensions/constants'

const EMOJI_REGEX = emojiRegex()

export const useCallLookup = ({ call, refs }) => {
  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()

  const [lookupInfo, setLookupInfo] = useState({ guess: {}, lookup: {}, lookups: {}, theirInfo: {} })
  useEffect(() => {
    setTimeout(async () => {
      let theirInfo = parseCallsign(call)
      if (theirInfo?.baseCall) {
        theirInfo = annotateFromCountryFile(theirInfo)
      } else if (call) {
        theirInfo = annotateFromCountryFile({ prefix: call, baseCall: call })
      }

      const { lookups } = await lookupCall(theirInfo, { online, settings, dispatch, skipLookup: false })
      const { refs: decoratedRefs } = await lookupRefs(refs, { online, settings, dispatch, skipLookup: false })

      const { guess, lookup } = mergeData({ theirInfo, lookups, refs: decoratedRefs })

      setLookupInfo({ guess, lookup, lookups, theirInfo })
    }, 0)
  }, [call, refs, online, settings, dispatch])

  return lookupInfo
}

export async function annotateQSO ({ qso, online, settings, dispatch, skipLookup = false }) {
  qso = { ...qso }

  let theirInfo = parseCallsign(qso?.their?.call)
  if (theirInfo?.baseCall) {
    theirInfo = annotateFromCountryFile(theirInfo)
  } else if (qso?.their?.call) {
    theirInfo = annotateFromCountryFile({ prefix: qso?.their?.call, baseCall: qso?.their?.call })
  }

  const { lookups } = await lookupCall(theirInfo, { online, settings, dispatch, skipLookup: false })
  const { refs } = await lookupRefs(qso?.refs, { online, settings, dispatch, skipLookup: false })

  const { guess, lookup } = mergeData({ theirInfo, lookups, refs })

  qso.their.guess = guess
  qso.their.lookup = lookup

  return qso
}

export async function lookupCall (theirInfo, { online, settings, dispatch, skipLookup = false }) {
  const lookups = {}
  if (!skipLookup) {
    const lookupHooks = findHooks('lookup')
    for (const hook of lookupHooks) {
      if (hook?.lookupCallWithDispatch) {
        lookups[hook.key] = await hook.lookupCallWithDispatch(theirInfo, { settings, dispatch, online })
      } else if (hook?.lookupCall) {
        lookups[hook.key] = hook.lookupCall(hook.lookupCall(theirInfo, { settings, online }))
      }
    }
  }

  return { lookups }
}

export async function lookupRefs (refs, { online, settings, dispatch, skipLookup = false }) {
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

function mergeData ({ theirInfo, lookups, refs }) {
  let mergedLookup = {}
  const newGuess = { ...theirInfo }

  for (const key in lookups) {
    if (lookups[key].call === theirInfo.call || lookups[key].call === theirInfo.baseCall) {
      mergedLookup = {
        ...mergedLookup,
        ...lookups[key],
        notes: [...mergedLookup.notes ?? [], ...lookups[key].notes ?? []],
        history: [...mergedLookup.history ?? [], ...lookups[key].history ?? []]
      }
      if (lookups[key].source) {
        mergedLookup.sources = (mergedLookup.sources || []) + [lookups[key].source]
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

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

import { useLookupCallQuery, apiQRZ } from '../../../../store/apiQRZ'
import { selectRuntimeOnline } from '../../../../store/runtime'
import { selectOperationCallInfo } from '../../../../store/operations'
import { selectSettings } from '../../../../store/settings'
import { findQSOHistory } from '../../../../store/qsos/actions/findQSOHistory'

import { findAllCallNotes, useAllCallNotesFinder } from '../../../../extensions/data/call-notes/CallNotesExtension'
import { capitalizeString } from '../../../../tools/capitalizeString'
import { findHooks } from '../../../../extensions/registry'
import { LOCATION_ACCURACY } from '../../../../extensions/constants'

const EMOJI_REGEX = emojiRegex()

export const useQSOInfo = ({ qso, operation }) => {
  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const theirCall = useMemo(() => {
    let call = qso?.their?.call ?? ''
    if (call.endsWith('/')) call = call.slice(0, -1)
    if (call.indexOf(',') >= 0) {
      const calls = call = call.split(',')
      call = calls[calls.length - 1].trim()
    }

    let newGuess = parseCallsign(call)
    if (newGuess?.baseCall) {
      annotateFromCountryFile(newGuess)
    } else if (call) {
      newGuess = annotateFromCountryFile({ prefix: call, baseCall: call })
    }
    return newGuess
  }, [qso?.their?.call])

  const callNotes = useAllCallNotesFinder(theirCall?.baseCall)

  const [callHistory, setCallHistory] = useState()
  useEffect(() => { // Get Call History
    findQSOHistory(theirCall?.call).then(qsoHistory => {
      setCallHistory(qsoHistory.filter(x => x && (x?.operation !== operation?.uuid || x.key !== qso?.key)))
    })
  }, [theirCall?.call, qso?.key, qso?.their?.call, operation?.uuid])

  // Get QRZ.com info
  const skipQRZ = !(online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && theirCall?.baseCall?.length > 2)
  const [altQRZCall, setAltQRZCall] = useState()
  const qrzLookup = useLookupCallQuery({ call: altQRZCall === theirCall?.baseCall ? altQRZCall : theirCall?.call }, { skip: skipQRZ })
  const qrz = useMemo(() => {
    const error = qrzLookup?.error?.message || qrzLookup?.error
    if (error && error.indexOf && error.indexOf('not found') >= 0) {
      // If the call has a prefix or suffix, and the full call was not found, let's retry with the base call
      if (qrzLookup?.originalArgs?.call && qrzLookup?.originalArgs?.call !== theirCall?.baseCall) {
        setAltQRZCall(theirCall.baseCall)
      }
    }
    return qrzLookup.currentData || {}
  }, [qrzLookup, theirCall?.baseCall])

  const [refs, setRefs] = useState()
  useEffect(() => {
    setTimeout(async () => {
      // eslint-disable-next-line no-shadow
      let refs = []
      for (const ref of (qso?.refs || [])) {
        const hooks = findHooks(`ref:${ref.type}`)
        for (const hook of hooks) {
          if (hook?.decorateRefWithDispatch) {
            refs.push(await dispatch(hook.decorateRefWithDispatch(ref, { dispatch })))
          } else if (hook?.decorateRef) {
            refs.push(hook.decorateRef(ref))
          }
        }
      }
      refs = refs.sort((a, b) => (b.accuracy ?? LOCATION_ACCURACY.NO_LOCATION) - (a.accuracy ?? LOCATION_ACCURACY.NO_LOCATION))
      setRefs(refs)
    }, 0)
  }, [dispatch, qso?.refs])

  const { guess, lookup } = useMemo(() => { // Merge all data sources and update guesses and QSO
    return mergeData({ theirCall, qrz, refs, callHistory, callNotes })
  }, [theirCall, qrz, refs, callHistory, callNotes])

  return {
    ourInfo, theirCall, guess, lookup, refs, qrz, callNotes, callHistory, online
  }
}

export async function annotateQSO ({ qso, online, settings, dispatch, skipLookup = false }) {
  qso = { ...qso }
  let theirCall = parseCallsign(qso?.their?.call)
  if (theirCall?.baseCall) {
    annotateFromCountryFile(theirCall)
  } else if (qso?.their?.call) {
    theirCall = annotateFromCountryFile({ prefix: qso?.their?.call, baseCall: qso?.their?.call })
  }

  const callNotes = findAllCallNotes(theirCall?.baseCall)

  const callHistory = await findQSOHistory(theirCall?.call)

  let qrz = {}
  if (!skipLookup && online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && theirCall?.baseCall?.length > 2) {
    const qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: theirCall.call }))
    await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
    const qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: theirCall.call })(getState()))
    qrzPromise.unsubscribe && qrzPromise.unsubscribe()
    qrz = qrzLookup.data || {}
  }

  let refs = []
  for (const ref of (qso?.refs || [])) {
    const hooks = findHooks(`ref:${ref.type}`)
    for (const hook of hooks) {
      if (hook?.decorateRefWithDispatch) {
        refs.push(await dispatch(hook.decorateRefWithDispatch(ref)))
      } else if (hook?.decorateRef) {
        refs.push(hook.decorateRef(ref))
      }
    }
  }
  refs = refs.sort((a, b) => (a.accuracy ?? LOCATION_ACCURACY.NO_LOCATION) - (b.accuracy ?? LOCATION_ACCURACY.NO_LOCATION))

  const { guess, lookup } = mergeData({ theirCall, qrz, refs, callHistory, callNotes })

  qso.their.guess = guess
  qso.their.lookup = lookup

  return qso
}

function mergeData ({ theirCall, qrz, refs, callHistory, callNotes }) {
  let historyData = {}
  let newLookup
  const newGuess = { ...theirCall }

  if (callHistory && callHistory[0] && callHistory[0].theirCall === theirCall?.call) {
    historyData = JSON.parse(callHistory[0].data)
    if (historyData?.their?.qrzInfo) {
      historyData.their.lookup = historyData.their?.qrzInfo
      historyData.their.lookup.source = 'qrz.com'
    }
    if (historyData.their) {
      newLookup = {}
      newLookup.name = capitalizeString(historyData.their.name ?? historyData.their.lookup?.name, { content: 'name', force: false })
      newLookup.state = historyData.their.state ?? historyData.their.lookup?.state
      newLookup.city = capitalizeString(historyData.their.city ?? historyData.their.lookup?.city, { content: 'address', force: false })
      newLookup.postal = historyData.their.postal ?? historyData.their.lookup?.postal
      newLookup.grid = historyData.their.grid ?? historyData.their.lookup?.grid
      newLookup.cqZone = historyData.their.cqZone ?? historyData.their.lookup?.cqZone
      newLookup.ituZone = historyData.their.ituZone ?? historyData.their.lookup?.ituZone
      Object.keys(newLookup).forEach(key => {
        if (!newLookup[key]) delete newLookup[key]
      })
      newLookup.source = 'history'
    }
  }

  if (qrz?.name && (qrz.call === theirCall.call || qrz.call === theirCall.baseCall || qrz.otherCall === theirCall.call || qrz.otherCall === theirCall.baseCall)) {
    newLookup = {
      source: 'qrz.com',
      call: qrz.call,
      name: qrz.name,
      state: qrz.state,
      city: qrz.city,
      country: qrz.country,
      dxccCode: qrz.dxccCode,
      county: qrz.county,
      postal: qrz.postal,
      grid: qrz.grid,
      cqZone: qrz.cqZone,
      ituZone: qrz.ituZone,
      image: qrz.image,
      imageInfo: qrz.imageInfo
    }
  }

  if (newLookup?.name) {
    // Use their name in any case
    newGuess.name = newLookup.name
    if (theirCall.indicators && theirCall.indicators.find(ind => ['P', 'M', 'AM', 'MM'].indexOf(ind) >= 0)) {
      // If operating Portable, Maritime Mobile, or Mobile, ignore location
    } else if (newLookup.call === theirCall.call || !newLookup.call) {
      // If the lookup call is the same as the guess call, then use the lookup location
      newGuess.state = newLookup.state
      newGuess.city = newLookup.city
      newGuess.grid = newLookup.grid
    }
  }

  if (callNotes?.length > 0 && (callNotes[0]?.call === undefined || callNotes[0]?.call === theirCall.baseCall || callNotes[0]?.call === theirCall?.call)) {
    newGuess.note = callNotes[0].note
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

  return { guess: newGuess, lookup: newLookup }
}

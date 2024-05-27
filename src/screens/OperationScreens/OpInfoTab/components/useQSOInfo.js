/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import emojiRegex from 'emoji-regex'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'

import { useLookupCallQuery, apiQRZ } from '../../../../store/apiQRZ'
import { useLookupParkQuery } from '../../../../store/apiPOTA'
import { selectRuntimeOnline } from '../../../../store/runtime'
import { selectOperationCallInfo } from '../../../../store/operations'
import { selectSettings } from '../../../../store/settings'
import { findQSOHistory } from '../../../../store/qsos/actions/findQSOHistory'

import { filterRefs, findRef } from '../../../../tools/refTools'
import { findAllCallNotes, useAllCallNotesFinder } from '../../../../extensions/data/call-notes/CallNotesExtension'
import { potaFindParkByReference } from '../../../../extensions/activities/pota/POTAAllParksData'

const EMOJI_REGEX = emojiRegex()

export const useQSOInfo = ({ qso, operation }) => {
  const online = useSelector(selectRuntimeOnline)
  const settings = useSelector(selectSettings)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const theirCall = useMemo(() => { // Parse the callsign
    let call = qso?.their?.call ?? ''
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
    const timeout = setTimeout(async () => {
      const qsoHistory = await findQSOHistory(theirCall?.baseCall)

      setCallHistory(qsoHistory.filter(x => x && (x?.operation !== operation?.uuid || x.key !== qso?.key)))
    }, 0)
    return () => clearTimeout(timeout)
  }, [theirCall?.baseCall, qso?.key, operation?.uuid])

  const [skipQRZ, setSkipQRZ] = useState(undefined) // Use `skip` to prevent calling the API on every keystroke
  useEffect(() => {
    if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && theirCall?.baseCall?.length > 2) {
      if (skipQRZ === undefined) {
        // If we start with a prefilled call, then call QRZ right away
        setSkipQRZ(false)
      } else {
        // Wait a bit before calling QRZ on every keystroke
        const timeout = setTimeout(() => { setSkipQRZ(false) }, 400)
        return () => clearTimeout(timeout)
      }
    }
  }, [theirCall?.baseCall, online, settings?.accounts?.qrz, skipQRZ])

  const [qrzCall, setQRZCall] = useState()
  const qrzLookup = useLookupCallQuery({ call: qrzCall === theirCall.baseCall ? qrzCall : theirCall.call }, { skip: skipQRZ })
  const qrz = useMemo(() => {
    if (qrzLookup?.error && qrzLookup.error.indexOf && qrzLookup.error.indexOf('not found') >= 0) {
      // If the call has a prefix or suffix, and the full call was not found, let's retry with the base call
      if (qrzLookup?.originalArgs?.call !== theirCall.baseCall) {
        setQRZCall(theirCall.baseCall)
      }
    } else if (qrzLookup?.error?.message && qrzLookup.error.message.indexOf('not found') >= 0) {
      // If the call has a prefix or suffix, and the full call was not found, let's retry with the base call
      if (qrzLookup?.originalArgs?.call !== theirCall.baseCall) {
        setQRZCall(theirCall.baseCall)
      }
    }
    return qrzLookup.currentData || {}
  }, [qrzLookup, theirCall?.baseCall])

  const potaRef = useMemo(() => { // Find POTA references
    const potaRefs = filterRefs(qso?.refs, 'pota')
    if (potaRefs?.length > 0) {
      return potaRefs[0].ref
    } else {
      return undefined
    }
  }, [qso?.refs])

  const potaLookup = useLookupParkQuery({ ref: potaRef }, { skip: !potaRef, online })

  const pota = useMemo(() => {
    return potaLookup?.data ?? {}
  }
  , [potaLookup?.data])

  const { guess, lookup } = useMemo(() => { // Merge all data sources and update guesses and QSO
    return mergeData({ theirCall, qrz, pota, callHistory, callNotes })
  }, [theirCall, qrz, pota, callHistory, callNotes])

  return {
    ourInfo, theirCall, guess, lookup, pota, qrz, callNotes, callHistory, online
  }
}

export async function annotateQSO ({ qso, online, settings, dispatch }) {
  let theirCall = parseCallsign(qso?.their?.call)
  if (theirCall?.baseCall) {
    annotateFromCountryFile(theirCall)
  } else if (qso?.their?.call) {
    theirCall = annotateFromCountryFile({ prefix: qso?.their?.call, baseCall: qso?.their?.call })
  }

  const callNotes = findAllCallNotes(theirCall?.baseCall)

  const callHistory = await findQSOHistory(theirCall?.baseCall)

  let qrz = {}
  if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && theirCall?.baseCall?.length > 2) {
    const qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: theirCall.call }))
    await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
    const qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: theirCall.call })(getState()))
    qrzPromise.unsubscribe && qrzPromise.unsubscribe()
    qrz = qrzLookup.data || {}
  }

  let pota = {}
  const potaRef = findRef(qso?.refs, 'pota')
  if (potaRef) {
    const potaLookup = await potaFindParkByReference(potaRef)
    pota = potaLookup?.data ?? {}
  }

  const { guess, lookup } = mergeData({ theirCall, qrz, pota, callHistory, callNotes })
  qso.their.guess = guess
  qso.their.lookup = lookup
}

function mergeData ({ theirCall, qrz, pota, callHistory, callNotes }) {
  let historyData = {}
  let newLookup = {}
  const newGuess = { ...theirCall }

  if (callHistory && callHistory[0] && callHistory[0].theirCall === theirCall?.baseCall) {
    historyData = JSON.parse(callHistory[0].data)
    if (historyData?.their?.qrzInfo) {
      historyData.their.lookup = historyData.their?.qrzInfo
      historyData.their.lookup.source = 'qrz.com'
    }

    newLookup.name = historyData.their.name ?? historyData.their.lookup?.name
    newLookup.state = historyData.their.state ?? historyData.their.lookup?.state
    newLookup.city = historyData.their.city ?? historyData.their.lookup?.city
    newLookup.postal = historyData.their.postal ?? historyData.their.lookup?.postal
    newLookup.grid = historyData.their.grid ?? historyData.their.lookup?.grid
    newLookup.cqZone = historyData.their.cqZone ?? historyData.their.lookup?.cqZone
    newLookup.ituZone = historyData.their.ituZone ?? historyData.their.lookup?.ituZone
    Object.keys(newLookup).forEach(key => {
      if (!newLookup[key]) delete newLookup[key]
    })
    newLookup.source = 'history'
  }

  if (qrz?.name) {
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

  if (callNotes?.length > 0) {
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

  if (pota?.grid6 && pota?.locationDesc?.indexOf(',') < 0) {
    // Only use POTA info if it's not a multi-state park
    newGuess.grid = pota.grid6

    if (pota.reference?.startsWith('US-') || pota.reference?.startsWith('CA-')) {
      const potaState = (pota.locationDesc || '').split('-').pop().trim()
      newGuess.state = potaState
    }
  }
  return { guess: newGuess, lookup: newLookup }
}

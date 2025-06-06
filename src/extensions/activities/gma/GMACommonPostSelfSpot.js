/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseCallsign } from '@ham2k/lib-callsigns'
import { GMAPostSpotAPI } from './GMAPostSpotAPI'

export const GMACommonPostSelfSpot = ({ operation, vfo, comments, refs, url }) => async (dispatch, getState) => {
  const state = getState()
  const call = operation.stationCall || state.settings.operatorCall
  const baseCall = parseCallsign(call).baseCall

  const mainRef = refs[0].ref
  const refComment = refs.length > 1 ? `also ${refs.slice(1).map((x) => (x.ref)).join(' ')}` : ''

  return GMAPostSpotAPI({
    call,
    comments: [comments, refComment],
    freq: vfo.freq,
    mode: vfo.mode ?? 'SSB',
    ref: mainRef,
    spotterCall: baseCall ?? call,
    url
  })
}

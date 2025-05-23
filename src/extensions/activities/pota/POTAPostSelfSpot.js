/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>, 2025 Phillip Kessels <dl9pk@darc.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterRefs } from '../../../tools/refTools'
import { POTAPostSpotAPI } from './POTAPostSpotAPI'

export const POTAPostSelfSpot = ({ operation, vfo, comments }) => async (_dispatch, getState) => {
  const state = getState()

  const calls = [
    operation.stationCall || state.settings.operatorCall,
    ...(operation?.stationCallPlusArray || [])
  ].filter(Boolean)

  const refs = filterRefs(operation, 'potaActivation')

  return Promise.all(
    calls.map((call) => POTAPostSpotAPI({
      calls: [call],
      comments,
      freq: vfo.freq,
      mode: vfo.mode,
      refs,
      spotterCall: call
    }))
  )
}

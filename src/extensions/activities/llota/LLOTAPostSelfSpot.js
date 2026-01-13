/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>, 2025 Phillip Kessels <dl9pk@darc.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterRefs } from '../../../tools/refTools'
import { LLOTAPostSpotAPI } from './LLOTAPostSpotAPI'

export const LLOTAPostSelfSpot = ({ t, operation, vfo, comments }) => (_dispatch, getState) => {
  const state = getState()

  let mainCall = operation.stationCall || state.settings.operatorCall
  if (operation.local?.isMultiStation) {
    mainCall = `${mainCall}/M${operation.local.multiIdentifier ?? "0"}`
  }

  const calls = [
    mainCall,
    ...(operation?.stationCallPlusArray || [])
  ].filter(Boolean)

  const refs = filterRefs(operation, 'llotaActivation')

  console.log('post self spot', t)
  return Promise.all(
    calls.map((call) => LLOTAPostSpotAPI({
      t,
      calls: [call],
      comments,
      freq: vfo.freq,
      mode: vfo.mode,
      refs,
      spotterCall: call
    }))
  )
}

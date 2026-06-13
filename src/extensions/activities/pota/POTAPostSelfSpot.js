// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>, 2025 Phillip Kessels <dl9pk@darc.de>
// SPDX-License-Identifier: MPL-2.0

import { filterRefs } from '@ham2k/lib-qson-tools'

import { POTAPostSpotAPI } from './POTAPostSpotAPI'

export const POTAPostSelfSpot = ({ t, operation, vfo, comments }) => (_dispatch, getState) => {
  const state = getState()

  let mainCall = operation.stationCall || state.settings.operatorCall
  if (operation.local?.isMultiStation) {
    mainCall = `${mainCall}/M${operation.local.multiIdentifier ?? '0'}`
  }

  const calls = [
    mainCall,
    ...(operation?.stationCallPlusArray || [])
  ].filter(Boolean)

  const refs = filterRefs(operation, 'potaActivation')

  return Promise.all(
    calls.map((call) => POTAPostSpotAPI({
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

// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { filterRefs } from '@ham2k/lib-qson-tools'

import { LLOTAPostSpotAPI } from './LLOTAPostSpotAPI'

export const LLOTAPostOtherSpot = ({ t, comments, qso, spotterCall }) => () => {
  const refs = filterRefs(qso, 'llota')

  return LLOTAPostSpotAPI({
    t,
    calls: [qso.their.call],
    comments,
    freq: qso.freq,
    mode: qso.mode,
    refs,
    spotterCall: qso.our?.call ?? spotterCall // with in-progress QSOs our call is still null
  })
}

// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { filterRefs } from '@ham2k/lib-qson-tools'

import { POTAPostSpotAPI } from './POTAPostSpotAPI'

export const POTAPostOtherSpot = ({ t, comments, qso, spotterCall }) => () => {
  const refs = filterRefs(qso, 'pota')

  return POTAPostSpotAPI({
    t,
    calls: [qso.their.call],
    comments,
    freq: qso.freq,
    mode: qso.mode,
    refs,
    spotterCall: qso.our?.call ?? spotterCall // with in-progress QSOs our call is still null
  })
}

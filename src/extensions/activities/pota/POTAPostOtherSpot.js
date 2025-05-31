/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterRefs } from '../../../tools/refTools'
import { POTAPostSpotAPI } from './POTAPostSpotAPI'

export const POTAPostOtherSpot = ({ comments, qso, spotterCall }) => () => {
  const refs = filterRefs(qso, 'pota')

  return POTAPostSpotAPI({
    calls: [qso.their.call],
    comments,
    freq: qso.freq,
    mode: qso.mode,
    refs,
    spotterCall: qso.our?.call ?? spotterCall // with in-progress QSOs our call is still null
  })
}

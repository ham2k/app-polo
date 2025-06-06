/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterRefs } from '../../../tools/refTools'
import { GMAPostSpotAPI } from './GMAPostSpotAPI'

export const GMACommonPostOtherSpot = ({ comments, refFilter, qso, spotterCall }) => () => {
  const refs = filterRefs(qso, refFilter)
  const refComment = refs.length > 1 ? `also ${refs.slice(1).map((x) => (x.ref)).join(' ')}` : ''

  return GMAPostSpotAPI({
    calls: [qso.their.call],
    comments: [comments, refComment],
    freq: qso.freq,
    mode: qso.mode,
    ref: refs[0].ref,
    spotterCall: qso.our?.call ?? spotterCall // with in-progress QSOs our call is still null
  })
}

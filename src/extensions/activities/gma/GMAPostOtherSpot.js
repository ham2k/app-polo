/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { GMACommonPostOtherSpot } from './GMACommonPostOtherSpot'

export const GMAPostOtherSpot = ({ comments, qso, spotterCall }) => (dispatch) => {
  return dispatch(GMACommonPostOtherSpot({ comments, refFilter: 'gma', qso, spotterCall }))
}

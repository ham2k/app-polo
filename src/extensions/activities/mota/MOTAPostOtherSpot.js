// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { GMACommonPostOtherSpot } from '../gma/GMACommonPostOtherSpot'

export const MOTAPostOtherSpot = ({ comments, qso, spotterCall }) => (dispatch) => {
  return dispatch(GMACommonPostOtherSpot({ comments, refFilter: 'mota', qso, spotterCall }))
}

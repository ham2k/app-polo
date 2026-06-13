// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { GMACommonPostOtherSpot } from './GMACommonPostOtherSpot'

export const GMAPostOtherSpot = ({ comments, qso, spotterCall }) => (dispatch) => {
  return dispatch(GMACommonPostOtherSpot({ comments, refFilter: 'gma', qso, spotterCall }))
}

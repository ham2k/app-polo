// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { filterRefs } from '@ham2k/lib-qson-tools'

import { GMACommonPostSelfSpot } from '../gma/GMACommonPostSelfSpot'

export const MOTAPostSelfSpot = ({ operation, vfo, comments }) => async (dispatch, getState) => {
  const refs = filterRefs(operation, 'motaActivation')
  if (refs.length) {
    return dispatch(GMACommonPostSelfSpot({ operation, vfo, comments, refs }))
  }
}

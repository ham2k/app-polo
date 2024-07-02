/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterRefs } from '../../../tools/refTools'
import { GMACommonPostSpot } from '../GMACommonPostSpot'

export const ELAPostSpot = (operation, vfo, comments) => async (dispatch, getState) => {
  const refs = filterRefs(operation, 'elaActivation')
  if (refs.length) {
    return dispatch(GMACommonPostSpot(operation, vfo, comments, refs))
  }
}

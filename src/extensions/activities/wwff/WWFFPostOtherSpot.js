/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { GMACommonPostOtherSpot } from '../gma/GMACommonPostOtherSpot'

export const WWFFPostOtherSpot = ({ comments, qso, spotterCall }) => (dispatch) => {
  return dispatch(GMACommonPostOtherSpot({ comments, refFilter: 'wwff', qso, spotterCall, url: 'https://www.cqgma.org/wwff/spotwwff.php' }))
}

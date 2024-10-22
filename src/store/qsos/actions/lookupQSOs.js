/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { annotateQSO } from '../../../screens/OperationScreens/OpInfoTab/components/useCallLookup'
import { selectRuntimeOnline } from '../../runtime'
import { selectSettings } from '../../settings'
import { selectQSOs } from '../qsosSlice'
import { addQSO } from './qsosDB'

export const lookupAllQSOs = (uuid, options = {}) => async (dispatch, getState) => {
  const qsos = selectQSOs(getState(), uuid)
  const settings = selectSettings(getState())
  const online = selectRuntimeOnline(getState())

  for (let qso of qsos) {
    qso = await annotateQSO({ qso, online, settings, dispatch })
    await dispatch(addQSO({ uuid, qso }))
  }
}

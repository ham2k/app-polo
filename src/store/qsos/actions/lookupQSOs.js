// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { annotateQSO } from '../../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'
import { selectRuntimeOnline } from '../../runtime'
import { selectSettings } from '../../settings'
import { selectQSOs } from '../qsosSlice'
import { addQSO } from './qsosDB'

export const lookupAllQSOs = (operation, options = {}) => async (dispatch, getState) => {
  const uuid = operation.uuid

  const qsos = selectQSOs(getState(), uuid)
  const settings = selectSettings(getState())
  const online = selectRuntimeOnline(getState())

  for (let qso of qsos) {
    qso = await annotateQSO({ qso, online, settings, operation, qsos, dispatch })
    await dispatch(addQSO({ uuid, qso }))
  }
}

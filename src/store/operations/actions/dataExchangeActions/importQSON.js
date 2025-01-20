/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'
import RNFetchBlob from 'react-native-blob-util'

import { reportError } from '../../../../distro'

import { actions } from '../../operationsSlice'
import { actions as qsosActions, saveQSOsForOperation } from '../../../qsos'
import { saveOperation } from '../operationsDB'

const QSON_FILENAME_REGEX = /.+\.qson$/i

export const importQSON = (path) => async (dispatch) => {
  const matches = path.match(QSON_FILENAME_REGEX)
  if (matches) {
    // const originalUUID = matches[1]
    const uuid = UUID.v4()
    dispatch(actions.setOperation({ uuid, status: 'loading' }))
    dispatch(qsosActions.setQSOsStatus({ uuid, status: 'loading' }))

    try {
      const json = await RNFetchBlob.fs.readFile(path)
      const data = JSON.parse(json)
      data.operation.uuid = uuid

      await dispatch(actions.setOperation(data.operation))
      await dispatch(qsosActions.setQSOs({ uuid: data.operation.uuid, qsos: data.qsos }))

      await dispatch(saveOperation(data.operation))
      await dispatch(saveQSOsForOperation(data.operation.uuid))

      dispatch(qsosActions.setQSOsStatus({ uuid: data.operation.uuid, status: 'ready' }))
      dispatch(actions.setOperation({ uuid, status: 'ready' }))
    } catch (error) {
      reportError('Error importing QSON', error)
    }
  } else {
    reportError('Invalid Path importing QSON', path)
  }
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { Buffer } from 'buffer'

import { qsoKey } from '@ham2k/lib-qson-tools'
import { adifToQSON } from '@ham2k/lib-qson-adif'

import { reportError } from '../../../../distro'

import { addQSOs, actions as qsosActions, saveQSOsForOperation } from '../../../qsos'
import { annotateQSO } from '../../../../screens/OperationScreens/OpInfoTab/components/useCallLookup'

const ADIF_FILENAME_REGEX = /.+\.(adi|adif)$/i

export const importADIFIntoOperation = (path, operation) => async (dispatch) => {
  const matches = path.match(ADIF_FILENAME_REGEX)
  if (matches) {
    dispatch(qsosActions.setQSOsStatus({ uuid: operation.uuid, status: 'loading' }))
    try {
      const adif64 = await RNFetchBlob.fs.readFile(path, 'base64')
      const buffer = Buffer.from(adif64, 'base64')
      const adif = buffer.toString('utf8')

      const data = adifToQSON(adif)
      const qsos = data.qsos.map((qso) => {
        const newQSO = { ...qso }
        newQSO.refs = (qso.refs || []).map(ref => {
          if (ref.type.match(/Activation$/i)) {
            // Remove activation references, since the QSOs will get them from this operation
            return false
          } else {
            return ref
          }
        }).filter(x => x)

        newQSO.key = qsoKey(newQSO)

        return newQSO
      })

      qsos.map(async qso => {
        return await annotateQSO({ qso, online: false, dispatch, settings: {} })
      })

      await dispatch(addQSOs({ uuid: operation.uuid, qsos }))

      await dispatch(saveQSOsForOperation(operation.uuid))
      dispatch(qsosActions.setQSOsStatus({ uuid: operation.uuid, status: 'ready' }))
      return qsos.length
    } catch (error) {
      reportError('Error importing ADIF into Operation', error)
    }
  } else {
    reportError('Invalid Path importing ADIF into Operation', path)
  }
  return -1
}

export const importHistoricalADIF = (path) => async (dispatch) => {
  const matches = path.match(ADIF_FILENAME_REGEX)
  if (matches) {
    dispatch(qsosActions.setQSOsStatus({ uuid: 'historical', status: 'loading' }))
    try {
      const adif64 = await RNFetchBlob.fs.readFile(path, 'base64')
      const buffer = Buffer.from(adif64, 'base64')
      const adif = buffer.toString('utf8')

      const data = adifToQSON(adif)
      const qsos = data.qsos.map(qso => {
        return {
          band: qso.band,
          freq: qso.frequency ?? qso.freq,
          mode: qso.mode,
          startAtMillis: qso.startAtMillis,
          our: { call: qso.our.call },
          their: {
            call: qso.their.call,
            name: qso.their.name,
            grid: qso.their.grid,
            city: qso.their.city ?? qso.their.qth,
            state: qso.their.state,
            county: qso.their.county,
            country: qso.their.country,
            postal: qso.their.postal,
            cqZone: qso.their.cqZone,
            ituZone: qso.their.ituZone
          },
          key: qsoKey(qso),
          operation: 'historical'
        }
      })
      await dispatch(qsosActions.setQSOs({ uuid: 'historical', qsos }))
      await dispatch(saveQSOsForOperation('historical'))
      dispatch(qsosActions.setQSOsStatus({ uuid: 'historical', status: 'ready' }))
    } catch (error) {
      reportError('Error importing Historical ADIF', error)
    }
  } else {
    reportError('Invalid Path importing Historical ADIF', path)
  }
}

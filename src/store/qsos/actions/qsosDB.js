/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { actions } from '../qsosSlice'
import { actions as operationActions, saveOperation } from '../../operations'

import { dbExecute, dbSelectAll } from '../../db/db'
import { qsoKey } from '@ham2k/lib-qson-tools'
import mergeQSOs from '../../../tools/mergeQSOs'
import GLOBAL from '../../../GLOBAL'

// import debounce from 'debounce'
// function debounceableDispatch (dispatch, action) {
//   return dispatch(action())
// }
// const debouncedDispatch = debounce(debounceableDispatch, 3000)

export const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  delete data._originalKey
  return data
}

export const loadQSOs = (uuid) => async (dispatch, getState) => {
  dispatch(actions.setQSOsStatus({ uuid, status: 'loading' }))

  let qsos = []
  try {
    qsos = await dbSelectAll('SELECT * FROM qsos WHERE operation = ? ORDER BY startOnMillis', [uuid], { row: prepareQSORow })
  } catch (error) {
  }

  let startOnMillisMin, startOnMillisMax
  qsos.forEach((qso, index) => {
    qso._number = index + 1
    if (qso.startOnMillis) {
      if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
      if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis
    }
  })

  dispatch(actions.setQSOs({ uuid, qsos }))
  dispatch(actions.setQSOsStatus({ uuid, status: 'ready' }))

  const qsoCount = qsos.filter(qso => !qso.deleted).length
  const operation = getState().operations.info[uuid]
  // console.log('loadQSOs', { uuid, operation })
  if (startOnMillisMin !== operation?.startOnMillisMin ||
  startOnMillisMax !== operation?.startOnMillisMax ||
  qsoCount !== operation?.qsoCount) {
    dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount }))
    setTimeout(() => {
      dispatch(saveOperation(operation))
    }, 0)
  }
}

export const addQSO = ({ uuid, qso }) => async (dispatch, getState) => {
  const origQSOs = await dbSelectAll(
    'SELECT * FROM qsos WHERE operation = ? AND (key = ? OR key = ?)',
    [uuid, qso.key, qso._originalKey ?? qso.key], { row: prepareQSORow }
  )

  const now = Date.now()

  if (origQSOs.length > 0) {
    qso.createdAtMillis = origQSOs[0].createdAtMillis || qso.createdAtMillis || now
    qso.createdOnDeviceId = origQSOs[0].createdOnDeviceId || qso.createdOnDeviceId || GLOBAL.deviceId
    qso.createdOnDeviceName = origQSOs[0].createdOnDeviceName || qso.createdOnDeviceName || GLOBAL.deviceName

    for (const origQSO of origQSOs) {
      if (qso._originalKey) {
        // Do nothing when saving changes to an already existing QSO
      } else if (origQSO.key === qso.key) {
        // Merge the new QSO with the old one
        qso = mergeQSOs(origQSO, qso)
      }

      await dbExecute(`
        DELETE FROM qsos
        WHERE operation = ? AND key = ?
        `, [uuid, origQSO.key])
    }
  } else {
    qso.createdAtMillis = qso.createdAtMillis || now
    qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId
  }
  qso.updatedAtMillis = now
  qso.updatedOnDeviceId = GLOBAL.deviceId

  await dbExecute(`
    DELETE FROM qsos
    WHERE operation = ? AND (key = ? OR key = ?)
    `, [uuid, qso.key, qso._originalKey ?? qso.key])

  const qsoClone = { ...qso }
  delete qsoClone._originalKey
  if (qsoClone.their?.lookup) {
    delete qsoClone.their.lookup
  }

  await dbExecute(`
    INSERT INTO qsos
    (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, qso.key, JSON.stringify(qsoClone), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis])

  dispatch(actions.addQSO({ uuid, qso }))

  const state = getState()
  const info = state.operations.info[uuid]
  const qsos = state.qsos.qsos[uuid]

  let { startOnMillisMin, startOnMillisMax } = info
  if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
  if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis

  // No need to save operation to the db, because min/max times and counts are recalculated on load
  dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount: qsos.filter(q => !q.deleted).length }))

  const operation = getState().operations.info[uuid]
  setTimeout(() => {
    dispatch(saveOperation(operation))
  }, 0)
}

export const batchUpdateQSOs = ({ uuid, qsos, data }) => async (dispatch, getState) => {
  for (const qso of qsos) {
    const originalKey = qso.key
    await dbExecute(`
      DELETE FROM qsos
      WHERE operation = ? AND key = ?
      `, [uuid, qso.key])

    qso.our = { ...qso.our, ...data.our } // Batch Update only changes `our` data
    qso.key = qsoKey(qso)

    await dbExecute(`
      INSERT INTO qsos
      (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuid, qso.key, JSON.stringify(qso), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis])

    dispatch(actions.addQSO({ uuid, qso: { ...qso, _originalKey: originalKey } }))
  }
  // Since the batch update does not change operation counts or times, no need to do anything else here
}

export const saveQSOsForOperation = (uuid) => async (dispatch, getState) => {
  const qsos = getState().qsos.qsos[uuid]
  // Move old QSOs out of the way (in sqlite, || is concatenation)
  try {
    await dbExecute(`
      UPDATE qsos
      SET operation = operation || '_tmp'
      WHERE operation = ?
      `, [uuid])
  } catch (error) {
    console.error('error moving old QSOs', error)
  }

  // Save new QSOs
  for (const qso of qsos) {
    const json = JSON.stringify(qso)

    await dbExecute(`
      INSERT INTO qsos
      (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE SET data = ?
    `, [uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis, json])
  }

  // Rename delete old QSOs  (in sqlite, || is concatenation)
  await dbExecute(`
    DELETE FROM qsos
    WHERE operation = ? || '_tmp'
    `, [uuid])
}

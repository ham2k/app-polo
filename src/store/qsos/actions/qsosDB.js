/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'
import { qsoKey } from '@ham2k/lib-qson-tools'

import GLOBAL from '../../../GLOBAL'

import { actions } from '../qsosSlice'
import { actions as operationActions, saveOperation } from '../../operations'
import { dbExecute, dbSelectAll } from '../../db/db'
import mergeQSOs from '../../../tools/mergeQSOs'

export const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  if (data.startOnMillis) data.startAtMillis = data.startOnMillis
  if (data.startOn) data.startAt = data.startOn
  if (data.endOnMillis) data.endAtMillis = data.endOnMillis
  if (data.endOn) data.endAt = data.endOn
  delete data._originalKey
  return data
}

export const loadQSOs = (uuid) => async (dispatch, getState) => {
  dispatch(actions.setQSOsStatus({ uuid, status: 'loading' }))

  let qsos = []
  try {
    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    qsos = await dbSelectAll('SELECT * FROM qsos WHERE operation = ? ORDER BY startOnMillis', [uuid], { row: prepareQSORow })
  } catch (error) {
  }

  let startAtMillisMin, startAtMillisMax
  qsos.forEach((qso, index) => {
    qso._number = index + 1
    if (qso.startAtMillis) {
      if (qso.startAtMillis < startAtMillisMin || !startAtMillisMin) startAtMillisMin = qso.startAtMillis
      if (qso.startAtMillis > startAtMillisMax || !startAtMillisMax) startAtMillisMax = qso.startAtMillis
    }
  })

  dispatch(actions.setQSOs({ uuid, qsos }))
  dispatch(actions.setQSOsStatus({ uuid, status: 'ready' }))

  const qsoCount = qsos.filter(qso => !qso.deleted).length
  const operation = getState().operations.info[uuid]
  // console.log('loadQSOs', { uuid, operation })
  if (startAtMillisMin !== operation?.startAtMillisMin ||
  startAtMillisMax !== operation?.startAtMillisMax ||
  qsoCount !== operation?.qsoCount) {
    dispatch(operationActions.setOperation({ uuid, startAtMillisMin, startAtMillisMax, qsoCount }))
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
    qso.uuid = origQSOs[0].uuid || qso.uuid
    qso.createdAtMillis = origQSOs[0].createdAtMillis || qso.createdAtMillis
    qso.createdOnDeviceId = origQSOs[0].createdOnDeviceId || qso.createdOnDeviceId
    qso.createdOnDeviceName = origQSOs[0].createdOnDeviceName || qso.createdOnDeviceName

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
  }
  qso.uuid = qso.uuid || UUID.v1()
  qso.createdAtMillis = qso.createdAtMillis || now
  qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId
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

  // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
  await dbExecute(`
    INSERT INTO qsos
    (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, qso.key, JSON.stringify(qsoClone), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis])

  dispatch(actions.addQSO({ uuid, qso }))

  const state = getState()
  const info = state.operations.info[uuid]
  const qsos = state.qsos.qsos[uuid]

  let { startAtMillisMin, startAtMillisMax } = info
  if (qso.startAtMillis < startAtMillisMin || !startAtMillisMin) startAtMillisMin = qso.startAtMillis
  if (qso.startAtMillis > startAtMillisMax || !startAtMillisMax) startAtMillisMax = qso.startAtMillis

  // No need to save operation to the db, because min/max times and counts are recalculated on load
  dispatch(operationActions.setOperation({ uuid, startAtMillisMin, startAtMillisMax, qsoCount: qsos.filter(q => !q.deleted).length }))

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

    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      INSERT INTO qsos
      (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuid, qso.key, JSON.stringify(qso), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis])

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

    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      INSERT INTO qsos
      (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE SET data = ?
    `, [uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, json])
  }

  // Rename delete old QSOs  (in sqlite, || is concatenation)
  await dbExecute(`
    DELETE FROM qsos
    WHERE operation = ? || '_tmp'
    `, [uuid])
}

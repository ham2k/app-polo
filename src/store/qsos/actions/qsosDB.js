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
import { dbExecute, dbSelectAll, dbTransaction } from '../../db/db'

export const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  data.uuid = row.uuid
  if (data.startOnMillis) data.startAtMillis = data.startOnMillis
  if (data.startOn) data.startAt = data.startOn
  if (data.endOnMillis) data.endAtMillis = data.endOnMillis
  if (data.endOn) data.endAt = data.endOn
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
  const now = Date.now()

  qso.uuid = qso.uuid || UUID.v1()
  qso.operation = uuid
  qso.createdAtMillis = qso.createdAtMillis || now
  qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId
  qso.updatedAtMillis = now
  qso.updatedOnDeviceId = GLOBAL.deviceId

  qso.key = qsoKey(qso)

  const qsoClone = { ...qso }
  delete qsoClone._isNew
  delete qsoClone._isLookup
  delete qsoClone._number
  if (qsoClone.their?.lookup) {
    delete qsoClone.their.lookup
  }
  const json = JSON.stringify(qsoClone)

  // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
  await dbExecute(`
    INSERT INTO qsos
    (uuid, operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT DO UPDATE SET operation = ?, key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?
    `, [
    qso.uuid,
    qso.operation, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis,
    qso.operation, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis
  ]
  )

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
    qso.our = { ...qso.our, ...data.our } // Batch Update only changes `our` data
    qso.key = qsoKey(qso)

    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      UPDATE qsos
      SET key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?
      WHERE uuid = ?
      `, [
      qso.key, JSON.stringify(qso), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis,
      qso.uuid
    ])

    dispatch(actions.addQSO({ uuid, qso }))
  }
  // Since the batch update does not change operation counts or times, no need to do anything else here
}

export const saveQSOsForOperation = (uuid) => async (dispatch, getState) => {
  return dbTransaction(async transaction => {
    const qsos = getState().qsos.qsos[uuid]

    // Save new QSOs
    for (const qso of qsos) {
      const json = JSON.stringify(qso)

      // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
      await dbExecute(`
        INSERT INTO qsos
        (uuid, operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET operation = ?, key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?
      `, [
        qso.uuid,
        uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis,
        uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis,
        json
      ])
    }
  })
}

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
import { actions as operationActions, saveOperationAdditionalData } from '../../operations'
import { dbExecute, dbSelectAll, dbTransaction } from '../../db/db'
import { syncLatestQSOs } from '../../sync'

export const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  data.uuid = row.uuid
  data.operation = row.operation
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
    if (qso.startAtMillis) {
      if (qso.startAtMillis < startAtMillisMin || !startAtMillisMin) startAtMillisMin = qso.startAtMillis
      if (qso.startAtMillis > startAtMillisMax || !startAtMillisMax) startAtMillisMax = qso.startAtMillis
    }
  })

  dispatch(actions.setQSOs({ uuid, qsos }))
  dispatch(actions.setQSOsStatus({ uuid, status: 'ready' }))

  let operationInfo = getState().operations.info[uuid]

  const qsoCount = qsos.filter(qso => !qso.deleted).length

  if (startAtMillisMin !== operationInfo?.startAtMillisMin ||
  startAtMillisMax !== operationInfo?.startAtMillisMax ||
  qsoCount !== operationInfo?.qsoCount) {
    operationInfo = { ...operationInfo, startAtMillisMin, startAtMillisMax, qsoCount }
    setImmediate(() => {
      dispatch(operationActions.setOperation(operationInfo))
      dispatch(saveOperationAdditionalData(operationInfo))
    })
  }
}

export const queryQSOs = async (query, params) => {
  let qsos = []
  qsos = await dbSelectAll(`SELECT * FROM qsos ${query}`, params, { row: prepareQSORow })
  return qsos
}

export const addQSO = ({ uuid, qso, synced = false }) => addQSOs({ uuid, qsos: [qso], synced })

export const addQSOs = ({ uuid, qsos, synced = false }) => async (dispatch, getState) => {
  const now = Date.now()

  for (const qso of qsos) {
    qso.uuid = qso.uuid || UUID.v1()
    qso.operation = uuid
    qso.createdAtMillis = qso.createdAtMillis || now
    qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
    qso.updatedAtMillis = now
    qso.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

    qso.key = qsoKey(qso)

    const qsoClone = { ...qso }
    delete qsoClone._isNew
    delete qsoClone._isLookup
    if (qsoClone.their?.lookup) {
      delete qsoClone.their.lookup
    }
    const json = JSON.stringify(qsoClone)

    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      INSERT INTO qsos
      (uuid, operation, key, data, ourCall, theirCall, mode, band, startOnMillis, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE SET operation = ?, key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?, synced = ?
      `, [
      qso.uuid,
      qso.operation, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, synced,
      qso.operation, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, synced
    ]
    )
  }

  const operationInfo = getState().operations.info[uuid]
  let { startAtMillisMin, startAtMillisMax } = operationInfo

  for (const qso of qsos) {
    dispatch(actions.addQSO({ uuid, qso }))

    if (qso.startAtMillis < startAtMillisMin || !startAtMillisMin) startAtMillisMin = qso.startAtMillis
    if (qso.startAtMillis > startAtMillisMax || !startAtMillisMax) startAtMillisMax = qso.startAtMillis
  }

  const finalQSOs = getState().qsos.qsos[uuid]

  operationInfo.startAtMillisMin = startAtMillisMin
  operationInfo.startAtMillisMax = startAtMillisMax
  operationInfo.qsoCount = finalQSOs.filter(q => !q.deleted).length

  setImmediate(() => {
    console.log('op update', { startAtMillisMin, startAtMillisMax, qsoCount: operationInfo.qsoCount })
    dispatch(operationActions.setOperation(operationInfo))
    dispatch(saveOperationAdditionalData(operationInfo))
    if (!synced) syncLatestQSOs({ dispatch, getState })
  })
}

export const batchUpdateQSOs = ({ uuid, qsos, data }) => async (dispatch, getState) => {
  const now = Date.now()

  for (const qso of qsos) {
    qso.our = { ...qso.our, ...data.our } // Batch Update only changes `our` data
    qso.key = qsoKey(qso)
    qso.uuid = qso.uuid || UUID.v1()
    qso.createdAtMillis = qso.createdAtMillis || now
    qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
    qso.updatedAtMillis = now
    qso.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      UPDATE qsos
      SET key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?, synced = ?
      WHERE uuid = ?
      `, [
      qso.key, JSON.stringify(qso), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, false,
      qso.uuid
    ])

    dispatch(actions.addQSO({ uuid, qso }))
  }
  // Since the batch update does not change operation counts or times, no need to do anything else here
}

export const saveQSOsForOperation = (uuid, { synced = false }) => async (dispatch, getState) => {
  const now = Date.now()

  return dbTransaction(async transaction => {
    const qsos = getState().qsos.qsos[uuid]

    // Save new QSOs
    for (const qso of qsos) {
      qso.key = qsoKey(qso)
      qso.uuid = qso.uuid || UUID.v1()
      qso.createdAtMillis = qso.createdAtMillis || now
      qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
      qso.updatedAtMillis = now
      qso.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

      const json = JSON.stringify(qso)

      // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
      await dbExecute(`
        INSERT INTO qsos
        (uuid, operation, key, data, ourCall, theirCall, mode, band, startOnMillis, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET operation = ?, key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?, synced = ?
      `, [
        qso.uuid,
        uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, synced,
        uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, synced
      ])
    }
  })
}

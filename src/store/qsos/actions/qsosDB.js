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
import { actions as operationActions, saveOperationLocalData } from '../../operations'
import { dbExecute, dbSelectAll, dbTransaction } from '../../db/db'
import { sendQSOsToSyncService } from '../../sync'
import { logTimer } from '../../../tools/perfTools'
import { annotateQSO } from '../../../screens/OperationScreens/OpInfoTab/components/useCallLookup'
import { selectSettings } from '../../settings'
import { selectRuntimeOnline } from '../../runtime'

export const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  data.uuid = row.uuid
  data.operation = row.operation
  // data.deleted = row.deleted // Let the `deleted` in the data take precedence

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
      dispatch(saveOperationLocalData(operationInfo))
    })
  }
}

export const queryQSOs = async (query, params) => {
  let qsos = []
  qsos = await dbSelectAll(`SELECT * FROM qsos ${query}`, params, { row: prepareQSORow })
  return qsos
}

export const addQSO = ({ uuid, qso, synced = false }) => addQSOs({ uuid, qsos: [qso], synced })

const DEBUG = false

export const addQSOs = ({ uuid, qsos, synced = false }) => async (dispatch, getState) => {
  const now = Date.now()

  if (DEBUG) logTimer('addQSOs', 'Start', { reset: true })
  const qsosToSave = [...qsos]
  while (qsosToSave.length > 0) {
    if (DEBUG) logTimer('addQSOs', 'batch')
    const batch = qsosToSave.splice(0, 50)
    const batchData = []
    for (const qso of batch) {
      qso.uuid = qso.uuid || UUID.v4()
      qso.operation = uuid
      qso.createdAtMillis = qso.createdAtMillis || now
      qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
      qso.updatedAtMillis = now
      qso.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

      qso.key = qsoKey(qso)

      const qsoClone = { ...qso }
      delete qsoClone._isNew
      delete qsoClone._needsLookup
      if (qsoClone.their?.lookup) {
        delete qsoClone.their.lookup
      }
      const json = JSON.stringify(qsoClone)
      batchData.push([
        qso.uuid, qso.operation, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, qso.deleted, synced
      ])

      if (qso._needsLookup) { // After inserting the QSO, maybe do a full data lookup if needed
        setTimeout(async () => {
          delete qso._needsLookup
          const state = getState()
          const settings = selectSettings(state)
          const online = selectRuntimeOnline(state)
          const annotatedQSO = await annotateQSO({ qso, online, settings, dispatch })
          dispatch(addQSO({ uuid, qso: annotatedQSO }))
        })
      }
    }

    if (DEBUG) logTimer('addQSOs', 'batch data ready')
    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      INSERT INTO qsos
        (uuid, operation, key, data, ourCall, theirCall, mode, band, startOnMillis, deleted, synced)
      VALUES
        ${batchData.map(q => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',')}
      ON CONFLICT
        DO UPDATE SET operation = excluded.operation, key = excluded.key, data = excluded.data, ourCall = excluded.ourCall, theirCall = excluded.theirCall, mode = excluded.mode, band = excluded.band, startOnMillis = excluded.startOnMillis, deleted = excluded.deleted, synced = excluded.synced
      `, batchData.flat()
    )
    if (DEBUG) logTimer('addQSOs', 'sql insert')
  }
  if (DEBUG) logTimer('addQSOs', 'done inserting')

  const operationInfo = getState().operations.info[uuid]
  if (getState().qsos.qsos[uuid]) { // QSOs are for an operation that's currently in memory
    let { startAtMillisMin, startAtMillisMax } = operationInfo
    if (DEBUG) logTimer('addQSOs', 'got op info')

    for (const qso of qsos) {
      dispatch(actions.addQSO({ uuid, qso }))

      if (qso.startAtMillis < startAtMillisMin || !startAtMillisMin) startAtMillisMin = qso.startAtMillis
      if (qso.startAtMillis > startAtMillisMax || !startAtMillisMax) startAtMillisMax = qso.startAtMillis
    }
    if (DEBUG) logTimer('addQSOs', 'added qsos to state')

    const finalQSOs = getState().qsos.qsos[uuid]

    operationInfo.startAtMillisMin = startAtMillisMin
    operationInfo.startAtMillisMax = startAtMillisMax
    operationInfo.qsoCount = finalQSOs.filter(q => !q.deleted).length

    setImmediate(() => {
      if (DEBUG) console.log('op update', { startAtMillisMin, startAtMillisMax, qsoCount: operationInfo.qsoCount })
      dispatch(operationActions.setOperation(operationInfo))
      dispatch(saveOperationLocalData(operationInfo))
    })
  }

  if (!synced) {
    setImmediate(() => {
      sendQSOsToSyncService({ dispatch, getState })
      if (DEBUG) logTimer('addQSOs', 'done updating operation')
    })
  }
}

export const mergeSyncQSOs = ({ qsos }) => async (dispatch, getState) => {
  const uuids = qsos.map((q) => `"${q.uuid}"`).join(',')
  if (DEBUG) logTimer('sync', 'Start of mergeSyncQSOs')
  const existingQSOs = await dbSelectAll('SELECT * FROM qsos WHERE uuid IN (?)', [uuids], { row: prepareQSORow })
  if (DEBUG) logTimer('sync', 'Retrieved QSOs', { sinceLast: true })
  console.log('-- ', { qsos: qsos.length })

  let lastSyncedAtMillis = 0

  const qsosForOperation = {}
  for (const qso of qsos) {
    const existing = existingQSOs.find((q) => q.uuid === qso.uuid)
    if (existing) {
      if (existing.updatedAtMillis >= qso.updatedAtMillis) {
        continue
      }
    }

    qsosForOperation[qso.operation] = qsosForOperation[qso.operation] || []
    qsosForOperation[qso.operation].push(qso)
    lastSyncedAtMillis = Math.max(lastSyncedAtMillis, qso.syncedAtMillis)
  }
  if (DEBUG) logTimer('sync', 'Compared QSOs', { sinceLast: true })
  for (const uuid in qsosForOperation) {
    await dispatch(addQSOs({ uuid, qsos: qsosForOperation[uuid], synced: true }))
    if (DEBUG) logTimer('sync', 'Saved QSOs', { sinceLast: true })
  }

  return lastSyncedAtMillis
}

export async function markQSOsAsSynced (qsos) {
  if (!qsos || qsos.length === 0) return
  await dbExecute(`UPDATE qsos SET synced = true WHERE uuid IN (${qsos.map(q => `"${q.uuid}"`).join(',')})`, [])
}

export const batchUpdateQSOs = ({ uuid, qsos, data }) => async (dispatch, getState) => {
  const now = Date.now()

  for (const qso of qsos) {
    qso.our = { ...qso.our, ...data.our } // Batch Update only changes `our` data
    qso.key = qsoKey(qso)
    qso.uuid = qso.uuid || UUID.v4()
    qso.createdAtMillis = qso.createdAtMillis || now
    qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
    qso.updatedAtMillis = now
    qso.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

    // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
    await dbExecute(`
      UPDATE qsos
      SET key = ?, data = ?, ourCall = ?, theirCall = ?, mode = ?, band = ?, startOnMillis = ?, deleted = ?, synced = ?
      WHERE uuid = ?
      `, [
      qso.key, JSON.stringify(qso), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, qso.deleted, false,
      qso.uuid
    ])

    dispatch(actions.addQSO({ uuid, qso }))
  }
  // Since the batch update does not change operation counts or times, no need to do anything else here
}

export const saveQSOsForOperation = (uuid, { synced } = {}) => async (dispatch, getState) => {
  const now = Date.now()

  synced = synced || false

  return dbTransaction(async transaction => {
    const qsos = getState().qsos.qsos[uuid]

    // Save new QSOs
    for (const qso of qsos) {
      qso.key = qsoKey(qso)
      qso.uuid = qso.uuid || UUID.v4()
      qso.createdAtMillis = qso.createdAtMillis || now
      qso.createdOnDeviceId = qso.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
      qso.updatedAtMillis = now
      qso.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

      const json = JSON.stringify(qso)

      // TODO: Rename column `startOnMillis` to `startAtMillis` in the database
      await dbExecute(`
        INSERT INTO qsos
        (uuid, operation, key, data, ourCall, theirCall, mode, band, startOnMillis, deleted, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO UPDATE SET operation = excluded.operation, key = excluded.key, data = excluded.data, ourCall = excluded.ourCall, theirCall = excluded.theirCall, mode = excluded.mode, band = excluded.band, startOnMillis = excluded.startOnMillis, deleted = excluded.deleted, synced = excluded.synced
      `, [
        qso.uuid,
        uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startAtMillis, qso.deleted, synced
      ])
    }
  })
}

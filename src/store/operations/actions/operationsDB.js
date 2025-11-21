/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'
import RNRestart from 'react-native-restart'
import RNFetchBlob from 'react-native-blob-util'

import { reportError } from '../../../distro'

import GLOBAL from '../../../GLOBAL'
import { persistor } from '../..'
import { actions as qsosActions } from '../../qsos'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../db/db'
import { sendOperationsToSyncService } from '../../sync'
import { actions } from '../operationsSlice'
import { selectSettings } from '../../settings'
import { selectLocalData, setLocalData } from '../../local'
import { computeSizes } from '../../../styles/tools/computeSizes'
import { fmtTimestamp } from '../../../tools/timeFormats'

const operationFromRow = (row) => {
  if (!row) return {}

  const data = row.data ? JSON.parse(row.data) : {}

  data.local = row.localData ? JSON.parse(row.localData) || {} : {}

  data.uuid = row.uuid
  data.deleted = row.deleted
  data.synced = row.synced

  // Backwards compatibility, remove in the future
  if (data.createdOnMillis) {
    data.createdAtMillis = data.createdOnMillis
    delete data.createdOnMillis
  }
  if (data.updatedOnMillis) {
    data.updatedAtMillis = data.updatedOnMillis
    delete data.updatedOnMillis
  }
  if (data.startOnMillisMin) delete data.startOnMillisMin
  if (data.startOnMillisMax) delete data.startOnMillisMax
  if (data.startAtMillisMin) delete data.startAtMillisMin
  if (data.startAtMillisMax) delete data.startAtMillisMax

    ;['mode', 'band', 'power', 'freq', 'operatorCall', 'spottedAt', 'spottedFreq', 'secondaryControls'].forEach((key) => {
      if (data[key]) {
        data.local[key] = data[key]
        delete data[key]
      }
    })

  // Inject values from row into data
  if (row.startAtMillisMin) data.startAtMillisMin = row.startAtMillisMin
  if (row.startAtMillisMax) data.startAtMillisMax = row.startAtMillisMax
  if (row.qsoCount) data.qsoCount = row.qsoCount

  return data
}

const rowFromOperation = (operation) => {
  const { uuid, local, deleted, startAtMillisMin, startAtMillisMax, qsoCount } = operation

  const operationClone = { ...operation }
  delete operationClone.synced
  delete operationClone.local
  delete operationClone.startAtMillisMin
  delete operationClone.startAtMillisMax
  delete operationClone.qsoCount
  delete operationClone._useTemplates
  const data = JSON.stringify(operationClone)
  const localData = JSON.stringify(local)

  return { uuid, data, localData, startAtMillisMin, startAtMillisMax, qsoCount, deleted }
}

export const loadOperations = () => async (dispatch, getState) => {
  const oplist = await dbSelectAll('SELECT * FROM operations', [], { row: operationFromRow })

  const ophash = oplist.reduce((acc, op) => {
    acc[op.uuid] = op
    return acc
  }, {})

  return dispatch(actions.setOperations(ophash))
}

export const loadDeletedOperations = () => async (dispatch, getState) => {
  const oplist = await dbSelectAll('SELECT * FROM operations WHERE deleted = 1', [], { row: operationFromRow })

  const ophash = oplist.reduce((acc, op) => {
    if (op.uuid) {
      acc[op.uuid] = op
    }
    return acc
  }, {})

  return dispatch(actions.setOperations(ophash))
}

export const queryOperations = async (query, params) => {
  let ops = []
  ops = await dbSelectAll(`SELECT * FROM operations ${query}`, params, { row: operationFromRow })
  return ops
}

export const saveOperation = (operation, { synced = false } = {}) => async (dispatch, getState) => {
  const originalOperation = await dbSelectOne('SELECT * FROM operations WHERE uuid = ?', [operation.uuid], { row: operationFromRow })
  const originalFingerprint = fingerprintOperationData(originalOperation)
  const newFingerprint = fingerprintOperationData(operation)
  if (newFingerprint !== originalFingerprint) {
    const now = Date.now()

    operation.createdAtMillis = operation.createdAtMillis || now
    operation.createdOnDeviceId = operation.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
    operation.updatedAtMillis = now
    operation.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)
  } else {
    synced = originalOperation.synced // Don't change sync status if the operation hasn't changed
  }

  const row = rowFromOperation(operation)
  await dbExecute(
    `
      INSERT INTO operations
        (uuid, data, localData, startAtMillisMin, startAtMillisMax, qsoCount, deleted, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO
        UPDATE SET data = ?, localData = ?, startAtMillisMin = ?, startAtMillisMax = ?, qsoCount = ?, deleted = ?, synced = ?
    `,
    [
      row.uuid,
      row.data, row.localData, row.startAtMillisMin, row.startAtMillisMax, row.qsoCount, !!row.deleted, !!synced,
      row.data, row.localData, row.startAtMillisMin, row.startAtMillisMax, row.qsoCount, !!row.deleted, !!synced
    ]
  )

  if (operation.deleted) {
    await dispatch(actions.unsetOperation(operation.uuid))
    await dispatch(qsosActions.unsetQSOs(operation.uuid))
  }

  if (!synced) {
    setImmediate(() => {
      sendOperationsToSyncService({ dispatch, getState })
    })
  }
}

export const saveOperationLocalData = (operation) => async (dispatch, getState) => {
  const row = rowFromOperation(operation)

  await dbExecute(
    `
      UPDATE operations SET localData = ?, startAtMillisMin = ?, startAtMillisMax = ?, qsoCount = ? WHERE uuid = ?
    `,
    [row.localData, row.startAtMillisMin, row.startAtMillisMax, row.qsoCount, row.uuid]
  )
}

export const mergeSyncOperations = ({ operations }) => async (dispatch, getState) => {
  const uuids = operations.map((op) => `"${op.uuid}"`).join(',')
  const existingOps = await dbSelectAll('SELECT * FROM operations WHERE uuid IN (?)', [uuids], { row: operationFromRow })

  const now = Date.now()
  let earliestSyncedAtMillis = now
  let latestSyncedAtMillis = 0

  for (const operation of operations) {
    delete operation.local
    delete operation.startAtMillisMin
    delete operation.startAtMillisMax
    delete operation.qsoCount

    const existing = existingOps.find((op) => op.uuid === operation.uuid)
    if (existing) {
      if (existing.updatedAtMillis >= operation.updatedAtMillis) {
        continue
      } else {
        operation.local = existing.local
      }
    }
    earliestSyncedAtMillis = Math.min(earliestSyncedAtMillis, operation.syncedAtMillis)
    latestSyncedAtMillis = Math.max(latestSyncedAtMillis, operation.syncedAtMillis)

    await dispatch(saveOperation(operation, { synced: true }))
  }

  dispatch(actions.updateOperations(operations))
  return { earliestSyncedAtMillis, latestSyncedAtMillis }
}

export async function markOperationsAsSynced(operations) {
  if (!operations || operations.length === 0) return
  await dbExecute(`UPDATE operations SET synced = true WHERE uuid IN (${operations.map(q => `"${q.uuid}"`).join(',')})`, [])
}

export const resetSyncedStatus = () => async (dispatch) => {
  await dbExecute('UPDATE qsos SET synced = false', [])
  await dbExecute('UPDATE operations SET synced = false', [])

  const localData = dispatch((_dispatch, getState) => selectLocalData(getState()))
  dispatch(setLocalData({ sync: { lastSyncAccountUUID: localData?.sync?.lastSyncAccountUUID } }))
}

export const clearAllOperationData = () => async (dispatch) => {
  const timestamp = fmtTimestamp(Date.now())
  await dbExecute(`ALTER TABLE operations RENAME TO bkp_${timestamp}_operations`)
  await dbExecute(`ALTER TABLE qsos RENAME TO bkp_${timestamp}_qsos`)
  await dbExecute(`CREATE TABLE operations AS SELECT * FROM bkp_${timestamp}_operations WHERE 0`)
  await dbExecute(`CREATE TABLE qsos AS SELECT * FROM bkp_${timestamp}_qsos WHERE 0`)
  await dbExecute(`CREATE UNIQUE INDEX replacement_${timestamp}_qsos_1 ON qsos(uuid)`)
  await dbExecute(`CREATE UNIQUE INDEX replacement_${timestamp}_operations_1 ON operations(uuid)`)

  dispatch(setLocalData({ sync: {} }))
  await persistor.purge()

  setTimeout(() => {
    RNRestart.restart()
  }, 500)
}

export const updateOperationInfo = ({ uuid }) => async (dispatch, getState) => {
  const qsoData = await dbSelectAll(`
    SELECT
      MIN(startOnMillis) as startAtMillisMin, MAX(startOnMillis) as startAtMillisMax,
      COUNT(*) as qsoCount
    FROM qsos
    WHERE operation = ? AND band != 'event' AND (deleted = 0 OR deleted IS NULL)
  `, [uuid])

  await dbExecute(`
    UPDATE operations
    SET startAtMillisMin = ?, startAtMillisMax = ?, qsoCount = ?
    WHERE uuid = ?
  `, [qsoData[0].startAtMillisMin, qsoData[0].startAtMillisMax, qsoData[0].qsoCount, uuid])

  const operation = getState().operations.info[uuid]
  const operationInfo = { ...operation, startAtMillisMin: qsoData[0].startAtMillisMin, startAtMillisMax: qsoData[0].startAtMillisMax, qsoCount: qsoData[0].qsoCount }

  dispatch(actions.setOperation(operationInfo))
}

export async function getSyncCounts() {
  const counts = {}

  const opCounts = await dbSelectAll('SELECT COUNT(*) as count, synced FROM operations GROUP BY synced')
  const qsoCounts = await dbSelectAll('SELECT COUNT(*) as count, synced FROM qsos WHERE operation != "historical" GROUP BY synced')

  counts.operations = opCounts.reduce((acc, row) => {
    acc[row.synced ? 'synced' : 'pending'] = row.count
    return acc
  }, {})
  counts.qsos = qsoCounts.reduce((acc, row) => {
    acc[row.synced ? 'synced' : 'pending'] = row.count
    return acc
  }, {})

  counts.operations.synced = counts.operations.synced ?? 0
  counts.operations.pending = counts.operations.pending ?? 0
  counts.qsos.synced = counts.qsos.synced ?? 0
  counts.qsos.pending = counts.qsos.pending ?? 0

  counts.operations.total = counts.operations.synced + counts.operations.pending
  counts.qsos.total = counts.qsos.synced + counts.qsos.pending

  return counts
}

export const addNewOperation = (operation) => async (dispatch, getState) => {
  const settings = selectSettings(getState())

  operation = operation || {}
  const now = Date.now()
  operation.uuid = UUID.v4()
  operation.createdAtMillis = operation.createdAtMillis || now
  operation.createdOnDeviceId = operation.createdOnDeviceId || GLOBAL.deviceId.slice(0, 8)
  operation.updatedAtMillis = now
  operation.updatedOnDeviceId = GLOBAL.deviceId.slice(0, 8)

  operation.title = operation.title || 'New Operation'
  operation.stationCall = operation.stationCall || settings.operatorCall
  operation.refs = operation.refs || []

  operation._isNew = operation._isNew ?? true

  dispatch(actions.setOperation(operation))
  await dispatch(saveOperation(operation))
  return operation
}

export const loadOperation = (uuid) => async (dispatch) => {
  const operation = await dbSelectOne('SELECT * FROM operations WHERE uuid = ?', [uuid], { row: operationFromRow })
  dispatch(actions.setOperation(operation))
}

export const deleteOperation = (uuid) => async (dispatch, getState) => {
  await dbExecute('UPDATE operations SET deleted = ?, synced = ? WHERE uuid = ?', [true, false, uuid])
  await dbExecute('UPDATE qsos SET deleted = ? WHERE operation = ?', [true, uuid])
  await dispatch(actions.unsetOperation(uuid))
  await dispatch(qsosActions.unsetQSOs(uuid))

  setImmediate(() => {
    sendOperationsToSyncService({ dispatch, getState })
  })
}

export const restoreOperation = (uuid) => async (dispatch) => {
  await dbExecute('UPDATE operations SET deleted = ? WHERE uuid = ?', [false, uuid])
  await dbExecute('UPDATE qsos SET deleted = ifnull(json_extract("data", "$.deleted"), false) WHERE operation = ?', [uuid])
  await dispatch(actions.unsetOperation(uuid))
  await dispatch(qsosActions.unsetQSOs(uuid))
  await dispatch(loadOperation(uuid))
}

const UUID_REGEX = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i
export const readOldOperationFiles = async () => {
  try {
    if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`)) { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`) }

    const dir = await RNFetchBlob.fs.ls(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`)
    const operations = {}
    for (const entry of dir) {
      if (!UUID_REGEX.test(entry)) continue
      const path = `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${entry}`
      if (RNFetchBlob.fs.isDir(path)) {
        try {
          const infoJSON = await RNFetchBlob.fs.readFile(`${path}/info.json`)
          const info = JSON.parse(infoJSON)
          info.uuid = entry

          const qsosJSON = await RNFetchBlob.fs.readFile(`${path}/qsos.json`)
          const qsos = JSON.parse(qsosJSON)

          operations[info.uuid] = { info, qsos }
        } catch (error) {
          console.info('Skipping Operation Folder', entry)
          console.info(error)
          // Skip this directory
        }
      }
    }
    return operations
  } catch (error) {
    reportError('Error reading operation list', error)
    return {}
  }
}

export const countHistoricalRecords = () => async (dispatch) => {
  const row = await dbSelectOne('SELECT COUNT(*) as count FROM qsos WHERE operation = ?', ['historical'])
  return row.count
}

export const deleteHistoricalRecords = () => async (dispatch) => {
  await dbExecute('DELETE FROM qsos WHERE operation = ?', ['historical'])
}

function fingerprintOperationData(operation) {
  const sanitized = { ...operation, local: undefined, startAtMillisMin: undefined, startAtMillisMax: undefined, qsoCount: undefined }
  return JSON.stringify(sanitized)
}


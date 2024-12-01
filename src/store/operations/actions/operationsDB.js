/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'
import RNFetchBlob from 'react-native-blob-util'

import { reportError } from '../../../distro'

import { actions } from '../operationsSlice'
import { actions as qsosActions } from '../../qsos'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../db/db'

const prepareOperationRow = (row) => {
  const data = JSON.parse(row.data)
  if (row.startAtMillisMin) data.startAtMillisMin = row.startAtMillisMin
  if (row.startAtMillisMax) data.startAtMillisMax = row.startAtMillisMax
  if (row.qsoCount) data.qsoCount = row.qsoCount

  if (data.startOnMillisMin) data.startAtMillisMin = data.startOnMillisMin
  if (data.startOnMillisMax) data.startAtMillisMax = data.startOnMillisMax
  if (data.createdOnMillis) data.createdAtMillis = data.createdOnMillis
  if (data.updatedOnMillis) data.updatedAtMillis = data.updatedOnMillis

  data.uuid = row.uuid
  return data
}

export const getOperations = () => async (dispatch, getState) => {
  const oplist = await dbSelectAll('SELECT * FROM operations', [], { row: prepareOperationRow })

  const ophash = oplist.reduce((acc, op) => {
    acc[op.uuid] = op
    return acc
  }, {})

  return dispatch(actions.setOperations(ophash))
}

export const queryOperations = async (query, params) => {
  let ops = []
  ops = await dbSelectAll(`SELECT * FROM operations ${query}`, params, { row: prepareOperationRow })
  return ops
}

export const saveOperation = (operation, { synced = false } = {}) => async (dispatch, getState) => {
  const { uuid, startAtMillisMin, startAtMillisMax, qsoCount } = operation
  const operationClone = { ...operation }
  console.log('saveOperation', operation)
  delete operationClone.startAtMillisMin
  delete operationClone.startAtMillisMax
  delete operationClone.qsoCount
  const json = JSON.stringify(operationClone)
  await dbExecute(
    `
      INSERT INTO operations
        (uuid, data, startAtMillisMin, startAtMillisMax, qsoCount, synced)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT DO
        UPDATE SET data = ?, startAtMillisMin = ?, startAtMillisMax = ?, qsoCount = ?, synced = ?
    `,
    [
      uuid,
      json, startAtMillisMin, startAtMillisMax, qsoCount, synced,
      json, startAtMillisMin, startAtMillisMax, qsoCount, synced
    ]
  )
}

export const addNewOperation = (operation) => async (dispatch) => {
  operation.uuid = UUID.v1()
  operation.qsoCount = 0
  operation.createdAtMillis = Math.floor(Date.now() / 1000) * 1000
  dispatch(actions.setOperation(operation))
  await dispatch(saveOperation(operation))
  return operation
}

export const loadOperation = (uuid) => async (dispatch) => {
  const operation = await dbSelectOne('SELECT * FROM operations WHERE uuid = ?', [uuid], { row: prepareOperationRow })
  dispatch(actions.setOperation(operation))
}

export const deleteOperation = (uuid) => async (dispatch) => {
  await dbExecute('DELETE FROM operations WHERE uuid = ?', [uuid])
  await dbExecute('DELETE FROM qsos WHERE operation = ?', [uuid])
  await dispatch(actions.unsetOperation(uuid))
  await dispatch(qsosActions.unsetQSOs(uuid))
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

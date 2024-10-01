/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { actions } from '../operationsSlice'
import { addQSO, actions as qsosActions, saveQSOsForOperation } from '../../qsos'
import { adifToQSON } from '@ham2k/lib-qson-adif'
import { qsoKey } from '@ham2k/lib-qson-tools'
import UUID from 'react-native-uuid'
import { Buffer } from 'buffer'

import { qsonToADIF } from '../../../tools/qsonToADIF'
import { fmtISODate } from '../../../tools/timeFormats'
import { qsonToCabrillo } from '../../../tools/qsonToCabrillo'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../db/db'
import { findBestHook } from '../../../extensions/registry'
import { simpleTemplate } from '../../../tools/stringTools'
import { reportError } from '../../../distro'

const prepareOperationRow = (row) => {
  const data = JSON.parse(row.data)
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

export const saveOperation = (operation) => async (dispatch, getState) => {
  const { uuid } = operation
  const json = JSON.stringify(operation)
  await dbExecute('INSERT INTO operations (uuid, data) VALUES (?, ?) ON CONFLICT DO UPDATE SET data = ?', [uuid, json, json])
}

export const addNewOperation = (operation) => async (dispatch) => {
  operation.uuid = UUID.v1()
  operation.qsoCount = 0
  operation.createdOnMillis = Math.floor(Date.now() / 1000) * 1000
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

export const generateExport = (uuid, type, activity) => async (dispatch, getState) => {
  const state = getState()
  const operation = state.operations.info[uuid]
  const settings = state.settings

  const { startOnMillisMax } = operation
  const call = operation?.stationCall || settings?.operatorCall

  const baseNameParts = {
    call,
    date: fmtISODate(startOnMillisMax),
    compactDate: fmtISODate(startOnMillisMax).replace(/-/g, '')
  }

  const qsos = state.qsos.qsos[uuid].map(qso => {
    return { ...qso, our: { ...qso.our, call: operation.stationCall || settings.operatorCall } }
  })

  const names = []
  const datas = []

  if (type === 'qson') {
    const nameParts = { ...baseNameParts, title: operation.title, uuid: operation.uuid, shortUUID: operation.uuid.split('-')[0] }
    const baseName = simpleTemplate('{shortUUID} {date} {call} {title}', nameParts)
    names.push(`${baseName.replace(/[/\\:]/g, '-')}.qson`)
    datas.push(JSON.stringify({ operation, qsos, settings }))
  } else {
    const exportHandlers = (operation?.refs || []).map(ref => ({ handler: findBestHook(`ref:${ref.type}`), ref }))?.filter(x => x?.handler)
    let exportOptions = exportHandlers.map(({ handler, ref }) => (
      { handler, ref, options: handler.suggestExportOptions && handler.suggestExportOptions({ operation, ref, settings }) }
    )).flat().filter(({ options }) => options)

    if (exportOptions.length === 0) {
      exportOptions = [{
        handler: {},
        ref: {},
        options: [{
          format: 'adif',
          common: { refs: [] },
          nameTemplate: settings.useCompactFileNames ? '{call}-{compactDate}' : '{date} {call}',
          titleTemplate: '{call} General Operation'
        }]
      }]
    }

    exportOptions.forEach(({ handler, ref, options }) => {
      options.forEach(option => {
        const nameParts = { ...baseNameParts, ref: ref.ref, ...(handler.suggestOperationTitle && handler.suggestOperationTitle(ref)) }
        const baseName = simpleTemplate(option.nameTemplate || '{date} {call} {ref}', nameParts)
        const title = simpleTemplate(option.titleTemplate || '{call} {ref} {date}', nameParts)

        if (option.format === 'adif') {
          names.push(`${baseName.replace(/[/\\:]/g, '-')}.adi`)
          datas.push(qsonToADIF({ operation: { ...operation, ...option.common }, qsos, settings, handler, title }))
        } else if (option.format === 'cabrillo') {
          names.push(`${baseName.replace(/[/\\:]/g, '-')}.log`)
          datas.push(qsonToCabrillo({ operation: { ...operation, ...option.common }, qsos, activity, settings, handler }))
        }
      })
    })
  }

  if (names.length && datas.length) {
    const paths = []
    while (names.length > 0) {
      const name = names.shift()
      const data = datas.shift()
      await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${name}`, data)
      paths.push(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${name}`)
    }
    return paths
  } else {
    return false
  }
}

export const deleteExport = (path) => async (dispatch) => {
  await RNFetchBlob.fs.unlink(path)
}

const QSON_FILENAME_REGEX = /.+\.qson$/i

export const importQSON = (path) => async (dispatch) => {
  const matches = path.match(QSON_FILENAME_REGEX)
  if (matches) {
    // const originalUUID = matches[1]
    const uuid = UUID.v1()
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
      const qsos = data.qsos.map(qso => {
        const newQSO = { ...qso }
        newQSO.key = qsoKey(newQSO)
        newQSO.refs = (qso.refs || []).map(ref => {
          if (ref.type.match(/Activation$/i)) {
            // Remove activation references, since the QSOs will get them from this operation
            return false
          } else {
            return ref
          }
        }).filter(x => x)
        // TODO: Call annotateQSO?
        return newQSO
      })

      for (const qso of qsos) {
        await dispatch(addQSO({ uuid: operation.uuid, qso }))
      }

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
          startOnMillis: qso.startOnMillis,
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

export const countHistoricalRecords = () => async (dispatch) => {
  const row = await dbSelectOne('SELECT COUNT(*) as count FROM qsos WHERE operation = ?', ['historical'])
  return row.count
}

export const deleteHistoricalRecords = () => async (dispatch) => {
  await dbExecute('DELETE FROM qsos WHERE operation = ?', ['historical'])
}

import RNFetchBlob from 'react-native-blob-util'
import { actions } from '../operationsSlice'
import { actions as qsosActions, saveQSOsForOperation } from '../../qsos'

import UUID from 'react-native-uuid'
import { qsonToADIF } from '../../../tools/qsonToADIF'
import { fmtISODate } from '../../../tools/timeFormats'
import { qsonToCabrillo } from '../../../tools/qsonToCabrillo'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../db/db'
import { excludeRefs, filterRefs } from '../../../tools/refTools'
import { findHooks } from '../../../extensions/registry'

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
  dispatch(saveOperation(operation))
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
    console.error('Error reading operation list', error)
    return {}
  }
}

export const generateExport = (uuid, type, activity) => async (dispatch, getState) => {
  const state = getState()
  const operation = state.operations.info[uuid]
  const settings = state.settings

  const { startOnMillisMax } = operation
  const call = operation?.stationCall || settings?.operatorCall

  const baseName = `${fmtISODate(startOnMillisMax)} ${call}`

  const qsos = state.qsos.qsos[uuid].map(qso => {
    return { ...qso, our: { ...qso.our, call: operation.stationCall || settings.operatorCall } }
  })

  const names = []
  const datas = []

  if (type === 'adif') {
    const potaActivationRefs = filterRefs(operation, 'potaActivation')
    const nonPotaRefs = excludeRefs(operation, 'potaActivation')

    const combinations = potaActivationRefs.length ? potaActivationRefs : [{}]

    combinations.forEach((activationRef, i) => {
      const combinedRefs = [...nonPotaRefs, activationRef].filter(x => x?.type)

      const referenceTitles = combinedRefs.map(ref => {
        const hooks = findHooks(`ref:${ref.type}`)
        return hooks.map(hook => hook?.suggestOperationTitle && hook?.suggestOperationTitle(ref)).filter(x => x)[0]
      }).filter(x => x)

      const titleParts = [baseName]
      const plainTitles = referenceTitles.map(ref => ref.title).filter(x => x).join(', ')
      const forTitles = referenceTitles.map(ref => ref.for).filter(x => x).join(', ')
      const atTitles = referenceTitles.map(ref => ref.at).filter(x => x).join(', ')
      if (plainTitles) titleParts.push(plainTitles)
      if (forTitles) titleParts.push('for ' + forTitles)
      if (atTitles) titleParts.push('at ' + atTitles)

      names.push(`${titleParts.join(' ').replace(/[/\\:]/g, '-')}.adi`)
      datas.push(qsonToADIF({ operation: { ...operation, refs: combinedRefs }, qsos, settings }))
    })
  } else if (type === 'cabrillo') {
    names.push(`${baseName.replace(/[/\\:]/g)} for ${activity.shortName.replace(/[/\\:]/g)}.log`)
    datas.push(qsonToCabrillo({ operation, qsos, activity, settings }))
  } else if (type === 'qson') {
    names.push(`${uuid}.qson`)
    datas.push(JSON.stringify({ operation, qsos, settings }))
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

const QSON_FILENAME_REGEX = /file:.+\/([\w-]+)\.qson/i

export const importQSON = (path) => async (dispatch) => {
  const matches = path.match(QSON_FILENAME_REGEX)
  if (matches[1]) {
    // const originalUUID = matches[1]
    const uuid = UUID.v1()
    dispatch(actions.setOperation({ uuid, status: 'loading' }))
    dispatch(qsosActions.setQSOsStatus({ uuid, status: 'loading' }))

    try {
      const json = await RNFetchBlob.fs.readFile(path.replace('file://', ''))
      const data = JSON.parse(json)
      data.operation.uuid = uuid

      dispatch(actions.setOperation(data.operation))
      dispatch(qsosActions.setQSOs({ uuid: data.operation.uuid, qsos: data.qsos }))

      dispatch(saveOperation(data.operation))
      dispatch(saveQSOsForOperation(data.operation.uuid))

      dispatch(qsosActions.setQSOsStatus({ uuid: data.operation.uuid, status: 'ready' }))
      dispatch(actions.setOperation({ uuid, status: 'ready' }))
    } catch (error) {
      console.error('Error importing QSON', error)
    }
  } else {
    console.error('Invalid Path importing QSON', path)
  }
}

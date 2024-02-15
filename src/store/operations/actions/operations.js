import RNFetchBlob from 'react-native-blob-util'
import { actions } from '../operationsSlice'
import { actions as qsosActions, saveQSOsForOperation } from '../../qsos'

import UUID from 'react-native-uuid'
import { qsonToADIF } from '../../../tools/qsonToADIF'
import { fmtISODate } from '../../../tools/timeFormats'
import { refsToString } from '../../../tools/refTools'
import { qsonToCabrillo } from '../../../tools/qsonToCabrillo'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../db/db'
import { addSystemMessage, selectSystemFlag, setSystemFlag } from '../../system'

const prepareOperationRow = (row) => {
  const data = JSON.parse(row.data)
  data.uuid = row.uuid
  return data
}

export const getOperations = () => async (dispatch, getState) => {
  const oplist = await dbSelectAll('SELECT * FROM operations', [], { row: prepareOperationRow })

  if (oplist && oplist.length === 0) {
    if (!selectSystemFlag('operations.migratedFromFiles')) {
      dispatch(addSystemMessage('Migrating operation data to new database'))
      const operations = await readOldOperationFiles()

      for (const uuid in operations) {
        const operation = operations[uuid]

        dispatch(saveOperation(operation.info))
        dispatch(qsosActions.setQSOs({ uuid, qsos: operation.qsos }))
        dispatch(saveQSOsForOperation(uuid))
      }
      if (operations.length > 0) {
        dispatch(addSystemMessage(`Migrated ${operations.length} successfully`))
      } else {
        dispatch(addSystemMessage('There were no operations to migrate'))
      }
      dispatch(setSystemFlag({ 'operations.migratedFromFiles': true }))

      return dispatch(getOperations())
    }
  }

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
  operation.createdOnMillis = Date.now()
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

  let name
  let data

  if (type === 'adif') {
    const pota = refsToString(operation, 'potaActivation')
    name = `${baseName}${pota ? ` at ${pota}` : ''}.adi`
    data = qsonToADIF({ operation, qsos, settings })
  } else if (type === 'cabrillo') {
    name = `${baseName} for ${activity.shortName}.log`
    data = qsonToCabrillo({ operation, qsos, activity, settings })
  } else if (type === 'qson') {
    name = `${uuid}.qson`
    data = JSON.stringify({ operation, qsos, settings })
  }

  if (name && data) {
    await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${name}`, data)
    return `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${name}`
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

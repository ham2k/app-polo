import RNFetchBlob from 'react-native-blob-util'
import { actions } from '../operationsSlice'
import { actions as qsosActions, saveQSOs } from '../../qsos'

import UUID from 'react-native-uuid'
import { qsonToADIF } from '../../../tools/qsonToADIF'
import { fmtISODate } from '../../../tools/timeFormats'
import { refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { qsonToCabrillo } from '../../../tools/qsonToCabrillo'

const UUID_REGEX = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i

export const loadOperationsList = () => async (dispatch) => {
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
          operations[info.uuid] = info
        } catch (error) {
          console.info('Skipping Operation Folder', entry)
          console.info(error)
          // Skip this directory
        }
      }
    }
    dispatch(actions.setOperations(operations))
    dispatch(actions.setOperationsStatus('ready'))
  } catch (error) {
    console.error('Error reading operation list', error)
    dispatch(actions.setOperations({}))
    dispatch(actions.setOperationsStatus('ready'))
  }
}

export const addNewOperation = (operation) => async (dispatch) => {
  try {
    operation.uuid = UUID.v1()
    operation.qsoCount = 0
    operation.createdOnMillis = Date.now()

    if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`)) await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`)
    if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${operation.uuid}`)) await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${operation.uuid}`)

    await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${operation.uuid}/info.json`, JSON.stringify(operation))

    dispatch(loadOperationsList())
  } catch (error) {
    console.error('Error adding new operation', error)
  }
}

export const loadOperation = (uuid) => async (dispatch) => {
  dispatch(actions.setOperation({ uuid, status: 'loading' }))

  let info = { uuid }
  try {
    const infoJSON = await RNFetchBlob.fs.readFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/info.json`)
    info = JSON.parse(infoJSON)

    // Temporary (as of 2024-01-01) "data migration". Remove in a month or two
    if (info.pota) {
      info.refs = replaceRefs(info.refs, 'potaActivation', stringToRefs('potaActivation', info.pota))
    }
  } catch (error) {
    console.error(`Error loading operation ${uuid}`, error)
  }
  info.status = 'ready'
  dispatch(actions.setOperation(info))
}

export const saveOperation = (info) => async (dispatch, getState) => {
  const { uuid } = info

  const infoJSON = JSON.stringify(info)

  if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`)) await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/ops`)
  if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}`)) await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}`)

  await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/new-info.json`, infoJSON)

  if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-info.json`)) {
    await RNFetchBlob.fs.unlink(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-info.json`)
  }

  if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/info.json`)) {
    await RNFetchBlob.fs.mv(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/info.json`, `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-info.json`)
  }

  await RNFetchBlob.fs.mv(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/new-info.json`, `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/info.json`)

  if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-info.json`)) {
    await RNFetchBlob.fs.unlink(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-info.json`)
  }
}

export const deleteOperation = (uuid) => async (dispatch) => {
  if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/deleted-ops`)) { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/deleted-ops`) }
  if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/deleted-ops/${uuid}`)) { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/deleted-ops/${uuid}`) }

  const fileList = ['info.json', 'new-info.json', 'old-info.json', 'qsos.json', 'new-qsos.json', 'old-qsos.json']
  fileList.forEach(async (file) => {
    if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${file}`)) {
      await RNFetchBlob.fs.mv(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${file}`, `${RNFetchBlob.fs.dirs.DocumentDir}/deleted-ops/${uuid}/${file}`)
    }
  })

  await dispatch(actions.unsetOperation(uuid))
  await dispatch(qsosActions.unsetQSOs(uuid))
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
      dispatch(saveQSOs(data.operation.uuid))

      dispatch(qsosActions.setQSOsStatus({ uuid: data.operation.uuid, status: 'ready' }))
      dispatch(actions.setOperation({ uuid, status: 'ready' }))
    } catch (error) {
      console.error('Error importing QSON', error)
    }
  } else {
    console.error('Invalid Path importing QSON', path)
  }
}

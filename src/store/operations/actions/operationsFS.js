import RNFS from 'react-native-fs'
import { actions } from '../operationsSlice'
import { actions as qsosActions } from '../../qsos'

import UUID from 'react-native-uuid'
import debounce from 'debounce'
import { qsonToADIF } from '../../../tools/qsonToADIF'
import { fmtISODate } from '../../../tools/timeFormats'
import { findRef, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'

export const loadOperationsList = () => async (dispatch) => {
  try {
    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/ops`)

    const readDirResult = await RNFS.readDir(`${RNFS.DocumentDirectoryPath}/ops`)

    const operations = {}
    for (const dir of readDirResult) {
      if (dir.isDirectory()) {
        try {
          const infoJSON = await RNFS.readFile(`${dir.path}/info.json`)
          const info = JSON.parse(infoJSON)
          info.uuid = dir.name
          operations[info.uuid] = info
        } catch (error) {
          console.info('loadOperationsList skipping', dir.name)
          // Skip this directory
        }
      }
    }
    dispatch(actions.setOperations(operations))
    dispatch(actions.setOperationsStatus('ready'))
  } catch (error) {
    console.error('loadOperationsList readDir error', error)
    dispatch(actions.setOperations({}))
    dispatch(actions.setOperationsStatus('ready'))
  }
}

export const addNewOperation = (operation) => async (dispatch) => {
  try {
    operation.uuid = UUID.v1()
    operation.qsoCount = 0
    operation.createdOnMillis = Date.now()

    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/ops/${operation.uuid}`)
    await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${operation.uuid}/info.json`, JSON.stringify(operation))
    dispatch(loadOperationsList())
  } catch (error) {
    console.error('addNewOperation error', error)
  }
}

export const loadOperation = (uuid) => async (dispatch) => {
  dispatch(actions.setOperation({ uuid, status: 'loading' }))

  let info = { uuid }
  try {
    const infoJSON = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/info.json`)
    info = JSON.parse(infoJSON)

    // Temporary (as of 2024-01-01) "data migration". Remove in a month or two
    if (info.pota) {
      info.refs = replaceRefs(info.refs, 'potaActivation', stringToRefs('potaActivation', info.pota))
    }
  } catch (error) {
  }
  info.status = 'ready'
  dispatch(actions.setOperation(info))
}

export const saveOperation = (info) => async (dispatch, getState) => {
  const { uuid } = info

  const infoJSON = JSON.stringify(info)

  await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-info.json`, infoJSON)

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-info.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-info.json`)
  }

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/info.json`)) {
    await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/info.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-info.json`)
  }

  await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-info.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/info.json`)

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-info.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-info.json`)
  }
}

export const deleteOperation = (uuid) => async (dispatch) => {
  await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/deleted-ops/${uuid}`)

  const fileList = ['info.json', 'new-info.json', 'old-info.json', 'qsos.json', 'new-qsos.json', 'old-qsos.json']
  fileList.forEach(async (file) => {
    if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/${file}`)) {
      await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/${file}`, `${RNFS.DocumentDirectoryPath}/deleted-ops/${uuid}/${file}`)
    }
  })

  await dispatch(actions.unsetOperation(uuid))
  await dispatch(qsosActions.unsetQSOs(uuid))
}

export const generateADIF = (uuid) => async (dispatch, getState) => {
  const state = getState()
  const operation = state.operations.info[uuid]
  const settings = state.settings

  const { startOnMillisMax } = operation
  const pota = refsToString(operation, 'potaActivation')

  const call = operation?.stationCall || settings?.operatorCall

  const qsos = state.qsos.qsos[uuid].map(qso => {
    return { ...qso, our: { ...qso.our, call: operation.stationCall || settings.operatorCall } }
  })

  const name = `${fmtISODate(startOnMillisMax)}-${call} ${pota ? `-${pota}` : ''}.adi`
  const adif = qsonToADIF({ operation, qsos })

  await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/${name}`, adif)

  return `${RNFS.DocumentDirectoryPath}/ops/${uuid}/${name}`
}

export const deleteADIF = (path) => async (dispatch) => {
  await RNFS.unlink(path)
}

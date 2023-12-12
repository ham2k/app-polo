import RNFS from 'react-native-fs'
import { actions } from '../operationsSlice'

import UUID from 'react-native-uuid'
import debounce from 'debounce'

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

    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/ops/${operation.uuid}`)
    await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${operation.uuid}/info.json`, JSON.stringify(operation))
    dispatch(loadOperationsList())
  } catch (error) {
    console.error('addNewOperation error', error)
  }
}

export const loadOperation = (uuid) => async (dispatch) => {
  dispatch(actions.setOperationInfo({ uuid, status: 'loading' }))

  let info = { uuid }
  let qsos = []
  try {
    const infoJSON = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/info.json`)
    info = JSON.parse(infoJSON)
  } catch (error) {
  }
  try {
    const qsosJSON = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)
    qsos = JSON.parse(qsosJSON)
  } catch (error) {
  }
  info.status = 'ready'
  dispatch(actions.setOperationQSOs({ uuid: info.uuid, qsos }))
  dispatch(actions.setOperationInfo(info))
}

function debounceableDispatch (dispatch, action) {
  return dispatch(action())
}
const debouncedDispatch = debounce(debounceableDispatch, 2000)

export const setOperationInfo = (info) => (dispatch, getState) => {
  dispatch(actions.setOperationInfo(info))
  const savedInfo = getState().operations.info[info.uuid]
  return debouncedDispatch(dispatch, () => saveOperationInfo(savedInfo))
}

export const addOperationQSO = ({ uuid, qso }) => (dispatch, getState) => {
  dispatch(actions.addOperationQSO({ uuid, qso }))
  return debouncedDispatch(dispatch, () => saveOperationQSOs(uuid))
}

export const saveOperationQSOs = (uuid) => async (dispatch, getState) => {
  const qsos = getState().operations.qsos[uuid]
  const qsosJSON = JSON.stringify(qsos)

  await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-qsos.json`, qsosJSON)

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)) {
    await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }

  await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-qsos.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }
}

export const saveOperationInfo = (info) => async (dispatch, getState) => {
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

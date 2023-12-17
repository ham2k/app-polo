import RNFS from 'react-native-fs'
import { actions } from '../operationsSlice'
import { actions as qsosActions } from '../../qsos'

import UUID from 'react-native-uuid'
import debounce from 'debounce'

function debounceableDispatch (dispatch, action) {
  return dispatch(action())
}
const debouncedDispatch = debounce(debounceableDispatch, 2000)

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
  dispatch(actions.setOperation({ uuid, status: 'loading' }))

  let info = { uuid }
  try {
    const infoJSON = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/info.json`)
    info = JSON.parse(infoJSON)
  } catch (error) {
  }
  info.status = 'ready'
  dispatch(actions.setOperation(info))
}

export const setOperation = (info) => (dispatch, getState) => {
  dispatch(actions.setOperation(info))
  const savedInfo = getState().operations.info[info.uuid]
  return debouncedDispatch(dispatch, () => saveOperation(savedInfo))
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

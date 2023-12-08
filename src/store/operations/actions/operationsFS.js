import RNFS from 'react-native-fs'
import { addOperationQSOToStore, setOperationInfo, setOperationQSOs, setOperations, setOperationsStatus } from '../operationsSlice'

import UUID from 'react-native-uuid'

export const loadOperationsList = () => async (dispatch) => {
  try {
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
          console.log('loadOperationsList skipping', dir.name)
          // Skip this directory
        }
      }
    }
    console.log('loadOperationsList readDir operations', operations)
    dispatch(setOperations(operations))
    dispatch(setOperationsStatus('ready'))
  } catch (error) {
    console.log('loadOperationsList readDir error', error)
    dispatch(setOperations({}))
    dispatch(setOperationsStatus('ready'))
  }
}

export const addNewOperation = (operation) => (dispatch) => {
  operation.uuid = UUID.v1()

  return RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/ops/${operation.uuid}`).then((mkDirResult) => {
    RNFS.writeFile(
      `${RNFS.DocumentDirectoryPath}/ops/${operation.uuid}/info.json`,
      JSON.stringify(operation)
    ).then(writeFileResult => {
      console.log('addNewOperation writeFile', writeFileResult, JSON.stringify(operation))
      dispatch(loadOperationsList())
    }).catch(error => {
      console.log('addNewOperation writeFile error', error)
    })
  }).catch((error) => {
    console.log('addNewOperation mkdir error', error)
  })
}

export const loadOperation = (uuid) => async (dispatch) => {
  dispatch(setOperationInfo({ uuid, status: 'loading' }))

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
  dispatch(setOperationQSOs({ uuid: info.uuid, qsos }))
  dispatch(setOperationInfo(info))
}

export const addOperationQSO = ({ uuid, qso }) => (dispatch, getState) => {
  dispatch(addOperationQSOToStore({ uuid, qso }))
  return dispatch(saveOperationQSOs(uuid))
}

export const saveOperationQSOs = (uuid) => async (dispatch, getState) => {
  const qsos = getState().operations.qsos[uuid]
  const qsosJSON = JSON.stringify(qsos)
  await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-qsos.json`, qsosJSON)
  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)) {
    await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }
  await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-qsos.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)
  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }
}

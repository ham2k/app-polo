import RNFS from 'react-native-fs'
import { setOperations, setOperationsStatus } from '../operationsSlice'

import uuid from 'react-native-uuid'

export const loadOperationsList = () => async (dispatch) => {
  try {
    dispatch(setOperationsStatus('loading'))
    const readDirResult = await RNFS.readDir(RNFS.DocumentDirectoryPath + '/ops')
    const operations = {}
    for (const dir of readDirResult) {
      if (dir.isDirectory()) {
        try {
          const infoJSON = await RNFS.readFile(dir.path + '/info.json')
          console.log('loadOperationsList readDir info.json', infoJSON)
          const info = JSON.parse(infoJSON)
          console.log('loadOperationsList readDir info', info)
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
  operation.uuid = uuid.v1()

  return RNFS.mkdir(RNFS.DocumentDirectoryPath + `/ops/${operation.uuid}`).then((mkDirResult) => {
    RNFS.writeFile(
      RNFS.DocumentDirectoryPath + `/ops/${operation.uuid}/info.json`,
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

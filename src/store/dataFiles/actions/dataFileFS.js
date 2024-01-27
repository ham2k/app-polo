import RNFS from 'react-native-fs'
import { getDataFileDefinition, getDataFileDefinitions } from '../dataFilesRegistry'
import { actions, selectAllDataFileInfos, selectDataFileInfo } from '../dataFilesSlice'

export const fetchDataFile = (key) => async (dispatch) => {
  console.log('fetchDataFile', key)
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  dispatch(actions.setDataFileInfo(key, { status: 'fetching' }))
  const { fetch } = definition
  console.log('-- fetch')
  const data = await fetch()
  console.log('-- fetch done')

  console.log('-- saving')
  // if (!await RNFS.exists(`${RNFS.DocumentDirectoryPath}/data`)) {
  console.log('-- mkdir')
  await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/data/`)
  console.log('-- mkdir done')
  // }

  await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.new.json`, JSON.stringify(data))
  console.log('-- write done')
  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.old.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.old.json`)
  }
  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.json`)) {
    await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.json`, `${RNFS.DocumentDirectoryPath}/data/${definition.key}.old.json`)
  }
  await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.new.json`, `${RNFS.DocumentDirectoryPath}/data/${definition.key}.json`)
  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.old.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.old.json`)
  }
  console.log('Done Saving Data File')

  if (definition.onLoad) definition.onLoad(data)

  dispatch(actions.setDataFileInfo(key, { ...data, status: 'loaded', date: data.date ?? new Date() }))
  if (definition.onLoad) definition.onLoad(data)
}

export const readDataFile = (key) => async (dispatch) => {
  console.log('readDataFile', key)
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)
  dispatch(actions.setDataFileInfo(key, { status: 'loading' }))

  const body = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.json`)
  const data = JSON.parse(body)

  dispatch(actions.setDataFileInfo(key, { ...data, status: 'loaded', date: Date.parse(data.date) }))
  if (definition.onLoad) definition.onLoad(data)
}

export const loadDataFile = (key) => async (dispatch, getState) => {
  console.log('loadDataFile', key)
  if (selectDataFileInfo(key)(getState())?.date) return // Already loaded, do nothing

  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  const exists = false // await RNFS.exists(`${RNFS.DocumentDirectoryPath}/data/${definition.key}.json`)
  if (exists) {
    await dispatch(readDataFile(key))
    const date = selectDataFileInfo(key)(getState())?.date
    if (date && definition.maxAgeInDays && (Date.now() - date.getTime()) / 1000 / 60 / 60 / 24 > definition.maxAgeInDays) {
      console.info(`Data for ${definition.key} is too old, fetching a fresh version`)
      dispatch(fetchDataFile(key))
    }
  } else {
    console.info(`Data for ${definition.key} not found, fetching a fresh version`)
    dispatch(fetchDataFile(key))
  }
}

export const loadAllDataFiles = () => (dispatch, getState) => {
  const definitions = getDataFileDefinitions()
  console.log('loadAllDataFiles', Object.keys(definitions), definitions)
  definitions.forEach((definition) => {
    dispatch(loadDataFile(definition.key))
  })
}

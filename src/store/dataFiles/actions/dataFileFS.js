import RNFetchBlob from 'react-native-blob-util'
import { getDataFileDefinition, getDataFileDefinitions } from '../dataFilesRegistry'
import { actions, selectDataFileInfo } from '../dataFilesSlice'

export const fetchDataFile = (key) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  dispatch(actions.setDataFileInfo({ key, status: 'fetching' }))
  const data = await definition.fetch()

  if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/data`)) await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/data/`)
  await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`, JSON.stringify(data))

  if (definition.onLoad) definition.onLoad(data)
  dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', version: data.version, date: data.date ?? new Date() }))
}

export const readDataFile = (key) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)
  dispatch(actions.setDataFileInfo({ key, status: 'loading' }))

  const body = await RNFetchBlob.fs.readFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
  const data = JSON.parse(body)

  const stat = await RNFetchBlob.fs.stat(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
  const lastModified = new Date(stat.lastModified)

  dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', date: lastModified ?? new Date() }))
  if (definition.onLoad) definition.onLoad(data)
}

export const loadDataFile = (key, force) => async (dispatch, getState) => {
  if (selectDataFileInfo(getState(), key)?.data) {
    return // Already loaded, do nothing
  }

  const definition = getDataFileDefinition(key)
  const maxAgeInDays = definition?.maxAgeInDays || 7
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  const exists = await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
  if (!exists || force) {
    console.info(`Data for ${definition.key} not found, fetching a fresh version`)
    dispatch(fetchDataFile(key))
  } else {
    await dispatch(readDataFile(key))
    const date = selectDataFileInfo(getState(), key)?.date

    if (date && maxAgeInDays && (Date.now() - Date.parse(date)) / 1000 / 60 / 60 / 24 > maxAgeInDays) {
      console.info(`Data for ${definition.key} is too old, fetching a fresh version`)
      dispatch(fetchDataFile(key))
    }
  }
}

export const loadAllDataFiles = () => (dispatch, getState) => {
  const definitions = getDataFileDefinitions()

  definitions.forEach((definition) => {
    dispatch(loadDataFile(definition.key))
  })
}

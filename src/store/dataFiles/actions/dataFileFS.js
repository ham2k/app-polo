import RNFetchBlob from 'react-native-blob-util'
import { getDataFileDefinition, getDataFileDefinitions } from '../dataFilesRegistry'
import { actions, selectDataFileInfo } from '../dataFilesSlice'
import { addRuntimeMessage } from '../../runtime'

export const fetchDataFile = (key) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    dispatch(actions.setDataFileInfo({ key, status: 'fetching' }))
    const data = await definition.fetch()

    if (!await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/data`)) await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/data/`)
    await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`, JSON.stringify(data))

    if (definition.onLoad) definition.onLoad(data)
    dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', version: data.version, date: data.date ?? new Date() }))
  } catch (error) {
    console.error(`Error fetching data file ${key}`, error)
    dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
  }
}

export const readDataFile = (key) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    dispatch(actions.setDataFileInfo({ key, status: 'loading' }))

    const body = await RNFetchBlob.fs.readFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
    const data = JSON.parse(body)

    const stat = await RNFetchBlob.fs.stat(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
    const lastModified = new Date(stat.lastModified)

    dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', date: lastModified ?? new Date() }))
    if (definition.onLoad) definition.onLoad(data)
  } catch (error) {
    console.error(`Error reading data file ${key}`, error)
    dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
  }
}

export const loadDataFile = (key, force) => async (dispatch, getState) => {
  if (selectDataFileInfo(getState(), key)?.data) {
    return // Already loaded, do nothing
  }

  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    const maxAgeInDays = definition?.maxAgeInDays || 7

    const exists = await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
    if (!exists || force) {
      console.info(`Data for ${definition.key} not found, fetching a fresh version`)
      dispatch(addRuntimeMessage(`Downloading ${definition.name}`))
      dispatch(fetchDataFile(key))
    } else {
      dispatch(addRuntimeMessage(`Loading ${definition.name}`))
      await dispatch(readDataFile(key))
      const date = selectDataFileInfo(getState(), key)?.date

      if (date && maxAgeInDays && (Date.now() - Date.parse(date)) / 1000 / 60 / 60 / 24 > maxAgeInDays) {
        console.info(`Data for ${definition.key} is too old, fetching a fresh version`)
        dispatch(fetchDataFile(key))
      }
    }
  } catch (error) {
    console.error(`Error loading data file ${key}`, error)
    dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
  }
}

export const loadAllDataFiles = () => async (dispatch, getState) => {
  const definitions = getDataFileDefinitions()
  const state = getState()

  for (const definition of definitions) {
    if (state?.settings[`dataFiles/${definition.key}`] ?? definition?.enabledByDefault) {
      await dispatch(loadDataFile(definition.key))
    }
  }
}

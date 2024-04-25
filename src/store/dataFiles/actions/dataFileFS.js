/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { getDataFileDefinition, getDataFileDefinitions } from '../dataFilesRegistry'
import { actions, selectDataFileInfo } from '../dataFilesSlice'
import { addRuntimeMessage } from '../../runtime'
import { reportError } from '../../../App'

export const fetchDataFile = (key) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    dispatch(actions.setDataFileInfo({ key, status: 'fetching' }))
    const data = await definition.fetch()

    try { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/data/`) } catch (error) { /* ignore */ }
    await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`, JSON.stringify(data))

    if (definition.onLoad) await definition.onLoad(data)
    dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', version: data.version, date: data.date ?? new Date() }))
  } catch (error) {
    reportError(`Error fetching data file ${key}`, error)
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
    if (definition.onLoad) await definition.onLoad(data)
  } catch (error) {
    reportError(`Error reading data file ${key}`, error)
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
      await dispatch(fetchDataFile(key))
    } else {
      dispatch(addRuntimeMessage(`Loading ${definition.name}`))
      await dispatch(readDataFile(key))
      const date = selectDataFileInfo(getState(), key)?.date

      if (date && maxAgeInDays && (Date.now() - Date.parse(date)) / 1000 / 60 / 60 / 24 > maxAgeInDays) {
        console.info(`Data for ${definition.key} is too old, fetching a fresh version`)
        await dispatch(fetchDataFile(key))
      }
    }
  } catch (error) {
    reportError(`Error loading data file ${key}`, error)
    dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
  }
}

export const removeDataFile = (key, force) => async (dispatch, getState) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  const exists = await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
  if (exists) {
    await RNFetchBlob.fs.unlink(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
  }
  if (definition.onRemove) await definition.onRemove()
  dispatch(actions.setDataFileInfo({ key, data: undefined, status: 'removed', date: undefined }))
}

export const loadAllDataFiles = () => async (dispatch) => {
  const definitions = getDataFileDefinitions()

  for (const definition of definitions) {
    await dispatch(loadDataFile(definition.key))
  }
}

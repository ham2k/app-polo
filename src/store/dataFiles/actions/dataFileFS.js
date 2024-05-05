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
import { reportError } from '../../../distro'

import { addNotice } from '../../system/systemSlice'

/*
 * Loading lifecycle:
 *  `status`: null, "fetching", "loading", "loaded", "error"
 *
 *
 */
export const fetchDataFile = (key, options = {}) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    await dispatch(actions.setDataFileInfo({ key, status: 'fetching' }))
    options.onStatus && await options.onStatus({ key, definition, status: 'fetching' })

    const data = await definition.fetch({ key, definition, options })

    try { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/data/`) } catch (error) { /* ignore */ }
    await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`, JSON.stringify(data))

    await dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', version: data.version, date: data.date ?? new Date() }))
    options.onStatus && await options.onStatus({ key, definition, status: 'loaded', data })

    let loadedOk
    if (definition.onLoad) loadedOk = await definition.onLoad(data, options)
    if (loadedOk === undefined || loadedOk === null) loadedOk = true

    return loadedOk
  } catch (error) {
    console.warn(`Error fetching data file ${key}`, error)
    await dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
    options.onStatus && await options.onStatus({ key, definition, status: 'error', error })
    return false
  }
}

export const readDataFile = (key, options = {}) => async (dispatch) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    dispatch(actions.setDataFileInfo({ key, status: 'loading' }))

    const body = await RNFetchBlob.fs.readFile(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
    const data = JSON.parse(body)

    const stat = await RNFetchBlob.fs.stat(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
    const lastModified = new Date(stat.lastModified)

    dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', date: lastModified ?? new Date() }))

    let loadedOk
    if (definition.onLoad) loadedOk = await definition.onLoad(data, options)
    if (loadedOk === undefined || loadedOk === null) loadedOk = true

    return loadedOk
  } catch (error) {
    reportError(`Error reading data file ${key}`, error)
    dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
    return false
  }
}

export const loadDataFile = (key, options) => async (dispatch, getState) => {
  const { force, noticesInsteadOfFetch } = options || {}

  if (selectDataFileInfo(getState(), key)?.data) {
    return
  }
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    const maxAgeInDays = definition?.maxAgeInDays || 7

    const exists = await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/data/${definition.key}.json`)
    if (!exists || force) {
      console.info(`Data for ${definition.key} not found, fetching a fresh version`)
      dispatch(addRuntimeMessage(`Downloading ${definition.name}`))
      if (noticesInsteadOfFetch) {
        await dispatch(addNotice({ key: `dataFiles:${definition.key}`, text: `Data for '${definition.name}' has to be downloaded.`, actionLabel: 'Download Now', action: 'fetch', actionArgs: { key: definition.key } }))
      } else {
        await dispatch(fetchDataFile(key))
      }
    } else {
      const readOk = await dispatch(readDataFile(key))
      const date = selectDataFileInfo(getState(), key)?.date

      dispatch(addRuntimeMessage(`Loading ${definition.name}`))
      if (date && maxAgeInDays && (Date.now() - Date.parse(date)) / 1000 / 60 / 60 / 24 > maxAgeInDays) {
        if (noticesInsteadOfFetch) {
          await dispatch(addNotice({ key: `dataFiles:${definition.key}`, text: `Data for '${definition.name}' has not been updated in a while.`, actionLabel: 'Refresh Now', action: 'fetch', actionArgs: { key: definition.key } }))
        } else {
          await dispatch(fetchDataFile(key))
        }
      } else if (!readOk) {
        if (noticesInsteadOfFetch) {
          await dispatch(addNotice({ key: `dataFiles:${definition.key}`, text: `Data for '${definition.name}' has to be downloaded.`, actionLabel: 'Download Now', action: 'fetch', actionArgs: { key: definition.key } }))
        } else {
          await dispatch(fetchDataFile(key))
        }
      }
    }
  } catch (error) {
    reportError(`Error loading data file ${key}`, error)
    dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
    return 'error'
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

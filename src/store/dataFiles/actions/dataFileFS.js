/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getDataFileDefinition, getDataFileDefinitions } from '../dataFilesRegistry'
import { actions, selectDataFileInfo } from '../dataFilesSlice'
import { addRuntimeMessage } from '../../runtime'
import { reportError } from '../../../distro'

import packageJson from '../../../../package.json'

import { addNotice } from '../../system/systemSlice'
import {
  ensureDataFileDirectoryExists, existsInLocalFileSystem,
  fetchForDataFiles, fetchForDataFilesBatchedLines,
  filenameForDefinition, getLastModifiedDate,
  readDataFileFromLocalFileSystem, removeDataFileFromLocalFileSystem,
  saveDataFileToLocalFileSystem
} from './dataFileFSNative'

/*
 * Loading lifecycle:
 *  `status`: null, "fetching", "loading", "loaded", "error"
 *
 *
 */
export const fetchDataFile = (key, options = {}) => async (dispatch, getState) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  const info = selectDataFileInfo(getState(), key)

  try {
    await dispatch(actions.setDataFileInfo({ key, status: 'fetching' }))
    options.onStatus && await options.onStatus({ key, definition, status: 'fetching' })

    const data = await definition.fetch({ key, definition, info, dispatch, getState, options })

    await ensureDataFileDirectoryExists()
    await saveDataFileToLocalFileSystem(filenameForDefinition(definition), data)

    await dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', version: data.version, date: data.date ?? new Date() }))
    options.onStatus && await options.onStatus({ key, definition, status: 'loaded', data })

    let loadedOk
    if (definition.onLoad) loadedOk = await definition.onLoad(data, { options, dispatch, getState })
    if (loadedOk === undefined || loadedOk === null) loadedOk = true

    return loadedOk
  } catch (error) {
    console.warn(`Error fetching data file ${key}`, error)
    await dispatch(actions.setDataFileInfo({ key, status: 'error', error }))
    options.onStatus && await options.onStatus({ key, definition, status: 'error', error })
    return false
  }
}

export const readDataFile = (key, options = {}) => async (dispatch, getState) => {
  const definition = getDataFileDefinition(key)
  if (!definition) throw new Error(`No data file definition found for ${key}`)

  try {
    dispatch(actions.setDataFileInfo({ key, status: 'loading' }))

    const data = await readDataFileFromLocalFileSystem(filenameForDefinition(definition))

    let date
    if (data.date) {
      date = new Date(data.date)
    } else {
      date = await getLastModifiedDate(filenameForDefinition(definition))
    }

    dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', date }))

    let loadedOk
    if (definition.onLoad) loadedOk = await definition.onLoad(data, { options, dispatch, getState })
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

    const exists = await existsInLocalFileSystem(filenameForDefinition(definition))
    if (!exists || force) {
      console.info(`Data for ${definition.key} not found, fetching a fresh version`)
      dispatch(addRuntimeMessage(`Downloading ${definition.name}`))
      if (noticesInsteadOfFetch) {
        await dispatch(addNotice({
          unique: `dataFiles:${definition.key}`,
          priority: -1,
          transient: true,
          title: definition.title || definition.name,
          icon: definition.titleIcon || definition.icon,
          text: `Data for **${definition.name}** has to be downloaded.`,
          actions: [
            {
              action: 'fetch',
              label: 'Download Now',
              args: {
                key: definition.key
              }
            }
          ]
        }))
      } else {
        await dispatch(fetchDataFile(key))
      }
    } else {
      const readOk = await dispatch(readDataFile(key))
      const date = selectDataFileInfo(getState(), key)?.date

      dispatch(addRuntimeMessage(`Loading ${definition.name}`))
      if (date && maxAgeInDays && (Date.now() - Date.parse(date)) / 1000 / 60 / 60 / 24 > maxAgeInDays) {
        if (noticesInsteadOfFetch) {
          await dispatch(addNotice({
            unique: `dataFiles:${definition.key}`,
            priority: -1,
            transient: true,
            title: definition.title || definition.name,
            icon: definition.titleIcon || definition.icon,
            text: `Data for **${definition.name}** has not been updated in a while.`,
            actions: [
              {
                action: 'fetch',
                label: 'Refresh Now',
                args: {
                  key: definition.key
                }
              }
            ]
          }))
        } else {
          await dispatch(fetchDataFile(key))
        }
      } else if (!readOk) {
        if (noticesInsteadOfFetch) {
          await dispatch(addNotice({
            unique: `dataFiles:${definition.key}`,
            priority: -1,
            transient: true,
            title: definition.title || definition.name,
            icon: definition.titleIcon || definition.icon,
            text: `Data for **${definition.name}** has to be downloaded.`,
            actions: [
              {
                action: 'fetch',
                label: 'Download Now',
                args: {
                  key: definition.key
                }
              }
            ]
          }))
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

  const exists = await existsInLocalFileSystem(filenameForDefinition(definition))
  if (exists) {
    await removeDataFileFromLocalFileSystem(filenameForDefinition(definition))
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

const DEBUG_FETCH = true

export async function fetchAndProcessURL ({ url, key, process, definition, info, options }) {
  url = await resolveDownloadUrl(url)

  const headers = {
    'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
  }
  if (DEBUG_FETCH) console.log('Fetching', { url, info })
  if (info?.data?.etag) {
    if (DEBUG_FETCH) console.log('-- Using etag', info.data.etag)
    headers['If-None-Match'] = info.data.etag
  }

  const { body, etag } = await fetchForDataFiles({ url, headers, key, process, definition, info, options })

  const data = process ? process(body) : body

  data.etag = etag

  return data
}

export async function fetchAndProcessBatchedLines ({ url, key, processLineBatch, processEndOfBatch, chunkSize, definition, info, options }) {
  url = await resolveDownloadUrl(url)

  if (!processLineBatch) {
    console.error('No processLineBatch function provided for batched lines')
    return
  }

  const headers = {
    'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
  }
  if (DEBUG_FETCH) console.log('Fetching for batching', { url, info })
  if (info?.data?.etag) {
    if (DEBUG_FETCH) console.log('-- Using etag', info.data.etag)
    // headers['If-None-Match'] = info.data.etag
  }

  const { status, etag } = await fetchForDataFilesBatchedLines({ url, headers, key, processLineBatch, processEndOfBatch, chunkSize, definition, info, options })
  if (status === 304) {
    return info?.data
  } else {
    return { etag }
  }
}

export async function resolveDownloadUrl (url) {
  url = url?.trim() || ''

  // Dropbox
  if (url.match(/^https:\/\/(www\.)*dropbox\.com\//i)) {
    url = url.replaceAll(/[&?]raw=\d/g, '').replaceAll(/[&?]dl=\d/g, '')
    if (url.match(/\?/)) {
      return `${url}&dl=1&raw=1`
    } else {
      return `${url}?dl=1&raw=1`
    }
  // Apple iCloud Drive
  } else if (url.match(/^https:\/\/(www\.)*icloud\.com\/iclouddrive/i)) {
    const parts = url.match(/iclouddrive\/([\w_]+)/)
    const response = await fetch('https://ckdatabasews.icloud.com/database/1/com.apple.cloudkit/production/public/records/resolve', {
      method: 'POST',
      headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
      body: JSON.stringify({
        shortGUIDs: [{ value: parts[1] }]
      })
    })
    if (response.status === 200) {
      const body = await response.text()
      const json = JSON.parse(body)
      return json?.results && json?.results[0] && json?.results[0].rootRecord?.fields?.fileContent?.value?.downloadURL
    } else {
      return url
    }
  // Google Drive
  } else if (url.match(/^https:\/\/drive\.google\.com\//i)) {
    const parts = url.match(/file\/d\/([\w_-]+)/)
    if (parts) {
      return `https://drive.google.com/uc?id=${parts[1]}&export=download`
    } else {
      console.log('No parts found for Google Drive URL', url)
      return url
    }
  // Google Docs
  } else if (url.match(/^https:\/\/docs\.google\.com\/document/i)) {
    const parts = url.match(/\/d\/([\w_-]+)/)
    return `https://docs.google.com/document/export?format=txt&id=${parts[1]}`
  // GitHub Gist
  } else if (url.match(/^https:\/\/gist\.github\.com\//i)) {
    console.log('gist url', url)
    const response = await fetch(url, {
      headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` }
    })
    if (response.status === 200) {
      const body = await response.text()
      const parts = body.match(/<a href="([^"]+\/raw\/[^"]+)"/)
      console.log('parts', parts)
      if (parts) {
        return `https://gist.githubusercontent.com${parts[1]}`
      } else {
        return url
      }
    }
  } else {
    return url
  }
}

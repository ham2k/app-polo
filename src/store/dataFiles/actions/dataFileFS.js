/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Buffer } from 'buffer'
import RNFetchBlob from 'react-native-blob-util'

import { getDataFileDefinition, getDataFileDefinitions } from '../dataFilesRegistry'
import { actions, selectDataFileInfo } from '../dataFilesSlice'
import { addRuntimeMessage } from '../../runtime'
import { reportError } from '../../../distro'

import packageJson from '../../../../package.json'

import { addNotice } from '../../system/systemSlice'

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

    try { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/data/`) } catch (error) { /* ignore */ }
    await RNFetchBlob.fs.writeFile(filenameForDefinition(definition), JSON.stringify(data))

    await dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', version: data.version, date: data.date ?? new Date() }))
    options.onStatus && await options.onStatus({ key, definition, status: 'loaded', data })

    let loadedOk
    if (definition.onLoad) loadedOk = await definition.onLoad(data, options)
    if (loadedOk === undefined || loadedOk === null) loadedOk = true

    return loadedOk
  } catch (error) {
    console.warn(`Error fetching data file ${key}`, error)
    console.warn(error.stack)
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

    const body = await RNFetchBlob.fs.readFile(filenameForDefinition(definition))
    const data = JSON.parse(body)

    let date
    if (data.date) {
      date = new Date(data.date)
    } else {
      const stat = await RNFetchBlob.fs.stat(filenameForDefinition(definition))
      date = new Date(stat.lastModified)
    }

    dispatch(actions.setDataFileInfo({ key, data, status: 'loaded', date }))

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

    const exists = await RNFetchBlob.fs.exists(filenameForDefinition(definition))
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

  const exists = await RNFetchBlob.fs.exists(filenameForDefinition(definition))
  if (exists) {
    await RNFetchBlob.fs.unlink(filenameForDefinition(definition))
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
  const headers = {
    'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
  }
  if (DEBUG_FETCH) console.log('Fetching', { url, info })
  if (info?.data?.etag) {
    if (DEBUG_FETCH) console.log('-- Using etag', info.data.etag)
    headers['If-None-Match'] = info.data.etag
  }

  const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, headers)
  if (DEBUG_FETCH) console.log('-- Response status', response?.respInfo?.status)
  if (DEBUG_FETCH) console.log('-- Response headers', response?.respInfo?.headers)
  if (response.respInfo.status === 304) {
    if (DEBUG_FETCH) console.log('-- 304 Not Modified')
    return info?.data
  } else if (response.respInfo.status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${response.respInfo.status}`)
  }

  if (DEBUG_FETCH) console.log('-- Reading file', response.data)
  const data64 = await RNFetchBlob.fs.readFile(response.data, 'base64')
  if (DEBUG_FETCH) console.log('-- Decoding', data64.length, 'bytes')
  const buffer = Buffer.from(data64, 'base64')
  const body = buffer.toString('utf8')

  const data = process ? process(body) : body

  RNFetchBlob.fs.unlink(response.data)

  const etagKey = Object.keys(response.respInfo.headers).find(k => k.toLowerCase() === 'etag')
  if (etagKey && response.respInfo.headers[etagKey]) {
    data.etag = response.respInfo.headers[etagKey]
    if (DEBUG_FETCH) console.log('-- Saved etag', data.etag)
  }

  return data
}

export async function fetchAndProcessBatchedLines ({ url, key, processLineBatch, processEndOfBatch, chunkSize, definition, info, options }) {
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

  const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, headers)
  if (DEBUG_FETCH) console.log('-- Response status', response?.respInfo?.status)
  if (DEBUG_FETCH) console.log('-- Response headers', response?.respInfo?.headers)
  if (response.respInfo.status === 304) {
    if (DEBUG_FETCH) console.log('-- 304 Not Modified')
    return info?.data
  } else if (response.respInfo.status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${response.respInfo.status}`)
  }

  const streamingPromise = new Promise((resolve, reject) => {
    let previousChunk = ''
    RNFetchBlob.fs.readStream(response.data, 'base64', chunkSize ?? 4096).then(stream => {
      stream.onData(chunk64 => {
        // The utf8 encoder in RNFetchBlob often breaks when there are some odd characters.
        // whereas `Buffer` is more resilient, so we go thru extra hoops, which are slower but more reliable
        const buffer = Buffer.from(chunk64, 'base64')
        let chunk = buffer.toString('utf8')

        // If the chunk ends with a complete line, then it ends in "\n" and `lines` will have an empty element as last.
        // but if it's not a complete line, then the last element will be the partial line.
        // In either case, we save it as `previousChunk` and remove it from the array,
        // and in the next chunk we'll prepend it to the first line.
        chunk = previousChunk + chunk
        const lines = chunk.split('\n')
        previousChunk = lines.pop()
        processLineBatch(lines)
      })
      stream.onEnd(() => {
        processEndOfBatch && processEndOfBatch()
        resolve()
      })
      stream.onError((err) => {
        console.log('Error reading stream', err)
        reject(err)
      })
      stream.open()
    })
  })

  await streamingPromise

  RNFetchBlob.fs.unlink(response.data)

  const etagKey = Object.keys(response.respInfo.headers).find(k => k.toLowerCase() === 'etag')
  if (etagKey && response.respInfo.headers[etagKey]) {
    if (DEBUG_FETCH) console.log('-- Saved etag', response.respInfo.headers[etagKey])
    return { etag: response.respInfo.headers[etagKey] }
  } else {
    return {}
  }
}

function filenameForDefinition (definition) {
  const basename = [definition.key, definition.version].filter(x => x).join('-')
  return `${RNFetchBlob.fs.dirs.DocumentDir}/data/${basename}.json`
}

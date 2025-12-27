/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { Buffer } from 'buffer'
import { Platform } from 'react-native'

export function filenameForDefinition(definition) {
  const basename = [definition.key, definition.version].filter(x => x).join('-')
  return `${RNFetchBlob.fs.dirs.DocumentDir}/data/${basename}.json`
}

export async function ensureDataFileDirectoryExists() {
  try { await RNFetchBlob.fs.mkdir(`${RNFetchBlob.fs.dirs.DocumentDir}/data/`) } catch (error) { /* ignore */ }
}

export async function saveDataFileToLocalFileSystem(name, data) {
  await RNFetchBlob.fs.writeFile(name, JSON.stringify(data))
}

export async function readDataFileFromLocalFileSystem(name) {
  const body = await RNFetchBlob.fs.readFile(name)
  return JSON.parse(body)
}

export async function getLastModifiedDate(name) {
  const stat = await RNFetchBlob.fs.stat(name)
  return new Date(stat.lastModified)
}

export async function existsInLocalFileSystem(name) {
  return await RNFetchBlob.fs.exists(name)
}

export async function removeDataFileFromLocalFileSystem(name) {
  await RNFetchBlob.fs.unlink(name)
}

const DEBUG_FETCH = false

export async function fetchForDataFiles({ url, headers, key, process, definition, info, options }) {
  const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, headers)
  if (DEBUG_FETCH) console.log('-- Response status', response?.respInfo?.status)
  if (DEBUG_FETCH) console.log('-- Response headers', response?.respInfo?.headers)
  if (response?.respInfo?.status === 304) {
    if (DEBUG_FETCH) console.log('-- 304 Not Modified')
    return { status: 304 }
  } else if (response?.respInfo?.status >= 301 && response?.respInfo?.status <= 308) {
    if (DEBUG_FETCH) console.log(`-- ${response?.respInfo?.status} Redirect`)
    return await fetchForDataFiles({ url: response.respInfo.headers?.location, headers, key, process, definition, info, options })
  } else if (response?.respInfo?.status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${response.respInfo.status}`)
  }

  if (DEBUG_FETCH) console.log('-- Reading file', response.data)

  // The utf8 encoder in RNFetchBlob often breaks when there are some odd characters.
  // whereas `Buffer` is more resilient, so we go thru extra hoops, which are slower but more reliable
  const data64 = await RNFetchBlob.fs.readFile(response.data, 'base64')
  if (DEBUG_FETCH) console.log('-- Decoding', data64.length, 'bytes')
  const buffer = Buffer.from(data64, 'base64')
  const body = buffer.toString('utf8')

  RNFetchBlob.fs.unlink(response.data)

  let etag
  const etagKey = Object.keys(response.respInfo.headers).find(k => k.toLowerCase() === 'etag')
  if (etagKey && response.respInfo.headers[etagKey]) {
    etag = response.respInfo.headers[etagKey]
  }

  return { body, etag, status: response.respInfo.status }
}

export async function fetchForDataFilesBatchedLines({ url, headers, key, processLineBatch, processEndOfBatch, chunkSize, definition, info, options }) {
  const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, headers)
  if (DEBUG_FETCH) console.log('-- Response status', response?.respInfo?.status)
  if (DEBUG_FETCH) console.log('-- Response headers', response?.respInfo?.headers)
  if (response.respInfo.status === 304) {
    if (DEBUG_FETCH) console.log('-- 304 Not Modified')
    return { status: 304 }
  } else if (response?.respInfo?.status >= 301 && response?.respInfo?.status <= 308) {
    if (DEBUG_FETCH) console.log(`-- ${response?.respInfo?.status} Redirect`)
    return await fetchForDataFilesBatchedLines({ url: response.respInfo.headers?.location, headers, key, process, definition, info, options })
  } else if (response.respInfo.status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${response.respInfo.status}`)
  }

  const streamingPromise = new Promise((resolve, reject) => {
    let previousChunk = ''

    if (DEBUG_FETCH) console.log('-- Reading file', response.data)

    if (Platform.OS === 'ios') {
      // There's a crashing bug in RNFetchBlob streams: https://github.com/RonRadtke/react-native-blob-util/issues/391
      // So until that's fixed, we'll use regular `readFile` instead for iOS
      // The utf8 encoder in RNFetchBlob often breaks when there are some odd characters.
      // whereas `Buffer` is more resilient, so we go thru extra hoops, which are slower but more reliable
      RNFetchBlob.fs.readFile(response.data, 'utf8').then(body => {
        // if (DEBUG_FETCH) console.log('-- Decoding', data64.length, 'bytes')
        // const buffer = Buffer.from(data64, 'base64')
        // const body = buffer.toString('utf8')
        const lines = body.split('\n')
        processLineBatch(lines)
        processEndOfBatch && processEndOfBatch()
        resolve()
      }).catch(err => {
        console.log('Error reading file', err)
        reject(err)
      })
    } else {
      RNFetchBlob.fs.readStream(response.data, 'utf8', chunkSize ?? 4096).then(stream => {
        stream.onData(chunk64 => {
          // The utf8 encoder in RNFetchBlob often breaks when there are some odd characters.
          // whereas `Buffer` is more resilient, so we go thru extra hoops, which are slower but more reliable
          // const buffer = Buffer.from(chunk64, 'base64')
          // let chunk = buffer.toString('utf8')
          let chunk = chunk64

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
    }
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

/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import base64 from 'react-native-base64'

import { qsonToADIF } from '../../../../tools/qsonToADIF'
import { qsonToCabrillo } from '../../../../tools/qsonToCabrillo'

export const generateExportsForOptions = (uuid, exports, options = {}) => async (dispatch, getState) => {
  const state = getState()
  const operation = state.operations.info[uuid]
  const settings = state.settings

  const results = []

  for (const oneExport of exports) {
    const operationData = oneExport.operation || operation

    let qsos = state.qsos.qsos[uuid].map(qso => {
      return { ...qso, our: { ...qso.our, call: operationData.stationCall } }
    })
    // When doing multioperator operations, with operators also working each other,
    // we want to exclude these QSOs from the combinations
    qsos = qsos.filter(qso => qso.our.call !== qso.their.call)
    console.log('generateExportsForOptions oneExport', oneExport)
    if (options.dataURI) {
      const uri = await generateExportDataURI({ uuid, qsos, operation: operationData, settings, ...oneExport })
      if (uri) {
        results.push({
          uri,
          type: mimeTypeForFormat(oneExport?.format),
          fileName: oneExport.fileName
        })
      }
    } else {
      const path = await generateExportFile({ uuid, qsos, operation: operationData, settings, ...oneExport })
      if (path) {
        results.push({
          path,
          uri: `file://${path}`,
          type: mimeTypeForFormat(oneExport?.format),
          fileName: oneExport.fileName
        })
      }
      console.log('results', results)
    }
  }
  console.log('generateExportsForOptions', results)
  return results
}

export const deleteExport = (path) => async (dispatch) => {
  await RNFetchBlob.fs.unlink(path)
}

export const generateExportFile = async ({ uuid, fileName, format, operation, qsos, exportData, ...rest }) => {
  let data

  if (rest?.selectQSOsToExport) {
    qsos = await rest.selectQSOsToExport({ qsos, format, operation, exportData, ...rest })
  }

  if (format === 'qson') {
    data = JSON.stringify({ operation: { ...operation, ...exportData }, qsos })
  } else if (format === 'adif') {
    data = qsonToADIF({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
  } else if (format === 'cabrillo') {
    data = qsonToCabrillo({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
  } else {
    const generateExportData = rest?.generateExportData ?? rest?.handler?.generateExportData
    if (generateExportData) {
      data = await generateExportData({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
    } else {
      data = ''
    }
  }

  if (fileName && data) {
    const path = `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${fileName}`
    await RNFetchBlob.fs.writeFile(path, data)
    return path
  } else {
    return false
  }
}

export const generateExportDataURI = async ({ uuid, fileName, format, operation, qsos, exportData, ...rest }) => {
  let data
  const type = mimeTypeForFormat(format)
  if (format === 'qson') {
    data = JSON.stringify({ operation: { ...operation, ...exportData }, qsos })
  } else if (format === 'adif') {
    data = qsonToADIF({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
  } else if (format === 'cabrillo') {
    data = qsonToCabrillo({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
  } else {
    const generateExportData = rest?.generateExportData ?? rest?.handler?.generateExportData
    if (generateExportData) {
      data = await generateExportData({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
    } else {
      data = ''
    }
  }

  const uri = `data:${type};base64,${base64.encode(data)}`
  return uri
}

const mimeTypeForFormat = (format) => {
  switch (format) {
    case 'qson':
      return 'application/json'
    case 'adif':
      return 'text/plain'
    case 'cabrillo':
      return 'text/plain'
    case 'text':
      return 'text/plain'
  }
  return 'text/plain'
}

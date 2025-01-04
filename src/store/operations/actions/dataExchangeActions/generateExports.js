/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'

import { qsonToADIF } from '../../../../tools/qsonToADIF'
import { qsonToCabrillo } from '../../../../tools/qsonToCabrillo'

export const generateExportsForOptions = (uuid, exports) => async (dispatch, getState) => {
  const state = getState()
  const operation = state.operations.info[uuid]
  const settings = state.settings

  const paths = []
  for (const oneExport of exports) {
    const operationData = oneExport.operation || operation

    let qsos = state.qsos.qsos[uuid].map(qso => {
      return { ...qso, our: { ...qso.our, call: operationData.stationCall } }
    })
    // When doing multioperator operations, with operators also working each other,
    // we want to exclude these QSOs from the combinations
    qsos = qsos.filter(qso => qso.our.call !== qso.their.call)

    paths.push(await generateExportFile({ uuid, qsos, operation: operationData, settings, ...oneExport }))
  }

  return paths.filter(x => x)
}

export const deleteExport = (path) => async (dispatch) => {
  await RNFetchBlob.fs.unlink(path)
}

export const generateExportFile = async ({ uuid, fileName, format, operation, qsos, exportData, ...rest }) => {
  let data
  if (format === 'qson') {
    data = JSON.stringify({ operation: { ...operation, ...exportData }, qsos })
  } else if (format === 'adif') {
    data = qsonToADIF({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
  } else if (format === 'cabrillo') {
    data = qsonToCabrillo({ operation: { ...operation, ...exportData }, qsos, fileName, format, ...rest })
  }

  if (fileName && data) {
    const path = `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${fileName}`
    await RNFetchBlob.fs.writeFile(path, data)
    return path
  } else {
    return false
  }
}

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

  const qsos = state.qsos.qsos[uuid].map(qso => {
    return { ...qso, our: { ...qso.our, call: operation.stationCall || settings.operatorCall } }
  })

  const paths = []
  for (const oneExport in exports) {
    paths.push(oneExport.data = await generateExportFile({ uuid, qsos, operation, settings, ...oneExport }))
  }

  return paths.filter(x => x)
}

export const deleteExport = (path) => async (dispatch) => {
  await RNFetchBlob.fs.unlink(path)
}

export const generateExportFile = async ({ uuid, qsos, operation, settings, exportData, format, handler, ref, title, fileName }) => {
  let data
  if (format === 'qson') {
    data = JSON.stringify({ operation: { ...operation, ...exportData }, qsos, settings, fileName })
  } else if (format === 'adif') {
    data = qsonToADIF({ operation: { ...operation, ...exportData }, qsos, settings, ref, handler, title, fileName })
  } else if (format === 'cabrillo') {
    data = qsonToCabrillo({ operation: { ...operation, ...exportData }, qsos, ref, settings, handler, title, fileName })
  }

  if (fileName && data) {
    const path = `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/${fileName}`
    await RNFetchBlob.fs.writeFile(path, data)
    return path
  } else {
    return false
  }
}

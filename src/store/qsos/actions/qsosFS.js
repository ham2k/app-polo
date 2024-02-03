import RNFetchBlob from 'react-native-blob-util'
import { actions } from '../qsosSlice'
import { actions as operationActions, saveOperation } from '../../operations'

import debounce from 'debounce'

function debounceableDispatch (dispatch, action) {
  return dispatch(action())
}
const debouncedDispatch = debounce(debounceableDispatch, 3000)

export const loadQSOs = (uuid) => async (dispatch, getState) => {
  dispatch(actions.setQSOsStatus({ uuid, status: 'loading' }))

  let qsos = []
  try {
    const qsosJSON = await RNFetchBlob.fs.readFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/qsos.json`)
    qsos = JSON.parse(qsosJSON)
  } catch (error) {
  }
  dispatch(actions.setQSOsStatus({ uuid, status: 'ready' }))
  dispatch(actions.setQSOs({ uuid, qsos }))

  let startOnMillisMin, startOnMillisMax
  qsos.forEach(qso => {
    if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
    if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis
  })
  dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount: qsos.length }))
  const operation = getState().operations.info[uuid]
  setTimeout(() => {
    dispatch(saveOperation(operation))
  }, 0)
}

export const addQSO = ({ uuid, qso }) => (dispatch, getState) => {
  dispatch(actions.addQSO({ uuid, qso }))

  const state = getState()
  const info = state.operations.info[uuid]
  const qsos = state.qsos.qsos[uuid]

  let { startOnMillisMin, startOnMillisMax } = info
  if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
  if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis

  setTimeout(() => {
    dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount: qsos.length }))
    debouncedDispatch(dispatch, () => saveQSOs(uuid))
  }, 1)
}

export const saveQSOs = (uuid) => async (dispatch, getState) => {
  const qsos = getState().qsos.qsos[uuid]
  const qsosJSON = JSON.stringify(qsos)

  await RNFetchBlob.fs.writeFile(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/new-qsos.json`, qsosJSON)

  if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-qsos.json`)) {
    await RNFetchBlob.fs.unlink(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-qsos.json`)
  }

  if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/qsos.json`)) {
    await RNFetchBlob.fs.mv(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/qsos.json`, `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-qsos.json`)
  }

  await RNFetchBlob.fs.mv(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/new-qsos.json`, `${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/qsos.json`)

  if (await RNFetchBlob.fs.exists(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-qsos.json`)) {
    await RNFetchBlob.fs.unlink(`${RNFetchBlob.fs.dirs.DocumentDir}/ops/${uuid}/old-qsos.json`)
  }

  const operation = getState().operations.info[uuid]
  setTimeout(() => {
    dispatch(saveOperation(operation))
  }, 0)
}

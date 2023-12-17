import RNFS from 'react-native-fs'
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
    const qsosJSON = await RNFS.readFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)
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
  if (qso.startOnMillis < startOnMillisMin) startOnMillisMin = qso.startOnMillis
  if (qso.startOnMillis > startOnMillisMax) startOnMillisMax = qso.startOnMillis

  dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount: qsos.length }))
  return debouncedDispatch(dispatch, () => saveQSOs(uuid))
}

export const saveQSOs = (uuid) => async (dispatch, getState) => {
  const qsos = getState().qsos.qsos[uuid]
  const qsosJSON = JSON.stringify(qsos)

  await RNFS.writeFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-qsos.json`, qsosJSON)

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)) {
    await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }

  await RNFS.moveFile(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/new-qsos.json`, `${RNFS.DocumentDirectoryPath}/ops/${uuid}/qsos.json`)

  if (await RNFS.exists(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)) {
    await RNFS.unlink(`${RNFS.DocumentDirectoryPath}/ops/${uuid}/old-qsos.json`)
  }

  const operation = getState().operations.info[uuid]
  setTimeout(() => {
    dispatch(saveOperation(operation))
  }, 0)
}

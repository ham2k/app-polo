import { actions } from '../qsosSlice'
import { actions as operationActions, saveOperation } from '../../operations'

import { dbExecute, dbSelectAll } from '../../db/db'

// import debounce from 'debounce'
// function debounceableDispatch (dispatch, action) {
//   return dispatch(action())
// }
// const debouncedDispatch = debounce(debounceableDispatch, 3000)

export const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  delete data._originalKey
  return data
}

export const loadQSOs = (uuid) => async (dispatch, getState) => {
  dispatch(actions.setQSOsStatus({ uuid, status: 'loading' }))

  let qsos = []
  try {
    qsos = await dbSelectAll('SELECT * FROM qsos WHERE operation = ? ORDER BY startOnMillis', [uuid], { row: prepareQSORow })
  } catch (error) {
  }
  dispatch(actions.setQSOs({ uuid, qsos }))
  dispatch(actions.setQSOsStatus({ uuid, status: 'ready' }))

  let startOnMillisMin, startOnMillisMax
  qsos.forEach(qso => {
    if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
    if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis
  })

  const qsoCount = qsos.filter(qso => !qso.deleted).length

  dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount }))
  const operation = getState().operations.info[uuid]
  setTimeout(() => {
    dispatch(saveOperation(operation))
  }, 0)
}

export const addQSO = ({ uuid, qso }) => async (dispatch, getState) => {
  await dbExecute(`
    DELETE FROM qsos
    WHERE operation = ? AND (key = ? OR key = ?)
    `, [uuid, qso.key, qso._originalKey ?? qso.key])

  const qsoClone = { ...qso }
  delete qsoClone._originalKey

  await dbExecute(`
    INSERT INTO qsos
    (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, qso.key, JSON.stringify(qsoClone), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis])

  dispatch(actions.addQSO({ uuid, qso }))
  const state = getState()
  const info = state.operations.info[uuid]
  const qsos = state.qsos.qsos[uuid]

  let { startOnMillisMin, startOnMillisMax } = info
  if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
  if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis

  // No need to save operation to the db, because min/max times and counts are recalculated on load
  dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount: qsos.length }))
  const operation = getState().operations.info[uuid]
  setTimeout(() => {
    dispatch(saveOperation(operation))
  }, 0)
}

export const saveQSOsForOperation = (uuid) => async (dispatch, getState) => {
  const qsos = getState().qsos.qsos[uuid]
  // Move old QSOs out of the way (in sqlite, || is concatenation)
  await dbExecute(`
    UPDATE qsos
    SET operation = operation || '_tmp'
    WHERE operation = ?
    `, [uuid])

  // Save new QSOs
  for (const qso of qsos) {
    const json = JSON.stringify(qso)
    await dbExecute(`
      INSERT INTO qsos
      (operation, key, data, ourCall, theirCall, mode, band, startOnMillis) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis])
  }

  // Rename delete old QSOs  (in sqlite, || is concatenation)
  await dbExecute(`
    DELETE FROM qsos
    WHERE operation = ? || '_tmp'
    `, [uuid])
}

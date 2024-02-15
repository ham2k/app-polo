import { actions } from '../qsosSlice'
import { actions as operationActions, saveOperation } from '../../operations'

// import debounce from 'debounce'
import { dbExecute, dbSelectAll } from '../../db/db'

// function debounceableDispatch (dispatch, action) {
//   return dispatch(action())
// }
// const debouncedDispatch = debounce(debounceableDispatch, 3000)

const prepareQSORow = (row) => {
  const data = JSON.parse(row.data)
  return data
}

export const loadQSOs = (uuid) => async (dispatch, getState) => {
  dispatch(actions.setQSOsStatus({ uuid, status: 'loading' }))

  let qsos = []
  try {
    qsos = await dbSelectAll('SELECT * FROM qsos WHERE op_uuid = ? ORDER BY start_on', [uuid], { row: prepareQSORow })
  } catch (error) {
  }
  dispatch(actions.setQSOs({ uuid, qsos }))
  dispatch(actions.setQSOsStatus({ uuid, status: 'ready' }))

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

export const addQSO = ({ uuid, qso }) => async (dispatch, getState) => {
  console.log('addQSO', uuid, qso)
  await dbExecute(`
    DELETE FROM qsos
    WHERE op_uuid = ? AND (key = ? OR key = ?)
    `, [uuid, qso.key, qso._originalKey ?? qso.key])

  await dbExecute(`
    INSERT INTO qsos
    (op_uuid, key, data, our_call, their_call, mode, band, start_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, qso.key, JSON.stringify(qso), qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis])

  dispatch(actions.addQSO({ uuid, qso }))
  const state = getState()
  const info = state.operations.info[uuid]
  const qsos = state.qsos.qsos[uuid]
  console.log('qsos', qsos)
  let { startOnMillisMin, startOnMillisMax } = info
  if (qso.startOnMillis < startOnMillisMin || !startOnMillisMin) startOnMillisMin = qso.startOnMillis
  if (qso.startOnMillis > startOnMillisMax || !startOnMillisMax) startOnMillisMax = qso.startOnMillis

  setTimeout(() => {
    // No need to save operation to the db, because min/max times and counts are recalculated on load
    dispatch(operationActions.setOperation({ uuid, startOnMillisMin, startOnMillisMax, qsoCount: qsos.length }))
  }, 1)
}

export const saveQSOsForOperation = (uuid) => async (dispatch, getState) => {
  console.log('saveQSOsForOperation', uuid)
  const qsos = getState().qsos.qsos[uuid]
  // Move old QSOs out of the way (in sqlite, || is concatenation)
  await dbExecute(`
    UPDATE qsos
    SET op_uuid = op_uuid || '_tmp'
    WHERE op_uuid = ?
    `, [uuid])

  // Save new QSOs
  for (const qso of qsos) {
    const json = JSON.stringify(qso)
    await dbExecute(`
      INSERT INTO qsos
      (op_uuid, key, data, our_call, their_call, mode, band, start_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uuid, qso.key, json, qso.our?.call, qso.their?.call, qso.mode, qso.band, qso.startOnMillis])
  }

  // Rename delete old QSOs  (in sqlite, || is concatenation)
  await dbExecute(`
    DELETE FROM qsos
    WHERE op_uuid = ? || '_tmp'
    `, [uuid])
}

import { findRef } from '../../../tools/refTools'
import { actions, selectQSOs } from '../qsosSlice'
import { apiPOTA } from '../../../store/apis/apiPOTA'

export const confirmSpots = (uuid, options = {}) => async (dispatch, getState) => {
  if (!options.call) {
    return
  }

  const park = findRef(options.operation, 'potaActivation')?.ref
  if (!park) {
    return
  }

  const args = { call: options.call, park }
  const apiPromise = await dispatch(apiPOTA.endpoints.spotComments.initiate(args, { forceRefetch: true }))
  await Promise.all(dispatch(apiPOTA.util.getRunningQueriesThunk()))

  apiPromise.unsubscribe?.()
  const spots = apiPromise.data

  const spotsMap = {}
  spots.filter(spot => spot.source.toUpperCase() !== 'RBN').forEach(spot => {
    spotsMap[spot.spotter] = spot
  })

  const qsos = selectQSOs(getState(), uuid)
  for (const qso of qsos) {
    const spot = spotsMap[qso.their.call]
    if (!spot) {
      continue
    }

    if (spot.mode !== qso.mode) {
      continue
    }

    if (!sameUTCDay(spot.timeInMillis, qso.startAtMillis)) {
      continue
    }

    const newQso = { ...qso, spotConfirmed: true }
    dispatch(actions.addQSO({ uuid: options.operation.uuid, qso: newQso }))
  }
}

function sameUTCDay (aMillis, bMillis) {
  if (!aMillis || !bMillis) {
    return false
  }

  const dateA = new Date(aMillis)
  const dateB = new Date(bMillis)

  return dateA.getUTCDate() === dateB.getUTCDate() &&
    dateA.getUTCMonth() === dateB.getUTCMonth() &&
    dateA.getUTCFullYear() === dateB.getUTCFullYear()
}

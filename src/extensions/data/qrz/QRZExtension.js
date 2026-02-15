/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GLOBAL from '../../../GLOBAL'
import { apiQRZ } from '../../../store/apis/apiQRZ'

import { hashCode } from '../../../tools/hashCode'
import { setOperationData } from '../../../store/operations'
import { adifFieldsForOneQSO, adifRow } from '../../../tools/qsonToADIF'

export const Info = {
  key: 'qrz',
  icon: 'web',
  name: 'QRZ.com Callsign Lookups',
  description: 'Requires free account for names, and paid account for locations',
  shortName: 'QRZ',
  infoURL: 'https://qrz.com/'
}

const Extension = {
  ...Info,
  category: 'lookup',
  enabledByDefault: true,
  onActivation: ({ registerHook }) => {
    registerHook('lookup', { hook: LookupHook, priority: 99 })
    registerHook('account', { hook: AccountHook })
    registerHook('qsl', { hook: QSLHook })
  }
}
export default Extension

const EMPTY_RECORD = { name: '', city: '', state: '', grid: '', locationLabel: '', locationAccuracy: undefined, image: '' }

const LookupHook = {
  ...Info,
  shouldSkipLookup: ({ online, lookedUp }) => {
    if (GLOBAL?.flags?.services?.qrz === false) return true

    return !online || (lookedUp.name && lookedUp.grid && lookedUp.city && lookedUp.image)
  },
  lookupCallWithDispatch: (callInfo, { settings, online }) => async (dispatch) => {
    if (GLOBAL?.flags?.services?.qrz === false) return {}

    let qrzPromise
    let qrzLookup
    if (online && settings?.accounts?.qrz?.login && settings?.accounts?.qrz?.password && callInfo?.baseCall?.length > 2) {
      qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: callInfo.call }))
      await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
      qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: callInfo.call })(getState()))
      qrzPromise.unsubscribe && qrzPromise.unsubscribe()

      // If not found and the call had modifiers, try the base call
      if ((typeof qrzLookup?.error === 'string' && qrzLookup?.error?.indexOf('not found') > 0) && callInfo.baseCall && callInfo.baseCall !== callInfo.call) {
        qrzPromise = await dispatch(apiQRZ.endpoints.lookupCall.initiate({ call: callInfo.baseCall }))
        await Promise.all(dispatch(apiQRZ.util.getRunningQueriesThunk()))
        qrzLookup = await dispatch((_dispatch, getState) => apiQRZ.endpoints.lookupCall.select({ call: callInfo.baseCall })(getState()))
        qrzPromise.unsubscribe && qrzPromise.unsubscribe()
      }

      let matchingQRZCall = qrzLookup?.data?.allCalls?.find(call => call === callInfo.call)
      if (!matchingQRZCall && callInfo.baseCall) matchingQRZCall = qrzLookup?.data?.allCalls?.find(call => call === callInfo.baseCall)

      if (matchingQRZCall) {
        return { ...qrzLookup.data, call: matchingQRZCall, source: 'qrz.com' }
      } else if (qrzLookup?.error) {
        const errorMessage = qrzLookup.error.error || qrzLookup.error
        return { ...EMPTY_RECORD, error: `QRZ: ${errorMessage}`, call: callInfo.call, source: 'qrz.com' }
      }
    }
    return {}
  }
}

const AccountHook = {
  ...Info,
  fetchSpots: async ({ online, settings, dispatch }) => {
  }
}

function qrzAdifRow(qso, operation) {
  return adifRow(adifFieldsForOneQSO({qso, common: operation, privateData: true, templates: {}}))
}

const QSLHook = {
  ...Info,
  serviceName: 'QRZ.com Logbook',
  canSendOutgoingQSLs: ({ operation, qsos, settings }) => {
    console.log("canSend", operation, settings)
    const activatorCallsign = operation.stationCall || settings.operatorCall
    const apiKey = settings?.accounts?.qrz?.logbooks?.find(log => log.callsign === activatorCallsign)?.apiKey
    return !!apiKey
  },
  sendOutgoingQSLs: async ({ operation, qsos, settings, dispatch }) => {
    const activatorCallsign = operation.stationCall || settings.operatorCall
    const apiKey = settings?.accounts?.qrz?.logbooks?.find(log => log.callsign === activatorCallsign)?.apiKey
    console.log(settings.accounts?.qrz)
    if (!apiKey) {
      dispatch(setOperationData({
        uuid: operation.uuid,
        qsl: { ...operation?.qsl, [Info.key]: {
          ...operation?.qsl?.[Info.key],
          error: `No logbook for callsign ${activatorCallsign}`
        }}
      }))
      return
    }

    const qsl = operation?.qsl?.[Info.key]
    const qslUploadIDs = {...qsl?.uploadIDs || {}}

    const uploadQSOs = []
    const qsosToDelete = []
    let qsosHash = 0
    qsos.filter(q => !q.deleted).forEach(qso => {
      const qsoAdifRow = qrzAdifRow(qso, operation)
      const qsoHash = hashCode(qsoAdifRow)
      qsosHash = hashCode(qsoAdifRow, qsosHash)
      if (qslUploadIDs[qso.uuid]?.hash && qslUploadIDs[qso.uuid]?.hash === qsoHash) return
      if (qslUploadIDs[qso.uuid]?.id) qsosToDelete.push(qslUploadIDs[qso.uuid].id)
      uploadQSOs.push({
        qsoUUID: qso.uuid,
        qsoHash,
        qsoAdifRow
      })
    })

    Object.keys(qslUploadIDs).forEach(qsoUUID => {
      if (!qsos.find(q => !q.deleted && q.uuid === qsoUUID)) {
        if (qslUploadIDs[qsoUUID]?.id) qsosToDelete.push(qslUploadIDs[qsoUUID].id)
        delete qslUploadIDs[qsoUUID]
      }
    })

    if (qsosToDelete.length > 0) {
      const apiDeletePromise = await dispatch(apiQRZ.endpoints.logbookDelete.initiate({apiKey, logIds: qsosToDelete}, {forceRefetch: true}))
      apiDeletePromise.unsubscribe && apiDeletePromise.unsubscribe()
    }

    const errors = []
    const promises = uploadQSOs.map((uploadQSO) => {
      const { qsoAdifRow, qsoHash, qsoUUID } = uploadQSO;

      return dispatch(apiQRZ.endpoints.logbookInsert.initiate({ apiKey, adif: qsoAdifRow }, { forceRefetch: true }))
      .then((result) => {
        if (!result.error) {
          qslUploadIDs[qsoUUID] = {
            id: result.data?.logId,
            hash: qsoHash,
          };
        } else {
          console.log('Error uploading QSO to QRZ.com', result.error);
          errors.push(result.error?.data?.REASON || 'Unknown error');
        }
        result.unsubscribe && result.unsubscribe();
      });
    });
    await Promise.all(promises)

    dispatch(setOperationData({
      uuid: operation.uuid,
      qsl: { ...operation?.qsl, [Info.key]: {
        lastUpdated: errors.length > 0 ? operation?.qsl?.[Info.key]?.lastUpdated : Date.now(),
        qsosHash,
        uploadIDs: qslUploadIDs,
        error: errors?.[0] || null  // Just return the first error if there are multiple, to keep it simple.
      }}
    }))
  },
  qslStatusForOperation: ({ operation, qsos }) => {
    error = operation?.qsl?.[Info.key]?.error
    if (!operation?.qsl?.[Info.key]) return { status: 'neverSent', error }

    // QSO modified in way that concerns service?
    const qslHash = operation.qsl?.[Info.key]?.qsosHash
    const newHash = qsos.filter(q => !q.deleted).reduce((hash, q) => hashCode(qrzAdifRow(q, operation), hash), 0)
    if (qslHash !== newHash) {
      return { status:'needsUpdate', error }
    }

    return { status: 'upToDate', error }
  }
}

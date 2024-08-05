/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './POTAInfo'
import { POTAActivityOptions } from './POTAActivityOptions'
import { potaFindParkByReference, registerPOTAAllParksData } from './POTAAllParksData'
import { POTALoggingControl } from './POTALoggingControl'
import { POTAPostSpot } from './POTAPostSpot'
import { fmtDateZulu } from '../../../tools/timeFormats'
import { apiPOTA } from '../../../store/apiPOTA'
import { bandForFrequency } from '@ham2k/lib-operation-data'

const Extension = {
  ...Info,
  category: 'locationBased',
  enabledByDefault: true,
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook('spots', { hook: SpotsHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerPOTAAllParksData()

    await dispatch(loadDataFile('pota-all-parks', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('pota-all-parks'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,

  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  postSpot: POTAPostSpot,
  Options: POTAActivityOptions,

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, Info.activationType)) return true
    if (findRef(qso, Info.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, Info.activationType)
    let label = opRef ? Info.shortNameDoubleContact : Info.shortName
    if (findRef(qso, Info.huntingType)) label = `✓ ${label}`
    return label
  },

  generalHuntingType: ({ operation, settings }) => Info.huntingType
}

const SpotsHook = {
  ...Info,
  sourceName: 'POTA.app',
  fetchSpots: async ({ online, settings, dispatch }) => {
    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiPOTA.endpoints.spots.initiate({}, { forceRefetch: true }))
      await Promise.all(dispatch(apiPOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiPOTA.endpoints.spots.select({})(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || {}
    }
    return spots.map(spot => {
      const qso = {
        their: { call: spot.activator },
        freq: spot.frequency,
        band: spot.frequency ? bandForFrequency(spot.frequency) : spot.band,
        mode: spot.mode,
        refs: [{
          ref: spot.reference,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: Date.parse(spot.spotTime + 'Z'),
          source: Info.key,
          icon: Info.icon,
          label: `POTA ${spot.reference}: ${spot.locationDesc ? spot.locationDesc.split('-')[1] + ' •' : ''} ${spot.name}`,
          sourceInfo: {
            source: spot.source,
            id: spot.spotId,
            comments: spot.comments,
            spotter: spot.spotter,
            count: spot.count
          }
        }
      }

      return qso
    })
  }
}

const HunterLoggingControl = {
  key: `${Info.key}/hunter`,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = [Info.shortName]
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: POTALoggingControl,
  inputWidthMultiplier: 30,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: `${Info.key}/activator`,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = [Info.shortNameDoubleContact]
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: POTALoggingControl,
  inputWidthMultiplier: 30,
  optionType: 'mandatory'
}

const ReferenceHandler = {
  ...Info,

  shortDescription: (operation) => refsToString(operation, Info.activationType),

  description: (operation) => {
    const refs = filterRefs(operation, Info.activationType)
    return [
      refs.map(r => r.ref).filter(x => x).join(', '),
      refs.map(r => r.name).filter(x => x).join(', ')
    ].filter(x => x).join(' • ')
  },

  iconForQSO: Info.icon,

  decorateRefWithDispatch: (ref) => async () => {
    if (!ref?.ref || !ref.ref.match(Info.referenceRegex)) return { ...ref, ref: '', name: '', shortName: '', location: '' }

    const data = await potaFindParkByReference(ref.ref)
    let result
    if (data?.name) {
      result = {
        ...ref,
        name: data.name,
        location: data.locationName,
        grid: data.grid
      }
    } else {
      return { name: Info.unknownReferenceName ?? 'Unknown reference', ...ref }
    }
    return result
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === Info.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name, shortSubtitle: ref.shortName }
    } else {
      return null
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref.type === Info.activationType && ref.ref) {
      return [{
        format: 'adif',
        common: { refs: [ref] },
        nameTemplate: settings.useCompactFileNames ? '{call}@{ref}-{compactDate}' : '{date} {call} at {ref}',
        titleTemplate: `{call}: ${Info.shortName} at ${[ref.ref, ref.name].filter(x => x).join(' - ')} on {date}`
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation, common }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)

    if (huntingRefs) return ([{ SIG: 'POTA' }, { SIG_INFO: huntingRefs[0].ref }, { POTA_REF: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') }])
    else return []
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation, common }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationADIF = []
    if (activationRef) {
      activationADIF = [
        { MY_SIG: 'POTA' }, { MY_SIG_INFO: activationRef.ref }, { MY_POTA_REF: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return huntingRefs.map(huntingRef => [
        ...activationADIF,
        { SIG: 'POTA' }, { SIG_INFO: huntingRef.ref }, { POTA_REF: huntingRef.ref }
      ])
    } else {
      return [activationADIF]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { band, mode, key, startOnMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const counts = refs.length || 1

    if (refs.length === 0 && !ref?.ref) return { counts: 0 } // If not activating, only counts if other QSO has a POTA ref

    const nearDupes = qsos.filter(q => !q.deleted && (startOnMillis ? q.startOnMillis < startOnMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length === 0) {
      return { counts, type: Info.activationType }
    } else {
      const day = fmtDateZulu(qso.startOnMillis ?? Date.now())
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => q.mode === mode).length !== 0
      const sameDay = nearDupes.filter(q => fmtDateZulu(q.startOnMillis) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameMode && sameDay && (sameRefs || refs.length === 0)) {
        return { counts: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef') // only if at new ref
        if (!sameDay) notices.push('newDay')
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { counts, notices, type: Info.activationType }
      }
    }
  },

  scoringForHuntingQSO: ({ qso, qsos, operation, ref }) => {
    if (!ref.ref) return {}

    const { band, mode, key, startOnMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const counts = refs.length || 1

    const nearDupes = qsos.filter(q => !q.deleted && (startOnMillis ? q.startOnMillis < startOnMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length === 0) {
      return { counts, type: Info.activationType }
    } else {
      const day = fmtDateZulu(qso.startOnMillis ?? Date.now())
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => q.mode === mode).length !== 0
      const sameDay = nearDupes.filter(q => fmtDateZulu(q.startOnMillis) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameMode && sameDay && (sameRefs || refs.length === 0)) {
        return { counts: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef') // only if at new ref
        if (!sameDay) notices.push('newDay')
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { counts, notices, type: Info.activationType }
      }
    }
  }
}

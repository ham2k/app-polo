/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { gridToLocation, distanceOnEarth } from '@ham2k/lib-geo-tools'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { filterRefs, findRef, mergeRefs, refsToString } from '@ham2k/lib-qson-tools'

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'

import { Info } from './LLOTAInfo'
import { LLOTAActivityOptions } from './LLOTAActivityOptions'
import { llotaFindByReference, llotaFindByLocation, registerLLOTAAllRefsData } from './LLOTAAllRefsData'
import { LLOTALoggingControl } from './LLOTALoggingControl'

import { LLOTAPostOtherSpot } from './LLOTAPostOtherSpot'
import { LLOTAPostSelfSpot } from './LLOTAPostSelfSpot'
import { apiLLOTA } from '../../../store/apis/apiLLOTA'
import { LOCATION_ACCURACY } from '../../constants'
import GLOBAL from '../../../GLOBAL'
import { generateActivityDailyAccumulator, generateActivityScorer, generateActivitySumarizer } from '../../shared/activityScoring'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook('spots', { hook: SpotsHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerLLOTAAllRefsData()

    await dispatch(loadDataFile('llota-all-lakes', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('llota-all-lakes'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,

  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  postOtherSpot: LLOTAPostOtherSpot,
  postSelfSpot: LLOTAPostSelfSpot,
  Options: LLOTAActivityOptions,

  generalHuntingType: ({ operation }) => Info.huntingType,

  sampleOperations: ({ settings, callInfo, t }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'XX-1234', name: t('extensions.llota.exampleRefName', 'Example Lake'), shortName: t('extensions.llota.activityOptions.exampleLake', 'Example Lake'), program: Info.shortName, label: `${Info.shortName} XX-1234: Example Lake`, shortLabel: `${Info.shortName} XX-1234` }] }
    ]
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'LLOTA.app',
  fetchSpots: async ({ online, settings, dispatch }) => {
    if (GLOBAL?.flags?.services?.llota === false) return []

    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiLLOTA.endpoints.spots.initiate({}, { forceRefetch: true }))
      await Promise.all(dispatch(apiLLOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiLLOTA.endpoints.spots.select({})(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []
    }
    return spots.filter(spot => !spot.comments?.match(/QRT/i)).map(spot => {
      const qso = {
        their: { call: spot.callsign },
        freq: spot.frequency,
        band: spot.frequency ? bandForFrequency(spot.frequency) : spot.band,
        mode: spot.mode,
        refs: [{
          ref: spot.reference,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: Date.parse(spot.updated_at),
          source: Info.key,
          icon: Info.icon,
          label: `${spot.reference}: ${spot.reference_name}`,
          sourceInfo: {
            id: spot.id,
            comments: spot.history.map(h => h.comment),
            spotter: spot.spotter,
            count: spot.history.length
          }
        }
      }

      return qso
    })
  },
  extraSpotInfo: async ({ online, settings, dispatch, spot }) => {
    if (GLOBAL?.flags?.services?.llota === false) return

    if (online) {
      const spotRef = findRef(spot, Info.huntingType)
      if (spotRef) {
        const spotComments = spot.sourceInfo?.comments || []

        const filteredSpotComment = spotComments.find(x =>
          x.comments.match(/\b[0-9]+-fer:(?: [A-Z0-9]+-(?:[0-9]{4,5}|TEST)){2,}$/)
        )
        if (filteredSpotComment) {
          const newRefs = filteredSpotComment.comments
            .match(/\b[0-9]+-fer: (.+)$/)[1]
            .split(' ')
            .map(ref => ({ ref, type: Info.huntingType }))
          spot.refs = mergeRefs(spot.refs, newRefs)
        }
      }
    }
  }
}

const HunterLoggingControl = {
  key: `${Info.key}/hunter`,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = [Info.shortName]
    const refCount = filterRefs(qso, Info.huntingType).length
    if (refCount === 1) parts.unshift('✓')
    else if (refCount > 1) parts.unshift(`×${refCount}`)
    return parts.join(' ')
  },
  InputComponent: LLOTALoggingControl,
  inputWidthMultiplier: 30,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: `${Info.key}/activator`,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = [Info.shortNameDoubleContact]
    const refCount = filterRefs(qso, Info.huntingType).length
    if (refCount === 1) parts.unshift('✓')
    else if (refCount > 1) parts.unshift(`×${refCount}`)
    return parts.join(' ')
  },
  InputComponent: LLOTALoggingControl,
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

  decorateRefWithDispatch: (ref) => async (dispatch) => {
    if (!ref?.ref || !ref.ref.match(Info.referenceRegex)) return { ...ref, ref: '', name: '', shortName: '', location: '' }
    let result

    const data = await llotaFindByReference(ref.ref)
    if (data?.name) {
      result = {
        ...ref,
        name: data.name,
        location: data.location,
        label: `${Info.shortName} ${ref.ref}: ${data.name}`,
        shortLabel: `${Info.shortName} ${ref.ref}`,
        program: Info.shortName
      }

      if (data?.location?.indexOf(',') < 0) {
        result.accuracy = LOCATION_ACCURACY.REASONABLE
        result.grid = data.grid

        if (data.ref?.startsWith('US-') || data.ref?.startsWith('CA-') || data.ref?.startsWith('AU-')) {
          // For US, Canada or Australia, use the state/province.
          result.state = (data.location || '').split('-')[1]?.trim()
        }
      } else {
        result.possibleStates = (data.location || '').split(',').map(x => x.split('-', 2)[1]?.trim())
      }
    } else {
      return { name: GLOBAL?.t?.('extensions.llota.unknownRefName', Info.unknownReferenceName ?? 'Unknown lake') ?? Info.unknownReferenceName, ...ref }
    }
    return result
  },

  extractTemplate: ({ ref, operation }) => {
    return { type: ref.type }
  },

  updateFromTemplateWithDispatch: ({ t, ref, operation }) => async (dispatch) => {
    if (operation?.grid) {
      let info = parseCallsign(operation.stationCall || '')
      info = annotateFromCountryFile(info)
      const [lat, lon] = gridToLocation(operation.grid)

      let nearby = await llotaFindByLocation(info.dxccCode, lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: t('extensions.llota.noRefsNearby', 'No lakes nearby!') }
    } else {
      return { type: ref.type }
    }
  },

  suggestOperationTitle: ({ ref }) => {
    if (ref.type === Info.activationType && ref.ref) {
      return {
        at: ref.ref, subtitle: ref.name, shortSubtitle: ref.shortName, description: `${Info.shortName}: ${ref.ref}`
      }
    } else {
      return null
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info.activationType && ref?.ref) {
      return [{
        format: 'adif',
        exportType: `${Info.key}-activator`,
        exportName: 'LLOTA Activation',
        exportData: { refs: [ref] }, // exports only see this one ref
        nameTemplate: '{{>RefActivityName}}',
        titleTemplate: '{{>RefActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRefs = filterRefs(operation, Info.activationType)

    const fields = []
    if (huntingRefs && huntingRefs[0]) {
      fields.push({ SIG: 'LLOTA' }, { SIG_INFO: huntingRefs[0]?.ref }, { LLOTA_REF: huntingRefs.map(ref => ref?.ref).filter(x => x).join(',') })
    }
    if (activationRefs && activationRefs[0]) {
      fields.push({ MY_SIG: 'LLOTA' }, { MY_SIG_INFO: activationRefs[0]?.ref }, { MY_LLOTA_REF: activationRefs.map(ref => ref?.ref).filter(x => x).join(',') })
    }
    return fields
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationFields = []
    if (activationRef) {
      activationFields = [
        { MY_SIG: 'LLOTA' }, { MY_SIG_INFO: activationRef.ref }, { MY_LLOTA_REF: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return huntingRefs.map(huntingRef => [
        ...activationFields,
        { SIG: 'LLOTA' }, { SIG_INFO: huntingRef.ref }, { LLOTA_REF: huntingRef.ref }
      ])
    } else {
      return [activationFields]
    }
  },

  scoringForQSO: generateActivityScorer({ info: Info }),
  accumulateScoreForDay: generateActivityDailyAccumulator({ info: Info }),
  summarizeScore: generateActivitySumarizer({ info: Info })

}

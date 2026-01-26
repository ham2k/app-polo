/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { bandForFrequency } from '@ham2k/lib-operation-data'

import GLOBAL from '../../../GLOBAL'

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'
import { LOCATION_ACCURACY } from '../../constants'
import { distanceOnEarth } from '../../../tools/geoTools'

import { generateActivityOperationAccumulator, generateActivityScorer, generateActivitySumarizer } from '../../shared/activityScoring'

import { apiTOTA } from '../../../store/apis/apiTOTA'
import { Info } from './TOTAInfo'
import { totaFindAllByLocation, totaFindOneByReference, registerTOTADataFile } from './TOTADataFile'
import { TOTAActivityOptions } from './TOTAActivityOptions'
import { TOTALoggingControl } from './TOTALoggingControl'
import { TOTAPostSelfSpot } from './TOTAPostSelfSpot'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook('spots', { hook: SpotsHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerTOTADataFile()
    await dispatch(loadDataFile('tota-all-towers', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('tota-all-towers'))
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
  postSelfSpot: TOTAPostSelfSpot,
  Options: TOTAActivityOptions,
  generalHuntingType: ({ operation, settings }) => Info.huntingType,
  sampleOperations: ({ t, settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'OKR-0123', program: Info.shortName, name: t('extensions.tota.exampleRefName', 'Example Tower'), shortName: t('extensions.tota.activityOptions.exampleRefName', 'Example Tower'), label: `${Info.shortName} OKR-0123: ${t('extensions.tota.exampleRefName', 'Example Tower')}`, shortLabel: `${Info.shortName} OKR-0123` }] }
    ]
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'TOTA Cluster',
  fetchSpots: async ({ online, settings, dispatch, t }) => {
    if (GLOBAL?.flags?.services?.tota === false) return []

    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiTOTA.endpoints.spots.initiate({}, { forceRefetch: true }))
      await Promise.all(dispatch(apiTOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiTOTA.endpoints.spots.select({})(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data?.spots || []
    }

    const today = new Date()
    const qsos = []
    for (const spot of spots) {
      if (!spot) continue
      const spotTime = Date.parse(spot.time_utc)
      if ((today - spotTime) > 1000 * 60 * 60) {
        continue // Some spots can be several hours old: cut off at 1 hour
      }
      const refDetails = await totaFindOneByReference(spot.tower_ref)
      const qso = {
        their: { call: spot.callsign?.toUpperCase() },
        freq: spot.frequency,
        band: spot.frequency ? bandForFrequency(spot.frequency) : 'other',
        mode: spot.mode?.toUpperCase(),
        refs: [{
          ref: spot.tower_ref,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: spotTime,
          source: Info.key,
          icon: Info.icon,
          label: `${spot.tower_ref}: ${refDetails?.name ?? t('extensions.tota.unknownRefName', 'Unknown Tower')}`,
          type: spot.comment?.match?.(/QRT/i) ? 'QRT' : undefined,
          sourceInfo: {
            comments: spot.comment,
            spotter: spot.spotter?.toUpperCase()
          }
        }
      }
      qsos.push(qso)
    }
    const dedupedQSOs = []
    const includedCalls = {}
    for (const qso of qsos) {
      if (!includedCalls[qso.their.call]) {
        includedCalls[qso.their.call] = true
        if (qso.spot.type !== 'QRT') dedupedQSOs.push(qso)
      }
    }
    return dedupedQSOs
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
  InputComponent: TOTALoggingControl,
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
  InputComponent: TOTALoggingControl,
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
    if (ref.ref) {
      const reference = await totaFindOneByReference(ref.ref)
      if (reference) {
        return {
          ...ref,
          name: reference.name,
          grid: reference.grid,
          accuracy: LOCATION_ACCURACY.REASONABLE,
          label: `${Info.shortName} ${ref.ref}: ${reference.name}`,
          shortLabel: `${Info.shortName} ${ref.ref}`,
          program: Info.shortName
        }
      } else {
        return { ...ref, name: GLOBAL?.t?.('extensions.tota.unknownRefName', Info.unknownReferenceName) ?? Info.unknownReferenceName, program: Info.shortName }
      }
    }
  },

  extractTemplate: ({ ref, operation }) => {
    return { type: ref.type }
  },

  updateFromTemplateWithDispatch: ({ ref, operation }) => async (dispatch) => {
    if (operation?.grid) {
      let info = parseCallsign(operation.stationCall || '')
      info = annotateFromCountryFile(info)
      const [lat, lon] = gridToLocation(operation.grid)

      let nearby = await totaFindAllByLocation(lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: GLOBAL?.t?.('extensions.tota.noRefsNearby', 'No towers nearby!') ?? 'No towers nearby!' }
    } else {
      return { type: ref.type }
    }
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === Info.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info.activationType && ref?.ref) {
      return [{
        format: 'adif',
        exportData: { refs: [ref] }, // exports only see this one ref
        nameTemplate: '{{>RefActivityName}}',
        titleTemplate: '{{>RefActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SIG: 'TOTA' }, { MY_SIG_INFO: activationRef.ref })
    if (huntingRef) fields.push({ SIG: 'TOTA' }, { SIG_INFO: huntingRef.ref })

    return fields
  },

  scoringForQSO: generateActivityScorer({ info: Info }),
  accumulateScoreForOperation: generateActivityOperationAccumulator({ info: Info }),
  summarizeScore: generateActivitySumarizer({ info: Info }),
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './WWFFInfo'
import { registerWWFFDataFile, wwffFindAllByLocation, wwffFindOneByReference } from './WWFFDataFile'
import { WWFFActivityOptions } from './WWFFActivityOptions'
import { WWFFLoggingControl } from './WWFFLoggingControl'
import { WWFFPostSelfSpot } from './WWFFPostSelfSpot'
import { apiGMA } from '../../../store/apis/apiGMA'
import { LOCATION_ACCURACY } from '../../constants'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { distanceOnEarth } from '../../../tools/geoTools'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook('spots', { hook: SpotsHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerWWFFDataFile()
    await dispatch(loadDataFile('wwff-all-parks', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('wwff-all-parks'))
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
  postSelfSpot: WWFFPostSelfSpot,
  Options: WWFFActivityOptions,

  generalHuntingType: ({ operation, settings }) => Info.huntingType,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'XXWW-1234', name: 'Example National Park', shortName: 'Example NP', program: Info.shortName, label: `${Info.shortName} XXWW-1234: Example NationalPark`, shortLabel: `${Info.shortName} XXWW-1234` }] }
    ]
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'WWFFwatch',
  fetchSpots: async ({ online, settings, dispatch }) => {
    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiGMA.endpoints.spots.initiate('wwff', { forceRefetch: true }))
      await Promise.all(dispatch(apiGMA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiGMA.endpoints.spots.select('wwff')(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []
    }
    const qsos = spots.map(spot => {
      const qso = {
        their: { call: spot.ACTIVATOR },
        freq: spot.frequency,
        band: spot.band,
        mode: spot.mode,
        refs: [{
          ref: spot.REF,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: spot.timeInMillis,
          source: Info.key,
          icon: Info.icon,
          label: `${spot.REF}: ${spot.NAME}`,
          sourceInfo: {
            comments: spot.TEXT,
            spotter: spot.SPOTTER
          }
        }
      }
      return qso
    })
    const dedupedQSOs = []
    const includedCalls = {}
    for (const qso of qsos) {
      if (!includedCalls[qso.their.call]) {
        includedCalls[qso.their.call] = true
        dedupedQSOs.push(qso)
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
  InputComponent: WWFFLoggingControl,
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
  InputComponent: WWFFLoggingControl,
  optionType: 'mandatory'
}

const ReferenceHandler = {
  ...Info,

  shortDescription: (operation) => refsToString(operation, Info.activationType),

  description: (operation) => {
    const ref = findRef(operation, Info.activationType)
    return [ref.ref, ref.name].filter(x => x).join(' • ')
  },

  iconForQSO: Info.icon,

  decorateRefWithDispatch: (ref) => async () => {
    if (ref.ref) {
      const data = await wwffFindOneByReference(ref.ref)
      if (data) {
        return {
          ...ref,
          name: data.name,
          location: data.region,
          grid: data.grid,
          accuracy: LOCATION_ACCURACY.REASONABLE,
          label: `${Info.shortName} ${ref.ref}: ${data.name}`,
          shortLabel: `${Info.shortName} ${ref.ref}`,
          program: Info.shortName
        }
      } else {
        return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference' }
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

      let nearby = await wwffFindAllByLocation(info.dxccCode, lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: 'No parks nearby!' }
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
        // Note that compact format uses a space instead of - because of WWFF requirements
        nameTemplate: '{{log.station}}@{{log.ref}} {{compact op.date}}',
        titleTemplate: '{{>RefActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation, exportType }) => {
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SIG: 'WWFF' }, { MY_SIG_INFO: activationRef.ref }, { MY_WWFF_REF: activationRef.ref })
    if (huntingRef) fields.push({ SIG: 'WWFF' }, { SIG_INFO: huntingRef.ref }, { WWFF_REF: huntingRef.ref })

    if (exportType === 'wwff') {
      // Delete POTA references, since some WWFF admins will reject logs that include them.
      fields.push({ POTA_REF: false }, { MY_POTA_REF: false })
      if (!huntingRef) fields.push({ SIG: false }, { SIG_INFO: false })
    }
    return fields
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { band, mode, uuid, startAtMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)

    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    if (refs.length === 0 && !ref?.ref) return { value: 0 } // If not activating, only counts if other QSO has a WWFF ref

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    if (nearDupes.length === 0) {
      return { value: 1, type: Info.activationType }
    } else {
      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => q.mode === mode).length !== 0
      const sameDay = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameMode && sameDay && (sameRefs || refs.length === 0)) {
        return { value: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef') // only if at new ref
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { value: 1, notices, type: Info.activationType }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    if (!ref?.ref) return score // No scoring if not activating
    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: Info.shortName,
      value: 0,
      summary: ''
    }

    score.value = score.value + qsoScore.value
    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    score.activated = score.value >= 44
    if (score.activated) {
      score.summary = '✓'
    } else {
      score.summary = `${score.value}/44`
    }

    return score
  }
}

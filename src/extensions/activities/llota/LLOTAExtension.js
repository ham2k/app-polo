/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, mergeRefs, refsToString } from '../../../tools/refTools'

import { Info } from './LLOTAInfo'
import { LLOTAActivityOptions } from './LLOTAActivityOptions'
import { llotaFindByReference, llotaFindByLocation, registerLLOTAAllRefsData } from './LLOTAAllRefsData'
import { LLOTALoggingControl } from './LLOTALoggingControl'

import { LLOTAPostOtherSpot } from './LLOTAPostOtherSpot'
import { LLOTAPostSelfSpot } from './LLOTAPostSelfSpot'
import { apiLLOTA } from '../../../store/apis/apiLLOTA'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import { LOCATION_ACCURACY } from '../../constants'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { distanceOnEarth } from '../../../tools/geoTools'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import GLOBAL from '../../../GLOBAL'
import { filterNearDupes, filterQSOsWithSectionRefs } from '../../../tools/qsonTools'
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

  MainExchangePanel: null,
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

  generalHuntingType: ({ operation, settings }) => Info.huntingType,

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
        const args = { call: spot.their.call, ref: spotRef.ref }
        const spotCommentPromise = await dispatch(apiLLOTA.endpoints.spotComments.initiate(args))
        await Promise.all(dispatch(apiLLOTA.util.getRunningQueriesThunk()))
        const spotCommentResults = await dispatch((_dispatch, getState) => apiLLOTA.endpoints.spotComments.select(args)(getState()))
        spotCommentPromise.unsubscribe && spotCommentPromise.unsubscribe()
        const spotComments = spotCommentResults.data || []

        const filteredSpotComment = spotComments.find(x =>
          x.source.startsWith('Ham2K Portable Logger') &&
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
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
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
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
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

  suggestOperationTitle: (ref) => {
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
  summarizeScore: generateActivitySumarizer({ info: Info }),

  originalScoringForQSO: ({ qso, qsos, operation, ref: scoredRef }) => {
    const { band, mode, uuid, startAtMillis } = qso

    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const refCount = refs.length
    let value
    let type
    if (scoredRef?.ref) {
      type = Info.activationType
      value = refCount || 1
    } else {
      type = Info.huntingType
      value = refCount
    }

    if (value === 0) return { value: 0 } // If not activating, only counts if other QSO has a LLOTA ref

    const nearDupes = filterNearDupes({ qso, qsos, operation, withSectionRefs: [scoredRef] })
    if (DEBUG) console.log('-- nearDupes', qso.uuid, qso.key, nearDupes)

    if (nearDupes.length === 0) {
      if (DEBUG) console.log('-- no dupes', { value, refCount, type })
      return { value, refCount, type }
    } else {
      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameDayDupes = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day)

      const sameDay = sameDayDupes.length !== 0
      const sameBand = sameDayDupes.filter(q => q.band === band).length !== 0
      const sameMode = sameDayDupes.filter(q => q.mode === mode).length !== 0
      const sameBandMode = sameDayDupes.filter(q => q.band === band && q.mode === mode).length !== 0
      const sameRefs = sameDayDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      const dupesHadRefs = sameDayDupes.filter(q => filterRefs(q, Info.huntingType).length !== 0).length !== 0

      if (DEBUG) console.log('-- ', { sameDayDupes, sameDay, sameBand, sameMode, sameBandMode, sameRefs })

      if (sameBandMode && sameDay && (sameRefs || refs.length === 0)) {
        if (DEBUG) console.log('-- duplicate', qso.uuid, { sameDayDupes, sameDay, sameBand, sameMode, sameBandMode, sameRefs })
        if (refs.length === 0 && dupesHadRefs && !qso.uuid) return { value: 0, refCount, notices: ['maybeDupe'], type }
        return { value: 0, refCount, alerts: ['duplicate'], type }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef') // only if at new ref
        if (!sameDay) notices.push('newDay')
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        if (DEBUG) console.log('-- near duplicate', { sameDayDupes, sameDay, sameBand, sameMode, sameBandMode, sameRefs })
        return { value, refCount, notices, type }
      }
    }
  },

  originalAccumulateScoreForDay: ({ qsoScore, score, operation, ref }) => {
    if (!ref?.ref) return score // No scoring if not activating
    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: Info.shortName,
      value: 0,
      refCount: 0,
      extraRefs: 0,
      refs: {},
      primaryRef: undefined,
      for: 'day'
    }

    if (!score.refs[ref.ref]) { // Track how many references we're activating
      score.refs[ref.ref] = 1
      score.primaryRef = score.primaryRef || ref.ref
    } else {
      score.refs[ref.ref] += 1
    }

    if (score.primaryRef === ref.ref) { // Only do scoring for the primary ref
      score.value = score.value + qsoScore.value
      score.refCount = score.refCount + qsoScore.refCount
      if (qsoScore.refCount > 1) score.extraRefs = score.extraRefs + qsoScore.refCount - 1
    }

    return score
  },

  originalSummarizeScore: ({ score, operation, ref, section }) => {
    score.activated = score.value >= 10

    if (score.activated) {
      score.summary = '✓'
    } else {
      score.summary = `${score.value}/10`
    }

    if (score.refCount > 0) {
      const label = score.primaryRef ? 'P2P' : 'P'
      if (score.extraRefs > 0) {
        score.summary = [score.summary, `${score.refCount - score.extraRefs}+${score.extraRefs} ${label}`].filter(x => x).join(' • ')
      } else {
        score.summary = [score.summary, `${score.refCount} ${label}`].filter(x => x).join(' • ')
      }
    }
    score.longSummary = [score.summary, `${score.value} Contacts`].filter(x => x).join(' • ')

    return score
  }
}


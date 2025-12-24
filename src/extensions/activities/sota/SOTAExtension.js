/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Alert } from 'react-native'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'

import GLOBAL from '../../../GLOBAL'

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { findRef, refsToString } from '../../../tools/refTools'
import { apiSOTA } from '../../../store/apis/apiSOTA'
import { LOCATION_ACCURACY } from '../../constants'
import { distanceOnEarth } from '../../../tools/geoTools'

import { SOTAActivityOptions } from './SOTAActivityOptions'
import { registerSOTADataFile, sotaFindAllByLocation, sotaFindOneByReference } from './SOTADataFile'
import { Info } from './SOTAInfo'
import { SOTALoggingControl } from './SOTALoggingControl'
import { SOTAAccountSetting } from './SOTAAccount'
import { SOTAPostSelfSpot } from './SOTAPostSelfSpot'
import { SOTAPostOtherSpot } from './SOTAPostOtherSpot'
import { filterNearDupes } from '../../../tools/qsonTools'
import { generateActivityDailyAccumulator, generateActivityScorer, generateActivitySumarizer } from '../../shared/activityScoring'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook('spots', { hook: SpotsHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })
    registerHook('export', { hook: ReferenceHandler })
    registerHook('setting', {
      hook: {
        key: 'sota-account',
        category: 'account',
        SettingItem: SOTAAccountSetting
      }
    })

    registerSOTADataFile()
    await dispatch(loadDataFile('sota-all-summits', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('sota-all-summits'))
  }
}
export default Extension

let lastAuthenticationCheck

const ActivityHook = {
  ...Info,

  standardExchangeFields: ({ vfo }) => ({
    // Enable grid for the 2026 SOTA Challenge (https://reflector.sota.org.uk/t/2026-sota-challenge-part-1/39799)
    grid: (vfo?.band === '2m' || vfo?.band === '70cm') && (vfo?.mode === 'CW' || vfo?.mode === 'SSB' || vfo?.mode === 'USB')
  }),

  MainExchangePanel: null,

  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },

  postOtherSpot: SOTAPostOtherSpot,
  postSelfSpot: SOTAPostSelfSpot,
  isOtherSpotEnabled: ({ settings, operation }) => {
    const enabled = !!settings?.accounts?.sota?.idToken
    const now = new Date().getTime()
    if (!enabled && (!lastAuthenticationCheck || (now - lastAuthenticationCheck > 1000 * 60 * 30))) {
      Alert.alert(
        GLOBAL?.t?.('extensions.sota.notLoggedInAlertTitle', 'Warning') || 'Warning',
        GLOBAL?.t?.('extensions.sota.notLoggedInAlertText', 'Not logged into SOTAWatch for spotting. Please go to PoLo settings') || 'Not logged into SOTAWatch for spotting. Please go to PoLo settings'
      )
      lastAuthenticationCheck = now
    }
    return enabled
  },
  isSelfSpotEnabled: ({ settings, operation }) => {
    const enabled = !!settings?.accounts?.sota?.idToken
    const now = new Date().getTime()
    if (!enabled && (!lastAuthenticationCheck || (now - lastAuthenticationCheck > 1000 * 60 * 30))) {
      Alert.alert(
        GLOBAL?.t?.('extensions.sota.notLoggedInAlertTitle', 'Warning') || 'Warning',
        GLOBAL?.t?.('extensions.sota.notLoggedInAlertText', 'Not logged into SOTAWatch for self-spotting. Please go to PoLo settings') || 'Not logged into SOTAWatch for self-spotting. Please go to PoLo settings'
      )
      lastAuthenticationCheck = now
    }
    return enabled
  },

  Options: SOTAActivityOptions,

  generalHuntingType: ({ operation, settings }) => Info.huntingType,

  sampleOperations: ({ t, settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'A/BC-1234', name: t('extensions.sota.exampleRefName', 'Example Summit'), shortName: t('extensions.sota.activityOptions.exampleSummit', 'Example Summit'), program: Info.shortName, label: `${Info.shortName} A/BC-1234: Example Summit`, shortLabel: `${Info.shortName} A/BC-1234` }] },
      // Hunting in a different operation
      { refs: [{}], qsos: [{ refs: [{ type: Info.huntingType, ref: 'A/BC-1234', name: t('extensions.sota.exampleRefName', 'Example Summit'), shortName: t('extensions.sota.activityOptions.exampleSummit', 'Example Summit'), program: Info.shortName, label: `${Info.shortName} A/BC-1234: Example Summit`, shortLabel: `${Info.shortName} A/BC-1234` }] }] }
    ]
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'SOTAWatch',
  fetchSpots: async ({ online, settings, dispatch }) => {
    if (GLOBAL?.flags?.services?.sota === false) return []

    let spots = []
    if (online) {
      const apiEpochPromise = await dispatch(apiSOTA.endpoints.epoch.initiate({}, { forceRefetch: true }))
      await Promise.all(dispatch(apiSOTA.util.getRunningQueriesThunk()))
      const apiEpochResults = await dispatch((_dispatch, getState) => apiSOTA.endpoints.epoch.select({})(getState()))

      apiEpochPromise.unsubscribe && apiEpochPromise.unsubscribe()
      const epoch = apiEpochResults.data

      // If epoch not changed, will returned cached result
      const apiPromise = await dispatch(apiSOTA.endpoints.spots.initiate({ limit: -1, epoch })) // -1 == 1hour
      await Promise.all(dispatch(apiSOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiSOTA.endpoints.spots.select({ limit: -1, epoch })(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []

      // null out any old caches to reduce memory
      const caches = await dispatch((_dispatch, getState) => apiSOTA.util.selectCachedArgsForQuery(getState(), 'spots'))
      caches.filter(x => x?.epoch !== epoch).forEach(x => dispatch(apiSOTA.util.updateQueryData('spots', x, () => null)))
    }

    // Dedupe first so QRT spots take precedence and filtered out
    // Spots already provided sorted reverse by time/id of spot i.e. most recent first
    const dedupedSpots = []
    const includedCalls = {}
    for (const spot of spots) {
      if (!includedCalls[spot.activatorCallsign]) {
        includedCalls[spot.activatorCallsign] = true
        dedupedSpots.push(spot)
      }
    }

    const qsos = dedupedSpots.filter(x => (x?.type || 'NORMAL') === 'NORMAL').map(spot => {
      const qso = {
        their: { call: spot.activatorCallsign },
        freq: spot.frequency * 1000,
        band: spot.frequency ? bandForFrequency(spot.frequency * 1000) : 'other',
        mode: spot.mode.toUpperCase(),
        refs: [{
          ref: spot.summitCode,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: Date.parse(spot.timeStamp),
          source: Info.key,
          icon: Info.icon,
          label: `${spot.points ? String.fromCodePoint(10121 + spot.points) : ''} ${spot.summitCode}: ${spot.summitName}`,
          sourceInfo: {
            id: spot.id,
            comments: spot.comments,
            spotter: spot.callsign
          }
        }
      }
      return qso
    })

    return qsos
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
  InputComponent: SOTALoggingControl,
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
  InputComponent: SOTALoggingControl,
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
      const data = await sotaFindOneByReference(ref.ref)
      if (data) {
        return {
          ...ref,
          name: data.name,
          location: data.region,
          grid: data.grid,
          accuracy: LOCATION_ACCURACY.ACCURATE,
          label: `${Info.shortName} ${ref.ref}: ${data.name}`,
          shortLabel: `${Info.shortName} ${ref.ref}`,
          program: Info.shortName
        }
      } else {
        return { ...ref, name: GLOBAL?.t?.('extensions.sota.unknownRefName', Info.unknownReferenceName ?? 'Unknown reference') ?? Info.unknownReferenceName }
      }
    }
  },

  extractTemplate: ({ ref, operation }) => {
    return { type: ref.type }
  },

  updateFromTemplateWithDispatch: ({ t, ref, operation }) => async (dispatch) => {
    if (operation?.grid) {
      let info = parseCallsign(operation.stationCall || '')
      info = annotateFromCountryFile(info)
      const [lat, lon] = gridToLocation(operation.grid)

      let nearby = await sotaFindAllByLocation(info.dxccCode, lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: t('extensions.sota.noRefsNearby', 'No summits nearby!') }
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

  suggestExportOptions: ({ operation, qsos, ref, settings }) => {
    if (ref?.type === Info.activationType && ref?.ref) {
      return [{
        format: 'adif',
        exportType: `${Info.key}-activator`,
        exportName: 'SOTA Activation',
        exportData: { refs: [ref] }, // exports only see this one ref
        nameTemplate: '{{>RefActivityName}}',
        titleTemplate: '{{>RefActivityTitle}}'
      }]
    } else { // "export" hook
      const hasSOTA = qsos?.find(q => findRef(q, Info.huntingType) && !q.deleted)
      const isSOTAActivation = findRef(operation, Info.activationType)
      if (!hasSOTA || isSOTAActivation) return null
      return [{
        format: 'adif',
        exportType: `${Info.key}-hunter`,
        exportName: 'SOTA Hunter',
        templateData: { handlerShortName: 'SOTA Hunted', handlerName: 'SOTA Hunted', includeTime: true },
        nameTemplate: '{{>OtherActivityName}}',
        titleTemplate: '{{>OtherActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation, common, exportType }) => {
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)

    if (!activationRef && !huntingRef) return false

    const fields = []

    if (activationRef) {
      fields.push({ MY_SOTA_REF: activationRef.ref })
      fields.push({ GRIDSQUARE: (qso.their?.grid ?? qso.their?.guess?.grid) })
      fields.push({ MY_GRIDSQUARE: (qso?.our?.grid ?? common.grid) })
    }

    if (huntingRef) fields.push({ SOTA_REF: huntingRef.ref })

    // For the 2026 SOTA Challenge, they ask for POTA and WWFF refs as a way to determine location
    const potaRefs = filterRefs(qso, 'pota')
    if (potaRefs.length > 0) fields.push({ POTA_REF: potaRefs.map(ref => ref.ref).filter(x => x).join(',') })
    const wwffRefs = filterRefs(qso, 'wwff')
    if (wwffRefs.length > 0) fields.push({ WWFF_REF: wwffRefs.map(ref => ref.ref).filter(x => x).join(',') })

    // SOTA does not save signal reports, so most operators like to include this in the comments
    // Also, SOTA does not process the NOTES field, so we include our notes and signal reports in the COMMENT field
    // fields.push({ COMMENT: [`s${qso.our.sent} r${qso.their.sent}`, qso.notes, qso.comments].filter(x => x).join(' - ') })

    return fields
  },

  scoringForQSO: generateActivityScorer({ info: Info }),
  accumulateScoreForDay: generateActivityDailyAccumulator({ info: Info }),
  summarizeScore: generateActivitySumarizer({ info: Info }),

  originalScoringForQSO: ({ qso, qsos, operation, ref: scoredRef }) => {
    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const { uuid, startAtMillis } = qso
    const theirRef = findRef(qso, Info.huntingType)
    const refCount = theirRef ? 1 : 0
    const points = refCount

    if (!theirRef && !scoredRef?.ref) return { value: 0 } // If not activating, only counts if other QSO has a SOTA ref

    const nearDupes = filterNearDupes({ qso, qsos, operation, withSectionRefs: [scoredRef] })

    if (nearDupes.length === 0) {
      return { value: 1, refCount, refs: [theirRef], points, type: Info.activationType }
    } else if (points > 0) {
      // Contacts with the same station don't count for the 4 QSOs needed to activate the summit
      // But might count for hunter points if they are for a new summit or day

      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameRefs = nearDupes.filter(q => findRef(q, Info.huntingType)?.ref === theirRef.ref).length !== 0
      const sameDay = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
      if (sameDay && sameRefs) {
        return { value: 0, refCount, refs: [theirRef], points: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (!sameRefs) notices.push('newRef')
        if (!sameDay) notices.push('newDay')

        return { value: 0, refCount, refs: [theirRef], points, notices, type: Info.activationType }
      }
    } else {
      return { value: 0, refCount, refs: [theirRef], points: 0, alerts: ['duplicate'], type: Info.activationType }
    }
  },

  originalAccumulateScoreForDay: ({ qsoScore, score, operation, ref }) => {
    if (!ref?.ref) return score // No scoring if not activating
    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: Info.shortName,
      summary: '',
      value: 0,
      refCount: 0,
      for: 'day'
    }

    score.value = score.value + qsoScore.value
    score.refCount = score.refCount + qsoScore.refCount

    return score
  },

  originalSummarizeScore: ({ score, operation, ref, section }) => {
    score.activated = score.value >= 4

    if (score.activated) {
      score.summary = '✓'
    } else {
      score.summary = `${score.value}/4`
    }

    if (score.refCount > 0) {
      const label = ref?.ref ? 'S2S' : 'S'
      score.summary = [score.summary, `${score.refCount} ${label}`].filter(x => x).join(' • ')
    }

    return score
  }
}

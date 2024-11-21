/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { findRef, refsToString } from '../../../tools/refTools'

import { SOTAActivityOptions } from './SOTAActivityOptions'
import { registerSOTADataFile, sotaFindOneByReference } from './SOTADataFile'
import { Info } from './SOTAInfo'
import { SOTALoggingControl } from './SOTALoggingControl'
import { SOTAAccountSetting } from './SOTAAccount'
import { SOTAPostSpot } from './SOTAPostSpot'
import { apiSOTA } from '../../../store/apis/apiSOTA'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import { LOCATION_ACCURACY } from '../../constants'

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

  postSpot: SOTAPostSpot,
  isSpotEnabled: ({ operation, settings }) => {
    return !!settings?.accounts?.sota?.idToken
  },

  Options: SOTAActivityOptions,

  generalHuntingType: ({ operation, settings }) => Info.huntingType
}

const SpotsHook = {
  ...Info,
  sourceName: 'SOTAWatch',
  fetchSpots: async ({ online, settings, dispatch }) => {
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

    const qsos = dedupedSpots.filter(x => (x?.type ?? 'NORMAL') === 'NORMAL').map(spot => {
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
          label: `SOTA ${spot.summitCode}: ${spot.summitName}`,
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
          label: `${Info.shortName} ${ref.ref}: ${data.name}`
        }
      } else {
        return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference' }
      }
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
      console.log('SOTA Activator')
      return [{
        format: 'adif',
        exportType: `${Info.key}-activator`,
        exportData: { refs: [ref] },
        nameTemplate: settings.useCompactFileNames ? '{call}@{ref}-{compactDate}' : '{date} {call} at {ref}',
        titleTemplate: `{call}: ${Info.shortName} at ${[ref.ref, ref.name].filter(x => x).join(' - ')} on {date}`
      }]
    } else { // "export" hook
      const hasSOTA = qsos?.find(q => findRef(q, Info.huntingType))
      const isSOTAActivation = findRef(operation, Info.activationType)
      if (!hasSOTA || isSOTAActivation) return null
      console.log('SOTA Hunter')
      return [{
        format: 'adif',
        exportType: `${Info.key}-hunter`,
        templateData: { modifier: 'SOTA Hunted', modifierDashed: 'sota-hunted' },
        nameTemplate: settings.useCompactFileNames ? '{call}@{modifierDashed}-{titleDashed}-{compactDate}' : '{date} {call} {modifier} {title}',
        titleTemplate: `{call}: ${Info.shortName} at ${[ref.ref, ref.name].filter(x => x).join(' - ')} on {date}`,
        exportTitle: 'SOTA Hunted'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation, exportType }) => {
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)

    if (!activationRef && !huntingRef) return false

    const fields = []
    if (activationRef) fields.push({ MY_SOTA_REF: activationRef.ref })
    if (huntingRef) fields.push({ SOTA_REF: huntingRef.ref })
    // SOTA does not save signal reports, so most operators like to include this in the comments
    // Also, SOTA does not process the NOTES field, so we include our notes and signal reports in the COMMENT field
    fields.push({ COMMENT: [`s${qso.our.sent} r${qso.their.sent}`, qso.notes, qso.comments].filter(x => x).join(' - ') })

    return fields
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const { key, startAtMillis } = qso
    const theirRef = findRef(qso, Info.huntingType)
    const refCount = theirRef ? 1 : 0
    const points = refCount

    if (!theirRef && !ref?.ref) return { value: 0 } // If not activating, only counts if other QSO has a SOTA ref

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length === 0) {
      return { value: 1, refCount, points, type: Info.activationType }
    } else if (points > 0) {
      // Contacts with the same station don't count for the 4 QSOs needed to activate the summit
      // But might count for hunter points if they are for a new summit or day

      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameRefs = nearDupes.filter(q => findRef(q, Info.huntingType)?.ref === theirRef.ref).length !== 0
      const sameDay = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
      if (sameDay && sameRefs) {
        return { value: 0, refCount, points: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (!sameRefs) notices.push('newRef')
        if (!sameDay) notices.push('newDay')

        return { value: 0, refCount, points, notices, type: Info.activationType }
      }
    } else {
      return { value: 0, refCount, points: 0, alerts: ['duplicate'], type: Info.activationType }
    }
  },

  accumulateScoreForDay: ({ qsoScore, score, operation, ref }) => {
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

  summarizeScore: ({ score, operation, ref, section }) => {
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

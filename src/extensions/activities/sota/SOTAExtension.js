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
import { apiSOTA } from '../../../store/apiSOTA'
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
  sourceName: 'SOTAWatch',
  fetchSpots: async ({ online, settings, dispatch }) => {
    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiSOTA.endpoints.spots.initiate({ limit: 50 }, { forceRefetch: true }))
      await Promise.all(dispatch(apiSOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiSOTA.endpoints.spots.select({ limit: 50 })(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []
    }
    const qsos = spots.map(spot => {
      const freqInMHz = Math.round(Number.parseFloat(spot.frequency, 10) * 1000)
      const qso = {
        their: { call: spot.activatorCallsign },
        freq: freqInMHz,
        band: freqInMHz ? bandForFrequency(freqInMHz) : spot.band,
        mode: spot.mode.toUpperCase(),
        refs: [{
          ref: `${spot.associationCode}/${spot.summitCode}`,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: Date.parse(spot.timeStamp + 'Z'),
          source: Info.key,
          icon: Info.icon,
          label: `SOTA ${spot.associationCode}/${spot.summitCode}: ${spot.summitDetails}`,
          sourceInfo: {
            id: spot.id,
            comments: spot.comments,
            spotter: spot.callsign
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
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SOTA_REF: activationRef.ref })
    if (huntingRef) fields.push({ SOTA_REF: huntingRef.ref })

    return fields
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    if (!ref.ref) return {}

    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const { key, startOnMillis } = qso
    const theirRef = findRef(qso, Info.huntingType)
    const refCount = theirRef ? 1 : 0
    const points = refCount

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startOnMillis ? q.startOnMillis < startOnMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length === 0) {
      return { value: 1, refCount, points, type: Info.activationType }
    } else if (points > 0) {
      // Contacts with the same station don't count for the 4 QSOs needed to activate the summit
      // But might count for hunter points if they are for a new summit or day

      const thisQSOTime = qso.startOnMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameRefs = nearDupes.filter(q => findRef(q, Info.huntingType)?.ref === theirRef.ref)
      const sameDay = nearDupes.filter(q => (q.startOnMillis - (q.startOnMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
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
      refCount: 0
    }

    score.value = score.value + qsoScore.value
    score.refCount = score.refCount + qsoScore.refCount

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

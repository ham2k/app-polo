/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './ZLOTAInfo'
import { ZLOTAActivityOptions } from './ZLOTAActivityOptions'
import { zlotaFindOneByReference, registerZLOTADataFile, zlotaFindAllByLocation } from './ZLOTADataFile'
import { ZLOTALoggingControl } from './ZLOTALoggingControl'
import { ZLOTAPostSelfSpot } from './ZLOTAPostSelfSpot'
import { ZLOTAPostOtherSpot } from './ZLOTAPostOtherSpot'
import { ZLOTAAccountSetting } from './ZLOTAAccount'
import { apiZLOTA } from '../../../store/apis/apiZLOTA'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import { LOCATION_ACCURACY } from '../../constants'
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
    registerHook('setting', {
      hook: {
        key: 'zlota-account',
        category: 'account',
        SettingItem: ZLOTAAccountSetting
      }
    })

    registerZLOTADataFile()
    await dispatch(loadDataFile('zlota-all-references', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('zlota-all-references'))
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
  postSelfSpot: ZLOTAPostSelfSpot,
  postOtherSpot: ZLOTAPostOtherSpot,
  isOtherSpotEnabled: ({ settings, operation }) => {
    const enabled = !!settings?.accounts?.zlota?.pin
    return enabled
  },
  isSelfSpotEnabled: ({ settings, operation }) => {
    const enabled = !!settings?.accounts?.zlota?.pin
    return enabled
  },

  Options: ZLOTAActivityOptions,

  generalHuntingType: ({ operation, settings }) => Info.huntingType,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'ZLH/XX-123', name: 'Example Hut', shortName: 'Example Hut', program: 'ZLOTA', label: 'ZLOTA ZLH/XX-123: Example Reference', shortLabel: 'ZLOTA ZLH/XX-123' }] }
    ]
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'ZLOTA',
  fetchSpots: async ({ online, settings, dispatch }) => {
    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiZLOTA.endpoints.spots.initiate({}, { forceRefetch: true }))
      await Promise.all(dispatch(apiZLOTA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiZLOTA.endpoints.spots.select({})(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []
    }
    spots.reverse() // Newest to oldest
    const qsos = []
    const qsoIds = {}
    for (const spot of spots) {
      const reference = {
        ref: spot.reference,
        type: Info.huntingType
      }
      if (qsoIds[spot.id]) {
        qsoIds[spot.id].refs.push(reference)
        qsoIds[spot.id].spot.label = qsoIds[spot.id].refs.map(ref => ref.ref).join(' ')
      } else {
        const spotTime = Date.parse(spot.referenced_time)
        const freq = parseFloat(spot.frequency)
        const qso = {
          their: { call: spot.activator.toUpperCase().trim() },
          freq,
          band: freq ? bandForFrequency(freq) : 'other',
          mode: spot.mode?.toUpperCase() || (freq ? modeForFrequency(freq, { ituRegion: 3, countryCode: 'NZ', entityPrefix: 'ZL' }) : 'SSB'),
          refs: [reference],
          spot: {
            timeInMillis: spotTime,
            source: Info.key,
            icon: Info.icon,
            label: `${reference.ref}: ${spot?.name ?? 'Unknown Reference'}`,
            sourceInfo: {
              comments: spot.comments,
              spotter: spot.spotter.toUpperCase().trim()
            }
          }
        }
        qsos.push(qso)
        qsoIds[spot.id] = qso
      }
    }

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
  InputComponent: ZLOTALoggingControl,
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
  InputComponent: ZLOTALoggingControl,
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
    if (!ref?.ref || !ref.ref.match(Info.referenceRegex)) return { ...ref, ref: '', name: '', location: '' }

    const data = await zlotaFindOneByReference(ref.ref)

    let result
    if (data?.name) {
      result = {
        ...ref,
        name: data.name,
        assetType: data.assetType,
        grid: data.grid,
        accuracy: LOCATION_ACCURACY.ACCURATE,
        label: `${ref.ref}: ${data.name}`,
        shortLabel: `${ref.ref}`
      }
    } else {
      return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference', assetType: ASSET_TYPE_MAP[ref.ref[2]] }
    }
    return result
  },

  extractTemplate: ({ ref, operation }) => {
    return { type: ref.type }
  },

  updateFromTemplateWithDispatch: ({ ref, operation }) => async (dispatch) => {
    if (operation?.grid) {
      const [lat, lon] = gridToLocation(operation.grid)

      let nearby = await zlotaFindAllByLocation(lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: 'No references nearby!' }
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
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SIG: 'ZLOTA' }, { MY_SIG_INFO: activationRef.ref })
    if (huntingRefs.length > 0) fields.push({ SIG: 'ZLOTA' }, { SIG_INFO: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') })
    return fields
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationADIF = []
    if (activationRef) {
      activationADIF = [
        { MY_SIG: 'ZLOTA' }, { MY_SIG_INFO: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return [[
        ...activationADIF,
        { SIG: 'ZLOTA' }, { SIG_INFO: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') }
      ]]
    } else {
      return [activationADIF]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { uuid, startAtMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const refCount = (new Set(refs.map(x => ASSET_TYPE_MAP[x.ref[2]]).filter(x => x))).size

    if (refs.length === 0 && !ref?.ref) return { value: 0 }

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    if (nearDupes.length === 0) {
      return { value: 1, refCount, type: Info.activationType }
    } else {
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameRefs) {
        return { value: 0, refCount: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        return { value: 1, refCount, notices: ['newRef'], type: Info.activationType }
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
      refCount: 0,
      summary: '',
      refs: {},
      primaryRef: undefined
    }

    if (!score.refs[ref.ref]) { // Track how many references we're activating...
      // ...and of what type
      score.refs[ref.ref] = ref.assetType || true
      score.primaryRef = score.primaryRef || ref.ref
    }

    if (score.primaryRef !== ref.ref) return score // Only do scoring for one ref

    score.value = score.value + qsoScore.value
    score.refCount = score.refCount + qsoScore.refCount

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    const activationScore = Math.max(...Object.values(score?.refs ?? {})
      .map(assetType => ACTIVATION_SCORES[assetType] ?? 1))

    score.activated = score.value >= activationScore

    if (score.activated) {
      score.summary = '✓'
    } else {
      score.summary = `${score.value}/${activationScore}`
    }

    if (score.refCount > 0) {
      const label = score.primaryRef ? Info.shortNameDoubleContact : 'ZL'
      const multiplier = (new Set(Object.values(score.refs))).size
      const multiplierLabel = multiplier > 1 ? `x${multiplier}` : ''
      score.summary = [score.summary, `${score.refCount}${multiplierLabel} ${label}`].filter(x => x).join(' • ')
    }

    return score
  }
}

const ASSET_TYPE_MAP = {
  B: 'lighthouse',
  H: 'hut',
  I: 'island',
  L: 'lake',
  P: 'park',
  V: 'volcano'
}

const ACTIVATION_SCORES = {
  lighthouse: 4,
  hut: 1,
  island: 1,
  lake: 2,
  park: 4,
  volcano: 4
}

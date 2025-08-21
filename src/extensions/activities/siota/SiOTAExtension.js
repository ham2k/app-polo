/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './SiOTAInfo'
import { SiOTAActivityOptions } from './SiOTAActivityOptions'
import { siotaFindOneByReference, registerSiOTADataFile, siotaFindAllByLocation } from './SiOTADataFile'
import { SiOTALoggingControl } from './SiOTALoggingControl'
import { SiOTAPostSelfSpot } from './SiOTAPostSelfSpot'
import { SiOTAPostOtherSpot } from './SiOTAPostOtherSpot'
import { PnPAccountSetting } from './PnPAccount'
import { apiPnP } from '../../../store/apis/apiPnP'
import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import { LOCATION_ACCURACY } from '../../constants'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { distanceOnEarth } from '../../../tools/geoTools'
import GLOBAL from '../../../GLOBAL'

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
        key: 'pnp-account',
        category: 'account',
        SettingItem: PnPAccountSetting
      }
    })

    registerSiOTADataFile()
    await dispatch(loadDataFile('siota-all-silos', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('siota-all-silos'))
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
  postSelfSpot: SiOTAPostSelfSpot,
  postOtherSpot: SiOTAPostOtherSpot,
  isOtherSpotEnabled: ({ settings, operation }) => {
    const enabled = !!settings?.accounts?.pnp?.apiKey
    return enabled
  },
  isSelfSpotEnabled: ({ settings, operation }) => {
    const enabled = !!settings?.accounts?.pnp?.apiKey
    return enabled
  },

  Options: SiOTAActivityOptions,

  generalHuntingType: ({ operation, settings }) => Info.huntingType,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'VK-ABC123', name: 'Example Silo', shortName: 'Example Silo', program: Info.shortName, label: `${Info.shortName} VK-ABC123: Example Silo`, shortLabel: `${Info.shortName} VK-ABC123` }] }
    ]
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'PnP',
  fetchSpots: async ({ online, settings, dispatch }) => {
    if (GLOBAL?.flags?.services?.pnp === false) return []

    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiPnP.endpoints.spots.initiate({}, { forceRefetch: true }))
      await Promise.all(dispatch(apiPnP.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiPnP.endpoints.spots.select({})(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []
    }
    spots.reverse() // Newest to oldest
    const qsos = []
    for (const spot of spots) {
      if (Info.referenceRegex.test(spot.actSiteID)) {
        const spotTime = Date.parse(spot.actTime + 'Z')
        const freq = parseFloat(spot.actFreq) * 1000
        const qso = {
          their: { call: spot.actCallsign.toUpperCase().trim() },
          freq,
          band: freq ? bandForFrequency(freq) : 'other',
          mode: spot.actMode?.toUpperCase() || (freq ? modeForFrequency(freq, { ituRegion: 3, countryCode: 'AU', entityPrefix: 'VK' }) : 'SSB'),
          refs: [{
            ref: spot.actSiteID,
            type: Info.huntingType
          }],
          spot: {
            timeInMillis: spotTime,
            source: Info.key,
            icon: Info.icon,
            label: `${spot.actSiteID}: ${spot?.actLocation || 'Unknown Reference'}`,
            sourceInfo: {
              comments: spot.actComments,
              spotter: spot.actSpoter.toUpperCase().trim()
            }
          }
        }
        qsos.push(qso)
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
  InputComponent: SiOTALoggingControl,
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
  InputComponent: SiOTALoggingControl,
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

    const data = await siotaFindOneByReference(ref.ref)
    let result
    if (data?.name) {
      result = {
        ...ref,
        name: data.name,
        location: data.location,
        state: data.state,
        grid: data.grid,
        accuracy: LOCATION_ACCURACY.ACCURATE,
        label: `${Info.shortName} ${ref.ref}: ${data.name}`,
        shortLabel: `${Info.shortName} ${ref.ref}`,
        program: Info.shortName
      }
    } else {
      return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference' }
    }
    return result
  },

  extractTemplate: ({ ref, operation }) => {
    return { type: ref.type }
  },

  updateFromTemplateWithDispatch: ({ ref, operation }) => async (dispatch) => {
    if (operation?.grid) {
      let info = parseCallsign(operation.stationCall || '')
      info = annotateFromCountryFile(info)
      const [lat, lon] = gridToLocation(operation.grid)

      let nearby = await siotaFindAllByLocation(info.dxccCode, lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: 'No silos nearby!' }
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
    if (huntingRefs.length > 0) fields.push({ SIG: 'SIOTA' }, { SIG_INFO: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') })
    if (activationRef) fields.push({ MY_SIG: 'SIOTA' }, { MY_SIG_INFO: activationRef.ref })
    return fields
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationADIF = []
    if (activationRef) {
      activationADIF = [
        { MY_SIG: 'SIOTA' }, { MY_SIG_INFO: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return [[
        ...activationADIF,
        { SIG: 'SIOTA' }, { SIG_INFO: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') }
      ]]
    } else {
      return [activationADIF]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { band, mode, uuid, startAtMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const points = refs.length

    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    if (nearDupes.length === 0) {
      return { counts: 1, points, type: Info.activationType }
    } else {
      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => q.mode === mode).length !== 0
      const sameDay = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameDay && sameMode) {
        if (points > 0 && !sameRefs) { // Doesn't count towards activation, but towards Silo 2 Silo award.
          return { counts: 0, points, notices: ['newRef'], type: Info.activationType }
        }
        return { counts: 0, points: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (!sameDay) notices.push('newDay')
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { counts: 1, points, notices, type: Info.activationType }
      }
    }
  }
}

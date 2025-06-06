/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { parseCallsign } from '@ham2k/lib-callsigns'
import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'
import { LOCATION_ACCURACY } from '../../constants'

import { MOTAActivityOptions } from './MOTAActivityOptions'
import { registerMOTADataFile, motaFindOneByReference, motaFindAllByLocation } from './MOTADataFile'
import { Info } from './MOTAInfo'
import { MOTALoggingControl } from './MOTALoggingControl'
import { MOTAPostSelfSpot } from './MOTAPostSelfSpot'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { distanceOnEarth } from '../../../tools/geoTools'
import { MOTAPostOtherSpot } from './MOTAPostOtherSpot'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerMOTADataFile()
    await dispatch(loadDataFile('mota-all-mills', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('mota-all-mills'))
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
  postOtherSpot: MOTAPostOtherSpot,
  postSelfSpot: MOTAPostSelfSpot,
  Options: MOTAActivityOptions,

  generalHuntingType: ({ operation, settings }) => Info.huntingType,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'X12345', name: 'Example Mill', shortName: 'Ex. Mill', program: Info.shortName, label: `${Info.shortName} X12345: Example Mill`, shortLabel: `${Info.shortName} X12345` }] }
    ]
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
  InputComponent: MOTALoggingControl,
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
  InputComponent: MOTALoggingControl,
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
    if (ref.ref) {
      const data = await motaFindOneByReference(ref.ref)
      if (data) {
        return {
          ...ref,
          name: data.name,
          grid: data.grid,
          accuracy: LOCATION_ACCURACY.REASONABLE,
          label: `${Info.shortName} ${ref.ref}: ${data.name}`,
          shortLabel: `${Info.shortName} ${ref.ref}`,
          program: Info.shortName
        }
      } else {
        return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference', program: Info.shortName }
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

      let nearby = await motaFindAllByLocation(info.entityPrefix, lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: 'No mills nearby!' }
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
        exportType: `${Info.key}-activator`,
        exportName: 'MOTA Activation',
        exportData: { refs: [ref] }, // exports only see this one ref
        templateData: { refPrefix: 'MOTA' },
        nameTemplate: '{{>RefActivityName}}',
        titleTemplate: '{{>RefActivityTitle}}'
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SIG: 'MOTA' }, { MY_SIG_INFO: activationRef.ref })
    if (huntingRef) fields.push({ SIG: 'MOTA' }, { SIG_INFO: huntingRef.ref })

    return fields
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationFields = []
    if (activationRef) {
      activationFields = [
        { MY_SIG: 'MOTA' }, { MY_SIG_INFO: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return huntingRefs.map(huntingRef => [
        ...activationFields,
        { SIG: 'MOTA' }, { SIG_INFO: huntingRef.ref },
      ])
    } else {
      return [activationFields]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const { band, uuid, startAtMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const refCount = refs.length

    if (refs.length === 0 && !ref?.ref) return { value: 0 }

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    if (nearDupes.length === 0) {
      return { value: 1, refCount, type: Info.activationType }
    } else {
      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameDay = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameDay) {
        if (refCount > 0 && !sameRefs) {
          return { value: 0, refCount, notices: ['newRef'], type: Info.activationType }
        }
        return { value: 0, refCount: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef')
        if (!sameDay) notices.push('newDay')
        if (!sameBand) notices.push('newBand')

        return { value: 1, refCount, notices, type: Info.activationType }
      }
    }
  }
}

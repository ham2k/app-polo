/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './POTAInfo'
import { POTAActivityOptions } from './POTAActivityOptions'
import { potaFindParkByReference, registerPOTAAllParksData } from './POTAAllParksData'
import { POTALoggingControl } from './POTALoggingControl'
import { POTAPostSpot } from './POTAPostSpot'

const Extension = {
  ...Info,
  category: 'locationBased',
  enabledByDefault: true,
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerPOTAAllParksData()
    await dispatch(loadDataFile('pota-all-parks'))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('pota-all-parks'))
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
  postSpot: POTAPostSpot,
  Options: POTAActivityOptions,

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
  InputComponent: POTALoggingControl,
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
  InputComponent: POTALoggingControl,
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

  decorateRefWithDispatch: (ref) => async () => {
    if (!ref?.ref || !ref.ref.match(Info.referenceRegex)) return { ...ref, ref: '', name: '', shortName: '', location: '' }

    const data = await potaFindParkByReference(ref.ref)
    let result
    if (data?.name) {
      result = {
        ...ref,
        name: data.name,
        shortName: data.shortName,
        location: data.locationName,
        grid: data.grid
      }
    } else {
      return { name: Info.unknownReferenceName ?? 'Unknown reference', shortName: 'Unknown reference', ...ref }
    }
    return result
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === Info.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name, shortSubtitle: ref.shortName }
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
    const huntingRefs = filterRefs(qso, Info.huntingType)

    if (huntingRefs) return ([{ SIG: 'POTA' }, { SIG_INFO: huntingRefs[0].ref }, { POTA_REF: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') }])
    else return []
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation, common }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationADIF = []
    if (activationRef) {
      activationADIF = [
        { MY_SIG: 'POTA' }, { MY_SIG_INFO: activationRef.ref }, { MY_POTA_REF: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return huntingRefs.map(huntingRef => [
        ...activationADIF,
        { SIG: 'POTA' }, { SIG_INFO: huntingRef.ref }, { POTA_REF: huntingRef.ref }
      ])
    } else {
      return [activationADIF]
    }
  }
}

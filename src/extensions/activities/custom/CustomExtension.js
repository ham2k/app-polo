/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './CustomInfo'
import { CustomActivityOptions } from './CustomActivityOptions'
import { CustomLoggingControl } from './CustomLoggingControl'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })
  }
}
export default Extension

const ActivatorLoggingControl = {
  key: 'custom/activator',
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = ['Custom']
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: CustomLoggingControl,
  optionType: 'optional'
}

const ActivityHook = {
  ...Info,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return []
    }
  },
  Options: CustomActivityOptions
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

  decorateRef: (ref) => {
    return ref // Custom so no known extra data
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === Info.activationType && ref.ref) {
      return {
        at: ref.ref,
        subtitle: ref.name
      }
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

  adifFieldCombinationsForOneQSO: ({ qso, operation, common }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const activationADIF = []
    if (activationRef) {
      if (activationRef?.mySig) activationADIF.push({ MY_SIG: activationRef.mySig })
      if (activationRef?.mySigInfo) activationADIF.push({ MY_SIG_INFO: activationRef.mySigInfo })
    }

    if (huntingRefs.length > 0) {
      if (activationRef?.mySig) activationADIF.push({ SIG: activationRef.mySig })
      return huntingRefs.map(huntingRef => [
        ...activationADIF,
        { SIG_INFO: huntingRef.ref }
      ])
    } else {
      return [activationADIF]
    }
  }
}

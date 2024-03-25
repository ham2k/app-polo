import { findRef, refsToString } from '../../tools/refTools'
import { adifField } from '../../tools/qsonToADIF'

import { INFO } from './WWFFInfo'
import { WWFFActivityOptions } from './WWFFActivityOptions'
import { WWFFData, registerWWFFDataFile } from './WWFFDataFile'
import { WWFFLoggingControl } from './WWFFLoggingControl'

registerWWFFDataFile()

const HunterLoggingControl = {
  key: 'wwff/hunter',
  order: 10,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    const parts = ['WWFF']
    if (findRef(qso, INFO.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: WWFFLoggingControl,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: 'wwff/activator',
  order: 10,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    const parts = ['P2P']
    if (findRef(qso, INFO.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: WWFFLoggingControl,
  optionType: 'mandatory'
}

const WWFFActivity = {
  ...INFO,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, INFO.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  Options: WWFFActivityOptions,

  description: (operation) => refsToString(operation, INFO.activationType),

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, INFO.activationType)) return true
    if (findRef(qso, INFO.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, INFO.activationType)
    let label = opRef ? 'P2P' : 'WWFF'
    if (findRef(qso, INFO.huntingType)) label = `✓ ${label}`
    return label
  },

  decorateRef: (ref) => (dispatch, getState) => {
    if (ref.ref) {
      const reference = WWFFData.byReference[ref.ref]
      if (reference) {
        return { ...ref, name: reference.name, location: reference.region, grid: reference.grid }
      } else {
        return { ...ref, name: 'Unknown park' }
      }
    }
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === INFO.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  },

  activationADIF: (activationRef) => {
    return adifField('MY_SIG', 'WWFF') + adifField('MY_SIG_INFO', activationRef.ref)
  },

  huntingADIF: (huntingRef) => {
    return adifField('SIG', 'WWFF') + adifField('SIG_INFO', huntingRef.ref)
  }
}

export default WWFFActivity

import { findRef } from '../../tools/refTools'

import { Info } from './SOTAInfo'
import { SOTAActivityOptions } from './SOTAActivityOptions'
import { SOTALoggingControl } from './SOTALoggingControl'

const HunterLoggingControl = {
  key: 'sota/hunter',
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = ['SOTA']
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: SOTALoggingControl,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: 'sota/activator',
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = ['S2S']
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: SOTALoggingControl,
  optionType: 'mandatory'
}

const SOTAActivity = {
  ...Info,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  Options: SOTAActivityOptions,

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, Info.activationType)) return true
    if (findRef(qso, Info.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, Info.activationType)
    let label = opRef ? 'S2S' : 'SOTA'
    if (findRef(qso, Info.huntingType)) label = `✓ ${label}`
    return label
  }
}

export default SOTAActivity

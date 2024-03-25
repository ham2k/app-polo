import { findRef, refsToString } from '../../tools/refTools'

import { INFO } from './SOTAInfo'
import { SOTAActivityOptions } from './SOTAActivityOptions'
import { SOTAData, registerSOTADataFile } from './SOTADataFile'
import { SOTALoggingControl } from './SOTALoggingControl'

registerSOTADataFile()

const HunterLoggingControl = {
  key: 'sota/hunter',
  order: 10,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    const parts = ['SOTA']
    if (findRef(qso, INFO.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: SOTALoggingControl,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: 'sota/activator',
  order: 10,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    const parts = ['S2S']
    if (findRef(qso, INFO.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: SOTALoggingControl,
  optionType: 'mandatory'
}

const SOTAActivity = {
  ...INFO,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, INFO.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  Options: SOTAActivityOptions,

  description: (operation) => refsToString(operation, INFO.activationType),

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, INFO.activationType)) return true
    if (findRef(qso, INFO.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, INFO.activationType)
    let label = opRef ? 'S2S' : 'SOTA'
    if (findRef(qso, INFO.huntingType)) label = `✓ ${label}`
    return label
  },

  decorateRef: (ref) => (dispatch, getState) => {
    if (ref.ref) {
      const reference = SOTAData.byReference[ref.ref]
      if (reference) {
        return { ...ref, name: reference.name, location: reference.region, grid: reference.grid }
      } else {
        return { ...ref, name: 'Unknown summit' }
      }
    }
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === INFO.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  }
}

export default SOTAActivity

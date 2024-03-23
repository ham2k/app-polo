import { findRef, refsToString } from '../../tools/refTools'

import { INFO } from './WWFFInfo'
import { WWFFActivityOptions } from './WWFFActivityOptions'
import { WWFFData, registerWWFFDataFile } from './WWFFDataFile'
import { WWFFLoggingControl } from './WWFFLoggingControl'
import { WWFFSpotterControl } from './WWFFSpotterControl'

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

const SpotterControl = {
  key: 'wwff/spotter',
  order: 11,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    return 'Spotting'
  },
  InputComponent: WWFFSpotterControl,
  inputWidthMultiplier: 40,
  optionType: 'mandatory'
}

const WWFFActivity = {
  ...INFO,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, INFO.activationType)) {
      return [ActivatorLoggingControl, SpotterControl]
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
  }
}

export default WWFFActivity

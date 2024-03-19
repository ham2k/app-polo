import { apiPOTA } from '../../store/apiPOTA'
import { findRef, refsToString } from '../../tools/refTools'

import { POTAActivityOptions } from './POTAActivityOptions'
import { POTALoggingControl } from './POTALoggingControl'
import { registerPOTAAllParksData } from './POTAAllParksData'

import { INFO } from './POTAInfo'

registerPOTAAllParksData()

const HunterLoggingControl = {
  key: 'pota/hunter',
  order: 10,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    const parts = ['POTA']
    if (findRef(qso, INFO.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: POTALoggingControl,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: 'pota/activator',
  order: 10,
  icon: INFO.icon,
  label: ({ operation, qso }) => {
    const parts = ['P2P']
    if (findRef(qso, INFO.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: POTALoggingControl,
  optionType: 'mandatory'
}

const POTAActivity = {
  ...INFO,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, INFO.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  Options: POTAActivityOptions,

  description: (operation) => refsToString(operation, INFO.activationType),

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, INFO.activationType)) return true
    if (findRef(qso, INFO.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, INFO.activationType)
    let label = opRef ? 'P2P' : 'POTA'
    if (findRef(qso, INFO.huntingType)) label = `✓ ${label}`
    return label
  },

  decorateRefWithDispatch: (ref) => async (dispatch, getState) => {
    if (!ref?.ref || !ref.ref.match(INFO.referenceRegex)) return { ...ref, ref: '', name: '', location: '' }

    const promise = dispatch(apiPOTA.endpoints.lookupPark.initiate(ref))
    const { data } = await promise
    let result
    if (data?.name) {
      result = {
        ...ref,
        name: [data.name, data.parktypeDesc].filter(x => x).join(' '),
        location: data?.locationName,
        grid: data?.grid6
      }
    } else {
      result = { ...ref, name: `${ref.ref} not found!` }
    }

    promise.unsubscribe()
    return result
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === INFO.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  }

}

export default POTAActivity

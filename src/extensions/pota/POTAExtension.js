import { apiPOTA } from '../../store/apiPOTA'
import { findRef, refsToString } from '../../tools/refTools'
import { POTAActivityOptions } from './POTAActivityOptions'
import { registerPOTAAllParksData } from './POTAAllParksData'
import { Info } from './POTAInfo'
import { POTALoggingControl } from './POTALoggingControl'
import { POTASpotterControl } from './POTASpotterControl'

const Extension = {
  ...Info,
  onActivation: ({ registerHook, registerHandler }) => {
    registerPOTAAllParksData()

    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl, SpotterControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  Options: POTAActivityOptions,

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, Info.activationType)) return true
    if (findRef(qso, Info.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, Info.activationType)
    let label = opRef ? 'P2P' : 'POTA'
    if (findRef(qso, Info.huntingType)) label = `✓ ${label}`
    return label
  }
}

const HunterLoggingControl = {
  key: 'pota/hunter',
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = ['POTA']
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: POTALoggingControl,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: 'pota/activator',
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = ['P2P']
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: POTALoggingControl,
  optionType: 'mandatory'
}

const SpotterControl = {
  key: 'pota/spotter',
  order: 11,
  icon: 'hand-wave',
  label: ({ operation, qso }) => {
    return 'Spotting'
  },
  InputComponent: POTASpotterControl,
  inputWidthMultiplier: 40,
  optionType: 'mandatory'
}

const ReferenceHandler = {
  ...Info,

  description: (operation) => refsToString(operation, Info.activationType),

  decorateRefWithDispatch: (ref) => async (dispatch, getState) => {
    if (!ref?.ref || !ref.ref.match(Info.referenceRegex)) return { ...ref, ref: '', name: '', location: '' }

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
    if (ref.type === Info.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  }
}

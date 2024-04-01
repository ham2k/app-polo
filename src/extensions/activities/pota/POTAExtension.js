import { apiPOTA } from '../../../store/apiPOTA'
import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'

import { Info } from './POTAInfo'
import { POTAActivityOptions } from './POTAActivityOptions'
import { registerPOTAAllParksData } from './POTAAllParksData'
import { POTALoggingControl } from './POTALoggingControl'
import { POTASpotterControl } from './POTASpotterControl'

const Extension = {
  ...Info,
  category: 'locationBased',
  enabledByDefault: true,
  onActivationDispatch: ({ registerHook, registerHandler }) => async (dispatch) => {
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

const SpotterControl = {
  key: `${Info.key}/spotter`,
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
        name: data.shortName || data.name,
        shortName: data.shortName,
        location: data.locationName,
        grid: data.grid6
      }
    } else {
      return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference' }
    }

    promise.unsubscribe()
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

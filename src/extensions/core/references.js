import { filterRefs, refsToString } from '../../tools/refTools'
import { camelCaseToWords } from '../../tools/stringTools'

export function defaultReferenceHandlerFor (type) {
  return {
    key: type,
    name: camelCaseToWords(type, { capitalize: true }),
    icon: 'help',
    description: (op) => filterRefs(op, type).map(ref => ref.ref).join(', '),
    suggestOperationTitle: (ref) => {
      if (ref.ref && ref.type.match(/Activation$/)) {
        return { at: ref.ref, subtitle: ref.name }
      } else {
        return null
      }
    }
  }
}

const Extension = {
  key: 'core-references',
  name: 'Core Reference Handlers',
  category: 'core',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook, registerHandler }) => {
    registerHook('ref:pota', { priority: -1, hook: POTAReferenceHandler })
    registerHook('ref:potaActivation', { priority: -1, hook: POTAReferenceHandler })
    registerHook('ref:sota', { priority: -1, hook: SOTAReferenceHandler })
    registerHook('ref:sotaActivation', { priority: -1, hook: SOTAReferenceHandler })
  }
}
export default Extension

const POTAInfo = {
  key: 'core-references/pota',
  icon: 'pine-tree',
  name: 'Parks on the Air',
  shortName: 'POTA',
  shortNameDoubleContact: 'P2P',
  huntingType: 'pota',
  activationType: 'potaActivation',
  unknownReferenceName: 'Unknown Park'
}

const POTAReferenceHandler = {
  ...POTAInfo,
  description: (operation) => refsToString(operation, 'potaActivation'),

  suggestOperationTitle: (ref) => {
    if (ref.type === 'potaActivation' && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  }
}

const SOTAInfo = {
  key: 'core-references/sota',
  icon: 'image-filter-hdr',
  name: 'Summits on the Air',
  shortName: 'SOTA',
  shortNameDoubleContact: 'S2S',
  huntingType: 'sota',
  activationType: 'sotaActivation',
  unknownReferenceName: 'Unknown Summit'
}

const SOTAReferenceHandler = {
  ...SOTAInfo,
  description: (operation) => refsToString(operation, SOTAInfo.activationType),

  suggestOperationTitle: (ref) => {
    if (ref.type === SOTAInfo.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  }
}

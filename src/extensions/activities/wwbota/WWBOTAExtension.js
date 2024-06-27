/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { filterRefs, findRef, refsToString } from '../../../tools/refTools'
import { fmtDateZulu } from '../../../tools/timeFormats'

import { Info } from './WWBOTAInfo'
import { WWBOTAActivityOptions } from './WWBOTAActivityOptions'
import { wwbotaFindOneByReference, registerWWBOTADataFile } from './WWBOTADataFile'
import { WWBOTALoggingControl } from './WWBOTALoggingControl'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })
    registerHook('ref:ukbota', { hook: ReferenceHandler }) // Legacy
    registerHook('ref:ukbotaActivation', { hook: ReferenceHandler }) // Legacy

    registerWWBOTADataFile()
    await dispatch(loadDataFile('wwbota-all-bunkers', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('wwbota-all-bunkers'))
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
  Options: WWBOTAActivityOptions,

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
  InputComponent: WWBOTALoggingControl,
  inputWidthMultiplier: 30,
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
  InputComponent: WWBOTALoggingControl,
  inputWidthMultiplier: 30,
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

  iconForQSO: Info.icon,

  decorateRefWithDispatch: (ref) => async () => {
    if (!ref?.ref || !ref.ref.match(Info.referenceRegex)) return { ...ref, ref: '', name: '', location: '' }

    const data = await wwbotaFindOneByReference(ref.ref)
    let result
    if (data?.name) {
      result = {
        ...ref,
        name: data.name,
        location: data.area,
        grid: data.grid
      }
    } else {
      return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference' }
    }
    return result
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === Info.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
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

    if (huntingRefs) return ([{ SIG: 'WWBOTA' }, { SIG_INFO: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') }])
    else return []
  },

  adifFieldCombinationsForOneQSO: ({ qso, operation, common }) => {
    const huntingRefs = filterRefs(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    let activationADIF = []
    if (activationRef) {
      activationADIF = [
        { MY_SIG: 'WWBOTA' }, { MY_SIG_INFO: activationRef.ref }
      ]
    }

    if (huntingRefs.length > 0) {
      return [[
        ...activationADIF,
        { SIG: 'WWBOTA' }, { SIG_INFO: huntingRefs.map(ref => ref.ref).filter(x => x).join(',') }
      ]]
    } else {
      return [activationADIF]
    }
  },

  adifHeaderComment: ({ qsos, operation, common }) => {
    const b2bCount = qsos.filter(qso => !qso.deleted).reduce((count, qso) => count + filterRefs(qso, Info.huntingType).length, 0)
    const stationsWorked = new Set(qsos.filter(qso => !qso.deleted).map(qso => qso.their?.call + qso.band)).size

    return `Stations Worked: ${stationsWorked}\nB2B QSOs: ${b2bCount}\n`
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    if (!ref.ref) return {}

    const { band, key, startOnMillis } = qso
    const refs = filterRefs(qso, Info.huntingType).filter(x => x.ref)
    const points = refs.length

    const nearDupes = qsos.filter(q => !q.deleted && (startOnMillis ? q.startOnMillis < startOnMillis : true) && q.their.call === qso.their.call && q.key !== key)

    if (nearDupes.length === 0) {
      return { counts: 1, points, type: Info.activationType }
    } else {
      const day = fmtDateZulu(qso.startOnMillis ?? Date.now())
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameDay = nearDupes.filter(q => fmtDateZulu(q.startOnMillis) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, Info.huntingType).filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameDay) {
        if (points > 0 && !sameRefs) { // Doesn't count towards activation, but towards B2B award.
          return { counts: 0, points, notices: ['newRef'], type: Info.activationType }
        }
        return { counts: 0, points: 0, alerts: ['duplicate'], type: Info.activationType }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef')
        if (!sameDay) notices.push('newDay')
        if (!sameBand) notices.push('newBand')

        return { counts: 1, points, notices, type: Info.activationType }
      }
    }
  }
}

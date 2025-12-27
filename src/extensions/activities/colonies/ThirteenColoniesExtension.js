/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { superModeForMode } from '@ham2k/lib-operation-data'
import { fmtNumber } from '@ham2k/lib-format-tools'


import { ThirteenColoniesOptions } from './ThirteenColoniesOptions'
import { findQSOsInOtherOps } from '../../../store/qsos/actions/findQSOsInOtherOps'
import { setOperationLocalData } from '../../../store/operations'
import { findRef } from '../../../tools/refTools'

export const Info = {
  key: 'colonies',
  icon: 'star-circle',
  name: '13 Colonies Special Event',
  shortName: '13 Colonies',
  infoURL: 'http://www.13colonies.us/',
  defaultValue: { year: 2025 }
}

const Extension = {
  ...Info,
  category: 'fieldOps',
  onActivation: ({ registerHook }) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  }
}
export default Extension

const THIRTEEN_COLONIES_CALLS = {
  K2A: 'NY',
  K2B: 'VA',
  K2C: 'RI',
  K2D: 'CT',
  K2E: 'DE',
  K2F: 'MD',
  K2G: 'GA',
  K2H: 'MA',
  K2I: 'NJ',
  K2J: 'NC',
  K2K: 'NH',
  K2L: 'SC',
  K2M: 'PA'
}

const THIRTEEN_COLONIES_SPECIAL_STATIONS = {
  GB13COL: 'GB',
  TM13COL: 'TM',
  WM3PEN: 'PEN'
}

const THIRTEEN_COLONIES_ALL_CALLSIGNS = Object.keys(THIRTEEN_COLONIES_CALLS).concat(Object.keys(THIRTEEN_COLONIES_SPECIAL_STATIONS))

const THIRTEEN_COLONIES_NAMES = {
  NY: 'New York',
  VA: 'Virginia',
  RI: 'Rhode Island',
  CT: 'Connecticut',
  DE: 'Delaware',
  MD: 'Maryland',
  GA: 'Georgia',
  MA: 'Massachusetts',
  NJ: 'New Jersey',
  NC: 'North Carolina',
  NH: 'New Hampshire',
  SC: 'South Carolina',
  PA: 'Pennsylvania',
  GB: 'England',
  TM: 'France',
  PEN: 'Philadelphia'
}

const ActivityHook = {
  ...Info,
  Options: ThirteenColoniesOptions
}

const ReferenceHandler = {
  ...Info,

  descriptionPlaceholder: '',
  description: (operation) => {
    const ref = findRef(operation, Info.key)
    return `${ref.year}`
  },

  decorateRef: (ref) => {
    return {
      ...ref,
      label: `${Info.name} ${ref.year}`,
      shortLabel: `${Info.shortName} ${ref.year}`
    }
  },

  setupHandlerForActiveOperation: async ({ operation, settings, dispatch }) => {
    const checklist = await _fetchColoniesChecklist({ operation })
    dispatch(setOperationLocalData({ uuid: operation.uuid, coloniesChecklist: checklist }))
  },

  suggestOperationTitle: (ref) => {
    return { subtitle: 'Chasing 13 Colonies', priority: 100 }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref?.type === Info?.key) {
      return [{
        format: 'adif',
        exportName: 'Thirteen Colonies',
        nameTemplate: settings?.useCompactFileNames ? `{{log.station}}-13Col-${ref.year}` : `{{log.station}} Thirteen Colonies ${ref.year}`,
        titleTemplate: `{{log.station}} for Thirteen Colonies ${ref.year}`,
        selectQSOsToExport: async ({ qsos }) => {
          const checklist = await _fetchColoniesExtendedChecklist({ operation })
          const selectedQSOs = {}
          for (const key in checklist) {
            if (checklist[key].length > 0) {
              const qso = checklist[key][0]
              selectedQSOs[qso.key] = qso
            }
          }
          return Object.values(selectedQSOs).sort((a, b) => a.startAtMillis - b.startAtMillis)
        }
      }]
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref, score }) => {
    const { band, mode, uuid, startAtMillis } = qso

    const superMode = superModeForMode(mode)
    const call = qso.their.call
    if (!THIRTEEN_COLONIES_CALLS[call]) return {}

    const colony = THIRTEEN_COLONIES_CALLS[call]
    const special = THIRTEEN_COLONIES_SPECIAL_STATIONS[call]

    const nearDupes = qsos.filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    const value = 1

    const scoring = { value, call, colony, special, mode: superMode, band }

    if (score?.worked?.[call]) {
      scoring.infos = [`13 Col: ${THIRTEEN_COLONIES_NAMES[colony]}`]
    } else {
      scoring.notices = [`13 Col:${THIRTEEN_COLONIES_NAMES[colony]}`]
    }

    if (nearDupes.length === 0) {
      return scoring
    } else {
      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => superModeForMode(q.mode) === superMode).length !== 0
      const sameBandMode = nearDupes.filter(q => q.band === band && q.mode === mode).length !== 0
      if (sameBandMode) {
        const alerts = [...(scoring.alerts || []), 'duplicate']
        return { ...scoring, value: 0, alerts }
      } else {
        const notices = [...(scoring.notices || [])]
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { ...scoring, notices }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    const checklist = operation?.local?.coloniesChecklist || {}
    if (!qsoScore.value) return score

    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: ref?.type,
      icon: Info.icon,
      label: Info.name,
      total: 0,
      // worked: {},
      // workedModes: {},
      worked: THIRTEEN_COLONIES_ALL_CALLSIGNS.reduce((acc, call) => {
        if (checklist[`MIXED-${call}`]) {
          acc[call] = checklist[`MIXED-${call}`]
        }
        return acc
      }, {}),
      workedModes: { ...checklist }
    }

    score.worked[qsoScore.call] = (score.worked[qsoScore.call] || 0) + 1
    score.workedModes[`MIXED-${qsoScore.call}`] = (score.workedModes[`MIXED-${qsoScore.call}`] || 0) + 1
    score.workedModes[`${qsoScore.mode}-${qsoScore.call}`] = (score.workedModes[`${qsoScore.mode}-${qsoScore.call}`] || 0) + 1

    score.total = Object.keys(score.worked).length
    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    if (!score?.total) {
      score.summary = '0 Col'
      score.longSummary = 'No special stations worked yet!'
      return score
    }

    const parts = []

    let line

    const modes = ['MIXED', 'PHONE', 'CW', 'DATA']
    const modeCounts = {}
    modes.forEach(m => {
      modeCounts[`${m}-COLONIES`] = Object.keys(THIRTEEN_COLONIES_CALLS).filter(c => score.workedModes[`${m}-${c}`]).length
      modeCounts[`${m}-SPECIALS`] = Object.keys(THIRTEEN_COLONIES_SPECIAL_STATIONS).filter(s => score.workedModes[`${m}-${s}`]).length
      modeCounts[`${m}-TOTAL`] = modeCounts[`${m}-COLONIES`] + modeCounts[`${m}-SPECIALS`]
    })
    const modesWorked = ['PHONE', 'CW', 'DATA'].filter(m => modeCounts[`${m}-TOTAL`] > 0)
    if (modesWorked.length > 1) {
      modesWorked.unshift('MIXED')
    }

    score.summary = `${fmtNumber(modeCounts['MIXED-COLONIES'])} Col`
    if (modeCounts['MIXED-SPECIALS'] > 0) {
      score.summary += ` + ${fmtNumber(modeCounts['MIXED-SPECIALS'])}`
    }

    if (modeCounts['MIXED-COLONIES'] >= 13) {
      if (modeCounts['MIXED-SPECIALS'] >= 3) {
        parts.push('**Full Sweep!!!**')
      } else {
        parts.push('**Clean Sweep!**')
      }
    }

    parts.push('')

    modesWorked.forEach(m => {
      if (modeCounts[`${m}-TOTAL`] === 0) {
        return
      }
      const titleParts = []
      if (modeCounts[`${m}-COLONIES`] === 0) titleParts.push('No Colonies')
      else if (modeCounts[`${m}-COLONIES`] === 1) titleParts.push('1 Colony')
      else if (modeCounts[`${m}-COLONIES`] === 13) titleParts.push('All 13 Colonies')
      else titleParts.push(`${modeCounts[`${m}-COLONIES`]} Colonies`)

      if (modeCounts[`${m}-SPECIALS`] === 0) titleParts.push('No Special Stations')
      else if (modeCounts[`${m}-SPECIALS`] === 1) titleParts.push('1 Special Station')
      else if (modeCounts[`${m}-SPECIALS`] === 3) titleParts.push('All 3 Special Stations')
      else titleParts.push(`${modeCounts[`${m}-SPECIALS`]} Special Stations`)

      parts.push(`### ${m}: ${titleParts.join(', ')}`)

      line = '> '
      Object.keys(THIRTEEN_COLONIES_CALLS).forEach(c => {
        if (score.workedModes[`${m}-${c}`]) {
          line += `**~~${c} ${THIRTEEN_COLONIES_CALLS[c]}~~**&nbsp; `
        } else {
          line += `${c} ${THIRTEEN_COLONIES_CALLS[c]}&nbsp; `
        }
      })
      parts.push(line)

      line = '> '
      Object.keys(THIRTEEN_COLONIES_SPECIAL_STATIONS).forEach(s => {
        if (score.workedModes[`${m}-${s}`]) {
          line += `**~~${s}~~** `
        } else {
          line += `${s} `
        }
      })
      parts.push(line)
    })

    score.longSummary = '\n' + parts.join('\n')
    return score
  }
}

function _dateRangeForSpecialEvent({ operation }) {
  const ref = findRef(operation, Info.key)
  const today = new Date()
  // Get current year's dates
  const july1 = Date.parse(`${ref.year}-07-01T13:00:00Z`) // July 1st 9am ET
  const july7 = Date.parse(`${ref.year}-07-08T03:59:59Z`) // July 7th midnight ET

  if (today < july1) {
    // Before July 1st, use the last seven days
    // Useful for testing before the event starts
    const sevenDaysAgo = today.getTime() - 7 * 24 * 60 * 60 * 1000
    const todayMidnight = today.getTime() + 24 * 60 * 60 * 1000 - 1
    return { startMillis: sevenDaysAgo, endMillis: todayMidnight }
  } else {
    // After July 1st, return July 1st to July 7th
    // Strict enforcement of event dates
    return { startMillis: july1, endMillis: july7 }
  }
}

async function _fetchColoniesChecklist({ operation }) {
  const { startMillis, endMillis } = _dateRangeForSpecialEvent({ operation })

  const calls = Object.keys(THIRTEEN_COLONIES_CALLS)
  calls.push(...Object.keys(THIRTEEN_COLONIES_SPECIAL_STATIONS))

  const qsos = await findQSOsInOtherOps(calls, { startMillis, endMillis, operation })
  const checklist = {}
  for (const qso of qsos) {
    const mode = superModeForMode(qso?.mode)
    const call = qso?.their?.call
    const colony = THIRTEEN_COLONIES_CALLS[call]
    const special = THIRTEEN_COLONIES_SPECIAL_STATIONS[call]
    if (colony || special) {
      checklist[call] = (checklist[call] || 0) + 1
      checklist[`MIXED-${call}`] = (checklist[`MIXED-${call}`] || 0) + 1
      checklist[`${mode}-${call}`] = (checklist[`${mode}-${call}`] || 0) + 1
    }
  }
  return checklist
}

async function _fetchColoniesExtendedChecklist({ operation }) {
  const { startMillis, endMillis } = _dateRangeForSpecialEvent({ operation })

  const calls = Object.keys(THIRTEEN_COLONIES_CALLS)
  calls.push(...Object.keys(THIRTEEN_COLONIES_SPECIAL_STATIONS))

  const qsos = await findQSOsInOtherOps(calls, { startMillis, endMillis }) // don't filter by operation
  const checklist = {}
  for (const qso of qsos) {
    const mode = superModeForMode(qso?.mode)
    const call = qso?.their?.call
    const colony = THIRTEEN_COLONIES_CALLS[call]
    const special = THIRTEEN_COLONIES_SPECIAL_STATIONS[call]
    if (colony || special) {
      checklist[call] = (checklist[call] || []).concat(qso)
      checklist[`MIXED-${call}`] = (checklist[`MIXED-${call}`] || []).concat(qso)
      checklist[`${mode}-${call}`] = (checklist[`${mode}-${call}`] || []).concat(qso)
    }
  }
  return checklist
}

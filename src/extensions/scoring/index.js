/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GLOBAL from '../../GLOBAL'

import { DefaultScoringHandler } from './DefaultScoringHandler'
import { findBestHook, findHooks } from '../registry'
import { DXCCScoringHandler } from './DXCCScoringHandler'
import { USStatesScoringHandler } from './USStatesScoringHandler'
import { CanadianProvincesScoringHandler } from './CanadianProvincesScoringHandler'
import { BandsAndModesScoringHandler } from './BandsAndModesScoringHandler'
import { reportError } from '../../distro'

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

const VERBOSE = 0
const DEBUG_KEYS = ['pota', 'qp']

export function scoringHandlersForOperation({ operation, settings }) {
  const scoringKeys = {}

  // Get handlers for operation refs
  const scoringHandlers = []

  const refs = (operation?.refs || []).filter(Boolean)

  refs.forEach(ref => {
    const handler = findBestHook(`ref:${ref.type}`)
    if (handler && handler.scoringForQSO) {
      scoringHandlers.push({ handler, ref })
      scoringKeys[handler.key] = true
    }
  })

  if (scoringHandlers.length === 0) scoringHandlers.push({ handler: DefaultScoringHandler, ref: { type: 'defaultOperation' } })

  // Get handlers for general hunting activities
  findHooks('activity').forEach(hook => {
    const type = hook.generalHuntingType && hook.generalHuntingType({ operation, settings })
    const handler = type && findBestHook(`ref:${type}`)
    if (handler && handler.scoringForQSO && !scoringKeys[handler.key]) {
      scoringHandlers.push({ handler, ref: { type } })
      scoringKeys[handler.key] = true
    }
  })

  scoringHandlers.push({ handler: DXCCScoringHandler, ref: {} })
  scoringKeys[DXCCScoringHandler.key] = true

  scoringHandlers.push({ handler: USStatesScoringHandler, ref: {} })
  scoringKeys[USStatesScoringHandler.key] = true

  scoringHandlers.push({ handler: CanadianProvincesScoringHandler, ref: {} })
  scoringKeys[CanadianProvincesScoringHandler.key] = true

  scoringHandlers.push({ handler: BandsAndModesScoringHandler, ref: {} })
  scoringKeys[BandsAndModesScoringHandler.key] = true

  return scoringHandlers

  return scoringHandlers.sort((a, b) => b.priority - a.priority)
}

export function analyzeAndSectionQSOs({ qsos, operation, settings, showDeletedQSOs = true }) {
  const t = GLOBAL?.t

  qsos = qsos ?? []
  operation = operation ?? {}

  if (VERBOSE) console.log('\n\n\nAnalyzing and sectioning QSOs', qsos.length)

  let scoringHandlers = scoringHandlersForOperation({ operation, settings })

  const activeQSOs = qsos.filter(qso => !qso.deleted && !qso.event)

  const sections = []

  let currentSection = null
  let currentBreakEvent = null
  let currentOperation = operation

  for (const qso of qsos) {
    if (showDeletedQSOs === false && qso.deleted) continue

    const day = qso.startAtMillis - (qso.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)

    if (!currentSection || currentSection.day !== day) {
      const previousSection = currentSection
      currentSection = { day, data: [], count: 0, scores: {} }
      sections.push(currentSection)

      if (VERBOSE) console.log('New Section Starts', scoringHandlers.map(({ handler, ref }) => (`${handler.key} ${ref.ref ?? ref.location ?? ref.type ?? '-'}`)).join(', '))

      scoringHandlers.forEach(({ handler, ref }) => {
        const key = ref?.type ?? handler.key
        if (VERBOSE && DEBUG_KEYS.includes(handler.key)) console.log(`-- ${handler.key}${handler.key !== key ? ` (${key})` : ' '} ${ref.ref ?? ref.location ?? ref.type ?? '-'}`)
        // Summarize previous section
        if (handler.summarizeScore && previousSection && previousSection.scores[key]) {
          try {
            previousSection.scores[key] = handler.summarizeScore({ t, score: previousSection.scores[key] ?? {}, operation, ref, section: previousSection })
            if (VERBOSE && DEBUG_KEYS.includes(handler.key)) console.log('---- Summarized previous section', { ...previousSection.scores[key] })
          } catch (e) {
            reportError(`Error summarizing previous section score for '${handler.key}'`, e)
          }
        }

        if (handler.accumulateScoreForDay) {
          currentSection.scores[key] = currentSection.scores[key] ?? {} // Reuse scores if sharing key
          if (VERBOSE >= 2 && DEBUG_KEYS.includes(handler.key)) console.log('---- Accumulated for day', { ...currentSection.scores[key] })
        } else if (handler.accumulateScoreForOperation) {
          currentSection.scores[key] = { ...previousSection?.scores?.[key] } // Copy scores from previous section
          if (VERBOSE >= 2 && DEBUG_KEYS.includes(handler.key)) console.log('---- Copied into next section', currentSection.scores[key])
        }
      })
    }
    currentSection.data.push(qso)

    if (qso.deleted) {
      currentSection.deleted = (currentSection.deleted || 0) + 1
    } else if (qso.event) {
      currentSection.events = (currentSection.events || 0) + 1
      if (qso.event.event === 'break' || qso.event.event === 'start') {
        currentBreakEvent = qso.event
        currentOperation = { ...operation, ...currentBreakEvent?.operation }

        if (VERBOSE) console.log('\nOperation Break', qso.event)

        scoringHandlers = scoringHandlersForOperation({ operation: currentOperation, settings })

        if (VERBOSE) console.log('-- New scoring handlers', scoringHandlers.map(({ handler, ref }) => (`${handler.key} ${ref.ref ?? ref.location ?? ref.type ?? '-'}`)).join(', '))
      }
    } else {
      currentSection.count = (currentSection.count || 0) + 1

      if (VERBOSE >= 1) console.log('\nScoring qso', qso.key, { refs: qso.refs })

      scoringHandlers.forEach(({ handler, ref }) => {
        const key = ref?.type ?? handler.key

        const qsoScore = handler.scoringForQSO({ qso, qsos, operation, score: currentSection.scores[key], ref })

        try {
          if (handler.accumulateScoreForDay) {
            currentSection.scores[key] = handler.accumulateScoreForDay({ qsoScore, score: currentSection.scores[key], operation, ref })
          } else if (handler.accumulateScoreForOperation) {
            currentSection.scores[key] = handler.accumulateScoreForOperation({ qsoScore, score: currentSection.scores[key], operation, ref })
          }

          if (VERBOSE && DEBUG_KEYS.includes(handler.key)) console.log(`-- ${handler.key}${handler.key !== key ? ` (${key})` : ' '} ${ref.ref ?? ref.location ?? ref.type}`, { ...qsoScore }, JSON.parse(JSON.stringify(currentSection.scores[key])))

        } catch (e) {
          reportError(`Error accumulating score for '${handler.key}' and qso '${qso.key}'`, e)
        }
      })
    }
  }

  // Summarize last section
  if (VERBOSE) console.log('Summarizing last section')
  scoringHandlers.forEach(({ handler, ref }) => {
    const key = ref?.type ?? handler.key
    if (VERBOSE >= 2 && DEBUG_KEYS.includes(handler.key)) console.log(`-- ${handler.key}${handler.key !== key ? ` (${key})` : ' '} ${ref.ref ?? ref.location ?? ref.type}`, { ...currentSection?.scores?.[key] })
    if (handler.summarizeScore && currentSection?.scores?.[key]) {
      try {
        const allSectionScores = sections.map(section => section.scores[key]).filter(x => x)

        currentSection.scores[key] = handler.summarizeScore({ t, score: currentSection.scores[key] ?? {}, operation, ref, section: currentSection, allSectionScores })
        if (VERBOSE && DEBUG_KEYS.includes(handler.key)) console.log('---- Summarized', { ...currentSection.scores[key] })
      } catch (e) {
        reportError(`Error summarizing score for '${handler.key}'`, e)
      }
    }
  })

  return { qsos, activeQSOs, sections }
}

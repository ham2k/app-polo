// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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

export function scoringHandlersForOperation ({ operation }) {
  const scoringKeys = {}

  // Get handlers for operation refs
  const scoringHandlers = []

  const refs = (operation?.refs || []).filter(Boolean)

  refs.filter(ref => ref.type).forEach(ref => {
    const handler = findBestHook(`ref:${ref.type}`)
    if (handler && handler.scoringForQSO) {
      scoringHandlers.push({ handler, ref })
      scoringKeys[handler.key] = true
    }
  })

  if (scoringHandlers.length === 0) scoringHandlers.push({ handler: DefaultScoringHandler, ref: { type: 'defaultOperation' } })

  // Get handlers for general hunting activities
  findHooks('activity').forEach(hook => {
    const type = hook.generalHuntingType && hook.generalHuntingType({ operation })
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

  return scoringHandlers.sort((a, b) => b.priority - a.priority)
}

/**
 * Builds the compact scoring payload used by QSO list headers.
 *
 * The summary is scoped by `qsos`: only non-deleted, non-event QSOs in that
 * array contribute to the returned `count` and accumulated `scores`.
 *
 * `operationQSOs` is the broader operation log passed through to scoring
 * handlers as `qsos`. This keeps existing duplicate/history logic intact for
 * handlers that need to inspect contacts outside the header's local scope, such
 * as contest scorers, while still allowing segment headers to count only their
 * own QSOs.
 *
 * Returns:
 *   {
 *     count: number,
 *     scores: {
 *       [scoreKey: string]: object
 *     }
 *   }
 */
export function buildHeaderSummary ({ qsos, operationQSOs, operation, ourInfo, scoringHandlers }) {
  const t = GLOBAL?.t

  qsos = qsos ?? []
  operationQSOs = operationQSOs ?? qsos
  operation = operation ?? {}
  scoringHandlers = scoringHandlers ?? scoringHandlersForOperation({ operation })

  const summary = { count: 0, scores: {} }

  scoringHandlers.forEach(({ handler, ref }) => {
    const key = ref?.type ?? handler.key
    summary.scores[key] = {}
  })

  qsos.forEach(qso => {
    if (qso.deleted || qso.event) return

    summary.count = summary.count + 1

    scoringHandlers.forEach(({ handler, ref }) => {
      const key = ref?.type ?? handler.key
      try {
        const qsoScore = handler.scoringForQSO({ qso, qsos: operationQSOs, score: summary.scores[key], operation, ref, ourInfo })

        if (handler.accumulateScoreForDay) {
          summary.scores[key] = handler.accumulateScoreForDay({ qsoScore, score: summary.scores[key], operation, ref })
        } else if (handler.accumulateScoreForOperation) {
          summary.scores[key] = handler.accumulateScoreForOperation({ qsoScore, score: summary.scores[key], operation, ref })
        }
      } catch (e) {
        reportError(`Error accumulating header summary score for '${handler.key}' and qso '${qso.key}'`, e)
      }
    })
  })

  scoringHandlers.forEach(({ handler, ref }) => {
    const key = ref?.type ?? handler.key
    if (handler.summarizeScore && summary.scores[key]) {
      try {
        summary.scores[key] = handler.summarizeScore({ t, score: summary.scores[key] ?? {}, operation, ref, section: summary })
      } catch (e) {
        reportError(`Error summarizing header summary score for '${handler.key}'`, e)
      }
    }
  })

  return summary
}

export function analyzeAndSectionQSOs ({ qsos, operation, ourInfo, showDeletedQSOs = true }) {
  const t = GLOBAL?.t

  qsos = qsos ?? []
  operation = operation ?? {}

  if (VERBOSE) console.log('\n\n\nAnalyzing and sectioning QSOs', qsos.length)

  let scoringHandlers = scoringHandlersForOperation({ operation })

  const activeQSOs = qsos.filter(qso => !qso.deleted && !qso.event)

  const sections = []

  let currentSection = null
  let currentBreakEvent = null
  let currentOperation = operation
  let currentSegment
  let currentSegmentHandlers = scoringHandlers

  const resetSegment = ({ event, segmentOperation, segmentScoringHandlers }) => {
    currentSegment = { event, operation: segmentOperation, qsos: [] }
    currentSegmentHandlers = segmentScoringHandlers
  }

  const summarizeSegment = () => {
    if (!currentSegment) return

    currentSegment.event.segmentSummary = buildHeaderSummary({
      qsos: currentSegment.qsos,
      operationQSOs: qsos,
      operation: currentSegment.operation,
      ourInfo,
      scoringHandlers: currentSegmentHandlers
    })
  }

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
        summarizeSegment()

        currentBreakEvent = qso.event
        currentOperation = { ...operation, ...currentBreakEvent?.operation }

        if (VERBOSE) console.log('\nOperation Break', qso.event)

        scoringHandlers = scoringHandlersForOperation({ operation: currentOperation })
        resetSegment({ event: currentBreakEvent, segmentOperation: currentOperation, segmentScoringHandlers: scoringHandlers })

        if (VERBOSE) console.log('-- New scoring handlers', scoringHandlers.map(({ handler, ref }) => (`${handler.key} ${ref.ref ?? ref.location ?? ref.type ?? '-'}`)).join(', '))
      }
    } else {
      currentSection.count = (currentSection.count || 0) + 1
      if (currentSegment) {
        currentSegment.qsos.push(qso)
      }

      if (VERBOSE >= 1) console.log('\nScoring qso', qso.key, { refs: qso.refs })

      scoringHandlers.forEach(({ handler, ref }) => {
        const key = ref?.type ?? handler.key

        const qsoScore = handler.scoringForQSO({ qso, qsos, score: currentSection.scores[key], operation: currentOperation, ref, ourInfo })

        try {
          if (handler.accumulateScoreForDay) {
            currentSection.scores[key] = handler.accumulateScoreForDay({ qsoScore, score: currentSection.scores[key], operation: currentOperation, ref })
          } else if (handler.accumulateScoreForOperation) {
            currentSection.scores[key] = handler.accumulateScoreForOperation({ qsoScore, score: currentSection.scores[key], operation: currentOperation, ref })
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
  summarizeSegment()
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

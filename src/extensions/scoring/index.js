/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { DefaultScoringHandler } from './DefaultScoringHandler'
import { findBestHook, findHooks } from '../registry'
import { DXCCScoringHandler } from './DXCCScoringHandler'
import { USStatesScoringHandler } from './USStatesScoringHandler'
import { CanadianProvincesScoringHandler } from './CanadianProvincesScoringHandler'
import { BandsAndModesScoringHandler } from './BandsAndModesScoringHandler'

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

export function scoringHandlersForOperation (operation, settings) {
  const scoringKeys = {}

  // Get handlers for operation refs
  const scoringHandlers = []
  ;(operation?.refs || []).forEach(ref => {
    const handler = findBestHook(`ref:${ref.type}`)
    if (handler && handler.scoringForQSO) {
      scoringHandlers.push({ handler, ref })
      scoringKeys[handler.key] = true
    }
  })

  // Get handlers for general hunting activities
  findHooks('activity').forEach(hook => {
    const type = hook.generalHuntingType && hook.generalHuntingType({ operation, settings })
    const handler = type && findBestHook(`ref:${type}`)
    if (handler && handler.scoringForQSO && !scoringKeys[handler.key]) {
      scoringHandlers.push({ handler, ref: { type } })
      scoringKeys[handler.key] = true
    }
  })

  if (scoringHandlers.length === 0) scoringHandlers.push({ handler: DefaultScoringHandler, ref: { type: 'defaultOperation' } })

  scoringHandlers.push({ handler: DXCCScoringHandler, ref: {} })
  scoringKeys[DXCCScoringHandler.key] = true

  scoringHandlers.push({ handler: USStatesScoringHandler, ref: {} })
  scoringKeys[USStatesScoringHandler.key] = true

  scoringHandlers.push({ handler: CanadianProvincesScoringHandler, ref: {} })
  scoringKeys[CanadianProvincesScoringHandler.key] = true

  scoringHandlers.push({ handler: BandsAndModesScoringHandler, ref: {} })
  scoringKeys[BandsAndModesScoringHandler.key] = true

  return scoringHandlers
}

export function analizeAndSectionQSOs ({ qsos, operation, settings }) {
  qsos = qsos ?? []
  operation = operation ?? {}

  const scoringHandlers = scoringHandlersForOperation(operation, settings)

  const activeQSOs = qsos.filter(qso => !qso.deleted)

  const sections = []

  let currentSection = null
  for (const qso of qsos) {
    const day = qso.startOnMillis - (qso.startOnMillis % TWENTY_FOUR_HOURS_IN_MILLIS)

    if (!currentSection || currentSection.day !== day) {
      const previousSection = currentSection
      currentSection = { day, data: [], count: 0 }
      sections.push(currentSection)

      scoringHandlers.forEach(({ handler, ref }) => {
        const key = ref?.type ?? handler.key
        if (handler.summarizeScore && previousSection?.scores?.[key]) {
          previousSection.scores[key] = handler.summarizeScore({ score: previousSection.scores[key], operation, ref, section: previousSection })
        }

        if (handler.accumulateScoreForDay) {
          currentSection.scores = currentSection.scores ?? {}
          currentSection.scores[key] = currentSection.scores[key] ?? {}
        } else if (handler.accumulateScoreForOperation) {
          currentSection.scores = currentSection.scores ?? {}
          currentSection.scores[key] = { ...(previousSection?.scores && previousSection.scores[key]) }
        }
      })
    }
    currentSection.data.push(qso)

    if (!qso.deleted) {
      currentSection.count = (currentSection.count || 0) + 1

      scoringHandlers.forEach(({ handler, ref }) => {
        const key = ref?.type ?? handler.key

        const qsoScore = handler.scoringForQSO({ qso, qsos, operation, score: currentSection.scores[key], ref })
        console.log('qsoScore', qsoScore, qso.their.call, qso.their.state)
        if (handler.accumulateScoreForDay) {
          currentSection.scores[key] = handler.accumulateScoreForDay({ qsoScore, score: currentSection.scores[key], operation, ref })
        } else if (handler.accumulateScoreForOperation) {
          currentSection.scores[key] = handler.accumulateScoreForOperation({ qsoScore, score: currentSection.scores[key], operation, ref })
        }
      })
    } else {
      currentSection.deleted = (currentSection.deleted || 0) + 1
    }
  }

  scoringHandlers.forEach(({ handler, ref }) => {
    const key = ref?.type ?? handler.key
    if (handler.summarizeScore && currentSection?.scores?.[key]) {
      currentSection.scores[key] = handler.summarizeScore({ score: currentSection.scores[key], operation, ref, section: currentSection })
    }
  })

  return { qsos, activeQSOs, sections }
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { scoringRefsHandlersForOperation } from '../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/CallInfo'

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

export function analizeAndSectionQSOs ({ qsos, operation, settings }) {
  qsos = qsos ?? []
  operation = operation ?? {}

  const scoringRefHandlers = scoringRefsHandlersForOperation(operation, settings)

  const activeQSOs = qsos.filter(qso => !qso.deleted)

  const sections = []

  let currentSection = null
  for (const qso of qsos) {
    const day = qso.startOnMillis - (qso.startOnMillis % TWENTY_FOUR_HOURS_IN_MILLIS)

    if (!currentSection || currentSection.day !== day) {
      const previousSection = currentSection
      currentSection = { day, data: [] }
      sections.push(currentSection)

      scoringRefHandlers.forEach(({ handler, ref }) => {
        const key = ref?.type ?? handler.key
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

      scoringRefHandlers.forEach(({ handler, ref }) => {
        const qsoScore = handler.scoringForQSO({ qso, qsos, operation, ref })
        const key = ref?.type ?? handler.key
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

  return { qsos, activeQSOs, sections }
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useSelector } from 'react-redux'

import { selectQSOs } from '../../../../store/qsos'
import { scoringRefsHandlersForOperation } from './LoggingPanel/CallInfo'

import { useMemo } from 'react'

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

export function useQSOsWithMilestones ({ operation, settings }) {
  const qsos = useSelector(state => selectQSOs(state, operation.uuid))

  const sections = useMemo(() => {
    const scoringRefHandlers = scoringRefsHandlersForOperation(operation, settings)
    console.log('ref handlers', scoringRefHandlers.map(h => h.ref.type))
    // eslint-disable-next-line no-shadow
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

      scoringRefHandlers.forEach(({ handler, ref }) => {
        const qsoScore = handler.scoringForQSO({ qso, qsos, operation, ref })
        const key = ref?.type ?? handler.key
        if (handler.accumulateScoreForDay) {
          currentSection.scores[key] = handler.accumulateScoreForDay({ qsoScore, score: currentSection.scores[key], operation, ref })
        } else if (handler.accumulateScoreForOperation) {
          currentSection.scores[key] = handler.accumulateScoreForOperation({ qsoScore, score: currentSection.scores[key], operation, ref })
        }
      })
    }
    return sections
  }, [qsos, operation, settings])

  return { qsos, sections }
}

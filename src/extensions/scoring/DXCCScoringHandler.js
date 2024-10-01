/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'

export const DXCCScoringHandler = {
  key: 'dxcc',
  weight: 101,

  scoringForQSO: ({ qso, qsos, operation, score, ref }) => {
    const entityPrefix = qso.their?.entityPrefix ?? qso.their?.guess?.entityPrefix

    if (score?.entities?.[entityPrefix]) {
      return { count: 0, type: 'dxcc', alerts: ['workedBefore'], entityPrefix }
    } else {
      return { count: 1, type: 'dxcc', entityPrefix }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, qsos }) => {
    score = score ?? {}
    score.entities = score.entities ?? {}

    if (qsoScore.entityPrefix) {
      score.entities[qsoScore.entityPrefix] = (score.entities[qsoScore.entityPrefix] ?? 0) + 1
    }

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    score.icon = 'earth'
    score.weight = DXCCScoringHandler.weight

    const count = Object.keys(score.entities).length

    if (count >= 5) {
      score.summary = `${count}`
    } else {
      score.summary = ''
    }

    if (count >= 2) {
      score.longSummary = `${count} DXCC entities\n`
      Object.keys(score.entities ?? {})
        .map(entityPrefix => DXCC_BY_PREFIX[entityPrefix])
        .sort((a, b) => score.entities[b.entityPrefix] - score.entities[a.entityPrefix])
        .forEach(entity => {
          score.longSummary += `${entity.flag}&nbsp;${entity.name.replaceAll(' ', '&nbsp;')}&nbsp;(${score.entities[entity.entityPrefix]}) `
        })
    }

    return score
  }
}

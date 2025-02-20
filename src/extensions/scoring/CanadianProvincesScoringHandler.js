/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import CANADIAN_PROVINCES from '../../data/canadianProvinces'

export const CanadianProvincesScoringHandler = {
  key: 'canadianProvinces',
  weight: 103,

  scoringForQSO: ({ qso, qsos, operation, score, ref }) => {
    const entityPrefix = qso.their?.entityPrefix ?? qso.their?.guess?.entityPrefix
    if (entityPrefix !== 'VE') return {}

    const state = (qso?.their?.state ?? qso?.their?.guess?.state ?? '').toUpperCase()

    if (score?.states?.[state]) {
      return { count: 0, type: 'wac', alerts: ['workedBefore'], state }
    } else {
      return { count: 1, type: 'wac', state }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, qsos }) => {
    score = score ?? {}
    score.states = score.states ?? {}

    if (qsoScore.state) {
      score.states[qsoScore.state] = (score.states[qsoScore.state] ?? 0) + 1
    }

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    score.icon = 'leaf-maple'
    score.weight = CanadianProvincesScoringHandler.weight

    const count = Object.keys(score.states ?? {}).length

    if (count >= 3) {
      score.summary = `${count}`
    } else {
      score.summary = ''
    }

    if (count >= 2) {
      score.label = `${count} Canadian Provinces`
      score.longSummary = ''
      for (let row = 0; row < 2; row++) {
        score.longSummary += '\n> '
        Object.keys(CANADIAN_PROVINCES).slice(row * 7, row * 7 + 7).forEach(state => {
          state = state.toUpperCase()
          if (score.states[state]) {
            score.longSummary += `**~~${state}~~**  `
          } else {
            score.longSummary += `${state}  `
          }
        })
      }
    }

    return score
  }
}

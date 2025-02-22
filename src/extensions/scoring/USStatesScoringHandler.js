/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import US_STATES from '../../data/usStates'

export const USStatesScoringHandler = {
  key: 'usStates',
  weight: 102,

  scoringForQSO: ({ qso, qsos, operation, score, ref }) => {
    const entityPrefix = qso.their?.entityPrefix ?? qso.their?.guess?.entityPrefix

    if (entityPrefix !== 'K' && entityPrefix !== 'KH6' && entityPrefix !== 'KL') return {}

    let state = (qso?.their?.state ?? qso?.their?.guess?.state ?? '').toUpperCase()
    if (entityPrefix === 'KH6') state = state || 'HI'
    if (entityPrefix === 'KL') state = state || 'AK'

    if (!Object.keys(US_STATES).includes(state.toLowerCase())) return {}

    if (score?.states?.[state]) {
      return { count: 0, type: 'was', alerts: ['workedBefore'], state }
    } else {
      return { count: 1, type: 'was', state }
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
    score.icon = 'star'
    score.weight = USStatesScoringHandler.weight

    const count = Object.keys(score.states ?? {}).length

    if (count >= 10) {
      score.summary = `${count}`
    } else {
      score.summary = ''
    }

    if (count >= 3) {
      score.label = `${count} US States`
      score.longSummary = ''
      // for (let row = 0; row < 5; row++) {
      // Object.keys(US_STATES).slice(row * 10, row * 10 + 10).forEach(state => {
      score.longSummary += '\n> '
      Object.keys(US_STATES).forEach(state => {
        state = state.toUpperCase()
        if (score.states[state]) {
          score.longSummary += `**~~${state}~~**  `
        } else {
          score.longSummary += `${state}  `
        }
      })
      // }
      if (score.states.DC) {
        score.longSummary += '\n **+ DC**  '
      }
    }

    return score
  }
}

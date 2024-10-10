/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BANDS } from '@ham2k/lib-operation-data'

export const BandsAndModesScoringHandler = {
  key: 'bandsAndModes',
  weight: 200,

  scoringForQSO: ({ qso, qsos, operation, score, ref }) => {
    const { band, mode } = qso
    if (score?.bands?.[band] || score?.modes?.[mode]) {
      return { count: 0, type: 'bandsAndModes', alerts: ['workedBefore'], band, mode }
    } else {
      return { count: 1, type: 'bandsAndModes', band, mode }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, qsos }) => {
    score = score ?? {}
    score.bands = score.bands ?? {}
    score.modes = score.modes ?? {}
    score.bandModes = score.bandModes ?? {}

    if (qsoScore.band) score.bands[qsoScore.band] = (score.bands[qsoScore.band] ?? 0) + 1
    if (qsoScore.mode) score.modes[qsoScore.mode] = (score.modes[qsoScore.mode] ?? 0) + 1
    if (qsoScore.band && qsoScore.mode) score.bandModes[`${qsoScore.band}-${qsoScore.mode}`] = (score.bandModes[`${qsoScore.band}-${qsoScore.mode}`] ?? 0) + 1

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    score.icon = 'antenna'
    score.weight = BandsAndModesScoringHandler.weight

    const bandCount = Object.keys(score.bands ?? {}).length
    const modeCount = Object.keys(score.modes ?? {}).length

    const summaryTitleParts = []
    if (bandCount >= 2) summaryTitleParts.push(`${bandCount} Bands`)
    if (modeCount >= 2) summaryTitleParts.push(`${modeCount} Modes`)

    score.longSummary = ''
    if (summaryTitleParts.length > 0) score.longSummary = summaryTitleParts.join(', ') + '\n'

    BANDS.forEach(band => {
      if (score?.bands?.[band]) {
        score.longSummary += `${band} - `
        const parts = []
        Object.keys(score.modes ?? {}).sort().forEach(mode => {
          if (score?.bandModes[`${band}-${mode}`]) {
            parts.push(`${score.bandModes[`${band}-${mode}`]} ${mode}`)
          }
        })
        if (parts.length > 1) {
          parts.push(`Total ${score.bands[band]}`)
        }
        score.longSummary += `${parts.join(' • ')}\n`
      }
    })

    return score
  }
}

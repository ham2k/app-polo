/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { filterRefs } from '../../../tools/refTools'

import { ActivityOptions } from './GAPOTAActivityOptions'

export const Info = {
  key: 'georgia-pota',
  icon: 'pine-tree-box',
  emoji: '🍑',
  name: 'Georgia State Parks on the Air',
  shortName: 'GA POTA'
}

const Extension = {
  ...Info,
  category: 'contests',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.key}`, { hook: ReferenceHandler })
  }
}
export default Extension

const GEORGIA_PARKS = {
  'US-0636': 'Jekyll Island State Park',
  'US-2165': 'A. H. Stephens State Park',
  'US-2166': 'Amicalola Falls State Park',
  'US-2167': 'Black Rock Mountain State Park',
  'US-2168': 'Chattahoochee Bend State Park',
  'US-2169': 'Cloudland Canyon State Park',
  'US-2170': 'Crooked River State Park',
  'US-2171': 'Don Carter State Park',
  'US-2172': 'Elijah Clark State Park',
  'US-2173': 'F.D. Roosevelt State Park',
  'US-2174': 'Florence Marina State Park',
  'US-2175': 'Fort McAllister State Park',
  'US-2176': 'Fort Mountain State Park',
  'US-2177': 'Fort Yargo State Park',
  'US-2178': 'General Coffee State Park',
  'US-2179': 'George L. Smith State Park',
  'US-2180': 'George T. Bagby and Lodge State Park',
  'US-2181': 'Georgia Veterans State Park',
  'US-2182': 'Jack Hill State Park',
  'US-2183': 'Hamburg State Park',
  'US-2184': 'Hard Labor Creek State Park',
  'US-2185': 'High Falls State Park',
  'US-2186': 'Indian Springs State Park',
  'US-2187': 'James H. (Sloppy) Floyd State Park',
  'US-2188': 'Laura S. Walker State Park',
  'US-2189': 'Little Ocmulgee State Park',
  'US-2190': 'Magnolia Springs State Park',
  'US-2191': 'Mistletoe State Park',
  'US-2192': 'Moccasin Creek State Park',
  'US-2193': 'Panola Mountain State Park',
  'US-2194': 'Red Top Mountain State Park',
  'US-2195': 'Reed Bingham State Park',
  'US-2196': 'Richard B. Russell State Park',
  'US-2197': 'Seminole State Park',
  'US-2198': 'Skidaway Island State Park',
  'US-2199': 'Smithgall Woods State Park',
  'US-2200': 'Stephen C Foster State Park',
  'US-2201': 'Sweetwater Creek State Park',
  'US-2202': 'Tallulah Gorge State Park',
  'US-2203': 'Tugaloo State Park',
  'US-2204': 'Unicoi State Park',
  'US-2205': 'Victoria Bryant State Park',
  'US-2206': 'Vogel State Park',
  'US-2207': 'Watson Mill Bridge State Park',
  'US-3726': 'Kolomoki Mounds State Park',
  'US-3727': 'Hart State Park',
  'US-3728': 'Providence Canyon State Park',
  'US-7858': 'Dames Ferry Campground State Park',
  'US-7861': 'Suwannee River Eco-Lodge State Park',
  'US-7896': 'Standing Boy Creek State Park',
  'US-9798': 'Centennial Olympic Park',
  'US-9799': 'Stone Mountain Park'
}

const ActivityHook = {
  ...Info,
  Options: ActivityOptions,

  hideStateField: false
}

const ReferenceHandler = {
  ...Info,

  relevantInfoForQSOItem: ({ qso, operation }) => {
    const refs = filterRefs(qso, 'pota').filter(x => x.ref)

    if (refs.filter(x => GEORGIA_PARKS[x.ref]).length > 0) {
      return ['🍑']
    } else {
      return []
    }
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    const { band, mode, uuid, startAtMillis } = qso

    const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

    const refs = filterRefs(qso, 'pota').filter(x => x.ref)
    const georgiaRefs = refs.filter(x => GEORGIA_PARKS[x.ref])

    const refCount = refs.length
    let value
    let type
    if (ref?.ref) {
      type = 'potaActivation'
      value = refCount || 1
    } else {
      type = 'pota'
      value = refCount
    }

    if (value === 0) return { value: 0 } // If not activating, only counts if other QSO has a POTA ref

    const nearDupes = (qsos || []).filter(q => !q.deleted && (startAtMillis ? q.startAtMillis < startAtMillis : true) && q.their.call === qso.their.call && q.uuid !== uuid)

    const gaPark = georgiaRefs.map(r => r.ref)[0]
    const emoji = gaPark ? '🍑' : undefined

    if (nearDupes.length === 0) {
      return { value, refCount, type, gaPark, emoji }
    } else {
      const thisQSOTime = qso.startAtMillis ?? Date.now()
      const day = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)

      const sameBand = nearDupes.filter(q => q.band === band).length !== 0
      const sameMode = nearDupes.filter(q => q.mode === mode).length !== 0
      const sameDay = nearDupes.filter(q => (q.startAtMillis - (q.startAtMillis % TWENTY_FOUR_HOURS_IN_MILLIS)) === day).length !== 0
      const sameRefs = nearDupes.filter(q => filterRefs(q, 'pota').filter(r => refs.find(qr => qr.ref === r.ref)).length > 0).length !== 0
      if (sameBand && sameMode && sameDay && (sameRefs || refs.length === 0)) {
        return { value: 0, refCount, alerts: ['duplicate'], type, gaPark, emoji }
      } else {
        const notices = []
        if (refs.length > 0 && !sameRefs) notices.push('newRef') // only if at new ref
        if (!sameDay) notices.push('newDay')
        if (!sameMode) notices.push('newMode')
        if (!sameBand) notices.push('newBand')

        return { value, refCount, notices, type, gaPark, emoji }
      }
    }
  },

  accumulateScoreForOperation: ({ qsoScore, score, operation, ref }) => {
    if (!score?.key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key: Info.key,
      icon: Info.icon,
      label: Info.shortName,
      value: 0,
      gaParks: {}
    }

    score.value = score.value + qsoScore.value

    if (qsoScore.gaPark) {
      score.gaParks[qsoScore.gaPark] = (score.gaParks[qsoScore.gaPark] || 0) + 1
    }

    return score
  },

  summarizeScore: ({ score, operation, ref, section }) => {
    const parkCount = Object.keys(score?.gaParks ?? {}).length

    score.summary = `${score.value}q ${parkCount}p`

    const lines = [`${score.value + 5 * parkCount} points`]

    lines.push(`${score.value} points from QSOs • ${5 * parkCount} points from Parks`)
    lines.push(`### ${parkCount} Georgia State Park${parkCount === 1 ? '' : 's'}`)
    let line = '> '
    Object.keys(GEORGIA_PARKS).forEach(gaPark => {
      if (score.gaParks[gaPark]) {
        line += `**~~${gaPark.replace('US-', '')}~~**  `
      } else {
        line += `${gaPark.replace('US-', '')}  `
      }
    })
    lines.push(line)

    score.longSummary = lines.join('\n')

    return score
  }
}

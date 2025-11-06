/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber } from "@ham2k/lib-format-tools"

import { filterNearDupes } from "../../tools/qsonTools"
import { filterRefs } from "../../tools/refTools"

const DEBUG = true
const DEBUG_ACTIVITIES = ['SOTA']
const DEBUG_CALLS = ['KN2X']

const TWENTY_FOUR_HOURS_IN_MILLIS = 1000 * 60 * 60 * 24

export const generateActivityScorer = ({ info }) => {
  const shortName = info.shortName ?? info.name
  const activationType = info.activationType ?? info.type
  const huntingType = info.huntingType ?? info.type
  const allowsMultipleReferences = info.scoring?.allowsMultipleReferences ?? false
  const uniquePer = (info.scoring?.uniquePer ?? []).reduce((parts, part) => { parts[part] = true; return parts }, {})

  return ({ qso, qsos, operation, ref: scoredRef }) => {
    const DEBUG_THIS_ONE = DEBUG && DEBUG_ACTIVITIES.includes(shortName) && DEBUG_CALLS.includes(qso?.their?.call)

    const { band, mode, uuid, startAtMillis } = qso

    if (DEBUG_THIS_ONE) console.log(`🧮 ${shortName} scoringForQSO`, { ...operation }, { ...scoredRef })

    const allRefs = filterRefs(qso, huntingType).filter(x => x.ref)
    const refs = allowsMultipleReferences ? allRefs : allRefs.slice(0, 1)
    const refCount = refs.length
    let value
    let type
    if (scoredRef?.ref) {
      type = activationType
      value = refCount || 1
    } else {
      type = huntingType
      value = refCount
    }

    const score = { value, refCount, refs, type }

    if (value === 0) return score // If not activating, only counts if other QSO has a ref

    let nearDupes = filterNearDupes({ qso, qsos, operation, withSectionRefs: [scoredRef] })
    if (DEBUG_THIS_ONE) console.log('-- nearDupes', qso.uuid, qso.key, nearDupes)

    if (nearDupes.length === 0) {
      if (DEBUG_THIS_ONE) console.log('-- no dupes', { value, refCount, type })
      return score
    } else {
      const notices = []
      const alerts = []

      if (uniquePer.day) {
        const thisQSOTime = qso.startAtMillis ?? Date.now()
        const startOfDay = thisQSOTime - (thisQSOTime % TWENTY_FOUR_HOURS_IN_MILLIS)
        if (DEBUG_THIS_ONE) console.log('-- uniquePer.day', [...nearDupes], thisQSOTime, startOfDay)
        nearDupes = nearDupes.filter(q => (q.startAtMillis >= startOfDay))
        if (DEBUG_THIS_ONE) console.log('-- uniquePer.day after', [...nearDupes])
        if (nearDupes.length === 0) notices.push('newDay')
      }

      if (uniquePer.band) {
        nearDupes = nearDupes.filter(q => q.band === band)
        if (nearDupes.length === 0 && notices.length === 0) notices.push('newBand')
      }

      if (uniquePer.mode) {
        nearDupes = nearDupes.filter(q => q.mode === mode)
        if (nearDupes.length === 0 && notices.length === 0) notices.push('newMode')
      }

      if (uniquePer.ref) {
        if (DEBUG_THIS_ONE) console.log('-- uniquePer.ref', [...nearDupes], refs)

        // q refs = [], refs = []  -> dupe
        // q refs = [], refs = [1] -> new ref
        // q refs = [1], refs = [] -> maybe
        // q refs = [1], refs = [1] -> dupe
        // q refs = [1], refs = [2] -> new ref

        nearDupes = nearDupes.filter(q => {
          const qRefs = filterRefs(q, huntingType)
          if (DEBUG_THIS_ONE) console.log('-- uniquePer.ref q', qRefs, q)
          return (qRefs.length === 0 && refs.length === 0) || qRefs.filter(qr => refs.find(r => qr.ref === r.ref)).length > 0
        })
        if (DEBUG_THIS_ONE) console.log('-- uniquePer.ref after', [...nearDupes])

        if (nearDupes.length === 0 && notices.length === 0) {
          if (refCount > 0) {
            notices.push('newRef')
          }
        } else if (nearDupes.length > 0 && !qso.uuid && refCount === 0) {
          // If we're scoring a new QSO that has no refs (yet?), and there are dupes that have refs,
          // then it might be a dupe, or not if they enter a different ref.

          const dupesHadRefs = nearDupes.filter(q => filterRefs(q, huntingType).length > 0).length > 0
          if (DEBUG_THIS_ONE) console.log('-- dupesHadRefs', dupesHadRefs, nearDupes)
          if (dupesHadRefs && notices.length === 0) {
            notices.push('maybeDupe')
          }
        }
      }

      if (notices.length === 0 && nearDupes.length > 0) {
        alerts.push('duplicate')
      }

      if (DEBUG_THIS_ONE) console.log('-- ', notices)
      if (DEBUG_THIS_ONE) console.log('-- ', alerts)
      return { ...score, notices, alerts }
    }
  }
}

export const generateActivityDailyAccumulator = ({ info }) => {
  const key = info.key
  const icon = info.icon
  const shortName = info.shortName ?? info.name

  return ({ qsoScore, score, operation, ref: scoredRef }) => {
    const DEBUG_THIS_ONE = DEBUG && DEBUG_ACTIVITIES.includes(shortName)

    if (!score?.key || score.key !== key) score = undefined // Reset if score doesn't have the right shape
    score = score ?? {
      key,
      icon,
      label: shortName,
      huntedQSOs: 0,
      huntedQSOsWhileActivating: 0,
      activatedQSOs: 0,
      activatedRefs: {},
      huntedRefs: {},
      for: 'day'
    }

    if (scoredRef?.ref && qsoScore?.value) {
      score.activatedRefs[scoredRef.ref] = (score.activatedRefs[scoredRef.ref] ?? 0) + qsoScore?.value
      score.activatedQSOs = score.activatedQSOs + qsoScore.value
    }

    if (qsoScore?.refs?.length > 0) {
      qsoScore.refs.forEach(ref => {
        score.huntedRefs[ref.ref] = (score.huntedRefs[ref.ref] ?? 0) + 1
        score.huntedQSOs = score.huntedQSOs + 1
        if (scoredRef?.ref) score.huntedQSOsWhileActivating = score.huntedQSOsWhileActivating + 1
      })
    }

    return score
  }
}


export const generateActivitySumarizer = ({ info }) => {
  const shortName = info.shortName ?? info.name
  const qsosToActivate = info.scoring?.qsosToActivate ?? 10

  const referenceLabel = info.scoring?.referenceLabel ?? 'reference'
  const referencesLabelPlural = info.scoring?.referenceLabelPlural ?? referenceLabel + 's'

  const ref2refLabel = info.scoring?.ref2refLabel ?? (shortName.substring(0, 1) + 'S' + shortName.substring(0, 1))
  const ref2refShortLabel = info.scoring?.ref2refShortName ?? ref2refLabel

  const huntedShortLabel = info.scoring?.huntedShorterName ?? shortName.substring(0, 1)

  const activatorQSOLabel = info.scoring?.activatorQSOLabel ?? 'activator QSO'
  const activatorQSOsLabel = info.scoring?.activatorQSOsLabel ?? 'activator QSOs'
  const ref2refQSOLabel = info.scoring?.ref2refQSOLabel ?? ref2refLabel + ' QSO'
  const ref2refQSOsLabel = info.scoring?.ref2refQSOsLabel ?? ref2refLabel + ' QSOs'
  const hunterQSOLabel = info.scoring?.hunterQSOLabel ?? 'hunter QSO'
  const hunterQSOsLabel = info.scoring?.hunterQSOsLabel ?? 'hunter QSOs'

  const referenceActivatedLabel = info.scoring?.referenceActivatedLabel ?? referenceLabel + ' activated'
  const referencesActivatedLabel = info.scoring?.referencesActivatedLabel ?? referencesLabelPlural + ' activated'
  const referenceMissedLabel = info.scoring?.referenceMissedLabel ?? referenceLabel + ' missed'
  const referencesMissedLabel = info.scoring?.referencesMissedLabel ?? referencesLabelPlural + ' missed'
  const referenceHuntedLabel = info.scoring?.referenceHuntedLabel ?? referenceLabel + ' hunted'
  const referencesHuntedLabel = info.scoring?.referencesHuntedLabel ?? referencesLabelPlural + ' hunted'

  return ({ score, operation, ref: scoredRef, section, allSectionScores }) => {
    const DEBUG_THIS_ONE = DEBUG && DEBUG_ACTIVITIES.includes(shortName)

    if (DEBUG_THIS_ONE) console.log('summarizeScore', shortName, { ...score })

    const activatedRefKeys = Object.keys(score.activatedRefs ?? {}).sort()

    const minMissing = Math.min(...Object.values(score.activatedRefs))

    // Short Summary

    const summaryParts = []
    if (activatedRefKeys.length > 0) {
      if (minMissing < qsosToActivate) {
        summaryParts.push(`${minMissing}/${qsosToActivate}`)
        score.activated = false
      } else if (activatedRefKeys.length < 6) {
        summaryParts.push(`✓`.repeat(activatedRefKeys.length))
        score.activated = true
      } else {
        summaryParts.push(`✓ x ${activatedRefKeys.length}`)
        score.activated = true
      }
    }
    if (score.huntedRefs.length > 0) {
      summaryParts.push(`${fmtNumber(Object.keys(score.huntedRefs.length))} ${activatedRefKeys.length > 0 ? ref2refShortLabel : huntedShortLabel}`)
    }
    score.summary = summaryParts.join(' +')

    // Long Summary

    score.longSummary = ''
    const qsoCounts = []
    if (activatedRefKeys.length > 0) {
      qsoCounts.push(`${fmtNumber(score.activatedQSOs)} ${activatorQSOLabel.length === 1 ? activatorQSOLabel : activatorQSOsLabel}`)
    }
    if (score.huntedQSOs > 0) {
      if (activatedRefKeys.length > 0) {
        qsoCounts.push(`${fmtNumber(score.huntedQSOs)} ${ref2refQSOLabel.length === 1 ? ref2refQSOLabel : ref2refQSOsLabel}`)
      } else {
        qsoCounts.push(`${fmtNumber(score.huntedQSOs)} ${hunterQSOLabel.length === 1 ? hunterQSOLabel : hunterQSOsLabel}`)
      }
    }
    score.longSummary += qsoCounts.join(' • ')

    if (activatedRefKeys.length > 0) {
      score.longSummary += `\n\n${activatedRefKeys.map(key => {
        if (score.activatedRefs[key] >= qsosToActivate) {
          return `✅ **${key}: ${fmtNumber(score.activatedRefs[key])}**`
        } else {
          return `❌ ${key}: ${fmtNumber(score.activatedRefs[key])}/${qsosToActivate}`
        }
      }).join('\n')}`
    }

    if (allSectionScores?.length > 1) {
      const refTotals = allSectionScores.reduce((totals, sectionScore) => {
        Object.keys(sectionScore.activatedRefs).forEach(key => {
          if (sectionScore.activatedRefs[key] >= qsosToActivate) {
            totals.activated += 1
          } else {
            totals.missed += 1
          }
        })
        totals.hunted += Object.keys(sectionScore.huntedRefs).length
        return totals
      }, { activated: 0, hunted: 0, missed: 0 })
      if (refTotals.activated > 0 || refTotals.hunted > 0 || refTotals.missed > 0) {
        score.longSummary += `\n\n---\n\n## Operation Totals\n `
        const totalsParts = []
        if (refTotals.activated > 0) {
          totalsParts.push(`**${refTotals.activated} ${refTotals.activated === 1 ? referenceActivatedLabel : referencesActivatedLabel}**`)
        }
        if (refTotals.missed > 0) {
          totalsParts.push(`${refTotals.missed} ${refTotals.missed === 1 ? referenceMissedLabel : referencesMissedLabel}`)
        }
        if (refTotals.hunted > 0) {
          totalsParts.push(`**${refTotals.hunted} ${refTotals.hunted === 1 ? referenceHuntedLabel : referencesHuntedLabel}**`)
        }
        score.longSummary += totalsParts.join('\n')
      }
    }

    if (DEBUG_THIS_ONE) console.log(`-- summary for ${shortName}: ${score.summary}`)
    if (DEBUG_THIS_ONE) console.log(`-- longSummary for ${shortName}: ${score.longSummary}`)

    return score
  }
}

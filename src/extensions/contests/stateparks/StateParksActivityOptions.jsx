/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useCallback, useEffect, useMemo } from 'react'

import { fmtDateTimeNice, fmtTimeBetween, prepareDateValue } from '@ham2k/lib-format-tools'
import { filterRefs, findRef, replaceRef, replaceRefs } from '@ham2k/lib-qson-tools'

import { H2kDropDown, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'

import { Info } from './StateParksInfo'
import { spData, STATE_PARKS_DATA } from './StateParksExtension'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const sp = useMemo(() => spData({ ref: activityRef }), [activityRef])

  const stateParksOptions = useMemo(() => {
    const now = new Date()

    const activeStateParksKeys = Object.keys(STATE_PARKS_DATA).filter(key => STATE_PARKS_DATA[key].options && !STATE_PARKS_DATA[key].disabled)
    const activeStateParksData = activeStateParksKeys.map(key => {
      const date = new Date(STATE_PARKS_DATA[key].start)
      let days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      let timeDiff
      if (days < -14) {
        timeDiff = 'Already happened'
        days = days + 365
      } else if (days < -2) {
        timeDiff = 'Last weekend'
      } else if (days >= -1 && days <= 1) {
        timeDiff = 'This weekend'
      } else if (days > 1) {
        timeDiff = `in ${days} days`
      }

      return {
        label: `${STATE_PARKS_DATA[key].name?.replace(' SP OTA Contest', '')} (${timeDiff})`,
        value: key,
        days
      }
    }).sort((a, b) => a.days - b.days)

    return activeStateParksData
  }, [])

  const handleStateParkChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ref: value }))
  }, [activityRef, allRefs, setRefs])

  const handleLocationChange = useCallback((value) => {
    const potaRefs = filterRefs(operation, 'potaActivation')
    const regularPotaRefs = potaRefs.filter(r => !r._spLocation)
    if (sp.parkAbbreviations && sp.parkAbbreviations[value]) {
      regularPotaRefs.push({ type: 'potaActivation', ref: sp.parkReferences[value], _spLocation: value })
    }

    let newRefs = replaceRefs(operation?.refs, 'potaActivation', regularPotaRefs)
    newRefs = replaceRef(newRefs, Info.key, { ...activityRef, location: value })

    setRefs(newRefs)
  }, [activityRef, operation, setRefs, sp.parkAbbreviations, sp.parkReferences])

  useEffect(() => {
    if (activityRef?.location === undefined && sp?.parkAbbreviations) {
      const potaRefs = filterRefs(operation, 'potaActivation')
      const park = potaRefs.map(r => sp.parks[r.ref]).filter(Boolean)[0]
      if (park) {
        setRefs(replaceRef(allRefs, Info.key, { ...activityRef, location: park }))
      }
    }
  }, [activityRef, activityRef?.location, allRefs, operation, setRefs, sp?.parkAbbreviations, sp.parks])

  const needsLocation = useMemo(() => {
    return !!sp?.parkAbbreviations
  }, [sp])

  const locationLabel = useMemo(() => {
    if (!activityRef?.location) return null
    if (sp?.parkAbbreviations && sp?.parkAbbreviations[activityRef?.location]) {
      return [sp?.parkReferences[activityRef?.location], sp?.parkAbbreviations[activityRef?.location]].filter(Boolean).join(' ')
    }
  }, [activityRef?.location, sp?.parkAbbreviations, sp?.parkReferences])

  return (
    <>
      <H2kListSection title={'Which State Park Event?'}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            value={activityRef?.ref}
            placeholder="Select a State Park Event"
            onChangeText={handleStateParkChange}
            dropDownContainerMaxHeight={styles.oneSpace * 45}
            style={{ width: styles.oneSpace * (styles.size === 'xs' ? 13 : 15) }}
            options={stateParksOptions}
          />
        </H2kListRow>
      </H2kListSection>

      {needsLocation && (
        <H2kListSection title={'Location'}>
          <H2kListRow>
            <H2kTextInput
              label="Location (Park Abbreviation)"
              value={activityRef?.location || ''}
              uppercase={true}
              onChangeText={handleLocationChange}
            />
          </H2kListRow>
          {activityRef?.location?.length >= 2 && (
            locationLabel ? (
              <H2kMarkdown style={{ padding: styles.oneSpace, marginHorizontal: styles.oneSpace }}>
                {locationLabel}
              </H2kMarkdown>
            ) : (
              <H2kMarkdown style={{ padding: styles.oneSpace, color: 'red', marginHorizontal: styles.oneSpace }}>
                Not found!
              </H2kMarkdown>
            )
          )}
        </H2kListSection>
      )}

      {sp && (
        <>
          <H2kListSection title={'Information'}>
            <H2kListRow>
              <H2kMarkdown style={{ marginHorizontal: styles.oneSpace }} styles={{ markdown: { paragraph: { marginBottom: styles.oneSpace } } }}>{`
**Please, also check your POTA activation settings!**

**Official Site:**
[${sp.url}](${sp.url})

${sp.secondStart ? (
`**First Period (Local Time):**
${fmtTimeBetween(sp.start, sp.end, { roundTo: 'hours' })}: ${_fmtDateTimeNiceRange(sp.start, sp.end).replaceAll(/:00 /g, '')}
**Second Period (Local Time):**
${fmtTimeBetween(sp.secondStart, sp.secondEnd, { roundTo: 'hours' })}: ${_fmtDateTimeNiceRange(sp.secondStart, sp.secondEnd).replaceAll(/:00 /g, '')}
`
) : (
`**Period (Local Time):**
${_fmtDateTimeNiceRange(sp.start, sp.end).replaceAll(/:00 /g, '')}`
)}

${sp.notes ? `**Notes:**\n${sp.notes}` : ''}

${sp.lastUpdated ? `**Last Updated:** ${sp.lastUpdated}` : ''}

${sp.status ? `**Status:** ${sp.status}` : ''}
`}
              </H2kMarkdown>
            </H2kListRow>
          </H2kListSection>
        </>
      )}
    </>
  )
}

function _fmtDateTimeNiceRange (t1, t2) {
  t1 = prepareDateValue(t1)
  t2 = prepareDateValue(t2)
  const diffInDays = (t2 - t1) / (1000 * 60 * 60 * 24)
  if (diffInDays < 7) {
    const date1 = t1.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    const date2 = t2.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    if (date1 === date2) {
      return [
        t1.toLocaleTimeString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: undefined, hour: '2-digit', minute: '2-digit', seconds: undefined }),
        t2.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', seconds: undefined })
      ].join(' to ')
    } else {
      return [
        t1.toLocaleTimeString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: undefined, seconds: undefined }),
        t2.toLocaleTimeString(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit', seconds: undefined })
      ].join(' to ')
    }
  } else {
    return [fmtDateTimeNice(t1), fmtDateTimeNice(t2)].join(' to ')
  }
}

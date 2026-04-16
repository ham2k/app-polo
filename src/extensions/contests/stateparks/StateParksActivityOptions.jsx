/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useCallback, useMemo } from 'react'

import { H2kDropDown, H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'
import { fmtDateTimeNice, fmtTimeBetween, prepareTimeValue } from '../../../tools/timeFormats'
import { findRef, replaceRef } from '../../../tools/refTools'

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

  // const handleSpotToQPHubChange = useCallback((value) => {
  //   if (value === undefined) value = !activityRef?.spotToQPHub
  //   setRefs(replaceRef(allRefs, Info.key, { ...activityRef, spotToQPHub: value }))
  // }, [activityRef, allRefs, setRefs])

  // const handleSpotToAPRSChange = useCallback((value) => {
  //   if (value === undefined) value = !activityRef?.spotToAPRS
  //   setRefs(replaceRef(allRefs, Info.key, { ...activityRef, spotToAPRS: value }))
  // }, [activityRef, allRefs, setRefs])

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

      {sp && (
        <>
          <H2kListSection title={'Information'}>
            <H2kListRow>
              <H2kMarkdown style={{ marginHorizontal: styles.oneSpace }} styles={{ markdown: { paragraph: { marginBottom: styles.oneSpace } } }}>{`
**You also need to configure a POTA activity with the park references you are activating!**

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
  t1 = prepareTimeValue(t1)
  t2 = prepareTimeValue(t2)
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

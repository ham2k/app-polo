/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import React, { useCallback, useMemo } from 'react'

import { H2kDropDown, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'
import { findRef, replaceRef } from '../../../tools/refTools'

import { VHF_CONTESTS_DATA } from './RSGBVHFContestsExtension'
import { Info } from './RSGBVHFContestsInfo'
import { RSGB_CLASSES } from './RSGBVHFData'
import { RSGB_POSTCODE_DISTRICTS } from './RSGBDistricts'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const testOptions = useMemo(() => {
    const now = new Date()

    const testKeys = Object.keys(VHF_CONTESTS_DATA)
    const testData = testKeys.map(key => {
      const date = new Date(VHF_CONTESTS_DATA[key].start)
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
        label: `${VHF_CONTESTS_DATA[key].name} (${timeDiff})`,
        value: key,
        days
      }
    }).sort((a, b) => a.days - b.days)

    return testData
  }, [])

  const handleTestChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, ref: value }))
  }, [activityRef, allRefs, setRefs])

  const test = useMemo(() => {
    return VHF_CONTESTS_DATA[activityRef?.ref]
  }, [activityRef])

  const classOptions = useMemo(() => {
    if (!test || !test.modes) return []

    return Object
      .entries(RSGB_CLASSES)
      .filter(([key, value]) => test?.classes?.includes(key))
      .map(([key, value]) => {
        return {
          label: value,
          value: key
        }
      })
  }, [test])

  const handleClassChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, class: value }))
  }, [activityRef, allRefs, setRefs])

  const gridExchange = useMemo(() => {
    if (test?.exchange?.includes('grid') || test?.exchange === undefined) {
      return operation.grid
    }
    return undefined
  }, [test, operation.grid])

  const districtExchange = useMemo(() => {
    if (test?.exchange?.includes('district')) {
      return RSGB_POSTCODE_DISTRICTS[activityRef?.exchange] || 'Not found!'
    }
    return undefined
  }, [test, activityRef?.exchange])

  const handleExchangeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, exchange: (value ?? '').toUpperCase() }))
  }, [activityRef, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={'Which VHF Contest?'}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            value={activityRef?.ref}
            placeholder="Select a VHF Contest"
            onChangeText={handleTestChange}
            dropDownContainerMaxHeight={styles.oneSpace * 45}
            style={{ width: styles.oneSpace * (styles.size === 'xs' ? 13 : 15) }}
            options={testOptions}
          />
        </H2kListRow>
      </H2kListSection>

      <H2kListSection title={'Section (Classification)'}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          <H2kDropDown
            value={activityRef?.class}
            placeholder="Select a Section"
            disabled={!test}
            onChangeText={handleClassChange}
            options={classOptions}
          />
        </H2kListRow>
      </H2kListSection>

      <H2kListSection title={'Exchange'} style={{ marginBottom: styles.oneSpace * 4 }}>
        <H2kListRow style={{ maxWidth: styles.oneSpace * 80 }}>
          {gridExchange !== undefined && (
            <>
              <H2kTextInput
                label="Grid Locator"
                value={gridExchange}
                disabled={true}
              />
              <H2kMarkdown style={{ padding: styles.oneSpace }}>
                Update your grid locator in the operation settings
              </H2kMarkdown>
            </>
          )}
          {districtExchange !== undefined && (
            <>
              <H2kTextInput
                label="District"
                value={activityRef?.exchange ?? ''}
                placeholder="Enter your exchange"
                onChangeText={handleExchangeChange}
              />
              <H2kMarkdown style={{ padding: styles.oneSpace }}>
                {districtExchange}
              </H2kMarkdown>
            </>
          )}
        </H2kListRow>
      </H2kListSection>

      {/* {test && (
        <>
          <H2kListSection title={'Information'}>
            <H2kListRow>
              <H2kMarkdown style={{ marginHorizontal: styles.oneSpace }} styles={{ markdown: { paragraph: { marginBottom: styles.oneSpace } } }}>{`
**Official Site:**
[${test.url}](${test.url})

${sp.lastUpdated ? `**Last Updated:** ${sp.lastUpdated}` : ''}

${sp.status ? `**Status:** ${sp.status}` : ''}
`}
              </H2kMarkdown>
            </H2kListRow>
          </H2kListSection>
        </>
      )} */}
    </>
  )
}

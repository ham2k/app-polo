// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useMemo } from 'react'

import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kDropDown, H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'

import { VHF_CONTESTS_DATA } from './ARRLVHFContestsExtension'
import { Info } from './ARRLVHFContestsInfo'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])
  const test = useMemo(() => VHF_CONTESTS_DATA[activityRef?.ref], [activityRef])

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

      {test && (
        <>
          <H2kListSection title={'Information'}>
            <H2kListRow>
              <H2kMarkdown style={{ marginHorizontal: styles.oneSpace }} styles={{ markdown: { paragraph: { marginBottom: styles.oneSpace } } }}>{`

${test.notes ? `**Notes:**\n${test.notes}\n\n` : ''}
${test.url ? `**Official Site:**\n[${test.url}](${test.url})\n\n` : ''}
${test.rules ? `**Rules:**\n[${test.rules}](${test.rules})\n\n` : ''}

${test.lastUpdated ? `**Last Updated:** ${test.lastUpdated}` : ''}

${test.status ? `**Status:** ${test.status}` : ''}
`}
              </H2kMarkdown>
            </H2kListRow>
          </H2kListSection>
        </>
      )}
    </>
  )
}

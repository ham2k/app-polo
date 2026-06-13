// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo } from 'react'
import { SegmentedButtons } from 'react-native-paper'

import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'

import { Info } from './CQWPXExtension'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  useEffect(() => {
    if (!findRef(operation?.refs, Info.key)) {
      setRefs(replaceRef(allRefs, Info.key, { type: Info.key, mode: 'CW' }))
    }
  }, [allRefs, operation, setRefs])

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleModeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, mode: value }))
  }, [activityRef, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={'CQ WPX Contest'}>

        <H2kListRow>
          <SegmentedButtons
            value={activityRef?.mode}
            onValueChange={handleModeChange}
            buttons={[
              { label: 'CW', value: 'CW' },
              { label: 'SSB', value: 'SSB' },
              { label: 'RTTY', value: 'RTTY' }
            ]}
          />
        </H2kListRow>

        <H2kListRow>
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
*Official Rules*: [https://cqwpx.com/rules/](https://cqwpx.com/rules/)

`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

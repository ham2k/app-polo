// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { SegmentedButtons } from 'react-native-paper'

import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { selectOperationCallInfo } from '../../../store/operations'
import { H2kEnhancedTextInput, H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'

import { Info } from './CQWWExtension'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const ourInfoSelector = useCallback((state) => selectOperationCallInfo(state, operation?.uuid), [operation?.uuid])
  const ourInfo = useSelector(ourInfoSelector)

  useEffect(() => {
    if (!findRef(operation?.refs, Info.key)) {
      setRefs(replaceRef(allRefs, Info.key, { type: Info.key, mode: 'CW' }))
    }
  }, [allRefs, operation, setRefs])

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleModeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, mode: value }))
  }, [activityRef, allRefs, setRefs])

  const handleZoneChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, zone: value }))
  }, [activityRef, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={'CQ World Wide DX Contest'}>

        <H2kListRow>
          <SegmentedButtons
            value={activityRef?.mode}
            onValueChange={handleModeChange}
            buttons={[
              { label: 'CW', value: 'CW' },
              { label: 'SSB', value: 'SSB' }
            ]}
          />
        </H2kListRow>

        <H2kListRow>
          <H2kEnhancedTextInput
            style={{ flex: 1 }}
            label={'Your CQ Zone'}
            placeholder={ourInfo?.cqZone ? String(ourInfo.cqZone) : ''}
            value={activityRef?.zone ?? ''}
            keyboard={'numbers'}
            numeric={true}
            onChangeText={handleZoneChange}
          />
        </H2kListRow>

        <H2kListRow>
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
*Official Rules*: [https://cqww.com/rules.htm](https://cqww.com/rules.htm)

`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

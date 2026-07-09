// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { SegmentedButtons } from 'react-native-paper'

import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { selectOperationCallInfo } from '../../../store/operations'
import { H2kEnhancedTextInput, H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'

import { Info } from './ARRLDXExtension'

const WVE_DXCC_CODES = [1, 291]

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const ourInfoSelector = useCallback((state) => selectOperationCallInfo(state, operation?.uuid), [operation?.uuid])
  const ourInfo = useSelector(ourInfoSelector)

  useEffect(() => {
    if (!findRef(operation?.refs, Info.key)) {
      const guessedType = WVE_DXCC_CODES.includes(ourInfo?.dxccCode) ? 'wve' : 'dx'
      setRefs(replaceRef(allRefs, Info.key, { type: Info.key, mode: 'CW', stationType: guessedType }))
    }
  }, [allRefs, operation, ourInfo, setRefs])

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleModeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, mode: value }))
  }, [activityRef, allRefs, setRefs])

  const handleStationTypeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, stationType: value }))
  }, [activityRef, allRefs, setRefs])

  const handleExchangeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, exchange: value?.toUpperCase() }))
  }, [activityRef, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={'ARRL International DX Contest'}>

        <H2kListRow>
          <SegmentedButtons
            value={activityRef?.mode}
            onValueChange={handleModeChange}
            buttons={[
              { label: 'CW', value: 'CW' },
              { label: 'Phone', value: 'Phone' }
            ]}
          />
        </H2kListRow>

        <H2kListRow>
          <SegmentedButtons
            value={activityRef?.stationType}
            onValueChange={handleStationTypeChange}
            buttons={[
              { label: 'W/VE Station', value: 'wve' },
              { label: 'DX Station', value: 'dx' }
            ]}
          />
        </H2kListRow>

        <H2kListRow>
          <H2kEnhancedTextInput
            style={{ flex: 1 }}
            label={activityRef?.stationType === 'dx' ? 'Your Power' : 'Your State/Province'}
            placeholder={activityRef?.stationType === 'dx' ? '100' : ''}
            value={activityRef?.exchange ?? ''}
            onChangeText={handleExchangeChange}
          />
        </H2kListRow>

        <H2kListRow>
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
W/VE stations may only contact DX stations, and vice versa. Alaska (KL7), Hawaii (KH6), St. Paul Is. (CY9), and Sable Is. (CY0) count as DX stations.

*Official Rules*: [https://www.arrl.org/arrl-dx](https://www.arrl.org/arrl-dx)

`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

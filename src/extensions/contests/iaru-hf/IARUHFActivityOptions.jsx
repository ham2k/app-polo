// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { SegmentedButtons } from 'react-native-paper'

import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { selectOperationCallInfo } from '../../../store/operations'
import { H2kEnhancedTextInput, H2kListRow, H2kListSection, H2kMarkdown } from '../../../ui'

import { Info } from './IARUHFExtension'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const ourInfoSelector = useCallback((state) => selectOperationCallInfo(state, operation?.uuid), [operation?.uuid])
  const ourInfo = useSelector(ourInfoSelector)

  useEffect(() => {
    if (!findRef(operation?.refs, Info.key)) {
      setRefs(replaceRef(allRefs, Info.key, { type: Info.key, stationType: 'normal', modeRestriction: 'Mixed' }))
    }
  }, [allRefs, operation, setRefs])

  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleStationTypeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, stationType: value }))
  }, [activityRef, allRefs, setRefs])

  const handleModeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, modeRestriction: value }))
  }, [activityRef, allRefs, setRefs])

  const handleZoneChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, zone: value }))
  }, [activityRef, allRefs, setRefs])

  const handleSocietyChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, society: value?.toUpperCase() }))
  }, [activityRef, allRefs, setRefs])

  const handleOfficialChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, official: value }))
  }, [activityRef, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={'IARU HF World Championship'}>

        <H2kListRow>
          <SegmentedButtons
            value={activityRef?.modeRestriction ?? 'Mixed'}
            onValueChange={handleModeChange}
            buttons={[
              { label: 'Mixed', value: 'Mixed' },
              { label: 'CW Only', value: 'CW' },
              { label: 'Phone Only', value: 'Phone' }
            ]}
          />
        </H2kListRow>

        <H2kListRow>
          <SegmentedButtons
            value={activityRef?.stationType ?? 'normal'}
            onValueChange={handleStationTypeChange}
            buttons={[
              { label: 'Normal', value: 'normal' },
              { label: 'HQ Station', value: 'hq' },
              { label: 'Official', value: 'official' }
            ]}
          />
        </H2kListRow>

        {(!activityRef?.stationType || activityRef?.stationType === 'normal') && (
          <H2kListRow>
            <H2kEnhancedTextInput
              style={{ flex: 1 }}
              label={'Your ITU Zone'}
              placeholder={ourInfo?.ituZone ? String(ourInfo.ituZone) : ''}
              value={activityRef?.zone ?? ''}
              keyboard={'numbers'}
              numeric={true}
              onChangeText={handleZoneChange}
            />
          </H2kListRow>
        )}

        {activityRef?.stationType === 'hq' && (
          <H2kListRow>
            <H2kEnhancedTextInput
              style={{ flex: 1 }}
              label={'Society Abbreviation'}
              placeholder={'ARRL'}
              value={activityRef?.society ?? ''}
              uppercase={true}
              onChangeText={handleSocietyChange}
            />
          </H2kListRow>
        )}

        {activityRef?.stationType === 'official' && (
          <H2kListRow>
            <SegmentedButtons
              value={activityRef?.official ?? 'AC'}
              onValueChange={handleOfficialChange}
              buttons={[
                { label: 'AC', value: 'AC' },
                { label: 'R1', value: 'R1' },
                { label: 'R2', value: 'R2' },
                { label: 'R3', value: 'R3' }
              ]}
            />
          </H2kListRow>
        )}

        <H2kListRow>
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
*Official Rules*: [https://www.arrl.org/iaru-hf-world-championship](https://www.arrl.org/iaru-hf-world-championship)

`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

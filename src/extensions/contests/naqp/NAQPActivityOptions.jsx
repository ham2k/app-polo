/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'

import { findRef, replaceRef } from '../../../tools/refTools'

import { H2kListSection, H2kListRow, H2kMarkdown, H2kTextInput, H2kDropDown } from '../../../ui'

import { Info } from './NAQPInfo'

export function ActivityOptions ({ styles, operation, refs: allRefs, setRefs }) {
  const activityRef = useMemo(() => findRef(allRefs, Info.key) ?? {}, [allRefs])

  const handleModeChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, mode: value }))
  }, [activityRef, allRefs, setRefs])

  const handleNameChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, name: value }))
  }, [activityRef, allRefs, setRefs])

  const handleLocationChange = useCallback((value) => {
    setRefs(replaceRef(allRefs, Info.key, { ...activityRef, location: value }))
  }, [activityRef, allRefs, setRefs])
  return (
    <>
      <H2kListSection title={'Exchange Details'}>
        <H2kListRow>
          <H2kDropDown
            label="Mode"
            value={activityRef?.mode}
            placeholder="SSB"
            onChangeText={handleModeChange}
            options={[
              { label: 'CW', value: 'CW' },
              { label: 'SSB', value: 'SSB' },
              { label: 'RTTY', value: 'RTTY' }
            ]}
          />

          <H2kTextInput
            label="Your Name"
            value={activityRef?.name || ''}
            uppercase={true}
            onChangeText={handleNameChange}
          />

          <H2kTextInput
            label="Your Location"
            value={activityRef?.location || ''}
            uppercase={true}
            onChangeText={handleLocationChange}
          />
          <H2kMarkdown style={{ marginTop: styles.oneSpace * 3 }}>{`
For the US, Canada, and Mexico, location is your State abbreviation.

For any other North American entity, use the standard DXCC prefix.

Outside of North America, use \`"DX"\`.
`}
          </H2kMarkdown>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

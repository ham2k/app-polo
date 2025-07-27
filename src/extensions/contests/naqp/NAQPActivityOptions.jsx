/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { findRef, replaceRef } from '../../../tools/refTools'

import { setOperationData } from '../../../store/operations'
import { H2kListSection, H2kListRow, H2kMarkdown, H2kTextInput, H2kDropDown } from '../../../ui'

import { Info } from './NAQPInfo'

export function ActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ref = useMemo(() => findRef(operation, Info.key), [operation])

  const handleModeChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, mode: value }) }))
  }, [dispatch, operation, ref])

  const handleNameChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, name: value }) }))
  }, [dispatch, operation, ref])

  const handleLocationChange = useCallback((value) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRef(operation?.refs, Info.key, { ...ref, location: value }) }))
  }, [dispatch, operation, ref])
  return (
    <>
      <H2kListSection title={'Exchange Details'}>
        <H2kListRow>
          <H2kDropDown
            label="Mode"
            value={ref?.mode}
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
            value={ref?.name || ''}
            uppercase={true}
            onChangeText={handleNameChange}
          />

          <H2kTextInput
            label="Your Location"
            value={ref?.location || ''}
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

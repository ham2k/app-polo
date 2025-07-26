/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useMemo, useCallback } from 'react'
import { useDispatch } from 'react-redux'

import { H2kButton, H2kListRow, H2kListSection, H2kTextInput } from '../../../ui'
import { setOperationData } from '../../../store/operations'
import { filterRefs, replaceRefs } from '../../../tools/refTools'

import { Info } from './CustomInfo'
import { CustomListItem } from './CustomListItem'

export function CustomActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const [mySig, setMySig] = useState('')
  const [mySigInfo, setMySigInfo] = useState('')
  const [name, setName] = useState('')
  const refs = useMemo(() => filterRefs(operation, Info.activationType), [operation]).filter(ref => ref.ref)

  const title = useMemo(() => {
    if (refs?.length === 0) return 'No references provided for activation'
    else return 'Activating references:'
  }, [refs])

  const handleAddReference = useCallback((refMySigInfo, refName, refMySig) => {
    const data = {
      type: Info.activationType,
      ref: [refMySig?.trim(), refMySigInfo?.trim()].filter(x => x).join(' '),
      name: refName,
      mySig: refMySig,
      mySigInfo: refMySigInfo
    }
    if (data.ref !== '') dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, [...refs.filter(r => r.ref !== data.ref), data]) }))
  }, [dispatch, operation, refs])

  const handleRemoveReference = useCallback((ref) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, refs.filter(r => r.ref !== ref)) }))
  }, [dispatch, operation, refs])

  return (
    <>
      <H2kListSection title={title}>
        {refs.map((ref, index) => (
          <CustomListItem
            key={ref.ref}
            activityRef={ref}
            styles={styles}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>
      <H2kListSection title={refs?.length === 0 ? 'Add more references' : 'Add a reference'}>
        <H2kListRow style={{ paddingBottom: styles.oneSpace * 1 }}>
          <H2kTextInput
            label="Activity - MY_SIG in ADIF (Optional)"
            placeholder={'i.e. COTA…'}
            value={mySig}
            onChangeText={text => setMySig(text)}
          />
        </H2kListRow>
        <H2kListRow style={{ paddingBottom: styles.oneSpace * 1 }}>
          <H2kTextInput
            label="Reference - MY_SIG_INFO in ADIF"
            placeholder={'i.e. XY-1234…'}
            value={mySigInfo}
            onChangeText={text => setMySigInfo(text)}
          />
        </H2kListRow>
        <H2kListRow style={{ paddingBottom: styles.oneSpace * 1 }}>
          <H2kTextInput
            label="Name (Optional)"
            placeholder={'i.e. XYZ Castle…'}
            value={name}
            onChangeText={text => setName(text)}
          />
        </H2kListRow>
        <H2kListRow>
          <H2kButton icon="plus-circle" mode="contained" onPress = {() => handleAddReference(mySigInfo, name, mySig) }>Add</H2kButton>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

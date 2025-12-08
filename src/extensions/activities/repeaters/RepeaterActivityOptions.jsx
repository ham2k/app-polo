/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useMemo, useCallback } from 'react'

import { H2kButton, H2kListRow, H2kListSection, H2kTextInput } from '../../../ui'
import { filterRefs, replaceRefs } from '../../../tools/refTools'

import { Info } from './RepeaterInfo'
import { CustomListItem } from './RepeaterListItem'

export function CustomActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const activityRefs = useMemo(() => filterRefs(allRefs, Info.activationType).filter(ref => ref.ref), [allRefs])

  const title = useMemo(() => {
    if (activityRefs?.length === 0) return 'No references provided for activation'
    else return 'Activating references:'
  }, [activityRefs])

  const [mySig, setMySig] = useState('')
  const [mySigInfo, setMySigInfo] = useState('')
  const [name, setName] = useState('')

  const handleAddReference = useCallback((refMySigInfo, refName, refMySig) => {
    const data = {
      type: Info.activationType,
      ref: [refMySig?.trim(), refMySigInfo?.trim()].filter(x => x).join(' '),
      name: refName,
      mySig: refMySig,
      mySigInfo: refMySigInfo
    }
    if (data.ref !== '') setRefs(replaceRefs(allRefs, Info.activationType, [...activityRefs.filter(r => r.ref !== data.ref), data]))
  }, [activityRefs, allRefs, setRefs])

  const handleRemoveReference = useCallback((ref) => {
    setRefs(replaceRefs(allRefs, Info.activationType, activityRefs.filter(r => r.ref !== ref)))
  }, [activityRefs, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={title}>
        {activityRefs.map((ref, index) => (
          <CustomListItem
            key={ref.ref}
            activityRef={ref}
            styles={styles}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>
      <H2kListSection title={activityRefs?.length === 0 ? 'Add more references' : 'Add a reference'}>
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
          <H2kButton icon="plus-circle" mode="contained" onPress = {() => handleAddReference(mySigInfo, name, mySig) }>Add {mySig} {mySigInfo}</H2kButton>
        </H2kListRow>
      </H2kListSection>
    </>
  )
}

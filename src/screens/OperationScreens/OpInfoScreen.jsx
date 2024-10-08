/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { ScrollView } from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { OpInfoPanel } from './OpInfoTab/components/OpInfoPanel'
import { useSelector } from 'react-redux'
import { selectSectionedQSOs } from '../../store/qsos'

export default function OpInfoScreen ({ navigation, route }) {
  const call = route?.params?.call
  const operation = route?.params?.operation ?? {}

  const { sections, qsos, activeQSOs } = useSelector(state => selectSectionedQSOs(state, operation?.uuid))

  const styles = useThemedStyles()

  // useEffect(() => {
  //   navigation.setOptions({ title: "" })
  // }, [navigation, call])

  return (
    <ScrollView style={{ height: '100%' }} contentContainerStyle={{ flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
      <OpInfoPanel
        styles={styles}
        themeColor={'tertiary'}
        call={call}
        sections={sections}
        qsos={qsos}
        activeQSOs={activeQSOs}
        operation={operation}
      />
    </ScrollView>
  )
}

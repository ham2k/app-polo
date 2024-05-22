/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect } from 'react'
import { ScrollView } from 'react-native'

import { CallInfoPanel } from '../OperationScreens/OpInfoTab/components/CallInfoPanel'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export default function CallInfoScreen ({ navigation, route }) {
  const operation = route?.params?.operation
  const qso = route?.params?.qso
  const call = route?.params?.call

  const styles = useThemedStyles()

  useEffect(() => {
    navigation.setOptions({ title: call })
  }, [navigation, call])

  return (
    <ScrollView style={{ height: '100%' }} contentContainerStyle={{ flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
      <CallInfoPanel
        styles={styles}
        themeColor={'tertiary'}
        call={call}
        qso={qso}
        operation={operation}
      />
    </ScrollView>
  )
}

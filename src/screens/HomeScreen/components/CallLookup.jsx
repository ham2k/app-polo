/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect } from 'react'
import { View, LayoutAnimation } from 'react-native'
import { CallInfo } from '../../OperationScreens/OpLoggingTab/components/LoggingPanel/CallInfo'

const CallLookupAnimation = {
  duration: 500,
  create: {
    type: 'easeInEaseOut',
    property: 'opacity'
  },
  update: {
    type: 'easeInEaseOut'
  }
}

export default function CallLookup ({ call, settings, onPress, styles, style }) {
  const [visible, setVisible] = useState()

  useEffect(() => {
    LayoutAnimation.configureNext(CallLookupAnimation)
    if (call.length > 2) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [call, visible])

  return (
    <View style={[
      { height: visible ? 'auto' : 0 }
    ]}
    >
      {visible && (
        <View style={[style, { paddingHorizontal: styles.oneSpace, paddingTop: styles.halfSpace, paddingBottom: styles.oneSpace }]}>
          <CallInfo
            qso={{ their: { call } }}
            operation={{}}
            styles={styles}
            settings={settings}
            themeColor={'primary'}
          />
        </View>
      )}
    </View>
  )
}

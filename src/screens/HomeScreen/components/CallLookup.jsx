/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { View, LayoutAnimation } from 'react-native'
import { CallInfo } from '../../OperationScreens/OpLoggingTab/components/LoggingPanel/CallInfo'
import { OpInfo } from '../../OperationScreens/OpLoggingTab/components/LoggingPanel/OpInfo'

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

export default function CallLookup ({ call, commandInfo, settings, onPress, styles, style }) {
  const [visible, setVisible] = useState()

  const commandMessage = useMemo(() => {
    if (commandInfo?.message) return { text: `**${commandInfo.message}**`, icon: 'chevron-right-box', hideCallInfo: true }
    return undefined
  }, [commandInfo?.message])

  useEffect(() => {
    LayoutAnimation.configureNext(CallLookupAnimation)
    if (call.length > 2 || commandMessage?.text) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [call, commandMessage, visible])

  return (
    <View style={[
      { height: visible ? 'auto' : 0 }
    ]}
    >
      {visible && (
        <View style={[style, { paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.oneSpace }]}>
          {commandMessage?.text ? (
            <OpInfo
              message={commandMessage}
              operation={{}}
              qsos={[]}
              styles={styles}
              settings={settings}
              themeColor={'primary'}
            />
          ) : (
            <CallInfo
              qso={{ their: { call } }}
              operation={{}}
              styles={styles}
              settings={settings}
              themeColor={'primary'}
            />
          )}

        </View>
      )}
    </View>
  )
}

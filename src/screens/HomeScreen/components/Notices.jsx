/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react'
import { View, Animated } from 'react-native'
import { Button } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'

export default function Notices () {
  const styles = useThemedStyles()

  const notices = [
    { text: '🎉 The POTA database has not been updated in over a week.' },
    { text: 'The SOTA database has not been updated in over a week.' }
  ]

  const [layout, setLayout] = useState()
  const handleLayout = useCallback((event) => {
    if (!layout) {
      setLayout(event?.nativeEvent?.layout)
      console.log('layout', event?.nativeEvent?.layout)
    }
  }, [setLayout, layout])

  const animatedHeight = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (layout?.height > 0) {
      console.log('layout height', layout?.height, animatedHeight)
      console.log('start animation')
      Animated.timing(animatedHeight, {
        toValue: 140,
        duration: 1000,
        useNativeDriver: false
      }).start()
    }
  }, [layout?.height, animatedHeight])

  return (
    <Animated.View
      style={{
        height: animatedHeight,
        flexDirection: 'column'
      }}
    >
      {notices.map((notice, index) => (
        <View
          onLayout={handleLayout}
          key={index}
          style={{
            padding: styles.oneSpace * 2,
            width: '100%',
            height: 140,
            backgroundColor: 'rgb(252,244,167)',
            borderColor: 'rgb(197,191,131)',
            borderTopWidth: 1,
            flexDirection: 'column',
            gap: styles.oneSpace
          }}
        >
          <Ham2kMarkdown style={{ color: '#333' }}>{notice.text}</Ham2kMarkdown>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
            <Button style={{ width: styles.oneSpace * 12 }} mode="text" compact={true}>Dismiss</Button>
            <Button style={{ width: styles.oneSpace * 12 }} mode={'outlined'} compact={true}>Update</Button>
          </View>
        </View>
      ))}
    </Animated.View>
  )
}

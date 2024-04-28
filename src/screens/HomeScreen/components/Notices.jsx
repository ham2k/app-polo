/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { View, Platform, UIManager, LayoutAnimation } from 'react-native'
import { Button } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { actions as systemActions, selectNotices } from '../../../store/system/systemSlice'

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
}

const NewNoticeAnimation = {
  duration: 1000,
  create: {
    type: 'easeInEaseOut',
    property: 'opacity'
  },
  update: {
    type: 'easeInEaseOut'
  }
}

const DismissNoticeAnimation = {
  duration: 500,
  create: {
    type: 'easeInEaseOut',
    property: 'opacity'
  },
  update: {
    type: 'easeInEaseOut'
  }
}

export default function Notices () {
  const styles = useThemedStyles()

  const dispatch = useDispatch()
  const notices = useSelector(selectNotices)

  const [currentNotice, setCurrentNotice] = useState()
  useEffect(() => {
    if (!currentNotice && notices.length > 0) {
      console.log('setting current', notices)
      setCurrentNotice(notices[0])
    }
  }, [notices, currentNotice])

  const [visible, setVisible] = useState()
  useEffect(() => {
    if (currentNotice) {
      LayoutAnimation.configureNext(NewNoticeAnimation)
      setVisible(true)
    }
  }, [currentNotice])

  const handleDismiss = useCallback((notice) => {
    setVisible(false)
    LayoutAnimation.configureNext(DismissNoticeAnimation,
      () => { // animation ended
        setCurrentNotice(undefined)
        dispatch(systemActions.dismissNotice(notice))
      },
      () => { // animation failed
        setCurrentNotice(undefined)
        dispatch(systemActions.dismissNotice(notice))
      }
    )
  }, [dispatch])

  return (
    <View
      style={{
        height: visible ? undefined : 0,
        flexDirection: 'column'
      }}
    >
      {[currentNotice].filter(x => x).map((notice, index) => (
        <View
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
            <Button style={{ width: styles.oneSpace * 12 }} mode="text" compact={true} onPress={() => handleDismiss(notice)}>Dismiss</Button>
            <Button style={{ width: styles.oneSpace * 12 }} mode={'outlined'} compact={true}>Update</Button>
          </View>
        </View>
      ))}
    </View>
  )
}

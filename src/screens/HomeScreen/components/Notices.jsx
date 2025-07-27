/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useCallback } from 'react'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'
import { Linking, Platform, ScrollView, View } from 'react-native'
import { Button, Dialog, IconButton, Surface } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { dismissNotice, useNotices } from '../../../store/system'
import { fetchDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { trackEvent, handleNoticeActionForDistribution } from '../../../distro'
import KeepAwake from '@sayem314/react-native-keep-awake'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { H2kDialog, H2kDialogTitle, H2kIcon, H2kMarkdown } from '../../../ui'

export default function Notices ({ paddingForSafeArea = false }) {
  const safeArea = useSafeAreaInsets()
  const styles = useThemedStyles(prepareStyles)

  const dispatch = useDispatch()
  const navigation = useNavigation()
  const notices = useNotices({ dispatch, includeTransient: true })

  const [currentNotice, setCurrentNotice] = useState(notices[0])
  const [visible, setVisible] = useState(false)

  // Animated values for smooth height and opacity transitions
  const animationProgress = useSharedValue(0)
  const animationHeight = useSharedValue(0)

  useEffect(() => {
    if (notices.length > 0 && !visible) {
      setVisible(true)
      setCurrentNotice(notices[0])
      animationProgress.value = withTiming(1, { duration: 500 })
    } else if (notices.length === 0 && visible) {
      animationProgress.value = withTiming(0, { duration: 500 })
      setTimeout(() => {
        setVisible(false)
        setCurrentNotice(undefined)
      }, 500)
    }
  }, [notices, visible, animationProgress])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: animationProgress.value * animationHeight.value,
      opacity: animationProgress.value
    }
  })

  const handleLayout = useCallback((event) => {
    const { height: layoutHeight } = event.nativeEvent.layout
    animationHeight.value = layoutHeight
  }, [animationHeight])

  const [dialogTitle, setDialogTitle] = useState()
  const [dialogText, setDialogText] = useState()

  const handleAction = useCallback((notice, action) => {
    trackEvent('accept_notice', { notice_action: action.action, notice_key: notice.actionArgs?.key })

    dispatch(dismissNotice(notice))
    if (notices[1]) {
      setCurrentNotice(notices[1])
    }
    performAction({ notice, action, dispatch, navigation, setDialogText, setDialogTitle })
  }, [dispatch, navigation, notices])

  const handleDismiss = useCallback((notice) => {
    trackEvent('dismiss_notice', { notice_action: notice.action, notice_key: notice.actionArgs?.key })

    dispatch(dismissNotice(notice))
    if (notices[1]) {
      setCurrentNotice(notices[1])
    }
  }, [dispatch, notices])

  if (!currentNotice && !dialogText) return null

  return (
    <>
      <Animated.View
        style={[styles.root, animatedStyle, { marginBottom: paddingForSafeArea ? safeArea.bottom : 0 }]}
      >
        {notices[1] && (
          <OneNotice style={styles.noticeContainerStacked} notice={{}} styles={styles} handleAction={handleAction} handleDismiss={handleDismiss} />
        )}

        {currentNotice && (
          <OneNotice
            notice={currentNotice}
            styles={styles}
            handleAction={handleAction}
            handleDismiss={handleDismiss}
            onLayout={handleLayout}
          />
        )}

      </Animated.View>

      {dialogText && (
        <>
          <KeepAwake />
          <H2kDialog
            visible={true}
            style={{ marginTop: 50, marginBottom: 50 }}
            onDismiss={() => {
              setDialogText(undefined)
              setDialogTitle(undefined)
            }}
          >
            {dialogTitle && (
              <H2kDialogTitle>{dialogTitle}</H2kDialogTitle>
            )}
            <Dialog.ScrollArea>
              <ScrollView fadingEdgeLength={styles.oneSpace * 10} style={{ maxHeight: styles.oneSpace * 28 }}>
                <H2kMarkdown styles={styles} style={{ color: styles.colors.onBackground }}>
                  {dialogText}
                </H2kMarkdown>
              </ScrollView>
            </Dialog.ScrollArea>
          </H2kDialog>
        </>
      )}
    </>
  )
}

export function NoticeList ({ notices, style }) {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const styles = useThemedStyles(prepareStyles)

  const [dialogTitle, setDialogTitle] = useState()
  const [dialogText, setDialogText] = useState()

  const handleAction = useCallback((notice, action) => {
    performAction({ notice, action, dispatch, navigation, setDialogText, setDialogTitle })
  }, [dispatch, navigation])

  return (
    <>
      {notices.map(notice => (
        <View key={notice.key} style={{ marginVertical: styles.oneSpace, marginHorizontal: styles.oneSpace * 2 }}>
          <OneNotice
            notice={notice}
            styles={styles}
            handleAction={handleAction}
            handleDismiss={false}
          />
        </View>
      ))}

      {dialogText && (
        <>
          <KeepAwake />
          <H2kDialog
            visible={true}
            style={{ marginTop: 50, marginBottom: 50 }}
            onDismiss={() => {
              setDialogText(undefined)
              setDialogTitle(undefined)
            }}
          >
            {dialogTitle && (
              <H2kDialogTitle>{dialogTitle}</H2kDialogTitle>
            )}
            <Dialog.ScrollArea>
              <ScrollView fadingEdgeLength={styles.oneSpace * 10} style={{ maxHeight: styles.oneSpace * 28 }}>
                <H2kMarkdown styles={styles} style={{ color: styles.colors.onBackground }}>
                  {dialogText}
                </H2kMarkdown>
              </ScrollView>
            </Dialog.ScrollArea>
          </H2kDialog>
        </>
      )}
    </>
  )
}

export function OneNotice ({ notice, style, styles, handleAction, handleDismiss, onLayout }) {
  return (
    <Surface
      elevation={3}
      style={[styles.noticeContainer, style]}
      onLayout={onLayout}
    >
      {(notice.title || notice.icon) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: styles.oneSpace }}>
          {notice.icon && (
            <H2kIcon name={notice.icon} size={styles.oneSpace * 3} color={styles.noticeText.color} />
          )}
          {notice.title && (
            <H2kMarkdown style={styles.noticeText}>## {notice.title}</H2kMarkdown>
          )}
        </View>
      )}

      <H2kMarkdown style={styles.noticeText}>
        {notice.text}
      </H2kMarkdown>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
        <ScrollView horizontal style={{ flex: 1, marginLeft: -styles.oneSpace, paddingLeft: styles.oneSpace }}>
          {notice?.actions?.map((action, index) => (
            <Button
              key={index}
              mode={'contained'}
              theme={ styles.buttonTheme }
              style={{ paddingHorizontal: styles.oneSpace, marginLeft: -styles.oneSpace, marginRight: styles.oneSpace * 2 }}
              compact={true}
              disabled={action === 'disabled'}
              onPress={() => handleAction(notice, action)}
            >
              {action.label ?? 'Ok!'}
            </Button>
          ))}
        </ScrollView>
        {handleDismiss ? (
          <IconButton
            icon="close"
            mode="outlined"
            theme={ styles.buttonTheme }
            iconColor={styles.noticeText.color}
            compact={true}
            onPress={() => handleDismiss(notice)}
            style={{ padding: 0, margin: 0, marginRight: -0.5 * styles.oneSpace }}
          />
        ) : (
          <View style={{ width: styles.oneSpace * 2 }} />
        )}
      </View>
    </Surface>
  )
}
async function performAction ({ notice, action, dispatch, navigation, setDialogText, setDialogTitle }) {
  if (typeof action !== 'object') return

  if (action.action === 'fetch' && action.args?.key) {
    await dispatch(fetchDataFile(action.args.key, {
      onStatus: ({ key, definition, status, progress }) => {
        if (status === 'fetching' || status === 'loading') {
          setDialogText(`### Fetching '${definition.name}'…`)
        } else if (status === 'progress') {
          setDialogText(`### Fetching '${definition.name}'\n\n${progress}`)
        } else if (status === 'loaded' || status === 'error') {
          setDialogText('')
        }
      }
    }))
  } else if (action.action === 'dialog') {
    if (Platform.OS === 'ios') {
      setDialogTitle(action.args?.['dialogTitle.ios'] ?? action.args?.dialogTitle)
      setDialogText(action.args?.['dialogText.ios'] ?? action.args?.dialogText)
    } else if (Platform.OS === 'android') {
      setDialogTitle(action.args?.['dialogTitle.android'] ?? action.args?.dialogTitle)
      setDialogText(action.args?.['dialogText.android'] ?? action.args?.dialogText)
    } else {
      setDialogTitle(action.args?.dialogTitle)
      setDialogText(action.args?.dialogText)
    }
  } else if (action.action === 'navigate' || action.action === 'navigation') {
    if (typeof action.args === 'string') {
      navigation.navigate(action.args)
    } else {
      navigation.navigate(...action.args)
    }
  } else if (action.action === 'link') {
    Linking.openURL(action.args?.url ?? action.args?.link ?? action.args?.href)
  } else {
    return handleNoticeActionForDistribution({ notice, action, dispatch, navigation, setOverlayText: setDialogText, setOverlayTitle: setDialogTitle })
  }
}

function prepareStyles (baseStyles, paddingForSafeArea, safeArea) {
  return {
    ...baseStyles,
    root: {
      minWidth: baseStyles.oneSpace * 40,
      maxWidth: '85%',
      maxHeight: baseStyles.oneSpace * 30,
      alignSelf: 'center',
      flexDirection: 'column',
      alignItems: 'stretch',
      margin: baseStyles.oneSpace,
      marginTop: baseStyles.oneSpace * 2,
      paddingBottom: paddingForSafeArea ? safeArea.bottom : 0
    },
    noticeContainer: {
      padding: baseStyles.oneSpace * 2,
      backgroundColor: 'rgb(252,244,167)',
      // borderColor: 'rgb(197,191,131)',
      // borderTopWidth: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      // flex: 1,
      gap: baseStyles.oneSpace,
      zIndex: 0
    },
    noticeContainerStacked: {
      position: 'absolute',
      flex: 1,
      top: 4,
      left: 4,
      right: -4,
      bottom: -4,
      zIndex: -1
    },
    noticeText: {
      color: 'rgb(97, 92, 47)'
    },
    buttonTheme: {
      colors: {
        primary: 'rgb(97, 92, 47)',
        outline: 'rgb(97, 92, 47)',
        onPrimary: 'rgb(252,244,167)'
      }
    }
  }
}

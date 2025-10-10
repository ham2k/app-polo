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
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogTitle, H2kIcon, H2kMarkdown } from '../../../ui'

export default function Notices ({ paddingForSafeArea = false }) {
  const safeArea = useSafeAreaInsets()
  const styles = useThemedStyles(prepareStyles, paddingForSafeArea, safeArea)

  const dispatch = useDispatch()
  const navigation = useNavigation()
  const notices = useNotices({ dispatch, includeTransient: true })

  const [currentNotice, setCurrentNotice] = useState()

  useEffect(() => {
    setCurrentNotice(notices[0])
  }, [notices])

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

  const [dialog, setDialog] = useState()

  const handleAction = useCallback((notice, action) => {
    trackEvent('accept_notice', { notice_action: action.action, notice_key: notice.actionArgs?.key })

    dispatch(dismissNotice(notice))
    if (notices[1]) {
      setCurrentNotice(notices[1])
    }
    performAction({ notice, action, dispatch, navigation, setDialog })
  }, [dispatch, navigation, notices])

  const handleDismiss = useCallback((notice) => {
    trackEvent('dismiss_notice', { notice_action: notice.action, notice_key: notice.actionArgs?.key })

    dispatch(dismissNotice(notice))
    if (notices[1]) {
      setCurrentNotice(notices[1])
    }
  }, [dispatch, notices])

  const handleDialogAction = useCallback((notice, action) => {
    performAction({ notice, action, dispatch, navigation, setDialog })
    setDialog(undefined)
  }, [dispatch, navigation])

  if (!currentNotice && !dialog) return null

  return (
    <Animated.View
      style={[styles.root, animatedStyle]}
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

      {dialog && (
        <>
          <KeepAwake />
          <H2kDialog
            visible={true}
            style={{ marginTop: 50, marginBottom: 50 }}
            onDismiss={() => {
              setDialog(undefined)
            }}
          >
            {dialog?.title && (
              <H2kDialogTitle>{dialog?.title}</H2kDialogTitle>
            )}
            <Dialog.ScrollArea>
              <ScrollView fadingEdgeLength={styles.oneSpace * 10} style={{ maxHeight: styles.oneSpace * 28 }}>
                <H2kMarkdown styles={styles} style={{ color: styles.colors.onBackground }}>
                  {dialog?.text}
                </H2kMarkdown>
              </ScrollView>
            </Dialog.ScrollArea>
            <H2kDialogActions>
              {dialog?.actions?.map((action, index) => (
                <H2kButton
                  key={index}
                  mode={'contained'}
                  theme={ styles.buttonTheme }
                  style={{ paddingHorizontal: styles.oneSpace, marginLeft: -styles.oneSpace, marginRight: styles.oneSpace * 2 }}
                  compact={true}
                  disabled={action === 'disabled'}
                  onPress={() => handleDialogAction(dialog, action)}
                >
                  {action.label ?? 'Ok!'}
                </H2kButton>
              ))}
              <H2kButton
                onPress={() => {
                  setDialog(undefined)
                }}
              >Ok</H2kButton>
            </H2kDialogActions>
          </H2kDialog>
        </>
      )}
    </Animated.View>
  )
}

export function NoticeList ({ notices, style }) {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const styles = useThemedStyles(prepareStyles)

  const [dialog, setDialog] = useState()

  const handleAction = useCallback((notice, action) => {
    performAction({ notice, action, dispatch, navigation, setDialog })
  }, [dispatch, navigation])

  const handleDialogAction = useCallback((notice, action) => {
    performAction({ notice, action, dispatch, navigation, setDialog })
    setDialog(undefined)
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

      {dialog && (
        <>
          <KeepAwake />
          <H2kDialog
            visible={true}
            style={{ marginTop: 50, marginBottom: 50 }}
            onDismiss={() => {
              setDialog(undefined)
            }}
          >
            {dialog?.title && (
              <H2kDialogTitle>{dialog?.title}</H2kDialogTitle>
            )}
            <Dialog.ScrollArea>
              <ScrollView fadingEdgeLength={styles.oneSpace * 10} style={{ maxHeight: styles.oneSpace * 28 }}>
                <H2kMarkdown styles={styles} style={{ color: styles.colors.onBackground }}>
                  {dialog?.text}
                </H2kMarkdown>
              </ScrollView>
            </Dialog.ScrollArea>
            <H2kDialogActions>
              {dialog?.actions?.map((action, index) => (
                <H2kButton
                  key={index}
                  mode={'contained'}
                  theme={ styles.buttonTheme }
                  style={{ paddingHorizontal: styles.oneSpace, marginLeft: -styles.oneSpace, marginRight: styles.oneSpace * 2 }}
                  compact={true}
                  disabled={action === 'disabled'}
                  onPress={() => handleDialogAction({}, action)}
                >
                  {action.label ?? 'Ok!'}
                </H2kButton>
              ))}
              <H2kButton
                onPress={() => {
                  setDialog(undefined)
                }}
              >Ok</H2kButton>
            </H2kDialogActions>
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

async function performAction ({ notice, action, dispatch, navigation, setDialog }) {
  if (typeof action !== 'object') return

  if (action.action === 'fetch' && action.args?.key) {
    await dispatch(fetchDataFile(action.args.key, {
      onStatus: ({ key, definition, status, progress }) => {
        if (status === 'fetching' || status === 'loading') {
          setDialog({ text: `### Fetching '${definition.name}'…` })
        } else if (status === 'progress') {
          setDialog({ text: `### Fetching '${definition.name}'\n\n${progress}` })
        } else if (status === 'loaded' || status === 'error') {
          setDialog({ text: '' })
        }
      }
    }))
  } else if (action.action === 'dialog') {
    if (Platform.OS === 'ios') {
      setDialog({
        title: action.args?.['dialogTitle.ios'] ?? action.args?.dialogTitle,
        text: action.args?.['dialogText.ios'] ?? action.args?.dialogText,
        actions: action.args?.['dialogActions.ios'] ?? action.args?.dialogActions
      })
    } else if (Platform.OS === 'android') {
      setDialog({
        title: action.args?.['dialogTitle.android'] ?? action.args?.dialogTitle,
        text: action.args?.['dialogText.android'] ?? action.args?.dialogText,
        actions: action.args?.['dialogActions.android'] ?? action.args?.dialogActions
      })
    } else {
      setDialog({
        title: action.args?.dialogTitle,
        text: action.args?.dialogText,
        actions: action.args?.dialogActions
      })
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
    return handleNoticeActionForDistribution({ notice, action, dispatch, navigation, setDialog })
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
      marginBottom: paddingForSafeArea ? safeArea.bottom + baseStyles.oneSpace * 2 : baseStyles.oneSpace * 2
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

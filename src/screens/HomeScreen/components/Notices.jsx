/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { View, Platform, UIManager, LayoutAnimation } from 'react-native'
import { Button, Dialog, IconButton, Surface } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { Ham2kDialog } from '../../components/Ham2kDialog'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { dismissNotice, selectNotices } from '../../../store/system/systemSlice'
import { fetchDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { trackEvent, handleNoticeActionForDistribution } from '../../../distro'
import KeepAwake from '@sayem314/react-native-keep-awake'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
}

const NewNoticeAnimation = {
  duration: 500,
  create: {
    type: 'easeInEaseOut',
    property: 'opacity'
  },
  update: {
    type: 'easeInEaseOut'
  }
}

const DismissNoticeAnimation = {
  duration: 250,
  create: {
    type: 'easeInEaseOut',
    property: 'opacity'
  },
  update: {
    type: 'easeInEaseOut'
  }
}

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    root: {
      backgroundColor: 'rgb(252,244,167)',
      margin: baseStyles.oneSpace
    },
    noticeContainer: {
      padding: baseStyles.oneSpace * 2,
      width: '100%',
      backgroundColor: 'rgb(252,244,167)',
      // borderColor: 'rgb(197,191,131)',
      // borderTopWidth: 1,
      flexDirection: 'column',
      gap: baseStyles.oneSpace
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

export default function Notices ({ paddingForSafeArea = false }) {
  const styles = useThemedStyles(prepareStyles)
  const safeArea = useSafeAreaInsets()

  const dispatch = useDispatch()
  const notices = useSelector(selectNotices)

  const [performingAction, setPerformingAction] = useState(false)

  const [currentNotice, setCurrentNotice] = useState()
  useEffect(() => {
    if (!performingAction && !currentNotice && notices.length > 0) {
      setCurrentNotice(notices[0])
    } else if (!performingAction && !notices.find(n => n.id === currentNotice.id)) {
      setCurrentNotice(notices[0])
    }
  }, [notices, currentNotice, performingAction])

  const [visible, setVisible] = useState()
  useEffect(() => {
    if (currentNotice) {
      LayoutAnimation.configureNext(NewNoticeAnimation)
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [currentNotice])

  const [overlayText, setOverlayText] = useState()

  const handleAction = useCallback(async (notice) => {
    try {
      setVisible(false)
      setPerformingAction(true)

      trackEvent('accept_notice', { notice_action: notice.action, notice_key: notice.actionArgs?.key })

      LayoutAnimation.configureNext(DismissNoticeAnimation,
        async () => { // animation ended
          setCurrentNotice(undefined)
          await dispatch(dismissNotice(notice))
        },
        async () => { // animation failed
          setCurrentNotice(undefined)
        }
      )

      await performAction(notice, dispatch, setOverlayText)
    } finally {
      setPerformingAction(false)
    }
  }, [dispatch])

  const handleDismiss = useCallback((notice) => {
    setVisible(false)

    trackEvent('dismiss_notice', { notice_action: notice.action, notice_key: notice.actionArgs?.key })

    LayoutAnimation.configureNext(DismissNoticeAnimation,
      async () => { // animation ended
        await dispatch(dismissNotice(notice))
        setCurrentNotice(undefined)
      },
      async () => { // animation failed
        await dispatch(dismissNotice(notice))
        setCurrentNotice(undefined)
      }
    )
  }, [dispatch])

  return (
    <View
      style={[
        styles.root,
        {
          height: visible ? undefined : 0,
          flexDirection: 'column'
        }
      ]}
    >
      {overlayText && (
        <Ham2kDialog visible={true}>
          <KeepAwake />
          <Dialog.Content>
            <Ham2kMarkdown styles={styles} style={{ paddingTop: 3 * styles.oneSpace, color: styles.colors.onBackground }}>{overlayText}</Ham2kMarkdown>
          </Dialog.Content>
        </Ham2kDialog>
      )}

      {[currentNotice].filter(x => x).map((notice, index) => (
        <Surface
          key={index}
          elevation={3}
          style={[styles.noticeContainer, { paddingBottom: paddingForSafeArea ? safeArea.bottom : (styles.noticeContainer.paddingBottom ?? styles.noticeContainer.padding) }]}
        >
          <Ham2kMarkdown style={styles.noticeText}>
            {notice.title && `### ${notice.title}\n\n`}
            {notice.text}
          </Ham2kMarkdown>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: styles.oneSpace }}>
            {notice.action && (
              <Button
                mode={'contained'}
                theme={ styles.buttonTheme }
                style={{ paddingHorizontal: styles.oneSpace, marginLeft: -styles.oneSpace }}
                compact={true}
                disabled={notice.action === 'disabled'}
                onPress={() => handleAction(notice)}
              >
                {notice.actionLabel}
              </Button>
            )}
            <IconButton
              icon={'close'}
              mode={'outlined'}
              compact={true}
              onPress={() => handleDismiss(notice)}
              style={{ padding: 0, margin: 0, marginRight: -0.5 * styles.oneSpace }}
            />
          </View>
        </Surface>
      ))}
    </View>
  )
}

async function performAction (notice, dispatch, setOverlayText) {
  if (notice.action === 'fetch' && notice.actionArgs?.key) {
    await dispatch(fetchDataFile(notice.actionArgs.key, {
      onStatus: ({ key, definition, status, progress }) => {
        if (status === 'fetching' || status === 'loading') {
          setOverlayText(`### Fetching '${definition.name}'…`)
        } else if (status === 'progress') {
          setOverlayText(`### Fetching '${definition.name}'\n\n${progress}`)
        } else if (status === 'loaded' || status === 'error') {
          setOverlayText('')
        }
      }
    }))
  } else {
    return handleNoticeActionForDistribution({ notice, dispatch, setOverlayText })
  }
}

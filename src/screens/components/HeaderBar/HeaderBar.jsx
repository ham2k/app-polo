/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useState } from 'react'

import { Appbar, Menu, Text } from 'react-native-paper'
import { Image, View } from 'react-native'
import { SystemBars } from 'react-native-edge-to-edge'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { tweakStringForVoiceOver } from '../../../tools/a11yTools'

import LOGO from './img/ham2k-800-filled.png'

export const DEFAULT_TITLE = 'Ham2K Portable Logger'

export default function HeaderBar ({
  route, options, navigation, title, subTitle, splitView,
  leftAction, leftActionA11yLabel, onLeftActionPress,
  rightAction, rightMenuItems, rightA11yLabel,
  onRightActionPress
}) {
  title = title || options?.title
  subTitle = subTitle || options?.subTitle
  leftAction = leftAction ?? options?.leftAction
  leftActionA11yLabel = leftActionA11yLabel ?? options?.leftActionA11yLabel
  onLeftActionPress = onLeftActionPress ?? options?.onLeftActionPress
  rightAction = rightAction ?? options?.rightAction
  rightMenuItems = rightMenuItems ?? options?.rightMenuItems
  rightA11yLabel = rightA11yLabel ?? options?.rightA11yLabel ?? rightAction
  onRightActionPress = onRightActionPress ?? options?.onRightActionPress

  const safeAreaInsets = useSafeAreaInsets()
  const styles = useThemedStyles(prepareStyles, { leftAction, safeAreaInsets, splitView })

  const [showMenu, setShowMenu] = useState(false)
  const onRightActionShowMenu = useCallback(() => {
    setShowMenu(true)
  }, [setShowMenu])

  // TODO: Once React Native fixes adjustsFontSizeToFit on iOS so it doesn't scale the font up, add it back to the Text components below

  const leftActionIcon = useMemo(() => {
    if (leftAction === 'logo' || leftAction === 'none') {
      return false
    } else if (leftAction === 'close') {
      return 'close'
    } else if (leftAction === 'back') {
      return 'arrow-left'
    } else if (leftAction === 'accept') {
      return 'check'
    } else if (leftAction === 'revert') {
      return 'undo-variant'
    }
    return 'arrow-left'
  }, [leftAction])

  const rightActionIcon = useMemo(() => {
    if (rightAction === 'revert') {
      return 'undo-variant'
    }
    return rightAction
  }, [rightAction])

  const handleLeftActionPress = useCallback(() => {
    if (onLeftActionPress) {
      onLeftActionPress()
    } else if (leftAction !== 'logo' && leftAction !== 'none') {
      navigation.goBack()
    }
  }, [navigation, onLeftActionPress, leftAction])

  return (
    <Appbar
      theme={styles.appBarTheme}
      dark={true}
      mode={'center-aligned'}
      safeAreaInsets={{ left: Math.max(safeAreaInsets.left, styles.oneSpace * 2), right: splitView ? 0 : Math.max(safeAreaInsets.right, styles.oneSpace * 2), top: safeAreaInsets.top, bottom: 0 }}
      style={styles.root}
    >
      <SystemBars style="light" />

      <View flexDirection="row" justifyContent="flex-start" style={styles.sideContent}>
        {leftActionIcon && (
          <View style={{ marginLeft: -styles.oneSpace * 2 }}>
            <Appbar.Action
              isLeading
              onPress={handleLeftActionPress}
              accessibilityLabel={leftActionA11yLabel ?? leftAction ?? 'Close'}
              icon={leftActionIcon}
              size={styles.oneSpace * 2.5}
              theme={styles.appBarTheme}
            />
          </View>
        )}
        {leftAction === 'logo' && (
          <Image source={LOGO} style={{ height: 18, width: 60, marginLeft: styles.oneSpace * 0 }} resizeMode="contain" />
        )}
        {leftAction === 'none' && (
          <Text accessible={false}>{' '}</Text>
        )}
      </View>

      <Appbar.Content
        style={styles.content}
        title={
            title && subTitle ? (
              <>
                <Text
                  adjustsFontSizeToFit={false}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}
                  minimumFontScale={0.9}
                  style={styles.screenTitleSmall}
                  accessibilityLabel={tweakStringForVoiceOver([title, subTitle].filter(x => x).join(', '))}
                >
                  {title}
                </Text>
                <Text accessible={false} adjustsFontSizeToFit={false} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.9} style={subTitle.length > 60 ? styles.screenSubTitleCondensed : styles.screenSubTitle}>{subTitle}</Text>
              </>
            ) : (
              <Text adjustsFontSizeToFit={false} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.8} maxFontSizeMultiplier={1} style={styles.screenTitle}>{title}</Text>
            )
        }
      />

      <View flexDirection="row" justifyContent="flex-end" style={styles.sideContent}>
        {rightMenuItems ? (
          <View style={{ marginRight: -styles.oneSpace * 2 }}>
            <Menu
              visible={showMenu}
              onDismiss={() => setShowMenu(false)}
              anchorPosition={'bottom'}
              anchor={
                <Appbar.Action
                  isLeading
                  onPress={onRightActionShowMenu}
                  icon={'dots-vertical'}
                  accessibilityLabel={'Menu'}
                  size={styles.oneSpace * 2.5}
                  theme={styles.appBarTheme}
                />
              }
            >
              {React.Children.map(rightMenuItems, child => (
                React.cloneElement(child, { setShowMenu })
              ))}
            </Menu>
          </View>
        ) : (
          rightAction ? (
            <View style={{ marginRight: -styles.oneSpace * 2 }}>
              <Appbar.Action
                isLeading
                onPress={onRightActionPress}
                accessibilityLabel={rightA11yLabel}
                icon={rightActionIcon}
                size={styles.oneSpace * 2.5}
                theme={styles.appBarTheme}
              />
            </View>
          ) : (
            <Text accessible={false}>{' '}</Text>
          )
        )}
      </View>

    </Appbar>
  )
}

function prepareStyles (baseStyles, { back, close, safeAreaInsets, splitView }) {
  return ({
    ...baseStyles,
    root: {
      height: Math.max(safeAreaInsets.top, baseStyles.oneSpace * 2) + baseStyles.oneSpace * 5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: Math.max(safeAreaInsets.left, baseStyles.oneSpace * 2),
      paddingRight: splitView ? 0 : Math.max(safeAreaInsets.right, baseStyles.oneSpace * 2),
      paddingTop: Math.min(safeAreaInsets.top, baseStyles.oneSpace * 8) - baseStyles.oneSpace,
      paddingBottom: 0
    },
    content: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center'
    },
    screenContainer: {
      backgroundColor: baseStyles.colors.background
    },
    screenTitle: {
      fontFamily: baseStyles.boldTitleFontFamily,
      fontSize: 20 * baseStyles.fontScaleAdjustment,
      lineHeight: 22 * baseStyles.fontScaleAdjustment,
      color: baseStyles.colors.onPrimary
    },
    screenTitleSmall: {
      fontFamily: 'Roboto Slab Medium',
      fontSize: 17 * baseStyles.fontScaleAdjustment,
      lineHeight: 20 * baseStyles.fontScaleAdjustment,
      color: baseStyles.colors.onPrimary
    },
    screenSubTitle: {
      fontFamily: baseStyles.normalFontFamily,
      fontSize: 13 * baseStyles.fontScaleAdjustment,
      lineHeight: 14 * baseStyles.fontScaleAdjustment,
      fontWeight: baseStyles.isIOS ? '400' : '100',
      color: baseStyles.colors.onPrimary
    },
    screenSubTitleCondensed: {
      fontFamily: baseStyles.maybeCondensedFontFamily,
      fontSize: 13 * baseStyles.fontScaleAdjustment,
      lineHeight: 14 * baseStyles.fontScaleAdjustment,
      fontWeight: baseStyles.isIOS ? '400' : '100',
      color: baseStyles.colors.onPrimary
    },
    screenTitleLight: {
      fontFamily: baseStyles.normalFontFamily,
      fontSize: 16 * baseStyles.fontScaleAdjustment,
      color: baseStyles.colors.onPrimary,
      // fontWeight: baseStyles.isIOS ? '300' : '100',
      marginLeft: baseStyles.oneSpace
    },
    screenTitleBold: {
      fontFamily: 'Roboto Black',
      fontSize: 20 * baseStyles.fontScaleAdjustment,
      lineHeight: 22 * baseStyles.fontScaleAdjustment
    },
    sideContent: {
      flex: 0,
      width: baseStyles.oneSpace * ((back || close) ? 4 : 8),
      alignItems: 'flex-end'
    },
    appBarTheme: {
      colors: {
        surface: baseStyles.colors.primary,
        onSurface: baseStyles.colors.onPrimary
      }
    }
  })
}

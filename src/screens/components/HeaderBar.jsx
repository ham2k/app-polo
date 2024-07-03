/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'

import { Appbar, Text } from 'react-native-paper'
import { StatusBar, View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export const DEFAULT_TITLE = 'Ham2K Portable Logger'

function prepareStyles (baseStyles, options) {
  return ({
    ...baseStyles,
    root: {
      height: baseStyles.oneSpace * 6
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
      width: baseStyles.oneSpace * ((options.back || options.close) ? 4 : 8)
    },
    appBarTheme: {
      colors: {
        surface: baseStyles.colors.primary,
        onSurface: baseStyles.colors.onPrimary
      }
    }
  })
}

export default function HeaderBar ({ route, options, navigation, back, close, title, subTitle, rightAction, headerBackVisible, closeInsteadOfBack, onRightActionPress }) {
  title = title || options?.title
  subTitle = subTitle || options?.subTitle
  rightAction = rightAction ?? options?.rightAction
  onRightActionPress = onRightActionPress ?? options?.onRightActionPress
  closeInsteadOfBack = closeInsteadOfBack ?? options?.closeInsteadOfBack
  headerBackVisible = headerBackVisible ?? options?.headerBackVisible ?? true

  const styles = useThemedStyles(prepareStyles, { back, close })

  if (closeInsteadOfBack) {
    close = back
  }

  // TODO: Once React Native fixes adjustsFontSizeToFit on iOS so it doesn't scale the font up, add it back to the Text components below

  return (
    <Appbar.Header
      theme={styles.appBarTheme}
      dark={true}
      mode={'center-aligned'}
      style={styles.root}
    >
      <StatusBar
        barStyle={'light-content'}
        backgroundColor={styles.colors.primary}
      />

      <View flexDirection="row" justifyContent="flex-start" style={styles.sideContent}>
        {headerBackVisible && (
          back ? (
            <Appbar.Action
              isLeading
              onPress={navigation.goBack}
              icon={closeInsteadOfBack ? 'close' : 'arrow-left'}
              size={styles.oneSpace * 2.5}
              theme={styles.appBarTheme}
            />
          ) : (
            <Text style={styles.screenTitleLight} numberOfLines={1} adjustsFontSizeToFit={false}>Ham2K</Text>
          )
        )}
      </View>

      <Appbar.Content
        style={styles.content}
        title={
          title && subTitle ? (
            <>
              <Text adjustsFontSizeToFit={false} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.9} style={styles.screenTitleSmall}>{title}</Text>
              <Text adjustsFontSizeToFit={false} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.9} style={subTitle.length > 60 ? styles.screenSubTitleCondensed : styles.screenSubTitle}>{subTitle}</Text>
            </>
          ) : (
            <Text adjustsFontSizeToFit={false} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.8} maxFontSizeMultiplier={1} style={styles.screenTitle}>{title}</Text>
          )
        }
      />

      <View flexDirection="row" justifyContent="flex-end" style={styles.sideContent}>
        {rightAction ? (
          <Appbar.Action
            isLeading
            onPress={onRightActionPress}
            icon={rightAction}
            size={styles.oneSpace * 2.5}
            theme={styles.appBarTheme}
          />
        ) : (
          <Text>{' '}</Text>
        )}
      </View>

    </Appbar.Header>
  )
}

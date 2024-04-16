/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PixelRatio, Platform, StyleSheet } from 'react-native'

const DEFAULT_THEME = {
  colors: {
    primary: '#546e7a',
    primaryContainer: '#f3f3f3'
  }
}

export const prepareGlobalStyles = ({ theme, colorScheme, width, height }) => {
  const isIOS = Platform.OS === 'ios'
  const isDarkMode = colorScheme === 'dark'

  const pixelRatio = PixelRatio.get()
  const fontScale = PixelRatio.getFontScale()
  theme = theme ?? DEFAULT_THEME

  let size
  if (width / fontScale < 340) size = 'xs'
  else if (width / fontScale < 400) size = 'sm'
  else if (width / fontScale < 600) size = 'md'
  else if (width / fontScale < 1000) size = 'lg'
  else size = 'xl'

  const portrait = height > width
  const landscape = !portrait

  // If the screen is too small, and the font scale too large, nothing will fit, so we need to adjust our font sizes down
  let fontScaleAdjustment = 1
  if (size === 'xs') {
    fontScaleAdjustment = width / fontScale / 330
  }

  const normalFontSize = 15 * fontScaleAdjustment
  const largeFontSize = 24 * fontScaleAdjustment
  const smallFontSize = 12 * fontScaleAdjustment

  const fontFamily = 'Roboto'
  const boldTitleFontFamily = 'Roboto Slab Black'
  const thinTitleFontFamily = 'Roboto Slab Medium'
  const normalFontFamily = 'Roboto'
  const condensedFontFamily = 'Roboto Condensed'
  const maybeCondensedFontFamily = size === 'xs' || size === 'sm' ? 'Roboto Condensed' : 'Roboto'

  const baseSpace = 8 * fontScaleAdjustment // Guesstimage of the width of an 'm' in the base (root) font size

  const oneSpace = PixelRatio.roundToNearestPixel(baseSpace * fontScale)
  const halfSpace = PixelRatio.roundToNearestPixel((baseSpace * fontScale) / 2)

  const styles = StyleSheet.create({
    theme,
    colors: theme.colors,
    colorScheme,
    isDarkMode,
    isIOS,
    isAndroid: !isIOS,

    pixelRatio,

    portrait,
    landscape,
    size,
    smOrGreater: size !== 'xs',
    mdOrGreater: size !== 'xs' && size !== 'sm',
    lgOrGreater: size !== 'xs' && size !== 'sm' && size !== 'md',
    lgOrSmaller: size !== 'xl',
    mdOrSmaller: size !== 'xl' && size !== 'lg',
    smOrSmaller: size !== 'xl' && size !== 'lg' && size !== 'md',

    oneSpace,
    halfSpace,

    normalFontSize,
    largeFontSize,
    smallFontSize,
    fontScaleAdjustment,

    fontFamily,
    boldTitleFontFamily,
    thinTitleFontFamily,
    normalFontFamily,
    condensedFontFamily,
    maybeCondensedFontFamily,

    screen: {
      backgroundColor: theme.colors.background
    },
    screenContainer: {
      backgroundColor: theme.colors.background
    },
    sectionContainer: {
      marginTop: oneSpace * 2,
      paddingHorizontal: 24
    },
    screenTitle: {
      fontSize: 20 * fontScaleAdjustment,
      color: theme.colors.onPrimary,
      fontFamily: boldTitleFontFamily
      // fontWeight: 'bold'
    },
    screenTitleSmall: {
      fontSize: 14 * fontScaleAdjustment,
      color: theme.colors.onPrimary,
      fontFamily: 'Roboto Slab Medium'
    },
    screenSubTitle: {
      fontSize: 12 * fontScaleAdjustment,
      color: theme.colors.onPrimary,
      fontWeight: isIOS ? '300' : '100'
    },
    screenTitleLight: {
      fontSize: 20 * fontScaleAdjustment,
      color: theme.colors.onPrimary,
      fontWeight: isIOS ? '300' : '100'
    },
    screenTitleBold: {
      fontFamily: 'Roboto Black',
      fontSize: 20 * fontScaleAdjustment
    },
    screenTabBar: {
      backgroundColor: theme.colors.primary
    },
    screenTabBarItem: {
      color: theme.colors.onPrimary
    },
    screenTabBarLabel: {
      color: theme.colors.onPrimary
    },
    screenTabBarIndicator: {
      backgroundColor: theme.colors.onPrimary,
      height: halfSpace
    },
    dialog: {
    },
    title: {
      marginBottom: oneSpace,
      fontSize: largeFontSize,
      fontWeight: '500'
    },
    paragraph: {
      marginBottom: oneSpace,
      fontSize: normalFontSize,
      fontWeight: '400'
    },
    highlight: {
      fontWeight: '700'
    },
    button: {
      marginBottom: oneSpace
    },
    listContainer: {

    },
    row: {
      minHeight: oneSpace * 8,
      paddingHorizontal: oneSpace * 2,
      paddingVertical: oneSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline
    },
    compactRow: {
      height: oneSpace * 4,
      paddingHorizontal: oneSpace,
      paddingVertical: halfSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      flexDirection: 'row',
      width: '100%'
    },
    doubleRow: {
      height: oneSpace * 7,
      paddingHorizontal: oneSpace,
      paddingVertical: oneSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%'
    },
    doubleRowInnerRow: {
      // borderWidth: 1,
      height: oneSpace * 2.6,
      flexDirection: 'row',
      width: '100%'
    },
    rowText: {
      fontSize: normalFontSize,
      fontFamily: 'Roboto',
      color: theme.colors.onBackground
    },
    text: {
      numbers: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono Medium'
      },
      callsign: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono Medium'
      },
      lighter: {
        color: theme.colors.onBackgroundLight
      }
    },
    markdown: {
      body: {
        fontSize: normalFontSize,
        color: theme.colors.onBackground
      },
      heading1: {
        fontWeight: 'bold',
        fontSize: normalFontSize * 1.4,
        marginBottom: halfSpace
      },
      heading2: {
        fontWeight: 'bold',
        fontSize: normalFontSize * 1.2,
        marginBottom: halfSpace
      },
      heading3: {
        fontWeight: 'bold',
        fontSize: normalFontSize * 1,
        marginBottom: halfSpace
      },
      bullet_list_icon: {
        marginLeft: halfSpace,
        marginRight: oneSpace * 1,
        fontSize: normalFontSize * 2,
        marginTop: -normalFontSize * 0.7
      },
      bullet_list_content: {
        marginBottom: halfSpace
      },
      code_inline: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono Medium',
        backgroundColor: false
      }
    }
  })

  return styles
}

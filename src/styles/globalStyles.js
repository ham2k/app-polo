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
  theme = theme ?? DEFAULT_THEME

  const sizeInfo = theme.sizes
  const { size, fontScaleAdjustment, pixelScaleAdjustment } = sizeInfo

  const normalFontSize = 16 * fontScaleAdjustment
  const largeFontSize = 24 * fontScaleAdjustment
  const smallFontSize = 14 * fontScaleAdjustment
  const smallerFontSize = 12 * fontScaleAdjustment

  const fontFamily = 'Roboto'
  const boldTitleFontFamily = 'Roboto Slab Black'
  const thinTitleFontFamily = 'Roboto Slab Medium'
  const normalFontFamily = 'Roboto'
  const condensedFontFamily = 'Roboto Condensed'
  const maybeCondensedFontFamily = size === 'xs' || size === 'sm' ? 'Roboto Condensed' : 'Roboto'

  const baseSpace = 8 // Guesstimage of the width of an 'm' in the base (root) font size

  const oneSpace = PixelRatio.roundToNearestPixel(baseSpace * pixelScaleAdjustment)
  const halfSpace = PixelRatio.roundToNearestPixel(oneSpace / 2)

  const styles = StyleSheet.create({
    theme,
    colors: theme.colors,
    colorScheme,
    isDarkMode,
    isIOS,
    isAndroid: !isIOS,

    ...sizeInfo,

    oneSpace,
    halfSpace,

    normalFontSize,
    largeFontSize,
    smallFontSize,
    smallerFontSize,
    fontScaleAdjustment,

    fontFamily,
    boldTitleFontFamily,
    thinTitleFontFamily,
    normalFontFamily,
    condensedFontFamily,
    maybeCondensedFontFamily,

    screenTabBar: {
      backgroundColor: theme.colors.primary
    },
    screenTabBarItem: {
      color: theme.colors.onPrimary
    },
    screenTabBarLabel: {
      fontFamily: normalFontFamily,
      fontWeight: '500',
      color: theme.colors.onPrimary,
      textTransform: 'uppercase',
      fontSize: smallFontSize // sizeInfo.smOrSmaller ? smallFontSize : normalFontSize
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
      maxHeight: oneSpace * 4,
      minHeight: oneSpace * 4,
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
    list: {
      item: {
        minHeight: oneSpace * 8
      },
      section: {
        fontSize: normalFontSize,
        fontWeight: '500',
        fontFamily: 'Roboto Slab Medium'
      },
      title: {
        fontSize: normalFontSize,
        fontWeight: '500',
        fontFamily: 'Roboto Medium'
      },
      description: {
        fontSize: normalFontSize,
        paddingTop: halfSpace
      }
    },
    text: {
      numbers: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono',
        fontWeight: 'regular'
      },
      callsign: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono',
        fontWeight: 'regular'
      },
      callsignBold: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono Bold'
      },
      bold: {
        fontWeight: 'bold'
      },
      lighter: {
        color: theme.colors.onBackgroundLight
      }
    },
    markdown: {
      body: {
        fontFamily,
        fontSize: normalFontSize,
        color: theme.colors.onBackground
      },
      paragraph: {
        marginTop: 0,
        marginBottom: oneSpace
      },
      heading1: {
        fontFamily,
        fontWeight: 'bold',
        fontSize: normalFontSize * 1.4,
        color: theme.colors.onBackground,
        marginBottom: halfSpace
      },
      heading2: {
        fontFamily,
        fontWeight: 'bold',
        fontSize: normalFontSize * 1.2,
        color: theme.colors.onBackground,
        marginBottom: halfSpace
      },
      heading3: {
        fontFamily,
        fontWeight: 'bold',
        fontSize: normalFontSize * 1,
        color: theme.colors.onBackground,
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
        fontFamily: 'Roboto Mono',
        backgroundColor: false
      }
      // strong: {
      //   fontWeight: '700'
      // }
    }
  })

  return styles
}

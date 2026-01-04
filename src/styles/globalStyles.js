/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
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

export const BASE_FONT_SIZE = 16

export const prepareGlobalStyles = ({ theme, colorScheme, width, height }) => {
  const isIOS = Platform.OS === 'ios'
  const isDarkMode = colorScheme === 'dark'
  theme = theme ?? DEFAULT_THEME

  const sizeInfo = theme.sizes
  const { size, sized, fontScale, fontScaleAdjustment, pixelScaleAdjustment } = sizeInfo

  // Fonts are specificed in their "natural" sizes, and the OS scales them up or down
  // based on the fontScale.
  const normalFontSize = 16 * fontScaleAdjustment // sized({ xs: 16, md: 17 })
  const mediumFontSize = 18 * fontScaleAdjustment // sized({ xs: 20, md: 21.5 })
  const largeFontSize = 24 * fontScaleAdjustment // sized({ xs: 24, md: 26 })

  const smallFontSize = 14 * fontScaleAdjustment // sized({ xs: 14, md: 15 })
  const smallerFontSize = 12 * fontScaleAdjustment // sized({ xs: 12, md: 13 })
  const smallestFontSize = 10 * fontScaleAdjustment // sized({ xs: 10, md: 11 })

  const fontFamily = 'Roboto'
  const boldTitleFontFamily = 'Roboto Slab Black'
  const thinTitleFontFamily = 'Roboto Slab Medium'
  const normalFontFamily = 'Roboto'
  const condensedFontFamily = 'Roboto Condensed'
  const maybeCondensedFontFamily = size === 'xs' || size === 'sm' ? 'Roboto Condensed' : 'Roboto'
  const monospacedFontFamily = 'Roboto Mono'

  const baseSpace = normalFontSize / 2 // Guesstimage of the width of an 'm' in the base (root) font size

  const oneSpace = PixelRatio.roundToNearestPixel(normalFontSize / 2 * fontScale) //normalFontSize / 2)
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
    mediumFontSize,
    largeFontSize,
    smallFontSize,
    smallerFontSize,
    smallestFontSize,
    fontScale,

    fontFamily,
    boldTitleFontFamily,
    thinTitleFontFamily,
    normalFontFamily,
    condensedFontFamily,
    maybeCondensedFontFamily,
    monospacedFontFamily,

    screenTabBar: {
      backgroundColor: theme.colors.primary
    },
    screenTabBarItem: {
      color: theme.colors.onPrimary
    },
    screenTabBarLabel: {
      fontFamily: normalFontFamily,
      fontWeight: '400',
      color: theme.colors.onPrimary,
      textTransform: 'uppercase',
      fontSize: smallFontSize * fontScaleAdjustment
    },
    screenTabBarIndicator: {
      backgroundColor: theme.colors.onPrimary,
      height: halfSpace
    },
    dialog: {
    },
    title: {
      fontFamily: boldTitleFontFamily,
      marginBottom: oneSpace,
      fontSize: largeFontSize,
      fontWeight: '400'
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
      borderBottomColor: theme.colors.outlineVariant
    },
    compactRow: {
      height: oneSpace * 4,
      maxHeight: oneSpace * 4,
      minHeight: oneSpace * 4,
      paddingHorizontal: oneSpace,
      paddingVertical: halfSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      flexDirection: 'row',
      width: '100%'
    },
    doubleRow: {
      height: sized({ xs: oneSpace * 7, md: oneSpace * 8 }),
      paddingHorizontal: oneSpace,
      paddingVertical: oneSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%'
    },
    doubleRowInnerRow: {
      // borderWidth: 1,
      height: PixelRatio.roundToNearestPixel(sized({ xs: oneSpace * 2.6, md: oneSpace * 3.3 })),
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
        lineHeight: normalFontSize * 1.2,
        fontWeight: '400',
        fontFamily: 'Roboto Medium'
      },
      description: {
        fontSize: normalFontSize,
        lineHeight: normalFontSize * 1.2,
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
        fontFamily: normalFontFamily,
        fontSize: normalFontSize,
        color: theme.colors.onBackground
      },
      paragraph: {
        marginTop: 0,
        marginBottom: oneSpace
      },
      heading1: {
        fontFamily: normalFontFamily,
        fontWeight: 'bold',
        fontSize: normalFontSize * 1.4,
        color: theme.colors.onBackground,
        marginBottom: halfSpace
      },
      heading2: {
        fontFamily: normalFontFamily,
        fontWeight: 'bold',
        fontSize: normalFontSize * 1.2,
        lineHeight: normalFontSize * 2,
        color: theme.colors.onBackground,
        marginBottom: halfSpace
      },
      heading3: {
        fontFamily: normalFontFamily,
        fontWeight: 'bold',
        fontSize: normalFontSize * 1,
        color: theme.colors.onBackground,
        marginBottom: halfSpace
      },
      bullet_list_icon: {
        marginLeft: halfSpace,
        marginRight: oneSpace * 1,
        fontSize: normalFontSize * 2,
        marginTop: oneSpace * -1.6
      },
      bullet_list_content: {
        marginBottom: halfSpace
      },
      code_inline: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono',
        backgroundColor: false
      },
      fence: {
        fontVariant: ['tabular-nums'],
        fontFamily: 'Roboto Mono',
        fontSize: normalFontSize,
        backgroundColor: theme.colors.surfaceVariant,
        color: theme.colors.onSurfaceVariant,
        padding: oneSpace,
        borderRadius: halfSpace
      }
      // strong: {
      //   fontWeight: '700'
      // }
    }
  })

  return styles
}

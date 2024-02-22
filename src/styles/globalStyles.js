import { PixelRatio, Platform, StyleSheet } from 'react-native'

const DEFAULT_THEME = {
  colors: {
    primary: '#546e7a',
    primaryContainer: '#f3f3f3'
  }
}

export const prepareGlobalStyles = ({ theme, colorScheme }) => {
  const isIOS = Platform.OS === 'ios'
  const isDarkMode = colorScheme === 'dark'

  const pixelRatio = PixelRatio.get()
  const fontScale = PixelRatio.getFontScale()

  theme = theme ?? DEFAULT_THEME

  const normalFontSize = 18
  const largeFontSize = 24
  const smallFontSize = 11

  const baseSpace = 8 // Guesstimage of the width of an 'm' in the base (root) font size

  const oneSpace = PixelRatio.roundToNearestPixel(baseSpace * fontScale)
  const halfSpace = PixelRatio.roundToNearestPixel((baseSpace * fontScale) / 2)

  const styles = StyleSheet.create({
    theme,
    colors: theme.colors,
    colorScheme,
    isDarkMode,

    pixelRatio,

    oneSpace,
    halfSpace,

    normalFontSize,
    largeFontSize,
    smallFontSize,

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
      fontSize: 20,
      color: theme.colors.onPrimary,
      fontWeight: '500'
    },
    screenTitleSmall: {
      fontSize: 14,
      color: theme.colors.onPrimary,
      fontWeight: '500'
    },
    screenSubTitle: {
      fontSize: 12,
      color: theme.colors.onPrimary,
      fontWeight: isIOS ? '300' : '100'
    },
    screenTitleLight: {
      fontSize: 20,
      color: theme.colors.onPrimary,
      fontWeight: isIOS ? '300' : '100'
    },
    screenTitleBold: {
      fontSize: 20,
      color: theme.colors.onPrimary,
      fontWeight: isIOS ? '600' : '800'
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
      paddingVertical: oneSpace,
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
      height: oneSpace * 2.3,
      flexDirection: 'row',
      width: '100%'
    },
    rowText: {
      fontSize: normalFontSize
    },
    text: {
      numbers: {
        fontVariant: ['tabular-nums'],
        fontFamily: isIOS ? 'San Francisco' : 'monospace'
      },
      callsign: {
        fontVariant: ['tabular-nums'],
        fontFamily: isIOS ? 'Menlo' : 'monospace'
      },
      lighter: {
        color: theme.colors.onBackgroundLight
      }
    }
  })

  return styles
}

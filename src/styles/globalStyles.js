import { Platform, StyleSheet } from 'react-native'

const DEFAULT_THEME = {
  colors: {
    primary: '#546e7a',
    primaryContainer: '#f3f3f3'
  }
}

export const prepareGlobalStyles = ({ theme, colorScheme }) => {
  const isIOS = Platform.OS === 'ios'
  const isDarkMode = colorScheme === 'dark'

  theme = theme ?? DEFAULT_THEME

  const oneSpace = 8
  const twoSpaces = oneSpace * 2
  const threeSpaces = oneSpace * 3
  const halfSpace = oneSpace / 2

  const normalFontSize = 18
  const largeFontSize = 24
  const rem = 16 // "Width of an `m` in the base (root) font size"

  const styles = StyleSheet.create({
    theme,
    colors: theme.colors,
    colorScheme,
    isDarkMode,

    rem,

    oneSpace,
    twoSpaces,
    threeSpaces,
    halfSpace,

    normalFontSize,
    largeFontSize,

    screen: {
      backgroundColor: theme.colors.background
    },
    screenContainer: {
      backgroundColor: theme.colors.background
    },
    sectionContainer: {
      marginTop: twoSpaces,
      paddingHorizontal: 24
    },
    screenTitle: {
      fontSize: 20,
      color: theme.colors.onPrimary,
      fontWeight: '500'
    },
    screenTitleLeft: {
      fontSize: 20,
      color: theme.colors.onPrimary,
      fontWeight: isIOS ? '400' : '100',
      marginRight: oneSpace
    },
    screenTitleRight: {
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
      paddingHorizontal: twoSpaces,
      paddingVertical: oneSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline
    },
    compactRow: {
      minHeight: rem * 2,
      paddingHorizontal: oneSpace,
      paddingVertical: oneSpace,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline
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

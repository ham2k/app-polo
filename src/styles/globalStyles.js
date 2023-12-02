import { StyleSheet } from 'react-native'

const DEFAULT_THEME = {
  colors: {
    primary: '#546e7a',
    primaryContainer: '#f3f3f3'
  }
}

export const prepareGlobalStyles = ({ theme, colorScheme }) => {
  theme = theme ?? DEFAULT_THEME

  const oneSpace = 8
  const twoSpaces = oneSpace * 2
  const threeSpaces = oneSpace * 3
  const halfSpace = oneSpace / 2

  const normalFont = 18
  const largeFont = 24

  const styles = StyleSheet.create({
    theme,
    colors: theme.colors,
    colorScheme,
    isDarkMode: colorScheme === 'dark',

    oneSpace,
    twoSpaces,
    threeSpaces,
    halfSpace,

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
    title: {
      marginBottom: oneSpace,
      fontSize: largeFont,
      fontWeight: '600'
    },
    paragraph: {
      marginBottom: oneSpace,
      fontSize: normalFont,
      fontWeight: '400'
    },
    highlight: {
      fontWeight: '700'
    },
    button: {
      marginBottom: oneSpace
    }
  })

  return styles
}

import React, { useMemo } from 'react'

import { Appbar, Text } from 'react-native-paper'
import { StatusBar, View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export const DEFAULT_TITLE = 'Ham2K Portable Logger'

export default function HeaderBar ({ route, options, navigation, back }) {
  const styles = useThemedStyles()

  console.log(options)
  const title = options.title
  const subTitle = options.subTitle

  const contentStyleTweaks = useMemo(() => {
    if (back) {
      return {
        marginRight: 48
      }
    } else {
      return {
        marginLeft: 48
      }
    }
  }, [back])

  return (
    <Appbar.Header
      theme={{ colors: { surface: styles.colors.primary, onSurface: styles.colors.onPrimary } }}
      dark={true}
      mode={'center-aligned'}
    >
      <StatusBar
        barStyle={'light-content'}
        backgroundColor={styles.colors.primary}
      />

      {back ? <Appbar.BackAction onPress={navigation.goBack} /> : null}
      <Appbar.Content
        style={contentStyleTweaks}
        title={
          title && subTitle ? (
            <View flexDirection="row" justifyContent="center">
              <Text style={styles.screenTitleLeft}>{title}</Text>
              <Text style={styles.screenTitleRight}>{subTitle}</Text>
            </View>
          ) : (
            <View flexDirection="row" justifyContent="center">
              <Text style={styles.screenTitle}>{title}</Text>
            </View>
          )
        }
      />
    </Appbar.Header>
  )
}

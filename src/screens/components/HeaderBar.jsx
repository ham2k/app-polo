import React, { useMemo } from 'react'

import { Appbar, Text } from 'react-native-paper'
import { StatusBar, View } from 'react-native'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export const DEFAULT_TITLE = 'Ham2K Portable Logger'

export default function HeaderBar ({ route, options, navigation, back, close, rightAction, onRightActionPress }) {
  const styles = useThemedStyles()

  const title = options.title
  const subTitle = options.subTitle

  rightAction = rightAction ?? options.rightAction
  onRightActionPress = onRightActionPress ?? options.onRightActionPress

  if (options.closeInsteadOfBack) {
    close = back
  }

  const contentStyleTweaks = useMemo(() => {
    if ((back || close)) {
      if (rightAction) {
        return {}
      } else {
        return {
          marginRight: 48
        }
      }
    } else {
      if (rightAction) {
        return {
          marginLeft: 48
        }
      } else {
        return {}
      }
    }
  }, [back, close, rightAction])

  return (
    <Appbar.Header
      theme={{ colors: { surface: styles.colors.primary, onSurface: styles.colors.onPrimary } }}
      dark={true}
      mode={'center-aligned'}
      style={{ height: styles.oneSpace * 6 }}
    >
      <StatusBar
        barStyle={'light-content'}
        backgroundColor={styles.colors.primary}
      />

      {back ? <Appbar.Action isLeading onPress={navigation.goBack} icon={options.closeInsteadOfBack ? 'close' : 'arrow-left'} /> : null}

      <Appbar.Content
        style={[contentStyleTweaks, { flex: 1 }]}
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

      {rightAction ? <Appbar.Action isLeading onPress={onRightActionPress} icon={rightAction} /> : null}

    </Appbar.Header>
  )
}

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

  const sidesWidth = useMemo(() => {
    if (back || close) {
      return 48
    } else {
      return 84
    }
  }, [back, close])

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

      <View flexDirection="row" justifyContent="flex-start" style={{ width: sidesWidth }}>
        {back ? (
          <Appbar.Action
            isLeading
            onPress={navigation.goBack}
            icon={options.closeInsteadOfBack ? 'close' : 'arrow-left'}
            theme={{ colors: { surface: styles.colors.primary, onSurface: styles.colors.onPrimary } }}
          />
        ) : (
          <Text style={[styles.screenTitleLight, { marginLeft: styles.oneSpace }]}>Ham2K</Text>
        )}
      </View>

      <Appbar.Content
        style={[{ flex: 1 }]}
        title={
          title && subTitle ? (
            <View flexDirection="row" justifyContent="center">
              <Text style={[styles.screenTitleLight, { marginRight: styles.oneSpace }]}>{title}</Text>
              <Text style={styles.screenTitleBold}>{subTitle}</Text>
            </View>
          ) : (
            <View flexDirection="row" justifyContent="center">
              <Text style={styles.screenTitle}>{title}</Text>
            </View>
          )
        }
      />

      <View flexDirection="row" justifyContent="flex-end" style={{ width: sidesWidth }}>
        {rightAction ? (
          <Appbar.Action
            isLeading
            onPress={onRightActionPress}
            icon={rightAction}
            theme={{ colors: { surface: styles.colors.primary, onSurface: styles.colors.onPrimary } }}
          />
        ) : (
          <Text />
        )}
      </View>

    </Appbar.Header>
  )
}

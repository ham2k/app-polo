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
      return styles.oneSpace * 7
    } else {
      return styles.oneSpace * 12
    }
  }, [back, close, styles])

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

      <View flexDirection="row" justifyContent="flex-start" style={{ flex: 0, width: sidesWidth }}>
        {back ? (
          <Appbar.Action
            isLeading
            onPress={navigation.goBack}
            icon={options.closeInsteadOfBack ? 'close' : 'arrow-left'}
            theme={{ colors: { surface: styles.colors.primary, onSurface: styles.colors.onPrimary } }}
          />
        ) : (
          <Text style={[styles.screenTitleLight, { marginLeft: styles.oneSpace }]} numberOfLines={1} adjustsFontSizeToFit={true}>Ham2K</Text>
        )}
      </View>

      <Appbar.Content
        style={[{ flex: 1, flexDirection: 'column', justifyContent: 'center' }]}
        title={
          title && subTitle ? (
            <>
              <Text adjustsFontSizeToFit={true} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.9} style={styles.screenTitleSmall}>{title}</Text>
              <Text adjustsFontSizeToFit={true} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.9} style={styles.screenSubTitle}>{subTitle}</Text>
              {/* <Text style={[styles.screenTitleLight]}>{title}</Text> */}
              {/* <Text style={styles.screenTitleBold}>{'  '}{subTitle}</Text> */}
              {/* </Text> */}
            </>
          ) : (
            <Text adjustsFontSizeToFit={true} numberOfLines={1} ellipsizeMode={'tail'} minimumFontScale={0.8} style={styles.screenTitle}>{title}</Text>
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
          <Text>{' '}</Text>
        )}
      </View>

    </Appbar.Header>
  )
}

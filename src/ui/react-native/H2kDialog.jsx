/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState, useRef, useCallback } from 'react'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { Dialog, Portal } from 'react-native-paper'

import { BaseStylesContext, useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useSafeAreaFrame } from 'react-native-safe-area-context'
import { Dimensions, ScrollView, View } from 'react-native'

export function H2kDialog ({ children, style, ...props }) {
  const styles = useThemedStyles()

  const { width } = useSafeAreaFrame()
  // const { width } = useWindowDimensions() <-- broken on iOS, no rotation

  const actualStyle = useMemo(() => {
    return {
      width: Math.min(width - styles.oneSpace * 4, styles.oneSpace * 60),
      alignSelf: 'center',
      ...style
    }
  }, [style, styles, width])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1, paddingTop: 100, paddingBottom: 100 }} behavior={'height'}>
        <Dialog
          {...props}
          style={[actualStyle]}
        >
          <BaseStylesContext.Provider value={styles}>
            {children}
          </BaseStylesContext.Provider>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

export function H2kDialogTitle ({ style, ...props }) {
  const styles = useThemedStyles()

  return <Dialog.Title {...props} style={[style, { fontSize: styles.normalFontSize * 1.3 }]}/>
}

export function H2kDialogContent (props) {
  return <Dialog.Content {...props} />
}

export function H2kDialogActions ({ children, style, ...props }) {
  const actualStyle = useMemo(() => {
    let actualChildren = children
    if (children.filter) actualChildren = children.filter(c => c)

    if (actualChildren.length > 1) {
      return [{ flexDirection: 'row', justifyContent: 'space-between' }, style]
    } else {
      return [{ flexDirection: 'row', justifyContent: 'flex-end' }, style]
    }
  }, [children, style])

  return <Dialog.Actions {...props} style={actualStyle}>{children}</Dialog.Actions>
}

export function H2kDialogCloseButton (props) {
  return <Dialog.CloseButton {...props} />
}

const MIN_VIEW_HEIGHT = 0.15
const MAX_VIEW_HEIGHT = 0.4

export function H2kDialogScrollArea ({ children, style, ...props }) {
  const styles = useThemedStyles()
  const [showTopShadow, setShowTopShadow] = useState(false)
  const [showBottomShadow, setShowBottomShadow] = useState(false)
  const contentHeightRef = useRef(0)
  const scrollViewHeightRef = useRef(0)
  const scrollYRef = useRef(0)
  const screenHeight = Dimensions.get('window').height

  const [requestedViewHeight, setRequestedViewHeight] = useState(screenHeight * MIN_VIEW_HEIGHT)

  const updateShadows = useCallback((scrollY, contentHeight, scrollViewHeight) => {
    scrollYRef.current = scrollY
    contentHeightRef.current = contentHeight
    scrollViewHeightRef.current = scrollViewHeight

    // Show top shadow if scrolled down
    setShowTopShadow(scrollY > 5)

    // Show bottom shadow if there's more content below (with small threshold)
    setShowBottomShadow(scrollY + scrollViewHeight < contentHeight - 5)
  }, [setShowTopShadow, setShowBottomShadow])

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    updateShadows(contentOffset.y, contentSize.height, layoutMeasurement.height)
  }, [updateShadows])

  const handleContentSizeChange = useCallback((contentWidth, contentHeight) => {
    // Re-check shadows when content size changes
    let expectedHeight = scrollViewHeightRef.current
    if (contentHeight > requestedViewHeight) {
      expectedHeight = Math.min(contentHeight, screenHeight * MAX_VIEW_HEIGHT)
      setRequestedViewHeight(expectedHeight)
    } else if (contentHeight < requestedViewHeight) {
      expectedHeight = Math.max(contentHeight, screenHeight * MIN_VIEW_HEIGHT)
      setRequestedViewHeight(expectedHeight)
    }
    updateShadows(scrollYRef.current, contentHeight, expectedHeight)
  }, [updateShadows, requestedViewHeight, screenHeight, scrollViewHeightRef])

  const handleLayout = useCallback((event) => {
    const { height } = event.nativeEvent.layout
    // Re-check shadows when layout changes
    updateShadows(scrollYRef.current, contentHeightRef.current, height)
  }, [updateShadows])

  return (
    <Dialog.ScrollArea {...props}
      // The default Paper dialog draws a thin line using the surfaceVariant color
      theme={{ colors: { surfaceVariant: styles.colors.elevation.level3 } }}

      style={{
        padding: 0,
        paddingHorizontal: styles.oneSpace,
        position: 'relative',
        minHeight: requestedViewHeight,
        height: requestedViewHeight,
        maxHeight: requestedViewHeight
      }}
    >
      <View style={{ position: 'relative', flex: 1 }}>
        {showTopShadow && <ScrollTopShadow styles={styles} />}
        <ScrollView onScroll={handleScroll} onContentSizeChange={handleContentSizeChange} onLayout={handleLayout} scrollEventThrottle={16} style={{ paddingHorizontal: styles.oneSpace * 2 }}>
          {children}
        </ScrollView>
        {showBottomShadow && <ScrollBottomShadow styles={styles} />}
      </View>
    </Dialog.ScrollArea>
  )
}

const ScrollTopShadow = ({ styles }) => {
  const shadowColor = styles.colors.shadow
  const shadowHeight = styles.oneSpace * 1
  const layerHeight = shadowHeight / 4
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: shadowHeight,
        marginHorizontal: styles.oneSpace * 1,
        zIndex: 1,
        pointerEvents: 'none'
      }}
    >
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.4 }} />
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.3 }} />
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.2 }} />
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.1 }} />
    </View>
  )
}

const ScrollBottomShadow = ({ styles }) => {
  const shadowColor = styles.colors.shadow
  const shadowHeight = styles.oneSpace * 1
  const layerHeight = shadowHeight / 4

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: shadowHeight,
        zIndex: 1,
        marginHorizontal: styles.oneSpace * 1,
        pointerEvents: 'none'
      }}
    >
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.1 }} />
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.2 }} />
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.3 }} />
      <View style={{ height: layerHeight, backgroundColor: shadowColor, opacity: 0.4 }} />
    </View>
  )
}

export function H2kDialogIcon (props) {
  return <Dialog.Icon {...props} />
}

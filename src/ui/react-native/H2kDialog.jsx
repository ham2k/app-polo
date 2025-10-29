/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { Dialog, Portal } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { useSafeAreaFrame } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native'

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
          {children}
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

export function H2kDialogScrollArea ({ children, style, ...props }) {
  const styles = useThemedStyles()

  return (
    <Dialog.ScrollArea {...props}
      // The default Paper dialog draws a thin line using the surfaceVariant color
      theme={{ colors: { surfaceVariant: styles.colors.elevation.level3 } }}

      style={{
        padding: 0,
        paddingHorizontal: styles.oneSpace,
        maxHeight: '80%'
      }}
    >
      <ScrollView
        // fadingEdgeLength={styles.oneSpace * 0}
        style={{ maxHeight: styles.oneSpace * 28, paddingHorizontal: styles.oneSpace * 2 }}
      >
        {children}
      </ScrollView>
    </Dialog.ScrollArea>
  )
}

export function H2kDialogIcon (props) {
  return <Dialog.Icon {...props} />
}

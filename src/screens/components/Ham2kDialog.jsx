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

export function Ham2kDialog ({ children, ...moreProps }) {
  const styles = useThemedStyles()

  const { width } = useSafeAreaFrame()
  // const { width } = useWindowDimensions() <-- broken on iOS, no rotation

  const style = useMemo(() => {
    return {
      width: Math.min(width - styles.oneSpace * 4, styles.oneSpace * 60),
      alignSelf: 'center',
      ...moreProps.style
    }
  }, [moreProps.style, styles, width])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1, paddingTop: 100, paddingBottom: 100 }} behavior={'height'}>
        <Dialog
          {...moreProps}
          style={[style]}
        >
          {children}
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

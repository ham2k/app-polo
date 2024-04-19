/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo } from 'react'
import { useWindowDimensions, KeyboardAvoidingView } from 'react-native'
import { Dialog, Portal } from 'react-native-paper'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function Ham2kDialog ({ children, ...moreProps }) {
  const styles = useThemedStyles()

  const { width } = useWindowDimensions()

  const style = useMemo(() => {
    return {
      width: Math.min(width - styles.oneSpace * 4, styles.oneSpace * 60),
      alignSelf: 'center',
      ...moreProps.style
    }
  }, [moreProps.style, styles, width])

  return (
    <Portal>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={'height'}>
        <Dialog
          {...moreProps}
          style={style}
        >
          {children}
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  )
}

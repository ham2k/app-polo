// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

// Codegen spec for the native <H2kNativeTextInput> Fabric component.
// This file is parsed by React Native codegen at build time to generate the
// native interfaces/delegates (Android) and component descriptor/protocol (iOS).
// It is NOT consumed at runtime directly — use the wrapper in ../H2kNativeTextInput.jsx.

import type { HostComponent, ViewProps, ColorValue } from 'react-native'
import { codegenNativeComponent, codegenNativeCommands } from 'react-native'
import type * as React from 'react'
import type {
  BubblingEventHandler,
  DirectEventHandler,
  Double,
  Int32,
  WithDefault
} from 'react-native/Libraries/Types/CodegenTypes'

// `text` in the change event carries the cursor sentinel (U+0001) at the caret position.
type ChangeEvent = Readonly<{ text: string, eventCount: Int32 }>
type KeyEvent = Readonly<{ eventCount: Int32 }>
type FocusEvent = Readonly<{ focused: boolean }>

export interface NativeProps extends ViewProps {
  // The controlled value. MAY contain a single cursor-sentinel char (U+0001);
  // native strips it and places the caret there, atomically with setting text.
  text?: string
  // Race guard mirroring RN's own TextInput: native ignores `text` updates whose
  // eventCount is older than the most recent change it emitted.
  mostRecentEventCount?: WithDefault<Int32, 0>

  placeholder?: string
  placeholderTextColor?: ColorValue
  color?: ColorValue
  fontSize?: WithDefault<Double, 0>
  fontFamily?: string
  fontWeight?: string

  editable?: WithDefault<boolean, true>
  uppercase?: WithDefault<boolean, false>

  // 'default' | 'code' | 'dumb' | 'numbers' | 'email'
  keyboardProfile?: WithDefault<string, 'default'>
  // 'light' | 'dark'
  keyboardAppearance?: WithDefault<string, 'light'>
  // When false, fall back to a plain keyboard (mirrors settings.smartKeyboard).
  smartKeyboard?: WithDefault<boolean, true>
  // 'navigate' (default): space is swallowed and reported via onSpacePressed.
  // 'insert': space is typed normally (for fields that allow spaces).
  spaceKeyMode?: WithDefault<string, 'navigate'>

  onChangeWithCursor?: BubblingEventHandler<ChangeEvent>
  onSpacePressed?: BubblingEventHandler<KeyEvent>
  onTabPressed?: BubblingEventHandler<KeyEvent>
  onSubmitPressed?: BubblingEventHandler<KeyEvent>
  onFocusChange?: DirectEventHandler<FocusEvent>
  // A tap on the (already-focused) field. Android emits this because the EditText
  // consumes the touch and RN's interception-based dispatch can't deliver it to a
  // parent Pressable; iOS leaves it to the chrome's Pressable, so it is not emitted
  // there (emitting on both would double-fire and blur-then-refocus).
  onPress?: BubblingEventHandler<KeyEvent>
}

interface NativeCommands {
  insertAtCursor: (
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    value: string
  ) => void
  focus: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void
  blur: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['insertAtCursor', 'focus', 'blur']
})

export default codegenNativeComponent<NativeProps>('H2kNativeTextInput') as HostComponent<NativeProps>

// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'

// Stand in for the native control: record the callbacks so the test can drive change/focus/blur
// the way the native side would, and render nothing.
const nativeProps = {}
const mockPressable = {}
jest.mock('@ham2k/h2k-native-text-input', () => ({
  H2kNativeTextInput: (props) => {
    Object.assign(nativeProps, props)
    return null
  },
  CURSOR: '',
  compose: (...fns) => (t) => fns.reduce((acc, fn) => fn(acc), t),
  splitAtCursor: (t) => [t, ''],
  joinAtCursor: (before, after) => before + after,
  stripCursor: (t) => t,
  leftTrim: (t) => t,
  noSpaces: (t) => t,
  periodToSlash: (t) => t,
  numeric: (t) => t,
  decimal: (t) => t,
  rst: (t) => t
}))

jest.mock('react-native', () => ({
  findNodeHandle: () => 1,
  Keyboard: {
    isVisible: () => mockKeyboard.height > 0,
    metrics: () => ({ height: mockKeyboard.height })
  },
  Platform: { OS: 'android', select: (o) => o.android },
  Pressable: ({ children, onPress }) => {
    mockPressable.onPress = onPress
    return children
  },
  View: ({ children }) => children
}))
jest.mock('react-native-paper', () => ({ Text: () => null }))
jest.mock('../../styles/tools/useThemedStyles', () => ({ useThemedStyles: () => ({ theme: { colors: {} } }) }))
const mockKeyboard = { height: 0 }
jest.mock('./H2kSimpleTextInput', () => ({ prepareStyles: () => ({ theme: { colors: {} } }) }))

const { H2kEnhancedTextInput, TapToDismissKeyboardContext } = require('./H2kEnhancedTextInput')

describe('H2kEnhancedTextInput', () => {
  let onBlur, renderer

  // Mounts the field and returns a handle that drives it the way the native side does.
  const field = (initialValue) => {
    onBlur = jest.fn()
    act(() => {
      renderer = TestRenderer.create(<H2kEnhancedTextInput value={initialValue} onBlur={onBlur} rst={true} />)
    })
    return {
      type: (text) => act(() => nativeProps.onChangeText(text)),
      focus: () => act(() => nativeProps.onFocus({})),
      blur: () => act(() => nativeProps.onBlur({})),
      // What the consumer pushes back down as the controlled value.
      setValue: (v) => act(() => renderer.update(<H2kEnhancedTextInput value={v} onBlur={onBlur} rst={true} />)),
      blurredWith: () => onBlur.mock.calls.at(-1)?.[0]?.value
    }
  }

  // The native buffer can be a keystroke ahead of the controlled prop, because the change
  // round-trip is async. Blur has to report what was actually typed or RST expansion never
  // sees the digit — this is why the value is tracked outside the prop at all.
  it('reports what native holds when the prop has not caught up yet', () => {
    const rst = field('599')
    rst.focus()
    rst.type('3') // prop is still '599' — no re-render yet
    rst.blur()

    expect(rst.blurredWith()).toBe('3')
  })

  // The user's report: log a QSO with a 3+space RST, start a new one, then tab through the
  // fresh 599 fields. Blur must not hand back the previous QSO's digit, or RST expansion
  // re-expands it and 599 silently becomes 339.
  it('does not resurrect a previous edit after the field is reset', () => {
    const rst = field('599')
    rst.focus()
    rst.type('3')
    rst.blur()
    rst.setValue('339') // consumer expands and pushes the result down

    rst.setValue('599') // QSO logged, field reset for the next one
    rst.focus()
    rst.blur() // tabbed straight through, nothing typed

    expect(rst.blurredWith()).toBe('599')
  })

  // Same hazard without the expansion step: the reset alone has to spend the tracked value.
  it('does not resurrect a previous edit the consumer never echoed back', () => {
    const rst = field('599')
    rst.focus()
    rst.type('4')
    rst.blur()

    rst.setValue('599')
    rst.focus()
    rst.blur()

    expect(rst.blurredWith()).toBe('599')
  })

  it('still reports a fresh edit made after a reset', () => {
    const rst = field('599')
    rst.focus()
    rst.type('3')
    rst.blur()
    rst.setValue('599')

    rst.focus()
    rst.type('4')
    rst.blur()

    expect(rst.blurredWith()).toBe('4')
  })
})

describe('H2kEnhancedTextInput tapping a focused, empty field with the soft keyboard up', () => {
  let node, renderer

  const renderField = ({ onLoggingScreen }) => {
    const input = <H2kEnhancedTextInput value="" />
    act(() => {
      renderer = TestRenderer.create(onLoggingScreen
        ? <TapToDismissKeyboardContext.Provider value={true}>{input}</TapToDismissKeyboardContext.Provider>
        : input)
    })
    node = { isFocused: () => true, focus: jest.fn(), blur: jest.fn() }
    nativeProps.innerRef(node)
  }
  // iOS delivers the tap to the field's Pressable; Android's EditText swallows it and reports it
  // as the native input's onPress instead.
  const tapChrome = () => act(() => mockPressable.onPress())
  const tapText = () => act(() => nativeProps.onPress())

  beforeEach(() => { mockKeyboard.height = 300 })
  afterEach(() => {
    act(() => renderer.unmount())
    mockKeyboard.height = 0
    for (const key of Object.keys(nativeProps)) delete nativeProps[key]
    delete mockPressable.onPress
  })

  // On the logging screen, tapping an empty field is the quick way to get the keyboard out of
  // the way and see the rest of the screen.
  it('dismisses the keyboard on the logging screen', () => {
    renderField({ onLoggingScreen: true })
    tapChrome()

    expect(node.blur).toHaveBeenCalled()
    expect(node.focus).not.toHaveBeenCalled()
  })

  // On Android most taps land on the text itself, so this path is the one users actually hit.
  it('dismisses the keyboard on the logging screen when the tap lands on the text', () => {
    renderField({ onLoggingScreen: true })
    tapText()

    expect(node.blur).toHaveBeenCalled()
  })

  // Everywhere else it must not: users lost the keyboard mid-entry on forms like the QRZ
  // credentials dialog, where tapping an empty field just means "I want to type here".
  it('keeps the keyboard up everywhere else', () => {
    renderField({ onLoggingScreen: false })
    tapChrome()
    tapText()

    expect(node.blur).not.toHaveBeenCalled()
    expect(node.focus).toHaveBeenCalledTimes(2)
  })

  // An iPad with a hardware keyboard still reports a short keyboard bar. There's no soft
  // keyboard to dismiss, so a tap should keep focus instead of dropping it.
  it('keeps focus when only the hardware keyboard bar is showing', () => {
    mockKeyboard.height = 55
    renderField({ onLoggingScreen: true })
    tapChrome()

    expect(node.blur).not.toHaveBeenCalled()
    expect(node.focus).toHaveBeenCalled()
  })
})

import React, { useRef } from 'react'

import { View, findNodeHandle, useWindowDimensions } from 'react-native'
import CallsignInput from '../../../../components/CallsignInput'
import ThemedTextInput from '../../../../components/ThemedTextInput'
import activities from '../../../activities'
import { findRef } from '../../../../../tools/refTools'

export const MainExchangePanel = ({
  qso, operation, settings, disabled, style, styles, themeColor, handleSubmit, handleFieldChange, setQSO, mainFieldRef, focusedRef
}) => {
  const { width } = useWindowDimensions()

  // We need to pre-allocate a ref for the main field, in case `mainFieldRef` is not provided
  // but since hooks cannot be called conditionally, we just need to create it whether we need it or not
  const alternateCallFieldRef = useRef()

  const refStack = []
  // the first ref will correspond to the call field
  refStack.push(mainFieldRef || alternateCallFieldRef)
  // Add enough refs for whatever fields might get added
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())
  refStack.push(useRef())

  // Make a copy since `refStack` will be used to distribute refs to each component
  let refs = [...refStack]

  // Switch between fields with the space key
  // We would have used a `useCallback` hook, but it depends on an array of refs that will change each render anyways
  const keyHandler = (event) => {
    const { nativeEvent: { key, target } } = event
    if (key === ' ') {
      const pos = refs.map(r => findNodeHandle(r.current)).indexOf(target)

      if (pos >= 0) {
        const next = (pos + 1) % refs.filter(r => r.current).length
        refs[next]?.current?.focus()
      }
      // } else {
      // console.log('key handler', event.nativeEvent)
    }
  }

  let fields = []
  fields.push(
    <CallsignInput
      key="call"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles.input, { minWidth: styles.oneSpace * 12, flex: 10 }]}
      value={qso?.their?.call ?? ''}
      label="Their Call"
      disabled={disabled}
      placeholder=""
      onChange={handleFieldChange}
      onSubmitEditing={handleSubmit}
      fieldId={'theirCall'}
      onKeyPress={keyHandler}
      focusedRef={focusedRef}
    />
  )
  fields.push(
    <ThemedTextInput
      key="sent"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 6, flex: 1 }]}
      value={qso?.our?.sent ?? ''}
      disabled={disabled}
      label="Sent"
      placeholder={qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59'}
      noSpaces={true}
      onChange={handleFieldChange}
      onSubmitEditing={handleSubmit}
      fieldId={'ourSent'}
      onKeyPress={keyHandler}
      keyboard={'numbers'}
      numeric={true}
      focusedRef={focusedRef}
    />
  )
  fields.push(
    <ThemedTextInput
      key="received"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles?.text?.numbers, { minWidth: styles.oneSpace * 6, flex: 1 }]}
      value={qso?.their?.sent || ''}
      disabled={disabled}
      label="Rcvd"
      placeholder={qso?.mode === 'CW' || qso?.mode === 'RTTY' ? '599' : '59'}
      noSpaces={true}
      onChange={handleFieldChange}
      onSubmitEditing={handleSubmit}
      fieldId={'theirSent'}
      onKeyPress={keyHandler}
      keyboard={'numbers'}
      numeric={true}
      focusedRef={focusedRef}
    />
  )

  activities.filter(activity => findRef(operation, activity.key) && activity.fieldsForMainExchangePanel).forEach(activity => {
    fields = fields.concat(
      activity.fieldsForMainExchangePanel(
        { qso, operation, settings, disabled, styles, themeColor, onSubmitEditing: handleSubmit, setQSO, keyHandler, refStack, focusedRef }
      )
    )
  })

  if (fields.length > 4 && width / styles.oneSpace < 60) {
    fields = [fields[0], ...fields.slice(3)]
    refs = [refs[0], ...refs.slice(3)]
  }

  return (
    <View style={{ ...style, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: styles.oneSpace }}>
      {fields}
    </View>
  )
}

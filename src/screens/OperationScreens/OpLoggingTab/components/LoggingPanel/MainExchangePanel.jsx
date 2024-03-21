import React, { useCallback, useMemo, useRef } from 'react'

import { View, findNodeHandle, useWindowDimensions } from 'react-native'
import CallsignInput from '../../../../components/CallsignInput'
import ThemedTextInput from '../../../../components/ThemedTextInput'
import { findRef } from '../../../../../tools/refTools'
import activities from '../../../../../plugins/loadPlugins'

export const MainExchangePanel = ({
  qso, operation, settings, style, styles, themeColor, handleSubmit, handleFieldChange, setQSO, mainFieldRef, focusedRef
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
  let refs = useMemo(() => [...refStack], [refStack])

  // Switch between fields with the space key
  // We would have used a `useCallback` hook, but it depends on an array of refs that will change each render anyways
  const keyHandler = useCallback((event) => {
    const { nativeEvent: { key, target } } = event
    if (key === ' ') {
      const pos = refs.map(r => findNodeHandle(r.current)).indexOf(target)

      if (pos >= 0) {
        const next = (pos + 1) % refs.filter(r => r.current).length
        setTimeout(() => refs[next]?.current?.focus(), 0)
      }
      // } else {
      // console.log('key handler', event.nativeEvent)
    }
  }, [refs])

  const rstLength = useMemo(() => {
    return qso?.mode === 'CW' || qso?.mode === 'RTTY' ? 3 : 2
  }, [qso?.mode])

  // For RST fields, switch to the next field after a full signal report is entered
  const handleRSTChange = useCallback((event) => {
    const value = event?.value || event?.nativeEvent?.text

    handleFieldChange && handleFieldChange(event)
    if (value.length >= rstLength) {
      keyHandler && keyHandler({ nativeEvent: { key: ' ', target: event?.nativeEvent?.target } })
    }
  }, [handleFieldChange, keyHandler, rstLength])

  let fields = []
  fields.push(
    <CallsignInput
      key="call"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles.input, { minWidth: styles.oneSpace * 12, flex: 10 }]}
      value={qso?.their?.call ?? ''}
      label="Their Call"
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
      label="Sent"
      placeholder={rstLength === 3 ? '599' : '59'}
      noSpaces={true}
      onChange={handleRSTChange}
      onSubmitEditing={handleSubmit}
      fieldId={'ourSent'}
      onKeyPress={keyHandler}
      keyboard={'numbers'}
      numeric={true}
      maxLength={rstLength + 1}
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
      label="Rcvd"
      placeholder={rstLength === 3 ? '599' : '59'}
      noSpaces={true}
      onChange={handleRSTChange}
      onSubmitEditing={handleSubmit}
      fieldId={'theirSent'}
      onKeyPress={keyHandler}
      keyboard={'numbers'}
      numeric={true}
      maxLength={rstLength + 1}
      focusedRef={focusedRef}
    />
  )

  if (settings.showStateField) {
    fields.push(
      <ThemedTextInput
        key="state"
        innerRef={refStack.shift()}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 6, flex: 1 }]}
        value={qso?.their?.state ?? ''}
        label="State"
        placeholder={''}
        uppercase={true}
        noSpaces={true}
        onChange={handleFieldChange}
        onSubmitEditing={handleSubmit}
        fieldId={'state'}
        onKeyPress={keyHandler}
        keyboard={'dumb'}
        maxLength={5}
        focusedRef={focusedRef}
      />
    )
  }

  activities.filter(activity => findRef(operation, activity.key) && activity.fieldsForMainExchangePanel).forEach(activity => {
    fields = fields.concat(
      activity.fieldsForMainExchangePanel(
        { qso, operation, settings, styles, themeColor, onSubmitEditing: handleSubmit, setQSO, keyHandler, refStack, focusedRef }
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

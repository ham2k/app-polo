import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

const ADD_DASHES_REGEX = /([A-Z0-9]+FF)(\d+)/gi
const NO_PREFIX_REGEX = /^(\d\d+)/gi

export default function WWFFInput (props) {
  const { textStyle, onChange, defaultPrefix, onChangeText, fieldId } = props

  const styles = useThemedStyles()

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(NO_PREFIX_REGEX, (match, p1, p2) => `${defaultPrefix ?? 'KFF'}-${p1}`)
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => `${p1}-${p2}`)
    event.nativeEvent.text = text

    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [onChange, onChangeText, fieldId, defaultPrefix])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={`${defaultPrefix ?? 'KFF'}-…`}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
    />
  )
}

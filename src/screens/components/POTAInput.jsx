import React, { useCallback } from 'react'

import ThemedTextInput from './ThemedTextInput'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

const ADD_DASHES_REGEX = /([A-Z]+)(\d+)/g
const ADD_COMMAS_REGEX = /(\d+)\s*[,]*\s*([A-Z]+)/g
const NO_PREFIX_REGEX = /^(\d+)/g
const REPEAT_PREFIX_REGEX = /(\w+)-(\d+)(\s+,\s*|,\s*|\s+)(\d+)/g

export default function POTAInput (props) {
  const { textStyle, onChange, defaultPrefix, onChangeText, fieldId } = props

  const styles = useThemedStyles()

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(NO_PREFIX_REGEX, (match, p1, p2) => `${defaultPrefix ?? 'K'}-${p1}`)
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => `${p1}-${p2}`)
    text = text.replace(ADD_COMMAS_REGEX, (match, p1, p2) => `${p1}, ${p2}`)
    text = text.replace(REPEAT_PREFIX_REGEX, (match, p1, p2, p3, p4) => `${p1}-${p2}, ${p1}-${p4}`)

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
      placeholder={`${defaultPrefix ?? 'K'}-…`}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
    />
  )
}

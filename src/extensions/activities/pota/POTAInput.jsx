import React, { useCallback } from 'react'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

const ADD_DASHES_REGEX = /([A-Z]+)(\d+|TEST)/gi
const ADD_COMMAS_REGEX = /(\d\d+)\s*[,]*\s*([A-Z]+)/gi
const NO_PREFIX_REGEX = /^(\d\d+|TEST)/gi
const REPEAT_PREFIX_REGEX = /(\w+)-(\d+)(\s+,\s*|,\s*|\s+)(\d\d+|TEST)/gi

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

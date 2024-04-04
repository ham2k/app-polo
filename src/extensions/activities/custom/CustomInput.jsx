import React, { useCallback } from 'react'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

export default function CustomInput (props) {
  const { textStyle, onChange, onChangeText, fieldId } = props

  const styles = useThemedStyles()

  const handleChange = useCallback((event) => {
    const { text } = event.nativeEvent
    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [onChange, onChangeText, fieldId])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={false}
      nospaces={false}
      placeholder={'ref…'}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
    />
  )
}

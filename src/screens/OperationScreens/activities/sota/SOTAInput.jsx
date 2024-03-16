import React, { useCallback } from 'react'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../../components/ThemedTextInput'

const ADD_DASHES_REGEX = /^([A-Z0-9]{1,2}[A-Z]{1,})(\d+)/g

export default function SOTAInput (props) {
  const { textStyle, onChange, onChangeText, fieldId } = props

  const styles = useThemedStyles()

  const handleChange = useCallback((event) => {
    let { text } = event.nativeEvent
    text = text.replace(ADD_DASHES_REGEX, (match, p1, p2) => (
      `${p1.substring(0, p1.length - 2)}/${p1.substring(p1.length - 2, p1.length)}-${p2}`)
    )

    event.nativeEvent.text = text

    onChangeText && onChangeText(text)
    onChange && onChange({ ...event, fieldId })
  }, [onChange, onChangeText, fieldId])

  return (
    <ThemedTextInput
      {...props}
      keyboard="dumb"
      uppercase={true}
      nospaces={true}
      placeholder={'SOTA Reference'}
      textStyle={[textStyle, styles?.text?.callsign]}
      onChange={handleChange}
    />
  )
}

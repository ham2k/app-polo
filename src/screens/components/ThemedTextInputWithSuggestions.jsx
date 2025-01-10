/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import ThemedTextInput from './ThemedTextInput'
import { useUIState } from '../../store/ui'
import createFuzzySearch from '@nozbe/microfuzz'

export default function ThemedTextInputWithSuggestions (props) {
  const {
    value, suggestions, minimumLengthForSuggestions, fieldId, innerRef, onFocus, onBlur, onSpace, onChange, onChangeText
  } = props

  const alternateInnerRef = useRef()
  const actualInnerRef = innerRef ?? alternateInnerRef

  const [loggingState, , updateLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  const [isFocused, setIsFocused] = useState(false)
  const [previousMessage, setPreviousMessage] = useState()

  const handleFocus = useCallback((event) => {
    setIsFocused(true)
    setPreviousMessage(loggingState.infoMessage)
    onFocus && onFocus({ ...event, ref: actualInnerRef })
  }, [loggingState.infoMessage, onFocus, actualInnerRef])

  const handleBlur = useCallback((event) => {
    setIsFocused(false)
    updateLoggingState({ infoMessage: previousMessage })
    setPreviousMessage(undefined)
    onBlur && onBlur({ ...event, ref: actualInnerRef.current })
  }, [updateLoggingState, previousMessage, onBlur, actualInnerRef])

  const fuzzySearch = useMemo(() => {
    return createFuzzySearch(suggestions ?? [], {
      getText: (item) => [item[1], item[0]]
    })
  }, [suggestions])

  const [bestSuggestion, setBestSuggestion] = useState()

  useEffect(() => {
    if (isFocused) {
      const directMatch = suggestions.find(item => item[0] === value)
      console.log({ minimumLengthForSuggestions })
      if (directMatch) {
        const suggestionsMessage = `**${directMatch[0]}**: ${directMatch[1]}`
        setBestSuggestion(undefined)
        updateLoggingState({ infoMessage: suggestionsMessage })
      } else if (value?.length >= (minimumLengthForSuggestions ?? 3)) {
        const results = fuzzySearch(value)
        if (results.length > 0) {
          const suggestionsList = results?.slice(0, 4)?.map(({ item, matches }, index) => {
            console.log('item', { item, matches: matches[0] })
            return `**\`${item[0]}\`**: ${item[1]}${index === 0 ? ' ← `[SPACE]`' : ''}`
          })
          if (results?.length > 4) {
            suggestionsList.push(`... and ${results.length - 4} more`)
          }
          const suggestionsMessage = suggestionsList?.join('\n')
          setBestSuggestion(results[0]?.item?.[0])
          updateLoggingState({ infoMessage: suggestionsMessage })
        } else {
          const suggestionsMessage = `No matches for **\`${value}\`**`
          setBestSuggestion(undefined)
          updateLoggingState({ infoMessage: suggestionsMessage })
        }
      } else {
        setBestSuggestion(undefined)
        updateLoggingState({ infoMessage: undefined })
      }
    }
  }, [suggestions, updateLoggingState, value, isFocused, fuzzySearch, minimumLengthForSuggestions])

  const handleSpace = useCallback((event) => {
    if (bestSuggestion) {
      const changeEvent = { ...event }
      changeEvent.fieldId = fieldId
      changeEvent.ref = actualInnerRef
      changeEvent.nativeEvent.text = bestSuggestion
      actualInnerRef.current.setNativeProps({ bestSuggestion })
      onChangeText && onChangeText(bestSuggestion)
      onChange && onChange(changeEvent)
    }
    onSpace && onSpace(event)
  }, [actualInnerRef, bestSuggestion, fieldId, onChange, onChangeText, onSpace])
  return (
    <ThemedTextInput
      {...props}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onSpace={handleSpace}
      innerRef={actualInnerRef}
    />
  )
}

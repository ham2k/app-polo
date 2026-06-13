// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { useDispatch, useSelector } from 'react-redux'
import { selectStateForComponentAndKey, setStateForComponentAndKey, updateStateForComponentAndKey } from './uiSlice'
import { useCallback } from 'react'

export function useUIState (component, key, defaultValue) {
  const dispatch = useDispatch()

  const componentDataSelector = useCallback((state) => selectStateForComponentAndKey(state, component, key), [component, key])
  const componentData = useSelector(componentDataSelector)

  const setter = useCallback((newData) => {
    // console.log('useUIState setter called with', component, key, newData)
    return dispatch(setStateForComponentAndKey({ component, key, value: newData }))
  }, [dispatch, component, key])

  const updater = useCallback((newData) => {
    // console.log('useUIState updater called with', component, key, newData)
    return dispatch(updateStateForComponentAndKey({ component, key, value: newData, defaultValue }))
  }, [dispatch, component, key, defaultValue])

  const data = (componentData ?? defaultValue)

  return [data, setter, updater]
}

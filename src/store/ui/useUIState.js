/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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

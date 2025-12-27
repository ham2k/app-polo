/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useDispatch, useSelector } from 'react-redux'
import { selectStateForComponent, setStateForComponent, updateStateForComponent } from './uiSlice'
import { useCallback, useEffect } from 'react'

export function useUIState (component, key, initialValue) {
  const dispatch = useDispatch()
  const componentData = useSelector(state => selectStateForComponent(state, component))
  const setter = useCallback((newData) => dispatch(setStateForComponent({ component, [key]: newData })), [dispatch, component, key])
  const updater = useCallback((newData) => dispatch(updateStateForComponent({ component, [key]: newData })), [dispatch, component, key])

  useEffect(() => {
    if ((!componentData || componentData[key] === undefined) && initialValue !== undefined) {
      setter(initialValue)
    }
  }, [setter, initialValue, componentData, key, component])

  const data = (componentData && componentData[key]) ?? initialValue

  return [data, setter, updater]
}

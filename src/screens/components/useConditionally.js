/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useUIState } from '../../store/ui'

/*
This hook prevents the value from changing when the screen is not in focus.
It's useful for "global" values that change often and can cause unnecessary re-renders.
*/

export function useSelectorConditionally(condition, selector, name = null) {
  const freshData = useSelector(selector)
  const dataRef = useRef(freshData)
  // if (name) console.log('useSelectorConditionally', name, ' fresh data', freshData?.qsos?.length)

  if (condition) {
    dataRef.current = freshData
  }

  return dataRef.current
}

export function useUIStateConditionally(condition, component, key, initialValue) {
  const freshData = useUIState(component, key, initialValue)
  const dataRef = useRef(freshData)

  if (condition) {
    dataRef.current = freshData
  }
  return dataRef.current
}

/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025-2026 Jeff Kowalski <jeff.KC6X@gmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useCallback, useRef } from 'react'
import { Linking } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'

import { selectAllOperations, addNewOperation, setOperationData } from '../../../store/operations'
import { findRef } from '../../../tools/refTools'
import { URL_SCHEME, activationTypeForKey, parseDeepLinkURL, buildSuggestedQSO } from './DeepLinkUtils'

const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours

/**
 * Hook that handles incoming deep links from companion apps.
 *
 * URL format: com.ham2k.polo://qso?our.refs=type:ref,...&their.refs=type:ref,...&frequency=...&mode=...
 *
 * Parameters:
 *   our.refs      - Comma-separated type:ref pairs (e.g., pota:K-1234,sota:W6/CT-006)
 *   their.refs    - Comma-separated type:ref pairs
 *   our.call      - Our callsign
 *   their.call    - Their callsign
 *   frequency     - Frequency in Hz
 *   mode          - Operating mode (CW, SSB, etc.)
 *   startAtMillis - Timestamp in milliseconds
 *
 * At least one of our.refs or their.refs must be provided.
 */
function useDeepLinkHandler () {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const operations = useSelector(selectAllOperations)
  const processedUrlRef = useRef(null)
  const initialUrlCheckedRef = useRef(false)

  const handleDeepLink = useCallback(async (url) => {
    if (!url || !url.startsWith(URL_SCHEME)) return

    // Avoid processing same URL twice (can happen on some platforms)
    if (processedUrlRef.current === url) return
    processedUrlRef.current = url

    try {
      const parsed = parseDeepLinkURL(url)
      if (!parsed) {
        console.log('[DeepLink] Could not parse URL:', url)
        return
      }

      const { ourRefs, theirRefs, freq, mode, startAtMillis, ourCall, theirCall } = parsed

      // Build the suggested QSO object
      const suggestedQSO = buildSuggestedQSO({ theirRefs, freq, mode, startAtMillis, ourCall, theirCall })

      // Find or create operation matching our refs (or create generic if chase-only)
      const operation = await findOrCreateOperation({ ourRefs, operations, dispatch })

      // Navigate to the operation with the suggested QSO
      navigation.navigate('Operation', {
        uuid: operation.uuid,
        operation,
        qso: suggestedQSO
      })
    } catch (error) {
      console.error('[DeepLink] Error handling deep link:', error)
    }
  }, [dispatch, navigation, operations])

  useEffect(() => {
    // Handle app opened from deep link (cold start)
    // Only check initial URL once to prevent re-processing when effect dependencies change
    const checkInitialURL = async () => {
      if (initialUrlCheckedRef.current) return
      initialUrlCheckedRef.current = true
      try {
        const url = await Linking.getInitialURL()
        if (url) {
          // Delay slightly to ensure app state is ready
          setTimeout(() => handleDeepLink(url), 500)
        }
      } catch (error) {
        console.error('[DeepLink] Error getting initial URL:', error)
      }
    }
    checkInitialURL()

    // Listen for incoming links while app is open (warm start)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url)
    })

    return () => subscription.remove()
  }, [handleDeepLink])
}

/**
 * Find an existing operation with matching ref, or create a new one.
 * If no ourRefs provided (chase-only mode), create a generic operation.
 */
async function findOrCreateOperation ({ ourRefs, operations, dispatch }) {
  // Chase-only mode: create generic operation
  // TODO: Search for recent "general operations" instead of adding a new operation
  if (!ourRefs?.length) {
    const newOperation = await dispatch(addNewOperation({ _useTemplates: true }))
    return newOperation
  }

  // Search recent operations for one matching ANY of our refs
  const cutoff = Date.now() - RECENT_WINDOW_MS
  const existingOp = Object.values(operations || {}).find(op => {
    if (!op || op.deleted) return false
    const lastActive = op.startAtMillisMax || op.createdAtMillis || 0
    if (lastActive < cutoff) return false
    return ourRefs.some(({ type, ref }) => {
      const activationType = activationTypeForKey(type)
      const opRef = findRef(op, activationType)
      return opRef?.ref === ref
    })
  })

  if (existingOp) {
    return existingOp
  }

  // Create new operation with these refs as activations
  const refs = ourRefs.map(({ type, ref }) => ({
    type: activationTypeForKey(type),
    ref
  }))

  const newOperation = await dispatch(addNewOperation({
    refs,
    _isNew: true
  }))

  // Trigger ref decoration and title derivation
  await dispatch(setOperationData({
    uuid: newOperation.uuid,
    refs: newOperation.refs
  }))

  return newOperation
}

/**
 * Component that activates deep link handling.
 * Must be rendered inside NavigationContainer.
 */
export function DeepLinkListener () {
  useDeepLinkHandler()
  return null
}

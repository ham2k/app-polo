/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useCallback, useRef } from 'react'
import { Linking } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation } from '@react-navigation/native'

import { selectAllOperations, addNewOperation, setOperationData } from '../store/operations'
import { findRef } from '../tools/refTools'
import { URL_SCHEME, TYPE_TO_ACTIVATION, parseDeepLinkURL, buildSuggestedQSO } from './DeepLinkUtils'

/**
 * Hook that handles incoming deep links from companion apps.
 *
 * URL format: com.ham2k.polo://qso?myRef=...&mySig=...&theirRef=...&theirSig=...&freq=...&mode=...
 *
 * Parameters:
 *   myRef    - Our activation reference (e.g., K-1234)
 *   mySig    - Our activation type (sota, pota, wwff, gma, wca, zlota)
 *   myCall   - Our callsign
 *   theirRef - Their activation reference (e.g., W6/CT-006)
 *   theirSig - Their activation type
 *   theirCall - Their callsign
 *   freq     - Frequency in Hz
 *   mode     - Operating mode (CW, SSB, etc.)
 *   time     - Timestamp in milliseconds
 *
 * At least one of (myRef+mySig) or (theirRef+theirSig) must be provided.
 */
export function useDeepLinkHandler () {
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

      const { myRef, mySig, theirRef, theirSig, freq, mode, time, myCall, theirCall } = parsed

      // Build the suggested QSO object
      const suggestedQSO = buildSuggestedQSO({ theirRef, theirSig, freq, mode, time, myCall, theirCall })

      // Find or create operation matching our ref (or create generic if chase-only)
      const operation = await findOrCreateOperation({ myRef, mySig, operations, dispatch })

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
 * If no myRef/mySig provided (chase-only mode), create a generic operation.
 */
async function findOrCreateOperation ({ myRef, mySig, operations, dispatch }) {
  // Chase-only mode: create generic operation
  if (!myRef || !mySig) {
    const newOperation = await dispatch(addNewOperation({ _useTemplates: true }))
    return newOperation
  }

  const activationType = TYPE_TO_ACTIVATION[mySig]

  // Search existing operations for one with matching ref
  const existingOp = Object.values(operations || {}).find(op => {
    if (!op || op.deleted) return false
    const opRef = findRef(op, activationType)
    return opRef?.ref === myRef
  })

  if (existingOp) {
    return existingOp
  }

  // Create new operation with this ref as activation
  const newOperation = await dispatch(addNewOperation({
    refs: [{ type: activationType, ref: myRef }],
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

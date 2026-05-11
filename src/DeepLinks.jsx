/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* ================================
 * Ham2K Deep Links
 * ================================
 *
 * PoLo handles two special schemas, `com.ham2k` and `com.ham2k.polo`.
 * Use the shorter one if you want any Ham2K app to handle the link,
 * or the longer one if you want only PoLo to handle the link.
 * The examples below use the shorter schema for brevity.
 *
 * # Log a QSO:
 *   `com.ham2k://qso?our.call=K2HRC&their.call=N0CALL&frequency=7200&mode=CW`
 *
 * # Link a Client
 *   `com.ham2k://link_client?id=1234&token=ABC...`
 */

import { useCallback, useEffect, useRef } from 'react'
import { Linking } from 'react-native'
import { useDispatch } from 'react-redux'
import { selectLatestOperation } from './store/operations'

const DEBUG = true

export function DeepLinks ({ navigationRef }) {
  const dispatch = useDispatch()

  const handleDeepLink = useCallback(({ url }) => {
    if (DEBUG) console.log('🔗 Deep link received:', url)

    const [schema, rest] = url.split('://')
    const [hostname, relativeUrl] = rest.split('/', 2)

    if (!schema.startsWith('com.ham2k')) return

    const pseudoUrl = `https://${hostname || 'default:1'}/${relativeUrl}`

    const urlObject = new URL(pseudoUrl)
    const path = urlObject.pathname
    const searchParams = urlObject.searchParams
    const params = Object.fromEntries(searchParams)
    if (DEBUG) {
      console.log('-- hostname:', urlObject.hostname)
      console.log('-- path:', path)
      console.log('-- params:', params)
    }

    if (path === '/qso') {
      const qso = {
        uuid: 'suggested-qso',
        their: { call: params['their.call'] },
        band: params.band,
        freq: Number(params.freq),
        mode: params.mode.toUpperCase(),
        _suggestedKey: url
      }

      if (DEBUG) console.log('🔗 Deep Link to QSO:', qso)

      _onceNavigationIsReady(navigationRef, async () => {
        console.log('-- navigationRef.current', navigationRef.current?.getRootState())
        const navState = navigationRef.current.getRootState()
        const route = navState.routes[navState.index]
        console.log('-- current route', route)
        if (route?.name === 'Operation' || route?.name === 'OpLog') {
          const navParams = { qso }
          if (route.params.operation) navParams.operation = route.params.operation
          if (route.params.uuid) navParams.uuid = route.params.uuid
          console.log('-- existing route, navigating to', route?.name, navParams)
          navigationRef.current.navigate(route?.name, navParams)
        } else {
          console.log('-- no existing route, navigating to Operation')
          await dispatch((_dispatch, getState) => {
            const operation = selectLatestOperation(getState())
            navigationRef.current.navigate('Operation', { qso, uuid: operation.uuid })
          })
        }
      })
    } else if (path === '/link_client') {
      const { id, token } = params
      if (DEBUG) console.log('🔗 Deep Link to Link Client:', token)

      _onceNavigationIsReady(navigationRef, async () => {
        navigationRef.current.navigate('Settings', { screen: 'SyncSettings', params: { linkClientId: id, linkToken: token } })
      })
    }
  }, [dispatch, navigationRef])

  useEffect(() => {
    Linking?.addEventListener('url', handleDeepLink)
    // return () => Linking?.removeEventListener('url', handleDeepLink)
  }, [handleDeepLink])

  const handledInitialUrl = useRef(false)

  useEffect(() => {
    if (handledInitialUrl.current) return
    Linking.getInitialURL().then((url) => {
      if (url && !handledInitialUrl.current) {
        handledInitialUrl.current = true
        handleDeepLink({ url })
      }
    })
  }, [handleDeepLink])

  return null // This is a headless component
}

function _onceNavigationIsReady (navigationRef, callback) {
  console.log('Navigation is ready', navigationRef.current?.isReady())
  if (navigationRef.current?.isReady()) {
    console.log('Navigation is ready')
    callback()
  } else {
    let tries = 0
    const maxTries = 20 // 20 * 100ms = 2000ms = 2s
    const tryCallback = () => {
      if (navigationRef.current?.isReady()) {
        console.log('Navigation is ready, calling callback')
        callback()
      } else if (tries < maxTries) {
        console.log('Navigation is not ready, trying again', tries)
        tries++
        setTimeout(tryCallback, 100)
      }
    }
    tryCallback()
  }
}

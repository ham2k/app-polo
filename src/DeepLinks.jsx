// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

/* ================================
 * Ham2K Deep Links
 * ================================
 *
 * PoLo handles two special schemas, `com.ham2k` and `com.ham2k.polo`.
 * Use the shorter one if you want any Ham2K app to handle the link,
 * or the longer one if you want only PoLo to handle the link.
 * The examples below use the shorter schema for brevity.
 *
 * # Present a QSO for logging:
 *
 *   `com.ham2k://qso?their.call=N0CALL&frequency=7200000&mode=CW`
 *
 *   - `their.call`: The callsign of the other station
 *   - `frequency`: Frequency of the QSO in Hz
 *   - `freq`: Frequency of the QSO in kHz
 *   - `band`: Band for the QSO (if `frequency` or `freq` is provided, this is ignored)
 *   - `startAtMillis`: Timestamp of the QSO in milliseconds since epoch (optional)
 *   - `mode`: Mode of the QSO
 *   - `their.refs` (or `refs`): References for the other station, comma separated list of type:ref pairs (i.e. "POTA:US-1234,POTA:US-4567,SOTA:W6/CT-225")
 *
 * # Link a Client
 *   `com.ham2k://link_client?id=1234&token=ABC...`
 */

import { useCallback, useEffect, useRef } from 'react'
import { Linking } from 'react-native'
import { useDispatch } from 'react-redux'
import { selectLatestOperation } from './store/operations'
import { bandForFrequency } from '@ham2k/lib-operation-data'

const DEBUG = false

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
      let freq
      if (params.freq) {
        freq = Number(params.freq)
      } else if (params.frequency) {
        freq = Number(params.frequency) / 1000
      }
      const band = freq ? bandForFrequency(freq) : params.band

      const qso = {
        uuid: 'suggested-qso',
        their: { call: params['their.call'] },
        band,
        freq,
        mode: params.mode.toUpperCase(),
        startAtMillis: params.startAtMillis ? Number(params.startAtMillis) : undefined,
        _suggestedKey: url
      }

      if (params['their.refs']) {
        qso.refs = _parseRefs(params['their.refs'] || params.refs)
      }

      if (DEBUG) console.log('🔗 Deep Link to QSO:', { ...qso, their: { ...qso?.their || {} } })

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

function _parseRefs (refsString) {
  const refs = []
  const parts = refsString.split(',').map(r => r.trim()).filter(r => r)
  parts.forEach(part => {
    const [type, ref] = part.split(':')
    if (type && ref) {
      refs.push({ type: type.toLowerCase(), ref })
    }
  })
  return refs
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

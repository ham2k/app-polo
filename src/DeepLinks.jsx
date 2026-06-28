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
 * The command is the URL *path*, so use three slashes (`com.ham2k:///qso?...`);
 * the host is reserved for other purposes and a host-form link is ignored.
 * Any value containing reserved characters must be percent-encoded - this
 * includes the `/` in a SOTA reference (`W6/CT-006` -> `W6%2FCT-006`) and in a
 * portable callsign (`S5/KC6X/P` -> `S5%2FKC6X%2FP`).
 *
 * # Set up an operation:
 *
 *   `com.ham2k:///operation?our.refs=pota:US-1234,sota:W6%2FCT-006`
 *
 *   - `our.refs`: References for our own activation, a comma separated list of
 *      type:ref pairs. Finds a recent operation activating exactly those
 *      references, or creates one, and opens it for logging.
 *
 * # Set the logging frequency and mode:
 *
 *   `com.ham2k:///vfo?frequency=14250000&mode=SSB`
 *
 *   - `frequency`: Frequency in Hz
 *   - `freq`: Frequency in kHz (used only if `frequency` is absent)
 *   - `mode`: Mode (optional; derived from the frequency if omitted)
 *
 *   Applies to the operation currently open (or the most recent one), so
 *   contacts logged from then on use the new frequency and mode. Useful for
 *   companion apps (SOTAcat, SOTAmat) that already handle spotting themselves
 *   and only need PoLo's log to follow the radio.
 *
 * # Present a QSO for logging:
 *
 *   `com.ham2k:///qso?their.call=N0CALL&frequency=7200000&mode=CW`
 *
 *   - `their.call`: The callsign of the other station. May be a comma-separated
 *      list for multi-operator activations (e.g. `their.call=KI2D,KC6X`).
 *   - `frequency`: Frequency of the QSO in Hz
 *   - `freq`: Frequency of the QSO in kHz (used only if `frequency` is absent)
 *   - `band`: Band for the QSO (if `frequency` or `freq` is provided, this is ignored)
 *   - `mode`: Mode of the QSO (optional; derived from the frequency if omitted)
 *   - `startAtMillis`: Timestamp of the QSO in milliseconds since epoch (optional)
 *   - `their.refs`: References for the station being worked, a comma separated
 *      list of type:ref pairs (i.e. "pota:US-1234,sota:W6%2FCT-225").
 *      These become the hunted references on the suggested QSO.
 *   - `returnpath`: Origin of the calling app (reserved; currently ignored).
 *
 *   The QSO is presented in the operation currently open, or the most recent
 *   one. Reference types are matched against the activity registry; unknown
 *   types are skipped.
 *
 * # Link a Client
 *   `com.ham2k:///link_client?id=1234&token=ABC...`
 */

import { useCallback, useEffect, useRef } from 'react'
import { Linking } from 'react-native'
import { useDispatch } from 'react-redux'

import { selectLatestOperation, findOrCreateOperation } from './store/operations'
import { buildSuggestedQSO, parseRefs } from './tools/deepLinkTools'

const DEBUG = false

export function DeepLinks ({ navigationRef }) {
  const dispatch = useDispatch()

  const handleDeepLink = useCallback(({ url }) => {
    if (DEBUG) console.log('🔗 Deep link received:', url)

    const [schema, rest] = url.split('://')
    const [hostname, ...restParts] = rest.split('/')
    const relativeUrl = restParts.join('/')

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

    if (path === '/operation') {
      const ourRefs = parseRefs(params['our.refs'])
      if (DEBUG) console.log('🔗 Deep Link to Operation:', ourRefs)
      if (!ourRefs?.length) return

      _onceNavigationIsReady(navigationRef, () => {
        dispatch(async (thunkDispatch) => {
          const operation = await thunkDispatch(findOrCreateOperation({ ourRefs }))
          navigationRef.current.navigate('Operation', { uuid: operation.uuid, operation, screen: 'OpLog' })
        })
      })
    } else if (path === '/qso' || path === '/vfo') {
      // `/vfo` only carries a frequency and mode; `/qso` also suggests the
      // station being worked. Both are presented in the current operation,
      // where the suggested QSO's freq/mode become the new VFO.
      const qsoParams = path === '/vfo'
        ? { frequency: params.frequency, freq: params.freq, mode: params.mode }
        : params
      const qso = buildSuggestedQSO(qsoParams, url)

      if (DEBUG) console.log('🔗 Deep Link to QSO:', { ...qso, their: { ...qso?.their || {} } })

      _onceNavigationIsReady(navigationRef, () => {
        if (DEBUG) console.log('-- navigationRef.current', navigationRef.current?.getRootState())
        const navState = navigationRef.current.getRootState()
        const route = navState.routes[navState.index]
        if (DEBUG) console.log('-- current route', route?.name)

        // Use `screen: 'OpLog'` below to force navigation to the logging tab, where the prefilled QSO appears.
        if (route?.name === 'Operation' || route?.name === 'OpLog') {
          // present the QSO in the operation currently open
          const navParams = { qso, screen: 'OpLog' }
          if (route.params.operation) navParams.operation = route.params.operation
          if (route.params.uuid) navParams.uuid = route.params.uuid
          navigationRef.current.navigate('Operation', navParams)
        } else {
          // no operation open: fall back to the most recent operation
          if (DEBUG) console.log('-- no existing route, navigating to Operation')
          dispatch((_dispatch, getState) => {
            const operation = selectLatestOperation(getState())
            if (!operation) return
            navigationRef.current.navigate('Operation', { qso, uuid: operation.uuid, screen: 'OpLog' })
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
  if (DEBUG) console.log('Navigation is ready', navigationRef.current?.isReady())
  if (navigationRef.current?.isReady()) {
    if (DEBUG) console.log('Navigation is ready')
    callback()
  } else {
    let tries = 0
    const maxTries = 20 // 20 * 100ms = 2000ms = 2s
    const tryCallback = () => {
      if (navigationRef.current?.isReady()) {
        if (DEBUG) console.log('Navigation is ready, calling callback')
        callback()
      } else if (tries < maxTries) {
        if (DEBUG) console.log('Navigation is not ready, trying again', tries)
        tries++
        setTimeout(tryCallback, 100)
      }
    }
    tryCallback()
  }
}

// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from 'react'
import GLOBAL from '../GLOBAL'
import { AccessibilityInfo } from 'react-native'

// This regexp is derived from `@ham2k/lib-callsign`
const CALLSIGN_REGEXP =
  /(^|\W)([A-Z0-9]+\/){0,1}(5U[A-Z]*|[0-9][A-Z]{1,2}[0-9]|[ACDEHJLOPQSTUVXYZ][0-9]|[A-Z]{1,2}[0-9])([A-Z0-9]+)(\/[A-Z0-9/]+){0,1}(\W|$)/g

export function tweakStringForVoiceOver (str) {
  str = str.replaceAll(CALLSIGN_REGEXP, (match, p1, p2, p3, p4, p5, p6, p7) => {
    return p1 + [p2, p3, p4, p5].join('').split('').join('.') + '.' + p6
  })
  str = str.replaceAll('QSOs', GLOBAL?.t?.('general.terms.QSOs-a11y', 'Q sos'))
  str = str.replaceAll('QSO', GLOBAL?.t?.('general.terms.QSO-a11y', 'Q so'))

  return str
}

export function useScreenReaderEnabled () {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(undefined)
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled)
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setIsScreenReaderEnabled)
    return () => subscription.remove()
  }, [])
  return isScreenReaderEnabled
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ScrollView } from 'react-native'
import { Button, Text } from 'react-native-paper'
import Share from 'react-native-share'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import DeviceInfo from 'react-native-device-info'

import packageJson from '../../../package.json'

import { reportError } from '../../distro'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    root: {
      padding: baseStyles.oneSpace * 2,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
      height: '100%'
    }
  }
}

export default function RootErrorBoundary ({ children }) {
  const onError = useCallback((error) => {
    reportError('Error caught by RootErrorBoundary', error)
  }, [])

  return (
    <ErrorBoundary
      FallbackComponent={RootFallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}

function RootFallback ({ error, resetErrorBoundary }) {
  const styles = useThemedStyles(prepareStyles)

  const [showDetails, setShowDetails] = useState(false)

  const shareDetails = useCallback(() => {
    Share.open({
      title: 'Ham2K PoLo Error Details',
      message: detailsText(error),
      email: 'help@ham2k.com'
    })
  }, [error])

  return (
    <GestureHandlerRootView style={styles.root}>
      <Text style={[styles.markdown.heading2, { marginBottom: styles.oneSpace }]}>Something went wrong</Text>
      <Text style={{ marginBottom: styles.oneSpace * 4 }}>{error.message}</Text>

      <Button style={{ marginBottom: styles.oneSpace * 4 }} onPress={resetErrorBoundary}>Try again</Button>

      <Button style={{ marginBottom: styles.oneSpace * 1 }} onPress={shareDetails}>Share details with the Development Team</Button>

      {!showDetails && (
        <Button onPress={() => setShowDetails(true)}>Show details</Button>
      )}

      {showDetails && (
        <>
          <ScrollView style={{ maxHeight: '40%', borderWidth: 1, borderColor: '#AAA', padding: styles.oneSpace, marginBottom: styles.oneSpace * 2 }}>
            <Text style={{ paddingBottom: styles.oneSpace * 2 }}>{detailsText(error)}</Text>
          </ScrollView>
        </>
      )}
    </GestureHandlerRootView>
  )
}

function detailsText (error) {
  const stack = error.stack.split('\n')
    .filter(line => !line
      .includes('node_modules'))
    .map(line => {
      const matches = line.match(/at\s(.*)\s\((.*?)(:\d+:\d+){0,1}\)/)
      if (matches) {
        console.log('matches', matches)
        return `* at ${matches[1]}${matches[3] || ''}`
      } else {
        return line
      }
    })
    .filter(x => x)
    .join('\n')

  const version = `Version ${packageJson.version} - Build ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`

  let platform = `Platform ${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`
  platform += ` - ${DeviceInfo.getManufacturerSync()} ${DeviceInfo.getDeviceId()}`
  platform += ` -  ${DeviceInfo.getInstallerPackageNameSync()} - ${DeviceInfo.getInstallReferrerSync()}`

  return [error.message, stack, version, platform].join('\n\n')
}

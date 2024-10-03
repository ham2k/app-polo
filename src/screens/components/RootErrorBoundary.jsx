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
import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { reportError } from '../../distro'

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

  return (
    <GestureHandlerRootView style={styles.root}>
      <Text style={[styles.markdown.heading2, { marginBottom: styles.oneSpace }]}>Something went wrong</Text>
      <Text style={{ marginBottom: styles.oneSpace }}>{error.message}</Text>

      <Button style={{ marginBottom: styles.oneSpace * 2 }} onPress={resetErrorBoundary}>Try again</Button>

      {!showDetails && (
        <Button onPress={() => setShowDetails(true)}>More Details</Button>
      )}

      {showDetails && (
        <ScrollView style={{ maxHeight: '40%', borderWidth: 1, borderColor: '#AAA', padding: styles.oneSpace }}>
          <Text>{cleanStack(error.stack)}</Text>
        </ScrollView>
      )}
    </GestureHandlerRootView>
  )
}

function cleanStack (stack) {
  return stack.split('\n')
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
}

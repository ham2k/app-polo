/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react'
import { List } from 'react-native-paper'
import { useSelector } from 'react-redux'
import { Image, Pressable, ScrollView, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import releaseNotes from '../../../../RELEASE-NOTES.json'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { ListRow } from '../../components/ListComponents'
import { VersionSettingsForDistribution } from '../../../distro'
import { selectSettings } from '../../../store/settings'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'

const SPLASH_IMAGE = require('../../../screens/StartScreen/img/launch_screen.jpg')

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

export default function VersionSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

  const settings = useSelector(selectSettings)

  const [showImage, setShowImage] = useState(false)

  return (
    <ScreenContainer
      style={{
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        margin: 0,
        height: '100%'
      }}
    >
      {showImage ? (
        <Pressable
          onPress={() => setShowImage(false)}
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'stretch'
          }}
        >
          <Image
            source={SPLASH_IMAGE}
            style={{
              resizeMode: 'cover',
              width: '100%',
              margin: 0,
              height: '100%'
            }}
          />

        </Pressable>
      ) : (
        <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
          <VersionSettingsForDistribution settings={settings} styles={styles} />

          <Ham2kListSection>
            <Ham2kListItem
              title={'Recent Changes'}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="newspaper-variant-outline" />}
              right={() => (
                <Pressable onPress={() => setShowImage(true)}>
                  <Image source={SPLASH_IMAGE} style={{ width: 64, height: 64 }} />
                </Pressable>
              )}
            />

            {Object.keys(releaseNotes).slice(0, 8).map((release, i) => (
              <ListRow key={i} style={styles.listRow}>

                <Markdown style={styles.markdown}>
                  {
  `## ${releaseNotes[release].name ? `${releaseNotes[release].name} Release` : `Version ${release}`}
  ${releaseNotes[release].changes.map(c => `* ${c}\n`).join('')}
  `
                  }
                </Markdown>
              </ListRow>
            ))}
          </Ham2kListSection>

          <View style={{ height: safeAreaInsets.bottom }} />

        </ScrollView>
      )}
    </ScreenContainer>
  )
}

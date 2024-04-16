/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'

import DeviceInfo from 'react-native-device-info'

import packageJson from '../../../../package.json'
import releaseNotes from '../../../../RELEASE-NOTES.json'

import Markdown from 'react-native-markdown-display'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { ListRow } from '../../components/ListComponents'

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

export default function VersionSettingsScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)

  const VersionIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="information-outline" />
  ), [styles])

  const NewsIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="bullhorn" />
  ), [styles])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Item title={`Version ${packageJson.version}`}
            description={`Build ${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`}
            left={VersionIcon}
          />

        </List.Section>
        <List.Section>
          <List.Item title={'Recent Changes'}
            left={NewsIcon}
          />
          {Object.keys(releaseNotes).slice(0, 8).map((release, i) => (
            <ListRow key={i} style={styles.listRow}>

              <Markdown style={styles.markdown}>
                {
`## Release ${release}
${releaseNotes[release].changes.map(c => `* ${c}\n`).join('')}
`
                }
              </Markdown>
            </ListRow>
          ))}

        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}

// ))}

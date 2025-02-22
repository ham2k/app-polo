/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React from 'react'
import { List } from 'react-native-paper'
import { Linking, ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'

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

export default function CreditsSettingsScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection>
          <Ham2kListItem title={'Created by Sebastián Delmont • KI2D'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'KI2D' })}
          />

          <Ham2kListItem title={'Ham2K PoLo is Open Source'}
            description={'Check out the code and contribute on GitHub!'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="github" />}
            onPress={async () => await Linking.openURL('https://github.com/ham2k/app-polo')}
          />

        </Ham2kListSection>

        <Ham2kListSection title={'Team PoLo'}>
          <Ham2kListItem
            title={'Sebastián Delmont • KI2D'}
            description={'Creator & Lead Developer'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'KI2D' })}
          />
          <Ham2kListItem
            title={'Steve Hiscocks • M1SDH'}
            description={'Developer'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'M1SDH' })}
          />
          <Ham2kListItem
            title={'Aldo Mendoza • NA7DO'}
            description={'Developer'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'NA7DO' })}
          />
          <Ham2kListItem
            title={'Ian Renton • M0TRT'}
            description={'Developer'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'M0TRT' })}
          />
          <Ham2kListItem
            title={'Ciemon Dunville • G0TRT'}
            description={'Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'G0TRT' })}
          />
          <Ham2kListItem
            title={'Alan McDonald • VK1AO'}
            description={'Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'VK1AO' })}
          />

        </Ham2kListSection>

      </ScrollView>
    </ScreenContainer>
  )
}

// ))}

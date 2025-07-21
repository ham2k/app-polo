/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React from 'react'
import { List } from 'react-native-paper'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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

export default function CreditsSettingsScreen ({ navigation, splitView }) {
  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
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
            title={'Alan McDonald • VK1AO'}
            description={'Lead Support & Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'VK1AO' })}
          />

        </Ham2kListSection>
        <Ham2kListSection title={'More code and docs contributors'}>
          <Ham2kListItem
            title={'Phil Kessels • DL9PK'}
            description={'Code: spotting others'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'DL9PK' })}
          />
          <Ham2kListItem
            title={'Ciemon Dunville • G0TRT'}
            description={'Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'G0TRT' })}
          />
          <Ham2kListItem
            title={'Emma • K4UWU/VA2EMZ'}
            description={'Code: WaveLog support'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'K4UWU' })}
          />
          <Ham2kListItem
            title={'Woody • KC1VOP'}
            description={'Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'KC1VOP' })}
          />
          <Ham2kListItem
            title={'John • KQ4URU'}
            description={'Code: QSO Party data and rules'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'KQ4URU' })}
          />
          <Ham2kListItem
            title={'Aldo Mendoza • NA7DO'}
            description={'Code: power controls, confirm QSOs from spots, lots of small fixes'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'NA7DO' })}
          />
          <Ham2kListItem
            title={'Ian Renton • M0TRT'}
            description={'Code: assorted bug fixes'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'M0TRT' })}
          />
          <Ham2kListItem
            title={'Stan • W1BOY'}
            description={'Code: QSO Party data and rules. Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'W1BOY' })}
          />
          <Ham2kListItem
            title={'Marion • W1GRL'}
            description={'Code: QSO Party data and rules. Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'W1GRL' })}
          />
          <Ham2kListItem
            title={'Bryan • W1WC'}
            description={'Code: QSO Party data and rules. Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'W1WC' })}
          />
          <Ham2kListItem
            title={'Kevin • W8NI'}
            description={'Code: QSO Party data and rules. Documentation'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
            onPress={() => navigation.navigate('CallInfo', { call: 'W8NI' })}
          />
        </Ham2kListSection>
        <View style={{ height: safeAreaInsets.bottom }} />

      </ScrollView>
    </ScreenContainer>
  )
}

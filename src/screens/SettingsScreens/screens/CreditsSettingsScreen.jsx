/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ScreenContainer from '../../components/ScreenContainer'
import { H2kListItem, H2kListSection } from '../../../ui'

export default function CreditsSettingsScreen ({ navigation, splitView }) {
  const safeAreaInsets = useSafeAreaInsets()

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem title={'Created by Sebastián Delmont • KI2D'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KI2D' })}
          />

          <H2kListItem title={'Ham2K PoLo is Open Source'}
            description={'Check out the code and contribute on GitHub!'}
            leftIcon="github"
            onPress={async () => await Linking.openURL('https://github.com/ham2k/app-polo')}
          />

        </H2kListSection>

        <H2kListSection title={'Team PoLo'}>
          <H2kListItem
            title={'Sebastián Delmont • KI2D'}
            description={'Creator & Lead Developer'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KI2D' })}
          />
          <H2kListItem
            title={'Steve Hiscocks • M1SDH'}
            description={'Developer'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'M1SDH' })}
          />
          <H2kListItem
            title={'Alan McDonald • VK1AO'}
            description={'Lead Support & Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'VK1AO' })}
          />

        </H2kListSection>
        <H2kListSection title={'More code and docs contributors'}>
          <H2kListItem
            title={'Phil Kessels • DL9PK'}
            description={'Code: spotting others'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'DL9PK' })}
          />
          <H2kListItem
            title={'Ciemon Dunville • G0TRT'}
            description={'Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'G0TRT' })}
          />
          <H2kListItem
            title={'Emma • K0UWU/VA2EMZ'}
            description={'Code: WaveLog support'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'K0UWU' })}
          />
          <H2kListItem
            title={'Woody • KC1VOP'}
            description={'Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KC1VOP' })}
          />
          <H2kListItem
            title={'John • KQ4URU'}
            description={'Code: QSO Party data and rules'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KQ4URU' })}
          />
          <H2kListItem
            title={'Aldo Mendoza • NA7DO'}
            description={'Code: power controls, confirm QSOs from spots, lots of small fixes'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'NA7DO' })}
          />
          <H2kListItem
            title={'Ian Renton • M0TRT'}
            description={'Code: assorted bug fixes'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'M0TRT' })}
          />
          <H2kListItem
            title={'Stan • W1BOY'}
            description={'Code: QSO Party data and rules. Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W1BOY' })}
          />
          <H2kListItem
            title={'Marion • W1GRL'}
            description={'Code: QSO Party data and rules. Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W1GRL' })}
          />
          <H2kListItem
            title={'Bryan • W1WC'}
            description={'Code: QSO Party data and rules. Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W1WC' })}
          />
          <H2kListItem
            title={'Kevin • W8NI'}
            description={'Code: QSO Party data and rules. Documentation'}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W8NI' })}
          />
        </H2kListSection>
        <View style={{ height: safeAreaInsets.bottom }} />

      </ScrollView>
    </ScreenContainer>
  )
}

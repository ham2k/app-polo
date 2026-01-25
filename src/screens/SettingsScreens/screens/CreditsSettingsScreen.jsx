/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { H2kListItem, H2kListSection } from '../../../ui'

export default function CreditsSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

  const safeAreaInsets = useSafeAreaInsets()
  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem title={t('screens.creditsSettings.createdBy', 'Created by {{callsign}}', { callsign: 'KI2D' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KI2D' })}
          />

          <H2kListItem title={t('screens.creditsSettings.openSource', 'Ham2K PoLo is Open Source')}
            description={t('screens.creditsSettings.checkOutCode', 'Check out the code and contribute on GitHub!')}
            leftIcon="github"
            onPress={async () => await Linking.openURL('https://github.com/ham2k/app-polo')}
          />

        </H2kListSection>

        <H2kListSection title={t('screens.creditsSettings.teamPoLo', 'Team PoLo')}>
          <H2kListItem
            title={'Sebastián Delmont • KI2D'}
            description={t('screens.creditsSettings.creator', 'Creator & Lead Developer')}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KI2D' })}
          />
          <H2kListItem
            title={'Steve Hiscocks • M1SDH'}
            description={t('screens.creditsSettings.developer', 'Developer')}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'M1SDH' })}
          />
          <H2kListItem
            title={'Alan McDonald • VK1AO'}
            description={t('screens.creditsSettings.leadSupport', 'Lead Support & Documentation')}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'VK1AO' })}
          />

        </H2kListSection>

        <H2kListSection title={t('screens.creditsSettings.moreCodeAndDocsContributors', 'More code and docs contributors')}>

          {/* Sorted by callsign alphabetically */}

          <H2kListItem
            title={'Phil Kessels • DL9PK'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'spotting others' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'DL9PK' })}
          />
          <H2kListItem
            title={'Ciemon Dunville • G0TRT'}
            description={t('screens.creditsSettings.contributorDocumentation', 'Documentation')}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'G0TRT' })}
          />
          <H2kListItem
            title={'Emma • K0UWU/VA2EMZ'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'Wavelog' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'K0UWU' })}
          />
          <H2kListItem
            title={'Woody • KC1VOP'}
            description={t('screens.creditsSettings.contributorDocumentation', 'Documentation Contributor')}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KC1VOP' })}
          />
          <H2kListItem
            title={'John • KQ4URU'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'QSO Party data and rules' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'KQ4URU' })}
          />
          <H2kListItem
            title={'Ian Renton • M0TRT'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'assorted bug fixes' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'M0TRT' })}
          />
          <H2kListItem
            title={'Aldo Mendoza • NA7DO'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'power controls, confirm QSOs from spots, lots of small fixes' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'NA7DO' })}
          />
          <H2kListItem
            title={'Stan • W1BOY'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'QSO Party data and rules' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W1BOY' })}
          />
          <H2kListItem
            title={'Marion • W1GRL'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'QSO Party data and rules' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W1GRL' })}
          />
          <H2kListItem
            title={'Bryan • W1WC'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'QSO Party data and rules' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W1WC' })}
          />
          <H2kListItem
            title={'Kevin • W8NI'}
            description={t('screens.creditsSettings.contributorCode', 'Code Contributor: {{contributions}}', { contributions: 'QSO Party data and rules' })}
            leftIcon="account"
            onPress={() => navigation.navigate('CallInfo', { call: 'W8NI' })}
          />
        </H2kListSection>

        <H2kListSection title={t('screens.creditsSettings.translations', 'Translations')}>
          <H2kListItem
            title={t('screens.creditsSettings.translationService', 'Translation tooling by CrowdIn')}
            description={t('screens.creditsSettings.translationServiceDescription', 'Tools to manage the translation process are generously donated by CrowdIn')}
            leftIcon="hammer-screwdriver"
          />
          <H2kListItem
            title={t('general.languages.cs', 'Czech')}
            description={'OK1PTR Petr (lead)'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.de', 'German')}
            description={'DA1EE Lucas (lead), DJ5NF Martin, DK8YS Yannick, DO7JZ Julius'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.es', 'Spanish')}
            description={'KI2D Sebastián (lead), EA1HET Jonathan'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.fr', 'French')}
            description={'F8EXM Yannick (lead), F4JSU Rémi, VA6DM Dino'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.ja', 'Japanese')}
            description={'W9WOT Tomoko (lead)'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.nb', 'Norwegian')}
            description={'LB4FH Kjetil (lead), LA2USA Espen'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.nl', 'Dutch')}
            description={'ON4VT Danny (lead)'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.sk', 'Slovak')}
            description={'OM8ATE Matúš (lead), OM1PU Michal'}
            leftIcon="earth"
          />
          <H2kListItem
            title={t('general.languages.zh', 'Chinese')}
            description={'BG4JIN Hanshen Liu (lead)'}
            leftIcon="earth"
          />

        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />

      </ScrollView>
    </ScreenContainer>
  )
}

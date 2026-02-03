/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { selectSettings } from '../../../store/settings'
import { findHooks } from '../../../extensions/registry'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kListItem, H2kListSection } from '../../../ui'
import { AccountsQRZDialog } from '../components/AccountsQRZDialog'

export default function AccountsSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const accountSettingHooks = useMemo(() => {
    const hooks = findHooks('setting').filter(hook => hook.category === 'account' && hook.SettingItem)
    return hooks
  }, [settings]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>

        <H2kListSection title={t('screens.accountsSettings.accountsSection', 'Credentials')}>
          <H2kListItem
            title={t('screens.accountsSettings.accountsQRZ.title', 'QRZ (for callsign lookups)')}
            description={settings?.accounts?.qrz ? t('screens.accountsSettings.accountsQRZ.description', 'Login: {{login}}', { login: settings.accounts.qrz.login }) : t('screens.accountsSettings.accountsQRZ.noAccount', 'No account')}
            leftIcon="web"
            onPress={() => setCurrentDialog('accountsQRZ')}
          />
          {currentDialog === 'accountsQRZ' && (
            <AccountsQRZDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}

          {accountSettingHooks.map((hook) => (
            <hook.SettingItem key={hook.key} settings={settings} styles={styles} />
          ))}
        </H2kListSection>

        {settings.wavelogExperiments && (
          <H2kListSection title={t('screens.settings.accountsSettings.servicesSection', 'Services')}>
            <H2kListItem
              title={t('screens.settings.wavelogSettings.title', 'Wavelog Settings')}
              description={t('screens.settings.wavelogSettings.description', 'Configure Wavelog API connection')}
              onPress={() => navigation.navigate('Settings', { screen: 'WavelogSettings' })}
              leftIcon="cloud-upload-outline"
              leftIconColor={styles.colors.devMode}
            />
          </H2kListSection>
        )}
      </ScrollView>
    </ScreenContainer>
  )
}

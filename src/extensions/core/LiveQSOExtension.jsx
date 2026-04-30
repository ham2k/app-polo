/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'

import { H2kListItem } from '../../ui'
import LiveQSOHTTPSettingsScreen from '../../screens/SettingsScreens/screens/LiveQSOHTTPSettingsScreen'
import LiveQSON1MMSettingsScreen from '../../screens/SettingsScreens/screens/LiveQSON1MMSettingsScreen'
import LiveQSOSettingsScreen from '../../screens/SettingsScreens/screens/LiveQSOSettingsScreen'
import LiveQSOSocketSettingsScreen from '../../screens/SettingsScreens/screens/LiveQSOSocketSettingsScreen'

export const Info = {
  key: 'core-live-qso',
  name: 'Live QSO logging',
  icon: 'broadcast',
  category: 'core',
  hidden: true,
  alwaysEnabled: true
}

function LiveQSOSettingItem ({ navigation }) {
  const { t } = useTranslation()
  const isIOS = Platform.OS === 'ios'
  const title = isIOS
    ? t('screens.liveQSOSettings.httpOnlyMenu.title', 'Custom HTTP QSO endpoint')
    : t('screens.liveQSOSettings.menu.title', 'Live QSO logging')
  const description = isIOS
    ? t('screens.liveQSOSettings.httpOnlyMenu.description', 'Send live QSOs to a custom web service')
    : t('screens.liveQSOSettings.menu.description', 'HTTP endpoint and other live export transports')

  return (
    <H2kListItem
      title={title}
      description={description}
      leftIcon="broadcast"
      onPress={() => navigation.navigate('ExtensionScreen', {
        key: 'live-qso-settings',
        title
      })}
    />
  )
}

const Extension = {
  ...Info,
  onActivation: ({ registerHook }) => {
    registerHook('setting', {
      hook: {
        key: 'live-qso-settings',
        category: 'logging',
        SettingItem: LiveQSOSettingItem
      }
    })

    registerHook('screen', {
      hook: {
        key: 'live-qso-settings',
        ScreenComponent: LiveQSOSettingsScreen
      }
    })

    registerHook('screen', {
      hook: {
        key: 'live-qso-http-settings',
        ScreenComponent: LiveQSOHTTPSettingsScreen
      }
    })

    registerHook('screen', {
      hook: {
        key: 'live-qso-udp-settings',
        ScreenComponent: LiveQSOSocketSettingsScreen
      }
    })

    registerHook('screen', {
      hook: {
        key: 'live-qso-n1mm-settings',
        ScreenComponent: LiveQSON1MMSettingsScreen
      }
    })
  }
}

export default Extension

/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { mergeSettings, selectSettings } from '../../../store/settings'
import {
  displayLiveQSOUDPURL,
  LIVE_QSO_UDP_MESSAGE_FORMAT_OPTIONS,
  liveQSOUDPMessageFormatOption,
  normalizeLiveQSOUDPURL,
  sendLiveQSOUDPTest,
  selectLiveQSOUDPSettings,
  summarizeLiveQSOUDPURL
} from '../../../store/liveQSO'
import {
  H2kButton,
  H2kDialog,
  H2kDialogActions,
  H2kDialogContent,
  H2kDialogTitle,
  H2kListItem,
  H2kListSection,
  H2kText,
  H2kTextInput
} from '../../../ui'

export default function LiveQSOSocketSettingsScreen ({ splitView }) {
  const { t } = useTranslation()

  const safeAreaInsets = useSafeAreaInsets()
  const styles = useThemedStyles()
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()

  const udpSettings = selectLiveQSOUDPSettings(settings)
  const selectedFormat = liveQSOUDPMessageFormatOption(udpSettings.messageFormat)

  const [urlDialogVisible, setURLDialogVisible] = useState(false)
  const [formatDialogVisible, setFormatDialogVisible] = useState(false)
  const [draftURL, setDraftURL] = useState(displayLiveQSOUDPURL(udpSettings.url))

  useEffect(() => {
    setDraftURL(displayLiveQSOUDPURL(udpSettings.url))
  }, [udpSettings.url])

  const mergeUDPSettings = useCallback((partial) => {
    dispatch(mergeSettings({ liveQSO: { udp: partial } }))
  }, [dispatch])

  const saveURL = useCallback(() => {
    mergeUDPSettings({ url: normalizeLiveQSOUDPURL(draftURL) })
    setURLDialogVisible(false)
  }, [draftURL, mergeUDPSettings])

  const cancelURLDialog = useCallback(() => {
    setDraftURL(udpSettings.url)
    setURLDialogVisible(false)
  }, [udpSettings.url])

  const selectFormat = useCallback((value) => {
    mergeUDPSettings({ messageFormat: value })
    setFormatDialogVisible(false)
  }, [mergeUDPSettings])

  const sendTestMessage = useCallback(async () => {
    try {
      await sendLiveQSOUDPTest({ settings: udpSettings })

      Alert.alert(
        t('screens.liveQSOUDPSettings.test.successTitle', 'UDP test sent'),
        t('screens.liveQSOUDPSettings.test.successBody', 'Done.')
      )
    } catch (error) {
      Alert.alert(
        t('screens.liveQSOUDPSettings.test.errorTitle', 'Error sending UDP test'),
        error?.message ?? t('screens.liveQSOUDPSettings.test.errorBody', 'Unknown error')
      )
    }
  }, [t, udpSettings])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSOUDPSettings.enabled.title', 'Enabled')}
            description={udpSettings.enabled ? t('screens.liveQSOUDPSettings.enabled.descriptionOn', 'Send saved QSOs to the configured UDP target') : t('screens.liveQSOUDPSettings.enabled.descriptionOff', 'Do not send live QSOs over UDP')}
            leftIcon="lan"
            rightSwitchValue={udpSettings.enabled}
            rightSwitchOnValueChange={(value) => mergeUDPSettings({ enabled: value })}
            onPress={() => mergeUDPSettings({ enabled: !udpSettings.enabled })}
          />

          <H2kListItem
            title={t('screens.liveQSOUDPSettings.url.title', 'Set URL')}
            description={summarizeLiveQSOUDPURL(udpSettings.url, { maxLength: 56 })}
            leftIcon="webhook"
            onPress={() => setURLDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSOUDPSettings.messageFormat.title', 'Message format')}
            description={t('screens.liveQSOUDPSettings.messageFormat.description', '{{format}} • {{programs}}', { format: selectedFormat.title, programs: selectedFormat.description })}
            leftIcon="format-list-bulleted"
            onPress={() => setFormatDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSOUDPSettings.test.title', 'Send test ADIF')}
            description={t('screens.liveQSOUDPSettings.test.description', 'Sends a test QSO to the configured URL')}
            leftIcon="send-outline"
            onPress={sendTestMessage}
          />
        </H2kListSection>
        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>

      {urlDialogVisible && (
        <H2kDialog visible={true} onDismiss={cancelURLDialog}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSOUDPSettings.url.dialogTitle', 'UDP ADIF Target')}</H2kDialogTitle>
          <H2kDialogContent>
            <H2kText variant="bodyMedium">{t('screens.liveQSOUDPSettings.url.dialogBody', 'Enter the UDP target that should receive live ADIF datagrams.')}</H2kText>
            <H2kTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={draftURL}
              label={t('screens.liveQSOUDPSettings.url.inputLabel', 'Target URL')}
              placeholder={t('screens.liveQSOUDPSettings.url.placeholder', 'example.local:2237')}
              keyboard="dumb"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setDraftURL}
            />
          </H2kDialogContent>
          <H2kDialogActions>
            <H2kButton onPress={cancelURLDialog}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
            <H2kButton onPress={saveURL}>{t('general.buttons.ok', 'Ok')}</H2kButton>
          </H2kDialogActions>
        </H2kDialog>
      )}

      {formatDialogVisible && (
        <H2kDialog visible={true} onDismiss={() => setFormatDialogVisible(false)}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSOUDPSettings.messageFormat.dialogTitle', 'UDP ADIF message format')}</H2kDialogTitle>
          <H2kDialogContent>
            {LIVE_QSO_UDP_MESSAGE_FORMAT_OPTIONS.map((option) => (
              <H2kListItem
                key={option.value}
                title={t(`screens.liveQSOUDPSettings.messageFormat.options.${option.value}.title`, option.title)}
                description={t(`screens.liveQSOUDPSettings.messageFormat.options.${option.value}.description`, option.description)}
                leftIcon={option.value === udpSettings.messageFormat ? 'check-circle-outline' : 'circle-outline'}
                onPress={() => selectFormat(option.value)}
              />
            ))}
          </H2kDialogContent>
          <H2kDialogActions>
            <H2kButton onPress={() => setFormatDialogVisible(false)}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
          </H2kDialogActions>
        </H2kDialog>
      )}
    </ScreenContainer>
  )
}

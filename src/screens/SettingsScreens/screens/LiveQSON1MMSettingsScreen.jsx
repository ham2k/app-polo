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
  liveQSON1MMNetworkPolicyOption,
  LIVE_QSO_N1MM_NETWORK_POLICY_OPTIONS,
  normalizeLiveQSOUDPURL,
  sendLiveQSON1MMTest,
  selectLiveQSON1MMSettings,
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

export default function LiveQSON1MMSettingsScreen ({ splitView }) {
  const { t } = useTranslation()
  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()
  const settings = useSelector(selectSettings)
  const dispatch = useDispatch()
  const n1mmSettings = selectLiveQSON1MMSettings(settings)
  const selectedNetworkPolicy = liveQSON1MMNetworkPolicyOption(n1mmSettings.networkPolicy)
  const noURLConfigured = t('screens.liveQSOSettings.noURLConfigured')
  const selectedPolicyTitle = t(`screens.liveQSON1MMSettings.networkPolicy.options.${selectedNetworkPolicy.value}.title`)
  const selectedPolicyDescription = t(`screens.liveQSON1MMSettings.networkPolicy.options.${selectedNetworkPolicy.value}.description`)

  const [urlDialogVisible, setURLDialogVisible] = useState(false)
  const [policyDialogVisible, setPolicyDialogVisible] = useState(false)
  const [draftURL, setDraftURL] = useState(displayLiveQSOUDPURL(n1mmSettings.url))

  useEffect(() => {
    setDraftURL(displayLiveQSOUDPURL(n1mmSettings.url))
  }, [n1mmSettings.url])

  const mergeN1MMSettings = useCallback((partial) => {
    dispatch(mergeSettings({ liveQSO: { n1mm: partial } }))
  }, [dispatch])

  const saveURL = useCallback(() => {
    mergeN1MMSettings({ url: normalizeLiveQSOUDPURL(draftURL) })
    setURLDialogVisible(false)
  }, [draftURL, mergeN1MMSettings])

  const cancelURLDialog = useCallback(() => {
    setDraftURL(displayLiveQSOUDPURL(n1mmSettings.url))
    setURLDialogVisible(false)
  }, [n1mmSettings.url])

  const selectNetworkPolicy = useCallback((value) => {
    mergeN1MMSettings({ networkPolicy: value })
    setPolicyDialogVisible(false)
  }, [mergeN1MMSettings])

  const sendTestMessage = useCallback(async () => {
    try {
      await sendLiveQSON1MMTest({
        settings: n1mmSettings,
        operatorCall: settings?.operatorCall
      })

      Alert.alert(
        t('screens.liveQSON1MMSettings.test.successTitle'),
        t('screens.liveQSON1MMSettings.test.successBody')
      )
    } catch (error) {
      Alert.alert(
        t('screens.liveQSON1MMSettings.test.errorTitle'),
        error?.message ?? t('screens.liveQSON1MMSettings.test.errorBody')
      )
    }
  }, [n1mmSettings, settings?.operatorCall, t])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection>
          <H2kListItem
            title={t('screens.liveQSON1MMSettings.enabled.title')}
            description={n1mmSettings.enabled ? t('screens.liveQSON1MMSettings.enabled.descriptionOn') : t('screens.liveQSON1MMSettings.enabled.descriptionOff')}
            leftIcon="broadcast"
            rightSwitchValue={n1mmSettings.enabled}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ enabled: value })}
            onPress={() => mergeN1MMSettings({ enabled: !n1mmSettings.enabled })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.url.title')}
            description={summarizeLiveQSOUDPURL(n1mmSettings.url, { maxLength: 56, empty: noURLConfigured })}
            leftIcon="webhook"
            onPress={() => setURLDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.networkPolicy.title')}
            description={t('screens.liveQSON1MMSettings.networkPolicy.description', { title: selectedPolicyTitle, detail: selectedPolicyDescription })}
            leftIcon="network-outline"
            onPress={() => setPolicyDialogVisible(true)}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.sendEdits.title')}
            description={n1mmSettings.sendEdits ? t('screens.liveQSON1MMSettings.sendEdits.descriptionOn') : t('screens.liveQSON1MMSettings.sendEdits.descriptionOff')}
            leftIcon="file-edit-outline"
            rightSwitchValue={n1mmSettings.sendEdits}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ sendEdits: value })}
            onPress={() => mergeN1MMSettings({ sendEdits: !n1mmSettings.sendEdits })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.sendDeletes.title')}
            description={n1mmSettings.sendDeletes ? t('screens.liveQSON1MMSettings.sendDeletes.descriptionOn') : t('screens.liveQSON1MMSettings.sendDeletes.descriptionOff')}
            leftIcon="delete-outline"
            rightSwitchValue={n1mmSettings.sendDeletes}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ sendDeletes: value })}
            onPress={() => mergeN1MMSettings({ sendDeletes: !n1mmSettings.sendDeletes })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.skipEmptyFields.title')}
            description={n1mmSettings.skipEmptyFields ? t('screens.liveQSON1MMSettings.skipEmptyFields.descriptionOn') : t('screens.liveQSON1MMSettings.skipEmptyFields.descriptionOff')}
            leftIcon="code-tags"
            rightSwitchValue={n1mmSettings.skipEmptyFields}
            rightSwitchOnValueChange={(value) => mergeN1MMSettings({ skipEmptyFields: value })}
            onPress={() => mergeN1MMSettings({ skipEmptyFields: !n1mmSettings.skipEmptyFields })}
          />

          <H2kListItem
            title={t('screens.liveQSON1MMSettings.test.title')}
            description={t('screens.liveQSON1MMSettings.test.description')}
            leftIcon="send-outline"
            onPress={sendTestMessage}
          />
        </H2kListSection>
        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>

      {urlDialogVisible && (
        <H2kDialog visible={true} onDismiss={cancelURLDialog}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSON1MMSettings.url.dialogTitle')}</H2kDialogTitle>
          <H2kDialogContent>
            <H2kText variant="bodyMedium">{t('screens.liveQSON1MMSettings.url.dialogBody')}</H2kText>
            <H2kTextInput
              style={[styles.input, { marginTop: styles.oneSpace }]}
              value={draftURL}
              label={t('screens.liveQSON1MMSettings.url.inputLabel')}
              placeholder={t('screens.liveQSON1MMSettings.url.placeholder')}
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

      {policyDialogVisible && (
        <H2kDialog visible={true} onDismiss={() => setPolicyDialogVisible(false)}>
          <H2kDialogTitle style={{ textAlign: 'center' }}>{t('screens.liveQSON1MMSettings.networkPolicy.dialogTitle')}</H2kDialogTitle>
          <H2kDialogContent>
            {LIVE_QSO_N1MM_NETWORK_POLICY_OPTIONS.map((option) => (
              <H2kListItem
                key={option.value}
                title={t(`screens.liveQSON1MMSettings.networkPolicy.options.${option.value}.title`)}
                description={t(`screens.liveQSON1MMSettings.networkPolicy.options.${option.value}.description`)}
                leftIcon={option.value === n1mmSettings.networkPolicy ? 'check-circle-outline' : 'circle-outline'}
                onPress={() => selectNetworkPolicy(option.value)}
              />
            ))}
          </H2kDialogContent>
          <H2kDialogActions>
            <H2kButton onPress={() => setPolicyDialogVisible(false)}>{t('general.buttons.cancel', 'Cancel')}</H2kButton>
          </H2kDialogActions>
        </H2kDialog>
      )}
    </ScreenContainer>
  )
}

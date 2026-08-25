// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { reportError, subscriptionPaywall } from '../../../../distro'
import { selectLocalExtensionData } from '../../../../store/local'
import { selectSettings } from '../../../../store/settings'
import { useFindHooks } from '../../../../extensions/registry'
import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogContent, H2kDialogTitle, H2kMarkdown, H2kText } from '../../../../ui'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

export function StashSentDialog ({ visible, filesLabel, isFreeAccount, onDismiss }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)
  const lofiDataSelector = useCallback((state) => selectLocalExtensionData(state, 'ham2k-lofi'), [])
  const lofiData = useSelector(lofiDataSelector)
  const syncHook = useFindHooks('sync')[0]

  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailMessage, setEmailMessage] = useState(null)

  // The dialog stays mounted between uploads, so start each one from a clean slate
  useEffect(() => {
    if (visible) {
      setEmailing(false)
      setEmailSent(false)
      setEmailMessage(null)
    }
  }, [visible])

  const handleEmailLink = useCallback(async () => {
    const errorMessage = (detail) => [
      t('screens.operationData.errorEmailingLink', "Couldn't send the email"),
      typeof detail === 'string' ? detail : undefined
    ].filter(x => x).join(': ')

    setEmailing(true)
    setEmailMessage(null)
    try {
      const result = await dispatch(syncHook.emailStashDownloadLink())
      if (result?.ok) {
        setEmailSent(true)
        setEmailMessage(t('screens.operationData.linkEmailed', "We've emailed you a download link."))
      } else {
        reportError('Error emailing Log Stash download link', new Error(`Error ${result?.status}: ${JSON.stringify(result?.json)}`))
        setEmailMessage(errorMessage(result?.json?.error))
      }
    } catch (error) {
      reportError('Error emailing Log Stash download link', error)
      setEmailMessage(errorMessage(error?.message))
    } finally {
      setEmailing(false)
    }
  }, [dispatch, syncHook, t])

  const handleSubscribe = useCallback(() => {
    onDismiss({ subscribed: true })
    subscriptionPaywall({ settings, lofiData, dispatch, syncHook })
  }, [dispatch, lofiData, onDismiss, settings, syncHook])

  if (!visible) return null

  return (
    <H2kDialog visible onDismiss={onDismiss}>
      <H2kDialogTitle>{t('screens.operationData.sentToLogStash', "Sent to Ham2K's File Stash")}</H2kDialogTitle>
      <H2kDialogContent>
        <H2kMarkdown compact style={{ marginBottom: styles.oneSpace * 2 }}>
          {t('screens.operationData.sentToLogStashRetrieve-md', 'You can retrieve {{filesLabel}} by visiting **[stash.ham2k.net](https://stash.ham2k.net)** on any browser.', { filesLabel })}
        </H2kMarkdown>

        <H2kText>
          {t('screens.operationData.sentToLogStashEmailOffer', 'Or for your convenience, we can send you an email with a direct link.')}
        </H2kText>
        <View style={{ alignItems: 'center', marginTop: styles.oneSpace * 1.5 }}>
          {emailSent ? (
            <H2kText style={{ fontWeight: 'bold', textAlign: 'center' }}>{emailMessage}</H2kText>
          ) : (
            <>
              {emailMessage && (
                <H2kText style={{ textAlign: 'center', color: styles.colors.error, marginBottom: styles.oneSpace }}>
                  {emailMessage}
                </H2kText>
              )}
              <H2kButton
                mode="contained"
                icon="email-outline"
                loading={emailing}
                disabled={emailing}
                onPress={handleEmailLink}
              >
                {t('screens.operationData.emailMeALink', 'Email Me a Link')}
              </H2kButton>
            </>
          )}
        </View>

        {isFreeAccount && (
          <>
            <H2kText style={{ marginTop: styles.oneSpace * 2 }}>
              {t('screens.operationData.logStashDialogTiers', 'Free accounts can only send one file at a time. Subscribers can send as many as they want.')}
            </H2kText>
            <View style={{ alignItems: 'flex-start', marginTop: styles.oneSpace }}>
              <H2kButton mode="outlined" compact onPress={handleSubscribe}>
                {t('screens.operationData.logStashDialogSubscribe', 'Subscribe')}
              </H2kButton>
            </View>
          </>
        )}
      </H2kDialogContent>
      <H2kDialogActions>
        <H2kButton onPress={onDismiss}>
          {t('general.buttons.done', 'Done')}
        </H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}

// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'
import { Platform } from 'react-native'
import { useTranslation } from 'react-i18next'

import { H2kButton, H2kDialog, H2kDialogActions, H2kDialogScrollArea, H2kDialogTitle, H2kMarkdown } from '../../../../ui'
import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'

export function ExportOptionsInfoDialog ({ visible, onDismiss }) {
  const { t } = useTranslation()
  const styles = useThemedStyles()

  if (!visible) return null

  return (
    <H2kDialog visible onDismiss={onDismiss}>
      <H2kDialogTitle>{t('screens.operationData.exportOptionsInfoTitle', 'Export Options')}</H2kDialogTitle>
      <H2kDialogScrollArea>
        <H2kMarkdown style={{ marginVertical: styles.oneSpace * 2 }}>
          {[
            t('screens.operationData.exportOptionsInfoStash-md', "**Stash** uploads your files to Ham2K's File Stash, and you can download them later from any browser at **[stash.ham2k.net](https://stash.ham2k.net)**. Useful in the field, when there's no other easy way to get a file off your phone."),
            Platform.OS === 'android'
              ? t('screens.operationData.exportOptionsInfoShare-md', '**Share** hands your files to another app on your device — email, messaging, cloud storage, or another logging program.')
              : t('screens.operationData.exportOptionsInfoExport-md', '**Export** hands your files to another app on your device — email, messaging, cloud storage, or another logging program.'),
            Platform.OS === 'android' &&
              t('screens.operationData.exportOptionsInfoSave-md', '**Save** writes your files straight into a folder on your device, without going through another app.'),
            t('screens.operationData.exportOptionsInfoSelection-md', 'These act on all the files you have checked below. You can also tap any single file to share just that one.')
          ].filter(x => x).join('\n\n')}
        </H2kMarkdown>
      </H2kDialogScrollArea>
      <H2kDialogActions>
        <H2kButton onPress={onDismiss}>
          {t('general.buttons.ok', 'Ok')}
        </H2kButton>
      </H2kDialogActions>
    </H2kDialog>
  )
}

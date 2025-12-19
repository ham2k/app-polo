/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { selectOperationCallInfo } from '../../../../store/operations'
import { H2kListItem } from '../../../../ui'

import { WABSquareDialog } from './WABSquareDialog'
import { Info } from '../WABExtension'

export function WABOpSetting ({ styles, operation, settings, titleStyle, descriptionStyle }) {
  const { t } = useTranslation()

  const [currentDialog, setCurrentDialog] = useState()
  const callInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  if (callInfo?.entityPrefix?.[0] === 'G' || callInfo?.entityPrefix === 'EI') {
    return (
      <>
        <H2kListItem
          title={callInfo?.entityPrefix?.[0] === 'G' ? t('extensions.wab.workedAllBritainSquare', 'Worked All Britain Square') : t('extensions.wab.workedAllIrelandSquare', 'Worked All Ireland Square')}
          description={operation?.wabSquare ? `${operation.wabSquare}` : t('extensions.wab.noSquareSet', 'No square set')}
          onPress={() => setCurrentDialog('wabSquare')}
          titleStyle={titleStyle}
          descriptionStyle={descriptionStyle}
          leftIcon={Info.icon}
        />
        {currentDialog === 'wabSquare' && (
          <WABSquareDialog
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )}
      </>
    )
  }
}

/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState } from 'react'
import { List } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { selectOperationCallInfo } from '../../../../store/operations'
import { Ham2kListItem } from '../../../../screens/components/Ham2kListItem'

import { WABSquareDialog } from './WABSquareDialog'
import { Info } from '../WABExtension'

export function WABOpSetting ({ styles, operation, settings }) {
  const [currentDialog, setCurrentDialog] = useState()
  const callInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  if (callInfo?.entityPrefix?.[0] === 'G' || callInfo?.entityPrefix === 'EI') {
    return (
      <React.Fragment>
        <Ham2kListItem
          title={'Worked All ' + (callInfo?.entityPrefix?.[0] === 'G' ? 'Britain' : 'Ireland') + ' Square'}
          description={operation?.wabSquare ? `${operation.wabSquare}` : 'No square set'}
          onPress={() => setCurrentDialog('wabSquare')}
          // eslint-disable-next-line react/no-unstable-nested-components
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={Info.icon} />}
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
      </React.Fragment>
    )
  }
}

import React, { useState } from 'react'
import { List } from 'react-native-paper'
import { useSelector } from 'react-redux'

import { selectOperationCallInfo } from '../../../../store/operations'
import { Ham2kListItem } from '../../../../screens/components/Ham2kListItem'

import { WABSquareDialog } from './WABSquareDialog'

export function WABOpSetting ({ styles, operation, settings }) {
  const [currentDialog, setCurrentDialog] = useState()
  const callInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  if (callInfo?.entityPrefix?.[0] === 'G') {
    return (
      <React.Fragment>
        <Ham2kListItem
          title="Worked All Britain Square"
          description={operation?.wabSquare ? `${operation.wabSquare}` : 'No square set'}
          onPress={() => setCurrentDialog('wabSquare')}
          // eslint-disable-next-line react/no-unstable-nested-components
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="map-marker-path" />}
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

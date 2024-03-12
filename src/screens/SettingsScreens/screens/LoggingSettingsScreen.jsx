import React, { useCallback, useState } from 'react'
import { List } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../../store/settings'
import { FlagsDialog } from '../components/FlagsDialog'

export default function LoggingSettingsScreen ({ navigation }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      listRow: {
        marginLeft: baseStyles.oneSpace * 2,
        marginRight: baseStyles.oneSpace * 2,
        marginBottom: baseStyles.oneSpace
      }
    }
  })

  const settings = useSelector(selectSettings)

  const [currentDialog, setCurrentDialog] = useState()

  const FlagsIcon = useCallback(() => (
    <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="flag" />
  ), [styles])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Item title={'Show Flags'}
            description={{ none: "Don't show any flags", all: 'For all contacts' }[settings.dxFlags] || 'Only for DX contacts'}
            left={FlagsIcon}
            onPress={() => setCurrentDialog('flags')}
          />
          {currentDialog === 'flags' && (
            <FlagsDialog
              settings={settings}
              styles={styles}
              visible={true}
              onDialogDone={() => setCurrentDialog('')}
            />
          )}
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}

// ))}

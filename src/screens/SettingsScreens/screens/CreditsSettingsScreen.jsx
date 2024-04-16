/* eslint-disable react/no-unstable-nested-components */
import React from 'react'
import { List } from 'react-native-paper'
import { Linking, ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    listRow: {
      marginLeft: baseStyles.oneSpace * 2,
      marginRight: baseStyles.oneSpace * 2,
      marginBottom: baseStyles.oneSpace
    }
  }
}

export default function CreditsSettingsScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <List.Section>
          <List.Item title={'Created by Sebastián Delmont • KI2D'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
          />

          <List.Item title={'Ham2K PoLo is Open Source'}
            description={'Check out the code and contribute on GitHub!'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="github" />}
            onPress={async () => await Linking.openURL('https://github.com/ham2k/app-polo')}
          />

        </List.Section>

        <List.Section>
          <List.Subheader>Team PoLo</List.Subheader>
          <List.Item title={'Steve Hiscocks • M1SDH'}
            left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="account" />}
          />

        </List.Section>

      </ScrollView>
    </ScreenContainer>
  )
}

// ))}

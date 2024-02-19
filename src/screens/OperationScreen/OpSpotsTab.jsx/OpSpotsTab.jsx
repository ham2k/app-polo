import React, { useMemo } from 'react'

import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useSpotsQuery } from '../../../store/apiPOTA'
import SpotList from './components/SpotList'

export default function OpSpotsTab ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      panel: {
        backgroundColor: baseStyles.theme.colors.secondaryContainer,
        borderBottomColor: baseStyles.theme.colors.secondaryLight,
        borderBottomWidth: 1
      },
      container: {
        paddingHorizontal: baseStyles.oneSpace,
        paddingTop: baseStyles.oneSpace,
        paddingBottom: baseStyles.oneSpace,
        gap: baseStyles.halfSpace
      }
    }
  })

  const spots = useSpotsQuery()
  const sortedSpots = useMemo(() => {
    return spots?.data?.sort((a, b) => {
      return a.frequency - b.frequency
    })
  }, [spots?.data])

  console.log(spots.data)
  return (
    <View style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }]}>

      <View style={[{ flex: 0, flexDirection: 'column' }]}>
        <SpotList spots={sortedSpots} />
      </View>
    </View>
  )
}

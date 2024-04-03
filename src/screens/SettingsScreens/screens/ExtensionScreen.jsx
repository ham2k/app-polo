import React, { useEffect, useMemo } from 'react'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings } from '../../../store/settings'
import ScreenContainer from '../../components/ScreenContainer'
import { findBestHook } from '../../../extensions/registry'

export default function ExtensionScreen ({ navigation, route }) {
  const styles = useThemedStyles()

  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const screenHook = useMemo(() => {
    return findBestHook('screen', { key: route.params.key })
  }, [route])

  useEffect(() => {
    if (!screenHook?.ScreenComponent) {
      navigation.goBack()
    }
  })

  return (
    <ScreenContainer>
      <screenHook.ScreenComponent styles={styles} settings={settings} navigation={navigation} route={route} dispatch={dispatch} />
    </ScreenContainer>
  )
}

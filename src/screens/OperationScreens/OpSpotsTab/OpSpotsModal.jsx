/*
 * Copyright ©️ 2025 Cainan Whelchel <krinkl3@proton.me>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState, useCallback } from 'react'
import { View, Text } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import cloneDeep from 'clone-deep'

import { parseCallsign } from '@ham2k/lib-callsigns'
import { bandForFrequency } from '@ham2k/lib-operation-data'

import { annotateQSO, useCallLookup } from '../OpLoggingTab/components/LoggingPanel/useCallLookup.js'
import { H2kPressable, H2kMarkdown } from '../../../ui'
import { trackEvent } from '../../../distro'
import { findHooks } from '../../../extensions/registry'
import { addQSOs, selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import { selectOperationCallInfo } from '../../../store/operations'
import { selectVFO } from '../../../store/station/stationSlice'
import { logTimer } from '../../../tools/perfTools'
import { expandRSTValues, parseStackedCalls } from '../../../tools/callsignTools'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

const DEBUG = false
let submitTimeout

function prepareStyles (themeStyles, themeColor) {
  // console.log(themeStyles)

  const white = '#fff'
  const black = '#000'
  const grey = '#bbb'
  // const grey2 = '#222'
  const grey3 = '#333'

  const commonStyles = {
    fontSize: themeStyles.normalFontSize,
    lineHeight: themeStyles.normalFontSize * 1.3,
    borderWidth: DEBUG ? 1 : 0,
    color: (themeStyles.theme.dark) ? white : black
  }

  const commonButton = {
    alignItems: 'center',
    flex: 0,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: grey3
  }

  return {
    ...themeStyles,
    panel: {
      backgroundColor: themeStyles.theme.colors[`${themeColor}Container`],
      borderBottomColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderTopColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderBottomWidth: 1,
      paddingTop: themeStyles.oneSpace,
      paddingBottom: themeStyles.oneSpace,
      flexDirection: 'column',
      color: themeStyles.theme.colors[`on${themeColor}`]
    },
    container: {
      paddingHorizontal: themeStyles.oneSpace,
      paddingTop: themeStyles.oneSpace,
      paddingBottom: themeStyles.oneSpace,
      gap: themeStyles.halfSpace
    },
    title: {
      ...themeStyles.title,
      color: (themeStyles.theme.dark) ? '#fff' : '#000',
      marginBottom: 40
    },
    buttons: {
      log: {
        ...commonButton,
        width: 175,
        height: 175,
        backgroundColor: (themeStyles.theme.dark) ? '#149c21ff' : '#25582aff'
      },
      cancel: {
        ...commonButton,
        width: 175,
        height: 175,
        backgroundColor: (themeStyles.theme.dark) ? '#b83202ff' : '#9f0101ff'
      },
      text: {
        ...commonStyles,
        fontSize: themeStyles.normalFontSize * 1.3,
        lineHeight: themeStyles.normalFontSize * 1.5,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
        color: white
      }
    },
    fields: {
      callAndEmoji: {
        ...commonStyles,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: themeStyles.oneSpace * 1.45,
        minWidth: themeStyles.oneSpace * 5
      },
      call: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        fontWeight: 800,
        fontSize: themeStyles.normalFontSize * 3.0,
        lineHeight: themeStyles.normalFontSize * 2.5
      },
      band: {
        ...commonStyles,
        flex: 0,
        marginBottom: themeStyles.oneSpace * 1
      },
      opName: {
        ...commonStyles,
        flex: 0,
        marginBottom: themeStyles.oneSpace * 2.5,
        fontWeight: 700,
        fontSize: themeStyles.normalFontSize * 1.8,
        lineHeight: themeStyles.normalFontSize * 2.5
      },
      note: {
        ...commonStyles,
        flex: 0,
        marginBottom: themeStyles.oneSpace * 1,
        fontWeight: 500,
        fontSize: themeStyles.normalFontSize * 1.2,
        color: (themeStyles.theme.dark) ? grey : grey3
      },
      mode: {
        ...commonStyles,
        flex: 0,
        marginLeft: themeStyles.oneSpace * 0.2,
        width: themeStyles.oneSpace * 5,
        textAlign: 'right',
        marginRight: themeStyles.oneSpace * 1.4,
        color: (themeStyles.theme.dark) ? grey : grey3
      },
      icon: {
        ...commonStyles,
        flex: 0,
        textAlign: 'left',
        marginRight: themeStyles.oneSpace * 0.3,
        marginLeft: themeStyles.oneSpace * -0.5,
        marginTop: themeStyles.oneSpace * 0.2
      },
      label: {
        ...commonStyles,
        fontSize: themeStyles.normalFontSize * 1.2,
        lineHeight: themeStyles.normalFontSize * 1.5,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
        color: (themeStyles.theme.dark) ? grey : grey3
      }
    }
  }
}

export default function OpSpotsModal ({ navigation, route }) {
  const [isValidQSO, setIsValidQSO] = useState(false)
  const themeColor = 'primary'
  const styles = useThemedStyles(prepareStyles, themeColor)
  const dispatch = useDispatch()

  const operation = route.params.operation
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)
  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))
  const vfo = useSelector(state => selectVFO(state))

  const { guess } = useCallLookup(route.params.qso)

  useEffect(() => { // Validate and analyze the callsign
    const { call } = parseStackedCalls(route.params.qso?.their?.call ?? '')

    const callInfo = parseCallsign(call)

    if (callInfo?.baseCall || call.indexOf('?') >= 0) {
      setIsValidQSO(true)
    } else {
      setIsValidQSO(false)
    }
  }, [route.params.qso?.their?.call])

  // Since our fields and logic often perform some async work,
  // we need to wait a few milliseconds before submitting to ensure all async work is complete.
  // But we can't just use a timeout, because we need the function to bind to the latest values.
  // So we use a state variable and a callback function to set it and an effect to actually submit..
  const [doSubmit, setDoSubmit] = useState(false)

  const handleSubmit = useCallback(() => { //
    if (submitTimeout) clearTimeout(submitTimeout)

    submitTimeout = setTimeout(() => {
      setDoSubmit(true)
    }, 50)
  }, [setDoSubmit])

  useEffect(() => {
    if (!doSubmit) return

    setDoSubmit(false)

    // copy out the params' qso to operate on it
    const qso = cloneDeep(route.params.qso)

    setTimeout(async () => { // Run inside a setTimeout to allow for async functions
      if (isValidQSO && !qso.deleted) {
        delete qso._isNew
        delete qso._willBeDeleted
        delete qso.deleted

        if (qso.freq) {
          qso.band = bandForFrequency(qso.freq)
        }

        if (!qso.startAtMillis) qso.startAtMillis = (new Date()).getTime()
        qso.startAt = new Date(qso.startAtMillis).toISOString()
        if (qso.endAtMillis) qso.endAt = new Date(qso.endAtMillis).toISOString()
        qso.our = qso.our || {}
        qso.our.call = qso.our.call || ourInfo?.call
        qso.our.operatorCall = qso.our.operatorCall || operation.local?.operatorCall
        qso.our.sent = expandRSTValues(qso.our.sent, qso.mode)

        qso.their = qso.their || {}
        qso.their.sent = expandRSTValues(qso.their.sent, qso.mode)
        // let lastUUID

        const { call, allCalls } = parseStackedCalls(qso?.their?.call ?? '')

        const multiQSOs = []

        for (let i = 0; i < allCalls.length; i++) {
          let oneQSO = qso
          qso.their.call = call
          if (allCalls.length > 1) { // If this is a multi-call QSO, we need to clone and annotate the QSO for each call
            console.log('preclone ')
            console.log(qso)
            oneQSO = cloneDeep(qso)
            console.log('postclone ')
            console.log(oneQSO)
            if (i > 0) oneQSO.uuid = null
            oneQSO.their.call = allCalls[i]?.trim()
            oneQSO.their.guess = {}
            oneQSO.their.lookup = {}
            oneQSO = await annotateQSO({ qso: oneQSO, online: false, settings, dispatch })
            console.log('this here is the problem')
            console.log(oneQSO)
            oneQSO._needsLookup = true
          }
          multiQSOs.push(oneQSO)

          const eventName = 'add_qso'

          trackEvent(eventName, { their_prefix: oneQSO.their?.entityPrefix ?? oneQSO.their?.guess?.entityPrefix, refs: (oneQSO.refs || []).map(r => r.type).join(',') })

        // lastUUID = oneQSO.uuid
        }

        const activities = findHooks('activity').filter(activity => activity.processQSOBeforeSaveWithDispatch || activity.processQSOBeforeSave)
        for (const activity of activities) {
          for (const q of multiQSOs) {
            if (activity.processQSOBeforeSaveWithDispatch) {
              activity.processQSOBeforeSaveWithDispatch({ qso: q, operation, qsos, vfo, settings, dispatch })
            } else {
              activity.processQSOBeforeSave({ qso: q, operation, qsos, vfo, settings })
            }
          }
        }

        setTimeout(() => {
        // Add the QSO to the operation, and set a new QSO
        // But leave enough time for blur effects to take place before being overwritten by the new setQSO
        // Just 10ms did not seemed to be enough in tests, but 50ms is fine.

          console.log('checking multiQSOs')
          console.log(multiQSOs)

          dispatch(addQSOs({ uuid: operation.uuid, qsos: multiQSOs }))
          if (DEBUG) logTimer('submit', 'handleSubmit added QSOs')

          // logging is done at this point. we can navigate away from popup
          navigation.goBack()
        }, 50)

      // if (DEBUG)
      //   logTimer('submit', 'handleSubmit after setQSO')
      }
    }, 0)
  }, [dispatch, doSubmit, isValidQSO, operation, ourInfo?.call, qsos, route.params.qso, settings, vfo, navigation])

  return (
    <View
      style={ [styles.panel, {
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 'large'
      }] }
    >
      <Text style={[styles.title]}>Log Spot?</Text>
      <Text style={[styles.fields.band]}>{route.params.qso.band} : {route.params.qso.mode} </Text>
      {/* <Text style={styles.fields.call}>{route.params.qso.their.call}{route.params.qso.their.guess.emoji}</Text> */}
      <View style={styles.fields.callAndEmoji}>
        <Text style={[styles.fields.call]}>{route.params.qso.their?.call ?? '?'}</Text>
      </View>
      <Text style={[styles.fields.opName]}>{guess?.name}</Text>
      {guess?.note &&
        <>
          <H2kMarkdown style={styles.fields.note}>{guess?.note}</H2kMarkdown>
        </>
      }
      <Text style={styles.fields.label}>{route.params.qso.spot.label}</Text>

      <View flexDirection="row" gap="10">
        <H2kPressable
          style={[styles.buttons.log, { gap: 10, marginTop: 25, border: 1 }]}
          onPress={() => {
            // this triggers the log code above and navigates back to the spots list
            handleSubmit()
          }}
          rippleColor='rgba(0, 255, 255, .32)'
        >
          <Text style={styles.buttons.text}>Log it!</Text>
        </H2kPressable>
        <H2kPressable
          style={[styles.buttons.cancel, { gap: 10, marginTop: 25, border: 1 }]}
          onPress={() => navigation.goBack()}
          rippleColor='rgba(218, 68, 3, 0.32)'
        >
          <Text style={styles.buttons.text}>Cancel</Text>
        </H2kPressable>
      </View>
    </View>
  )
}

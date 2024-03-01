/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import POTAInput from '../../components/POTAInput'
import { useDispatch, useSelector } from 'react-redux'
import { selectOperationCallInfo, setOperationData } from '../../../store/operations'
import { Text } from 'react-native-paper'
import { ActivitySettingsDialog } from '../components/ActivitySettingsDialog'
import { apiPOTA, useLookupParkQuery } from '../../../store/apiPOTA'
import { ScrollView } from 'react-native'
import { filterRefs, findRef, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { POTAAllParks, preparePOTAAllParksData } from '../../../data/POTA-AllParks'

preparePOTAAllParksData()

const ACTIVITY = {
  key: 'pota',
  icon: 'pine-tree',
  name: 'Parks on the Air',
  shortName: 'POTA',
  infoURL: 'https://parksontheair.com/',
  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, 'potaActivation')) return true
    if (findRef(qso, 'pota')) return true
    else return false
  },
  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, 'potaActivation')
    let label = opRef ? 'P2P' : 'POTA'
    if (findRef(qso, 'pota')) label = `✓ ${label}`
    return label
  },
  huntingType: 'pota',
  activationType: 'potaActivation',
  operationAttribute: 'pota',
  description: (operation) => refsToString(operation, ACTIVITY.activationType),
  descriptionPlaceholder: 'Enter POTA references',
  referenceRegex: /^[A-Z0-9]+-[0-9]{4,5}$/,
  decorateRef: (ref) => async (dispatch, getState) => {
    if (!ref?.ref || !ref.ref.match(/^[A-Z0-9]+-[0-9]{4,5}$/)) return { ...ref, ref: '', name: '', location: '' }

    const promise = dispatch(apiPOTA.endpoints.lookupPark.initiate(ref))
    const { data, error, isLoaded } = await promise
    let result
    if (data?.name) {
      result = {
        ...ref,
        name: [data.name, data.parktypeDesc].filter(x => x).join(' '),
        location: data?.locationName,
        grid: data?.grid6
      }
    } else if (error || isLoaded) {
      result = { ...ref, name: `${ref.ref} not found!` }
    }

    promise.unsubscribe()
    return result
  }
}

function ThisActivityOptionalExchangePanel (props) {
  const { qso, setQSO, styles } = props

  const [localValue, setLocalValue] = useState('')

  // Only initialize localValue once
  useEffect(() => {
    const refs = filterRefs(qso, ACTIVITY.huntingType)
    if (!localValue) {
      setLocalValue(refsToString(refs, ACTIVITY.huntingType))
    }
  }, [qso, localValue])

  const localHandleChangeText = useCallback((value) => {
    setLocalValue(value)
    const refs = stringToRefs(ACTIVITY.huntingType, value, { regex: ACTIVITY.referenceRegex })

    setQSO({ ...qso, refs: replaceRefs(qso?.refs, ACTIVITY.huntingType, refs) })
  }, [qso, setQSO])

  const defaultPrefix = useMemo(() => {
    if (qso?.their?.guess?.dxccCode) {
      return POTAAllParks.prefixByDXCCCode[qso?.their.guess.dxccCode] ?? 'K'
    } else {
      return 'K'
    }
  }, [qso?.their?.guess?.dxccCode])

  return (
    <POTAInput
      {...props}
      style={{ minWidth: 16 * styles.oneSpace }}
      value={localValue}
      label="Their POTA"
      defaultPrefix={defaultPrefix}
      onChangeText={localHandleChangeText}
    />
  )
}

export function ThisActivitySettingsDialog (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(selectOperationCallInfo(operation?.uuid))
  const defaultPrefix = useMemo(() => {
    if (ourInfo?.dxccCode) {
      return POTAAllParks.prefixByDXCCCode[ourInfo?.dxccCode] ?? 'K'
    } else {
      return 'K'
    }
  }, [ourInfo?.dxccCode])

  const handleChange = useCallback((value) => {
    let refs
    if (value) {
      refs = stringToRefs(ACTIVITY.activationType, value, { regex: ACTIVITY.referenceRegex })
    } else {
      refs = []
    }
    if (refs.length === 0 && value !== undefined) refs = [{ type: ACTIVITY.activationType, ref: value }]

    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, ACTIVITY.activationType, refs) }))
  }, [dispatch, operation])

  const handleGridSelect = useCallback((grid) => {
    dispatch(setOperationData({ uuid: operation.uuid, grid }))
  }, [dispatch, operation])

  return (
    <ActivitySettingsDialog
      {...props}
      icon={ACTIVITY.icon}
      title={ACTIVITY.name}
      info={ACTIVITY.infoURL}
      removeOption={true}
      value={refsToString(operation, ACTIVITY.activationType)}
      onChange={handleChange}
      content={({ value, setValue }) => (
        <>
          <Text variant="bodyMedium">Enter one or more park references being activated in this operation</Text>
          <POTAInput
            style={[styles.input, { marginTop: styles.oneSpace }]}
            label={'POTA References'}
            placeholder={''}
            mode={'flat'}
            value={value}
            defaultPrefix={defaultPrefix}
            onChangeText={(newValue) => {
              setValue(newValue)
            }}
          />
          <ScrollView style={{ maxHeight: styles.oneSpace * 6 }}>
            {stringToRefs(ACTIVITY.activationType, value, { regex: ACTIVITY.referenceRegex }).map((ref, index) => (
              <ThisActivityLookupLine key={ref.ref} activityRef={ref.ref} styles={styles} style={{ marginTop: styles.halfSpace, fontSize: styles.smallFontSize }} onGridSelect={handleGridSelect} />
            ))}
          </ScrollView>
        </>
      )}
    />
  )
}

export function ThisActivityLookupLine ({ activityRef, style, styles, onGridSelect }) {
  const pota = useLookupParkQuery({ ref: activityRef }, { skip: !activityRef })

  if (pota.isLoading) {
    return <Text style={style}>{'...'}</Text>
  } else {
    return (
      <Text style={style}>
        {pota?.data?.name ? (
          <>
            {[pota.data.name, pota.data.parktypeDesc].filter(x => x).join(' ')}
            {pota?.data?.grid6 ? ' • ' : ''}
            {pota?.data?.grid6 && (
              <Text
                onPress={() => onGridSelect && onGridSelect(pota.data.grid6)}
                style={{ color: styles.theme.colors.primary, textDecorationLine: 'underline' }}
              >
                {pota.data.grid6}
              </Text>
            )}

            {pota?.data?.locationName ? ` • ${pota.data.locationName}` : ''}
          </>
        ) : (
          `${activityRef} not found!`
        )}
      </Text>
    )
  }
}

const ThisActivity = {
  ...ACTIVITY,
  MainExchangePanel: null,
  OptionalExchangePanel: ThisActivityOptionalExchangePanel,
  SettingsDialog: ThisActivitySettingsDialog
}

export default ThisActivity

/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { setOperationData } from '../../../store/operations'
import { setVFO } from '../../../store/station/stationSlice'
import { capitalizeString } from '../../../tools/capitalizeString'
import { fmtFreqInMHz } from '../../../tools/frequencyFormats'
import { findRef, removeRef, replaceRef } from '../../../tools/refTools'
import { H2kDropDown } from '../../../ui'

import { SatelliteData } from './SatelliteData'
import { Info } from './SatellitesInfo'

export function SatellitesLoggingControl (props) {
  const { qso, vfo, operation, updateQSO, styles, style } = props
  const dispatch = useDispatch()

  const value = useMemo(() => {
    const ref = findRef(qso?.refs, Info.refType)
    return qso?._isNew ? ref?.ref ?? operation?.satellite : ref?.ref
  }, [operation?.satellite, qso?.refs, qso?._isNew])

  const options = useMemo(() => {
    const sats = [{ label: 'None', value: '' }]

    ;(SatelliteData?.activeSatellites ?? []).forEach(sat => {
      sat.uplinks.forEach((uplink, index) => {
        const downlink = sat.downlinks[index] && sat.downlinks[index]
        let label = sat.name
        label += ` • ${capitalizeString(uplink?.mode)}: `
        label += [fmtFreqInMHz(uplink?.lowerMHz), fmtFreqInMHz(downlink?.upperMHz)].filter(x => x).join(' → ')
        if (sat.aliases) label += ' (' + sat.aliases.join(', ') + ')'

        sats.push({
          label,
          value: `${sat.name}/${uplink?.lowerMHz}/${uplink?.mode}`
        })
      })
    })
    return sats
  }, [])

  const handleChange = useCallback((event) => {
    const newValue = event.nativeEvent.text
    const [satName, satFreq, satMode] = newValue.split('/')

    const sat = SatelliteData.satelliteByName[satName]
    if (sat) {
      const linkIndex = sat.uplinks.findIndex(link => `${link.lowerMHz}` === satFreq && link.mode === satMode)
      const uplink = sat.uplinks[linkIndex] || sat.uplinks[0]
      const freq = uplink.lowerMHz ? uplink.lowerMHz * 1000 : vfo?.freq
      const mode = uplink.mode === 'fm' ? 'FM' : vfo?.mode

      updateQSO({ freq, mode, refs: replaceRef(qso?.refs, Info.refType, { type: Info.refType, ref: newValue }) })
      if (qso?._isNew) {
        dispatch(setOperationData({ uuid: operation.uuid, satellite: newValue }))
        dispatch(setVFO({ freq, mode }))
      }
    } else {
      updateQSO({ refs: removeRef(qso?.refs, Info.refType) })
      if (qso?._isNew) {
        dispatch(setOperationData({ uuid: operation.uuid, satellite: undefined }))
      }
    }
  }, [dispatch, operation.uuid, qso?.refs, qso?._isNew, updateQSO, vfo?.freq, vfo?.mode])

  return (
    <H2kDropDown
      {...props}
      label="Satellite"
      value={value ?? ''}
      onChange={handleChange}
      dropDownContainerMaxHeight={styles.oneSpace * 19}
      fieldId={'satellite'}
      style={{ ...style, width: styles.oneSpace * 40 }}
      options={options}
    />
  )
}

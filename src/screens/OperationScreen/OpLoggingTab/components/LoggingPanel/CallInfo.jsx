import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text } from 'react-native-paper'
import { View } from 'react-native'
import { capitalizeString } from '../../../../../tools/capitalizeString'
import { useLookupCallQuery } from '../../../../../store/apiQRZ'
import { useLookupParkQuery } from '../../../../../store/apiPOTA'
import { filterRefs } from '../../../../../tools/refTools'

export function CallInfo ({ qso, styles, style }) {
  // Parse the callsign
  // Use `skip` to prevent calling the API on every keystroke
  const [skipQRZ, setSkipQRZ] = useState(true)
  useEffect(() => {
    setSkipQRZ(true)
    const timeout = setTimeout(() => setSkipQRZ(false), 500)
    return () => clearTimeout(timeout)
  }, [qso?.their?.call])

  const qrz = useLookupCallQuery({ call: qso?.their?.guess?.baseCall }, { skipQRZ })

  // Use `skip` to prevent calling the API on every keystroke
  const potaRef = useMemo(() => {
    const potaRefs = filterRefs(qso?.refs, 'pota')
    if (potaRefs?.length > 0) {
      return potaRefs[0].ref
    } else {
      return undefined
    }
  }, [qso?.refs])

  const pota = useLookupParkQuery({ ref: potaRef }, { skip: !potaRef })

  const line1 = useMemo(() => {
    const parts = []
    const entity = DXCC_BY_PREFIX[qso?.their?.guess?.entityPrefix]

    if (pota?.data?.name) {
      parts.push(`${entity?.flag ? `${entity.flag} ` : ''} POTA: ${pota.data.name} ${pota.data.parktypeDesc}`)
      if (pota.data.locationName) parts.push(pota.data.locationName)
    } else if (pota?.data?.error) {
      parts.push(`POTA ${potaRef} ${pota.data?.error}`)
    } else {
      if (entity) parts.push(`${entity.flag} ${entity.shortName}`)
      if (qrz?.data?.city && !qrz.isFetching) parts.push(capitalizeString(qrz.data.city, { force: false }), qrz.data.state)
    }

    return parts.filter(x => x).join(' • ')
  }, [qso?.their?.guess?.entityPrefix, qrz, pota, potaRef])

  const line2 = useMemo(() => {
    const parts = []
    if (qrz?.error) {
      parts.push(qrz.error)
    } else if (qrz?.data?.name && !qrz.isFetching) {
      parts.push(capitalizeString(qrz.data.name, { content: 'name', force: false }))
      if (qrz.data.call && qrz.data.call !== qrz.originalArgs?.call) {
        parts.push(`(Now ${qrz.data.call})`)
      }
    }
    return parts.filter(x => x).join(' • ')
  }, [qrz])

  return (
    <View style={[style, { flexDirection: 'column', justifyContent: 'flex-start' }]}>
      <Text style={{ height: styles.oneSpace * 2.2 }}>{line1}</Text>
      {qrz.loading ? (
        <ActivityIndicator size={styles.oneSpace} animating={true} style={{ alignSelf: 'flex-start' }}/>
      ) : (
        <Text style={{ height: styles.oneSpace * 2.2, fontWeight: 'bold' }}>{line2}</Text>

      )}
    </View>
  )
}

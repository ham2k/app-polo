import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile, useBuiltinCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text } from 'react-native-paper'
import { View } from 'react-native'
import { capitalizeString } from '../../../../../tools/capitalizeString'
import { useLookupCallQuery } from '../../../../../store/apiQRZ'

// Not actually a react hook, just named like one
// eslint-disable-next-line react-hooks/rules-of-hooks
useBuiltinCountryFile()

export function CallInfo ({ call, styles, style }) {
  // Parse the callsign
  const [parsedInfo, setParsedInfo] = useState({})
  useEffect(() => {
    // eslint-disable-next-line no-shadow
    let parsedInfo = parseCallsign(call)
    if (parsedInfo?.baseCall) {
      annotateFromCountryFile(parsedInfo)
    } else if (call) {
      parsedInfo = annotateFromCountryFile({ prefix: call })
    }
    setParsedInfo(parsedInfo)
  }, [call])

  const [skip, setSkip] = useState(true)
  useEffect(() => {
    setSkip(true)
    const timeout = setTimeout(() => setSkip(false), 500)
    return () => clearTimeout(timeout)
  }, [call])

  const { data: operatorInfo, loading } = useLookupCallQuery({ call: parsedInfo?.baseCall }, { skip })

  const line1 = useMemo(() => {
    const parts = []
    const entity = DXCC_BY_PREFIX[parsedInfo?.entityPrefix]
    if (entity) parts.push(`${entity.flag} ${entity.shortName}`)
    if (operatorInfo?.city) parts.push(capitalizeString(operatorInfo?.city, { force: false }), operatorInfo?.state)
    return parts.filter(x => x).join(' • ')
  }, [parsedInfo, operatorInfo])

  const line2 = useMemo(() => {
    const parts = []
    if (operatorInfo?.name) {
      parts.push(capitalizeString(operatorInfo.name, { content: 'name', force: false }))
      if (operatorInfo?.call && operatorInfo.call !== parsedInfo.baseCall) {
        parts.push(`(Now ${operatorInfo.call})`)
      }
    }
    return parts.filter(x => x).join(' • ')
  }, [parsedInfo, operatorInfo])

  return (
    <View style={[style, { flexDirection: 'column', justifyContent: 'flex-start', minHeight: 5.1 * styles.oneSpace }]}>
      <Text>{line1}</Text>
      {loading ? (
        <ActivityIndicator size={styles.oneSpace} animating={true} style={{ alignSelf: 'flex-start' }}/>
      ) : (
        <Text style={{ fontWeight: 'bold' }}>{line2}</Text>

      )}
    </View>
  )
}

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

  // Use `skip` to prevent calling the API on every keystroke
  const [skip, setSkip] = useState(true)
  useEffect(() => {
    setSkip(true)
    const timeout = setTimeout(() => setSkip(false), 500)
    return () => clearTimeout(timeout)
  }, [call])

  const lookup = useLookupCallQuery({ call: parsedInfo?.baseCall }, { skip })

  const line1 = useMemo(() => {
    const parts = []
    const entity = DXCC_BY_PREFIX[parsedInfo?.entityPrefix]
    if (entity) parts.push(`${entity.flag} ${entity.shortName}`)
    if (lookup?.data?.city) parts.push(capitalizeString(lookup.data.city, { force: false }), lookup.data.state)
    return parts.filter(x => x).join(' • ')
  }, [parsedInfo, lookup])

  const line2 = useMemo(() => {
    console.log('CallInfo', lookup)
    const parts = []
    if (lookup?.error) {
      parts.push(lookup.error)
    } else if (lookup?.data?.name) {
      parts.push(capitalizeString(lookup.data.name, { content: 'name', force: false }))
      if (lookup.data.call && lookup.data.call !== parsedInfo.baseCall) {
        parts.push(`(Now ${lookup.data.call})`)
      }
    }
    return parts.filter(x => x).join(' • ')
  }, [parsedInfo, lookup])

  return (
    <View style={[style, { flexDirection: 'column', justifyContent: 'flex-start' }]}>
      <Text>{line1}</Text>
      {lookup.loading ? (
        <ActivityIndicator size={styles.oneSpace} animating={true} style={{ alignSelf: 'flex-start' }}/>
      ) : (
        <Text style={{ fontWeight: 'bold' }}>{line2}</Text>

      )}
    </View>
  )
}

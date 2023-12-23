import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile, useBuiltinCountryFile } from '@ham2k/lib-country-files'
import { DXCC_BY_PREFIX } from '@ham2k/lib-dxcc-data'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Text } from 'react-native-paper'
import { useSelector } from 'react-redux'
import { selectSettings } from '../../../../../store/settings'

import packageJson from '../../../../../../package.json'

import { XMLParser } from 'fast-xml-parser'
import { View } from 'react-native'
import { capitalizeString } from '../../../../../tools/capitalizeString'
import debounce from 'debounce'

// Not actually a react hook, just named like one
// eslint-disable-next-line react-hooks/rules-of-hooks
useBuiltinCountryFile()

const qrzCache = {}

async function qrzAPILogin ({ username, password }) {
  const response = await fetch(
    'https://xmldata.qrz.com/xml/current/?' + new URLSearchParams({
      username,
      password,
      agent: `ham2k-polo-${packageJson.version}`
    })
  )
  const body = await response.text()
  const parser = new XMLParser()
  const xml = parser.parse(body)
  return xml
}

async function qrzAPILookup ({ sessionKey, callsign }) {
  if (!sessionKey) {
    console.error('No QRZ Session Key!')
    return { error: 'No QRZ Session Key!' }
  }
  try {
    const response = await fetch(
      'https://xmldata.qrz.com/xml/current/?' + new URLSearchParams({
        s: sessionKey,
        callsign
      })
    )
    const body = await response.text()
    const parser = new XMLParser()
    const xml = parser.parse(body)
    // console.log('Lookup', xml)
    return xml
  } catch (e) {
    console.error('qrzAPILookup Error', e)
    return { error: 'Error calling QRZ API Lookup', exception: e }
  }
}
async function qrzSession ({ settings }) {
  try {
    if (qrzCache.sessionKey) {
      return qrzCache.sessionKey
    } else {
      const login = await qrzAPILogin({ username: settings?.accounts?.qrz?.login, password: settings?.accounts?.qrz?.password })
      return login?.QRZDatabase?.Session?.Key
    }
  } catch (e) {
    console.log('qrzSession Error', e)
    return null
  }
}

async function fetchInfoFromQRZ ({ call, settings }) {
  const qrz = settings?.accounts?.qrz
  if (!qrz?.login || !qrz?.password) return {}
  const sessionKey = await qrzSession({ settings })
  const lookup = await qrzAPILookup({ sessionKey, callsign: call })

  console.log('lookup', lookup)

  const callsignInfo = lookup?.QRZDatabase?.Callsign || {}

  return {
    name: callsignInfo.name_fmt,
    call: callsignInfo.call,
    firstName: callsignInfo.fname,
    lastName: callsignInfo.name,
    tz: callsignInfo.TimeZone,
    gmtOffset: callsignInfo.GMTOffset,
    city: callsignInfo.addr2,
    state: callsignInfo.state,
    country: callsignInfo.country,
    postal: callsignInfo.zip,
    county: callsignInfo.county,
    grid: callsignInfo.grid,
    cqZone: callsignInfo.cqzone,
    ituZone: callsignInfo.ituzone,
    dxccCode: callsignInfo.dxcc,
    lat: callsignInfo.lat,
    lon: callsignInfo.lon,
    image: callsignInfo.image,
    imageInfo: (callsignInfo.imageinfo || '').split(':')
  }
}
// const sampleLookupResponse = {
//   Callsign: {
//     AreaCode: 845,
//     DST: 'Y',
//     GMTOffset: -5,
//     MSA: 0,
//     TimeZone: 'Eastern',
//     addr1: '376 Wilsey Valley Rd',
//     addr2: 'Wurtsboro',
//     aliases: 'KD2FLX',
//     bio: 1685,
//     biodate: '2022-11-05 20:47:28',
//     call: 'KN2X',
//     ccode: 271,
//     class: 'E',
//     codes: 'HVIE',
//     country: 'United States',
//     county: 'Sullivan',
//     cqzone: 5,
//     dxcc: 291,
//     efdate: '2017-12-19',
//     email: 'kn2x.ham@gmail.com',
//     eqsl: 0,
//     expdate: '2027-12-19',
//     fips: 36105,
//     fname: 'John J',
//     geoloc: 'user',
//     grid: 'FN21so',
//     image: 'https://cdn-xml.qrz.com/x/kn2x/hn_adirondacks_backpacking_psd_1.jpg',
//     imageinfo: '531:799:102422',
//     ituzone: 8,
//     land: 'United States',
//     lat: 41.590938,
//     lon: -74.492775,
//     lotw: 1,
//     moddate: '2021-06-13 19:49:34',
//     name: 'Lavelle, Jr',
//     name_fmt: 'John J Lavelle, Jr',
//     qslmgr: 'LOTW or direct',
//     state: 'NY',
//     u_views: 3975,
//     zip: 12790
//   }
// }

const performQRZLookup = async ({ parsedInfo, setIsLoading, setOperatorInfo, settings }) => {
  let operatorInfo
  if (parsedInfo?.baseCall) {
    setIsLoading(true)
    operatorInfo = await fetchInfoFromQRZ({ call: parsedInfo?.baseCall, settings })
    // setTimeout(() => setIsLoading(false), 3000)
    setIsLoading(false)
  } else {
    operatorInfo = {}
  }
  setOperatorInfo(operatorInfo)
}

const debouncedQRZLookup = debounce(performQRZLookup, 500)

export function CallInfo ({ call, styles, style }) {
  const settings = useSelector(selectSettings)

  const [loading, setIsLoading] = useState(false)

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
    console.log('info', parsedInfo)
  }, [call])

  // Fetch callsign info
  const [operatorInfo, setOperatorInfo] = useState({})
  useEffect(() => {
    if (parsedInfo?.baseCall) {
      debouncedQRZLookup({ parsedInfo, setIsLoading, setOperatorInfo, settings })
    } else {
      setOperatorInfo({})
    }
  }, [parsedInfo, settings])

  const line1 = useMemo(() => {
    const entity = DXCC_BY_PREFIX[parsedInfo?.entityPrefix]
    return [
      entity && `${entity.flag} ${entity.shortName}`,
      [capitalizeString(operatorInfo.city), operatorInfo.state].filter(x => x).join(', ')
    ].filter(x => x).join(' • ')
  }, [parsedInfo, operatorInfo])

  const line2 = useMemo(() => {
    return [
      capitalizeString(operatorInfo.name, { mode: 'name' }),
      operatorInfo.call !== parsedInfo.baseCall ? operatorInfo.call : ''
    ].filter(x => x).join(' • ')
  }, [operatorInfo, parsedInfo])

  return (
    <View style={[style, { flexDirection: 'column', justifyContent: 'flex-start', minHeight: 2 * styles.rem + 2 /* +2 to compensate for emoji */ }]}>
      <Text>{line1}</Text>
      {loading ? (
        <ActivityIndicator size={styles.rem - 1} animating={true} style={{ alignSelf: 'flex-start' }}/>
      ) : (
        <Text style={{ fontWeight: 'bold' }}>{line2}</Text>

      )}
    </View>
  )
}

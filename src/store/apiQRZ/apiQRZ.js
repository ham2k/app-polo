import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { XMLParser } from 'fast-xml-parser'

import packageJson from '../../../package.json'
import { setAccountInfo } from '../settings'

/**

  QRZ.com XML API
  https://www.qrz.com/XML/current_spec.html

 */

const BASE_URL = 'https://xmldata.qrz.com/'

async function decodeXMLResponse (response) {
  const body = await response.text()
  const parser = new XMLParser()
  const xml = parser.parse(body)
  console.log(`QRZApi ${response.url} ${response.status}`)
  console.log(xml)
  return xml
}

function defaultParams (api) {
  const session = api.getState().settings?.accounts?.qrz?.session
  return {
    s: session,
    agent: `ham2k-polo-${packageJson.version}`
  }
}

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: `${BASE_URL}/xml/current`,
  responseHandler: async (response) => {
    if (response.status === 200) {
      return await decodeXMLResponse(response)
    } else {
      return {}
    }
  }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQueryWithSettings(args, api, extraOptions)
  if (result.error && result.error.status === 401) {
    console.log('baseQueryWithReauth - Trying to get a new session')

    api.dispatch(setAccountInfo({ qrz: { session: undefined } }))

    // try to get a new session key
    const { login, password } = api.getState().settings?.accounts?.qrz
    const { data, error, meta } = await baseQueryWithSettings({
      url: '',
      params: {
        ...defaultParams(api),
        username: login,
        password
      }
    })

    console.log('baseQueryWithReauth - session: ', { data, error })
    if (error) return { error, meta }
    if (data?.QRZDatabase?.Session?.Error) return { error: data?.QRZDatabase?.Session?.Error, meta }

    const session = data?.QRZDatabase?.Session?.Key
    if (session) {
      console.log('baseQueryWithReauth - saving session', session)
      api.dispatch(setAccountInfo({ qrz: { session } }))

      result = await baseQueryWithSettings(args, api, extraOptions)
    } else {
      api.dispatch(setAccountInfo({ qrz: { session: undefined } }))
      return { error: 'Unexpected error logging into QRZ.com', meta }
    }
  }
  return result
}

export const apiQRZ = createApi({
  reducerPath: 'apiQRZ',
  tagTypes: ['QRZSession', 'QRZLookup'],
  baseQuery: baseQueryWithReauth,
  endpoints: builder => ({

    // Lookup a callsign
    //   https://xmldata.qrz.com/xml/current/?s=SESSIONKEY;callsign=xx1xxx

    lookupCall: builder.query({
      queryFn: (arg, api, extraOptions, baseQuery) => {
        const { call } = arg
        // console.log('apiQRZ.lookupCall', call)
        if (!call || call.length < 3) return { data: {} }

        return baseQuery({
          url: '',
          params: {
            ...defaultParams(api),
            callsign: call
          },
          responseHandler: async (response) => {
            const xml = await decodeXMLResponse(response)
            const error = xml?.QRZDatabase?.Session?.Error

            if (error) {
              if (error.startsWith('Not found')) {
                return { call, name: 'Not Found', error: true }
              } else {
                return { call, name: error, error: true }
              }
            } else {
              const callsignInfo = xml?.QRZDatabase?.Callsign || {}

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
          }
        })
      }
    })
  })
})

export const { actions } = apiQRZ

export const { useLookupCallQuery } = apiQRZ

export const { endpoints, reducerPath, reducer, middleware } = apiQRZ

export default apiQRZ.reducer

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

/**

  POTA API
  https://api.pota.app/

  https://docs.pota.app/api/authentication.html

  - A list of park references in JSON format is available programmatically at: https://api.pota.app/location/parks/{location-code}.
  - A complete CSV file is available (generated nightly) at https://pota.app/all_parks_ext.csv.

  Interesting API Endpoints
  * https://api.pota.app/locations
  * https://api.pota.app/location/parks/US-NY
  * https://api.pota.app/spot/

  * https://api.pota.app/program/parks/YV

  * https://api.pota.app/user/stats/park
  * https://api.pota.app/park/YV-0001
  * https://api.pota.app/park/stats/YV-0001
  * https://api.pota.app/park/leaderboard/YV-0001?count=5
  * https://api.pota.app/park/activations/YV-0001?count=all

  * https://api.pota.app/profile/YV5RAB

 */

export const apiPOTA = createApi({
  reducerPath: 'apiPOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.pota.app/',
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      return headers
    }
  }),
  endpoints: builder => ({

    lookupPark: builder.query({
      query: ({ ref }) => `park/${ref}`,
      transformResponse: (response) => {
        if (response === null) {
          // This is what the API returns when a park was not found
          return { error: 'Park not found' }
        }
        return response
      }
    })
  })
})

export const { actions } = apiPOTA
const POTA_REGEX = /[A-Z]{1,2}-[0-9]{4,5}/

export function useLookupParkQuery (arg, options) {
  let result
  if (!arg?.ref || !arg?.ref?.match(POTA_REGEX)) {
    result = apiPOTA.useLookupParkQuery('', { skip: true })
  } else {
    result = apiPOTA.useLookupParkQuery(arg, options)
  }
  if (result?.status === 'uninitialized') {
    return undefined
  } else {
    return result
  }
}

export const { endpoints, reducerPath, reducer, middleware } = apiPOTA

export default apiPOTA.reducer

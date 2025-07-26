/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../../store/operations'
import { filterRefs, replaceRefs } from '../../../tools/refTools'
import { distanceOnEarth } from '../../../tools/geoTools'
import { H2kListRow, H2kListSection, H2kSearchBar } from '../../../ui'

import { Info } from './MOTAInfo'
import { motaFindAllByLocation, motaFindAllByName, motaFindOneByReference } from './MOTADataFile'
import { MOTAListItem } from './MOTAListItem'

export function MOTAActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation, settings } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const refs = useMemo(() => filterRefs(operation, Info.activationType).filter(ref => ref.ref), [operation])

  const title = useMemo(() => {
    if (refs?.length === 0) return 'No mills selected for activation'
    else if (refs?.length === 1) return 'Activating 1 mill'
    else return `Activating ${refs.length} mills`
  }, [refs])

  const [search, setSearch] = useState('')

  const [results, setResults] = useState([])
  const [resultsMessage, setResultsMessage] = useState([])

  const [location, setLocation] = useState()
  useEffect(() => {
    Geolocation.getCurrentPosition(
      info => {
        const { latitude, longitude } = info.coords
        setLocation({ lat: latitude, lon: longitude })
      },
      error => {
        console.info('Geolocation error', error)
      }, {
        enableHighAccuracy: true,
        timeout: 1000 * 30 /* 30 seconds */,
        maximumAge: 1000 * 60 /* 1 minute */
      }
    )
  }, [])

  const [refDatas, setRefDatas] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      const datas = []
      for (const ref of refs) {
        const lookupData = await motaFindOneByReference(ref.ref)
        const newData = { ...ref, ...lookupData }
        if (location?.lat && location?.lon) {
          newData.distance = distanceOnEarth(newData, location, { units: settings.distanceUnits })
        }
        datas.push(newData)
      }
      setRefDatas(datas)
    }, 0)
  }, [refs, location, settings.distanceUnits])

  const [nearbyResults, setNearbyResults] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      if (location?.lat && location?.lon) {
        const newResults = await motaFindAllByLocation(ourInfo?.entityPrefix, location.lat, location.lon, NEARBY_DEGREES)
        setNearbyResults(newResults.map(result => ({
          ...result,
          distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
        })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999)))
      }
    })
  }, [ourInfo, location, settings.distanceUnits])

  useEffect(() => {
    setTimeout(async () => {
      if (search?.length > 2) {
        let newResults = await motaFindAllByName(ourInfo?.entityPrefix, search.toLowerCase())
        if (location?.lat && location?.lon) {
          newResults = newResults.map(result => ({
            ...result,
            distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
          })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))
        }

        // Is the search term a plain reference, either with prefix or just digits?
        let nakedReference
        if (search.match(Info.referenceRegex)) {
          nakedReference = search.toUpperCase()
        }

        // If it's a naked reference, let's ensure the results include it, or else add a placeholder
        // just to cover any cases where the user knows about a new reference not included in our data
        if (nakedReference && !newResults.find(ref => ref.ref === nakedReference)) {
          newResults.unshift({ ref: nakedReference, name: 'Unknown mill' })
        }

        setResults(newResults.slice(0, 15))
        if (newResults.length === 0) {
          setResultsMessage('No mills found')
        } else if (newResults.length > 15) {
          setResultsMessage(`Nearest 15 of ${newResults.length} matches`)
        } else if (newResults.length === 1) {
          setResultsMessage('One matching mill')
        } else {
          setResultsMessage(`${newResults.length} matching mills`)
        }
      } else {
        setResults(nearbyResults)
        if (nearbyResults === undefined) setResultsMessage('Search for some mills to activate!')
        else if (nearbyResults.length === 0) setResultsMessage('No mills nearby')
        else setResultsMessage('Nearby mills')
      }
    })
  }, [search, ourInfo, nearbyResults, location, settings.distanceUnits])

  const handleAddReference = useCallback((ref) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, [...refs.filter(r => r.ref !== ref), { type: Info.activationType, ref }]) }))
  }, [dispatch, operation, refs])

  const handleRemoveReference = useCallback((ref) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, refs.filter(r => r.ref !== ref)) }))
  }, [dispatch, operation, refs])

  return (
    <>
      <H2kListSection title={title}>
        {refDatas.map((refData, index) => (
          <MOTAListItem
            key={refData.ref}
            activityRef={refData.ref}
            refData={refData}
            allRefs={refs}
            operationRef={refData.ref}
            styles={styles}
            settings={settings}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>

      <H2kListRow>
        <H2kSearchBar
          placeholder={'Mills by name or reference…'}
          value={search}
          onChangeText={setSearch}
        />
      </H2kListRow>

      <H2kListSection title={resultsMessage}>
        {results.map((result) => (
          <MOTAListItem
            key={result.ref}
            activityRef={result.ref}
            allRefs={refs}
            refData={result}
            styles={styles}
            settings={settings}
            onPress={() => handleAddReference(result.ref) }
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>
    </>
  )
}

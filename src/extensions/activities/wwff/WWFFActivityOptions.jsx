/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Searchbar } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import { ListRow } from '../../../screens/components/ListComponents'
import { distanceOnEarth } from '../../../tools/geoTools'

import { Info } from './WWFFInfo'
import { WWFFListItem } from './WWFFListItem'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'
import { wwffFindAllByLocation, wwffFindAllByName, wwffFindOneByReference } from './WWFFDataFile'

export function WWFFActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation, settings } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const operationRef = useMemo(() => findRef(operation, Info.activationType), [operation]) ?? ''

  const title = useMemo(() => {
    if (!operationRef?.ref) return 'No park selected for activation'
    else return 'Activating park:'
  }, [operationRef])

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
        timeout: 30 * 1000 /* 30 seconds */,
        maximumAge: 1000 * 60 * 5 /* 5 minutes */
      }
    )
  }, [])

  const [refData, setRefData] = useState({})
  useEffect(() => {
    setTimeout(async () => {
      const lookupData = await wwffFindOneByReference(operationRef.ref)
      const newData = { ...operationRef, ...lookupData }
      if (location?.lat && location?.lon) {
        newData.distance = distanceOnEarth(newData, location, { units: settings.distanceUnits })
      }
      setRefData(newData)
    }, 0)
  }, [operationRef, location, settings.distanceUnits])

  const [nearbyResults, setNearbyResults] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      if (location?.lat && location?.lon) {
        const newResults = await wwffFindAllByLocation(ourInfo.dxccCode, location.lat, location.lon, NEARBY_DEGREES)
        setNearbyResults(newResults.map(result => ({
          ...result,
          distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
        })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999)))
      }
    })
  }, [ourInfo, location, settings.distanceUnits])

  useEffect(() => {
    if (search?.length > 2) {
      setTimeout(async () => {
        let newResults = await wwffFindAllByName(ourInfo?.dxccCode, search.toLowerCase())

        if (location?.lat && location?.lon) {
          newResults = newResults.map(park => ({
            ...park,
            distance: distanceOnEarth(park, location, { units: settings.distanceUnits })
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
          newResults.unshift({ ref: nakedReference })
        }

        setResults(newResults.slice(0, 15))
        if (newResults.length === 0) {
          setResultsMessage('No parks found')
        } else if (newResults.length > 15) {
          setResultsMessage(`Nearest 15 of ${newResults.length} matches`)
        } else if (newResults.length === 1) {
          setResultsMessage('One matching park')
        } else {
          setResultsMessage(`${newResults.length} matching parks`)
        }
      })
    } else {
      setResults(nearbyResults)
      if (nearbyResults === undefined) setResultsMessage('Search for a park to activate!')
      else if (nearbyResults.length === 0) setResultsMessage('No parks nearby')
      else setResultsMessage('Nearby parks')
    }
  }, [search, ourInfo, nearbyResults, location, settings.distanceUnits])

  const handleAddReference = useCallback((newRef) => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRef(operation?.refs, Info.activationType, { type: Info.activationType, ref: newRef })
    }))
  }, [dispatch, operation])

  const handleRemoveReference = useCallback((newRef) => {
    dispatch(setOperationData({
      uuid: operation.uuid,
      refs: replaceRef(operation?.refs, Info.activationType, {})
    }))
  }, [dispatch, operation])

  return (
    <>
      <Ham2kListSection title={title}>
        {refData?.ref && (
          <WWFFListItem
            key={refData.ref}
            activityRef={refData.ref}
            refData={refData}
            operationRef={refData.ref}
            styles={styles}
            settings={settings}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        )}
      </Ham2kListSection>

      <ListRow>
        <Searchbar
          placeholder={'Parks by name or reference…'}
          value={search}
          onChangeText={setSearch}
        />
      </ListRow>

      <Ham2kListSection title={resultsMessage}>
        {results.map((result) => (
          <WWFFListItem
            key={result.ref}
            activityRef={result.ref}
            operationRef={operationRef.ref}
            refData={result}
            styles={styles}
            settings={settings}
            onPress={() => handleAddReference(result.ref) }
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </Ham2kListSection>
    </>
  )
}

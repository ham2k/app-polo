/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import Geolocation from '@react-native-community/geolocation'
import { useTranslation } from 'react-i18next'

import { selectOperationCallInfo } from '../../../store/operations'
import { findRef, replaceRef } from '../../../tools/refTools'
import { distanceOnEarth } from '../../../tools/geoTools'
import { H2kListRow, H2kListSection, H2kSearchBar } from '../../../ui'

import { Info } from './WWFFInfo'
import { WWFFListItem } from './WWFFListItem'
import { wwffFindAllByLocation, wwffFindAllByName, wwffFindOneByReference } from './WWFFDataFile'

export function WWFFActivityOptions({ styles, operation, settings, refs: allRefs, setRefs }) {
  const { t } = useTranslation()

  const NEARBY_DEGREES = 0.25

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const activityRef = useMemo(() => findRef(allRefs, Info.activationType) ?? {}, [allRefs]) ?? ''

  const title = useMemo(() => {
    return t('extensions.wwff.activityOptions.title', 'Activating {{count}} parks', { count: activityRef?.ref ? 1 : 0 })
  }, [activityRef?.ref, t])

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

  const [refData, setRefData] = useState({})
  useEffect(() => {
    setTimeout(async () => {
      const lookupData = await wwffFindOneByReference(activityRef.ref)
      const newData = { ...activityRef, ...lookupData }
      if (location?.lat && location?.lon) {
        newData.distance = distanceOnEarth(newData, location, { units: settings.distanceUnits })
      }
      setRefData(newData)
    }, 0)
  }, [activityRef, location, settings.distanceUnits])

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
        if (newResults.length > 15) {
          setResultsMessage(t('extensions.wwff.activityOptions.nearestMatches', 'Nearest {{limit}} of {{count}} matches', { limit: 15, count: newResults.length }))
        } else {
          setResultsMessage(t('extensions.wwff.activityOptions.matchingParks', '{{count}} matching parks', { count: newResults.length }))
        }
      })
    } else {
      setResults(nearbyResults)
      if (nearbyResults === undefined) setResultsMessage(t('extensions.wwff.activityOptions.searchForParks', 'Search for a park to activate!'))
      else if (nearbyResults.length === 0) setResultsMessage(t('extensions.wwff.activityOptions.noParksNearby', 'No parks nearby'))
      else setResultsMessage(t('extensions.wwff.activityOptions.nearbyParks', 'Nearby parks'))
    }
  }, [search, ourInfo, nearbyResults, location, settings.distanceUnits, t])

  const handleAddReference = useCallback((newRef) => {
    setRefs(replaceRef(allRefs, Info.activationType, { type: Info.activationType, ref: newRef }))
  }, [allRefs, setRefs])

  const handleRemoveReference = useCallback((newRef) => {
    setRefs(replaceRef(allRefs, Info.activationType, { type: Info.activationType, ref: newRef }))
  }, [allRefs, setRefs])

  return (
    <>
      <H2kListSection title={title}>
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
      </H2kListSection>

      <H2kListRow>
        <H2kSearchBar
          placeholder={t('extensions.wwff.activityOptions.searchPlaceholder', 'Name or reference…')}
          value={search}
          onChangeText={setSearch}
        />
      </H2kListRow>

      <H2kListSection title={resultsMessage}>
        {results.map((result) => (
          <WWFFListItem
            key={result.ref}
            activityRef={result.ref}
            operationRef={activityRef.ref}
            refData={result}
            styles={styles}
            settings={settings}
            onPress={() => handleAddReference(result.ref)}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </H2kListSection>
    </>
  )
}

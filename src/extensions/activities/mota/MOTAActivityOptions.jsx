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
import { filterRefs, replaceRefs } from '../../../tools/refTools'
import { distanceOnEarth } from '../../../tools/geoTools'
import { H2kListRow, H2kListSection, H2kSearchBar } from '../../../ui'

import { Info } from './MOTAInfo'
import { motaFindAllByLocation, motaFindAllByName, motaFindOneByReference } from './MOTADataFile'
import { MOTAListItem } from './MOTAListItem'

export function MOTAActivityOptions ({ styles, operation, settings, refs: allRefs, setRefs }) {
  const { t } = useTranslation()

  const NEARBY_DEGREES = 0.25

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const activityRefs = useMemo(() => filterRefs(allRefs, Info.activationType).filter(ref => ref.ref), [allRefs])

  const title = useMemo(() => {
    return t('extensions.mota.activityOptions.title', 'Activating {{count}} mills', { count: activityRefs?.length })
  }, [activityRefs?.length, t])

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
      for (const ref of activityRefs) {
        const lookupData = await motaFindOneByReference(ref.ref)
        const newData = { ...ref, ...lookupData }
        if (location?.lat && location?.lon) {
          newData.distance = distanceOnEarth(newData, location, { units: settings.distanceUnits })
        }
        datas.push(newData)
      }
      setRefDatas(datas)
    }, 0)
  }, [activityRefs, location, settings.distanceUnits])

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
          newResults.unshift({ ref: nakedReference, name: t('extensions.mota.activityOptions.unknownMill', 'Unknown mill') })
        }

        setResults(newResults.slice(0, 15))
        if (newResults.length > 15) {
          setResultsMessage(t('extensions.mota.activityOptions.nearestMatches', 'Nearest {{limit}} of {{count}} matches', { limit: 15, count: newResults.length }))
        } else {
          setResultsMessage(t('extensions.mota.activityOptions.matchingMills', '{{count}} matching mills', { count: newResults.length }))
        }
      } else {
        setResults(nearbyResults)
        if (nearbyResults === undefined) setResultsMessage(t('extensions.mota.activityOptions.searchForMills', 'Search for some mills to activate!'))
        else if (nearbyResults.length === 0) setResultsMessage(t('extensions.mota.activityOptions.noMillsNearby', 'No mills nearby'))
        else setResultsMessage(t('extensions.mota.activityOptions.nearbyMills', 'Nearby mills'))
      }
    })
  }, [search, ourInfo, nearbyResults, location, settings.distanceUnits, t])

  const handleAddReference = useCallback((ref) => {
    setRefs(replaceRefs(allRefs, Info.activationType, [...activityRefs.filter(r => r.ref !== ref), { type: Info.activationType, ref }]))
  }, [activityRefs, allRefs, setRefs])

  const handleRemoveReference = useCallback((ref) => {
    setRefs(replaceRefs(allRefs, Info.activationType, activityRefs.filter(r => r.ref !== ref)))
  }, [activityRefs, allRefs, setRefs])

  return (
    <>
      <H2kListSection title={title}>
        {refDatas.map((refData, index) => (
          <MOTAListItem
            key={refData.ref}
            activityRef={refData.ref}
            refData={refData}
            allRefs={activityRefs}
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
          placeholder={t('extensions.mota.activityOptions.searchPlaceholder', 'Mills by name or reference…')}
          value={search}
          onChangeText={setSearch}
        />
      </H2kListRow>

      <H2kListSection title={resultsMessage}>
        {results.map((result) => (
          <MOTAListItem
            key={result.ref}
            activityRef={result.ref}
            allRefs={activityRefs}
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

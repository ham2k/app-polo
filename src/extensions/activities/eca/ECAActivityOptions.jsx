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

import { Info } from './ECAInfo'
import { ecaFindAllByLocation, ecaFindAllByName, ecaFindOneByReference } from './ECADataFile'
import { ECAListItem } from './ECAListItem'

export function ECAActivityOptions({ styles, operation, settings, refs: allRefs, setRefs }) {
  const { t } = useTranslation()

  const NEARBY_DEGREES = 0.25

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const activityRefs = useMemo(() => filterRefs(allRefs, Info.activationType).filter(ref => ref.ref), [allRefs])

  const title = useMemo(() => {
    return t('extensions.eca.activityOptions.title', 'Activating {{count}} castles', { count: activityRefs?.length || 0 })
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
        const result = await ecaFindOneByReference(ref.ref)
        const newData = { ...ref, ...result }
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
        const newResults = await ecaFindAllByLocation(ourInfo.dxccCode, location.lat, location.lon, NEARBY_DEGREES)
        setNearbyResults(
          newResults.map(result => ({
            ...result,
            distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
          })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))
        )
      }
    })
  }, [ourInfo, location, settings.distanceUnits])

  useEffect(() => {
    setTimeout(async () => {
      if (search?.length > 2) {
        let newRefs = await ecaFindAllByName(ourInfo?.dxccCode, search.toLowerCase())
        if (location?.lat && location?.lon) {
          newRefs = newRefs.map(ref => ({
            ...ref,
            distance: distanceOnEarth(ref, location, { units: settings.distanceUnits })
          })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))
        }

        // Is the search term a plain reference, either with prefix or just digits?
        let nakedReference
        if (search.match(Info.referenceRegex)) {
          nakedReference = search
        }

        // If it's a naked reference, let's ensure the results include it, or else add a placeholder
        // just to cover any cases where the user knows about a new park not included in our data
        if (nakedReference && !newRefs.find(ref => ref.ref === nakedReference)) {
          newRefs.unshift({ ref: nakedReference })
        }

        setResults(newRefs.slice(0, 15))
        if (newRefs.length > 15) {
          setResultsMessage(t('extensions.eca.activityOptions.nearestMatches', 'Nearest {{limit}} of {{count}} matches', { limit: 15, count: newRefs.length }))
        } else {
          setResultsMessage(t('extensions.eca.activityOptions.matchingCastles', '{{count}} matching castles', { count: newRefs.length }))
        }
      } else {
        setResults(nearbyResults)
        if (nearbyResults === undefined) setResultsMessage(t('extensions.eca.activityOptions.searchForCastles', 'Search for some castles to activate!'))
        else if (nearbyResults.length === 0) setResultsMessage(t('extensions.eca.activityOptions.noCastlesNearby', 'No castles nearby'))
        else setResultsMessage(t('extensions.eca.activityOptions.nearbyCastles', 'Nearby castles'))
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
          <ECAListItem
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
          placeholder={t('extensions.eca.activityOptions.searchPlaceholder', 'Name or reference…')}
          value={search}
          onChangeText={setSearch}
        />
      </H2kListRow>

      <H2kListSection title={resultsMessage}>
        {results.map((result) => (
          <ECAListItem
            key={result.ref}
            activityRef={result.ref}
            allRefs={activityRefs}
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

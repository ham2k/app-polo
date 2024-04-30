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

import { reportError } from '../../../App'
import { selectOperationCallInfo, setOperationData } from '../../../store/operations'
import { filterRefs, replaceRefs } from '../../../tools/refTools'
import { ListRow } from '../../../screens/components/ListComponents'
import { distanceOnEarth } from '../../../tools/geoTools'

import { Info } from './ECAInfo'
import { ecaFindAllByLocation, ecaFindAllByName, ecaFindOneByReference } from './ECADataFile'
import { ECAListItem } from './ECAListItem'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'

export function ECAActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation, settings } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const refs = useMemo(() => filterRefs(operation, Info.activationType).filter(ref => ref.ref), [operation])

  const title = useMemo(() => {
    if (refs?.length === 0) return 'No castles selected for activation'
    else if (refs?.length === 1) return 'Activating 1 castle'
    else return `Activating ${refs.length} castles`
  }, [refs])

  const [search, setSearch] = useState('')

  const [results, setResults] = useState([])
  const [resultsMessage, setResultsMessage] = useState([])

  const [location, setLocation] = useState()
  useEffect(() => {
    Geolocation.getCurrentPosition(info => {
      const { latitude, longitude } = info.coords
      setLocation({ lat: latitude, lon: longitude })
    }, error => {
      reportError('Geolocation error', error)
      setLocation(undefined)
    })
  }, [])

  const [refDatas, setRefDatas] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      const datas = []
      for (const ref of refs) {
        const result = await ecaFindOneByReference(ref.ref)
        const newData = { ...ref, ...result }
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
        const newResults = await ecaFindAllByLocation(ourInfo.dxccCode, location.lat, location.lon, NEARBY_DEGREES)
        setNearbyResults(
          newResults.map(result => ({
            ...result,
            distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
          })).sort((a, b) => a.distance - b.distance)
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
          })).sort((a, b) => a.distance - b.distance)
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
        if (newRefs.length === 0) {
          setResultsMessage('No castles found')
        } else if (newRefs.length > 15) {
          setResultsMessage(`Nearest 15 of ${newRefs.length} matches`)
        } else if (newRefs.length === 1) {
          setResultsMessage('One matching castles')
        } else {
          setResultsMessage(`${newRefs.length} matching castles`)
        }
      } else {
        setResults(nearbyResults)
        if (nearbyResults === undefined) setResultsMessage('Search for some castles to activate!')
        else if (nearbyResults.length === 0) setResultsMessage('No castles nearby')
        else setResultsMessage('Nearby castles')
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
      <Ham2kListSection title={title}>
        {refDatas.map((refData, index) => (
          <ECAListItem
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
      </Ham2kListSection>

      <ListRow>
        <Searchbar
          placeholder={'Castles by name or reference…'}
          value={search}
          onChangeText={setSearch}
        />
      </ListRow>

      <Ham2kListSection title={resultsMessage}>
        {results.map((result) => (
          <ECAListItem
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
      </Ham2kListSection>
    </>
  )
}

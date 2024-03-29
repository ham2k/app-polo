import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Searchbar } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../store/operations'
import { findRef, replaceRef } from '../../tools/refTools'
import { SOTAData } from './SOTADataFile'
import { Info } from './SOTAInfo'
import { SOTAListItem } from './SOTAListItem'
import { ListRow } from '../../screens/components/ListComponents'
import { distanceOnEarth } from '../../tools/geoTools'
import { reportError } from '../../App'

export function SOTAActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation, settings } = props

  const dispatch = useDispatch()

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const operationRef = useMemo(() => findRef(operation, Info.activationType), [operation]) ?? ''

  const title = useMemo(() => {
    if (!operationRef?.ref) return 'No summit selected for activation'
    else return 'Activating summit:'
  }, [operationRef])

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

  const refData = useMemo(() => {
    const newData = { ...operationRef, ...SOTAData.byReference[operationRef.ref] }
    if (location?.lat && location?.lon) {
      newData.distance = distanceOnEarth(newData, location, { units: settings.distanceUnits })
    }
    return newData
  }, [operationRef, location, settings.distanceUnits])

  const [nearbyResults, setNearbyResults] = useState([])
  useEffect(() => {
    if (location?.lat && location?.lon) {
      const newResults = SOTAData.activeReferences.filter(reference => {
        return (Math.abs(reference.lat - location.lat) < NEARBY_DEGREES && Math.abs(reference.lon - location.lon) < NEARBY_DEGREES)
      }).map(result => ({
        ...result,
        distance: distanceOnEarth(result, location, { units: settings.distanceUnits })
      })).sort((a, b) => a.distance - b.distance)
      setNearbyResults(newResults)
    }
  }, [ourInfo, location, settings.distanceUnits])

  useEffect(() => {
    if (search?.length > 2) {
      const ucSearch = search.toUpperCase()
      let newResults = SOTAData.activeReferences.filter(reference => {
        return (reference.ref?.includes(ucSearch) || (reference.uc ?? reference.name ?? '').includes(ucSearch))
      })

      if (location?.lat && location?.lon) {
        newResults = newResults.map(park => ({
          ...park,
          distance: distanceOnEarth(park, location, { units: settings.distanceUnits })
        })).sort((a, b) => a.distance - b.distance)
      }

      // Is the search term a plain reference, either with prefix or just digits?
      let nakedReference
      if (search.match(Info.referenceRegex)) {
        nakedReference = search.toUpperCase()
      }

      // If it's a naked reference, let's ensure the results include it, or else add a placeholder
      // just to cover any cases where the user knows about a new reference not included in our data
      if (nakedReference && !newResults.find(ref => ref.ref === nakedReference)) {
        newResults.unshift({ ref: nakedReference, name: 'Unknown summit' })
      }

      setResults(newResults.slice(0, 15))
      if (newResults.length === 0) {
        setResultsMessage('No summits found')
      } else if (newResults.length > 15) {
        setResultsMessage(`Nearest 15 of ${newResults.length} matches`)
      } else if (newResults.length === 1) {
        setResultsMessage('One matching summits')
      } else {
        setResultsMessage(`${newResults.length} matching summits`)
      }
    } else {
      setResults(nearbyResults)
      if (nearbyResults === undefined) setResultsMessage('Search for some summits to activate!')
      else if (nearbyResults.length === 0) setResultsMessage('No summits nearby')
      else setResultsMessage('Nearby summits')
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
      <List.Section title={title}>
        {refData?.ref && (
          <SOTAListItem
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
      </List.Section>

      <ListRow>
        <Searchbar
          placeholder={'Summits by name or reference…'}
          value={search}
          onChangeText={setSearch}
        />
      </ListRow>

      <List.Section title={resultsMessage}>
        {results.map((result) => (
          <SOTAListItem
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
      </List.Section>
    </>
  )
}

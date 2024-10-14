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
import { filterRefs, replaceRefs } from '../../../tools/refTools'
import { selectRuntimeOnline } from '../../../store/runtime'
import { ListRow } from '../../../screens/components/ListComponents'
import { distanceOnEarth } from '../../../tools/geoTools'

import { Info } from './POTAInfo'
import { potaFindParkByReference, potaFindParksByLocation, potaFindParksByName, potaPrefixForDXCCCode } from './POTAAllParksData'
import { POTAListItem } from './POTAListItem'
import { Ham2kListSection } from '../../../screens/components/Ham2kListSection'

export function POTAActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation, settings } = props

  const dispatch = useDispatch()

  const online = useSelector(selectRuntimeOnline)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const refs = useMemo(() => filterRefs(operation, Info.activationType).filter(ref => ref.ref), [operation])

  const title = useMemo(() => {
    if (refs?.length === 0) return 'No parks selected for activation'
    else if (refs?.length === 1) return 'Activating 1 park'
    else return `Activating ${refs.length} parks`
  }, [refs])

  const [search, setSearch] = useState('')

  const [parks, setParks] = useState([])
  const [parksMessage, setParksMessage] = useState([])

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

  const [refDatas, setRefDatas] = useState([])
  useEffect(() => {
    setTimeout(async () => {
      const datas = []
      for (const ref of refs) {
        const park = await potaFindParkByReference(ref.ref)
        const newData = { ...ref, ...park }
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
        const newResults = await potaFindParksByLocation(ourInfo.dxccCode, location.lat, location.lon, NEARBY_DEGREES)
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
        let newParks = await potaFindParksByName(ourInfo?.dxccCode, search.toLowerCase())
        if (location?.lat && location?.lon) {
          newParks = newParks.map(park => ({
            ...park,
            distance: distanceOnEarth(park, location, { units: settings.distanceUnits })
          })).sort((a, b) => a.distance - b.distance)
        }

        // Is the search term a plain reference, either with prefix or just digits?
        let nakedReference
        const parts = search.match(/^\s*([A-Z]*)[-]{0,1}(\d+|TEST)\s*$/i)
        if (parts && parts[2].length >= 4) {
          nakedReference = (parts[1]?.toUpperCase() || potaPrefixForDXCCCode(ourInfo?.dxccCode) || 'K') + '-' + parts[2].toUpperCase()
        } else if (search.match(Info.referenceRegex)) {
          nakedReference = search
        }

        // If it's a naked reference, let's ensure the results include it, or else add a placeholder
        // just to cover any cases where the user knows about a new park not included in our data
        if (nakedReference && !newParks.find(park => park.ref === nakedReference)) {
          newParks.unshift({ ref: nakedReference })
        }

        setParks(newParks.slice(0, 15))
        if (newParks.length === 0) {
          setParksMessage('No parks found')
        } else if (newParks.length > 15) {
          setParksMessage(`Nearest 15 of ${newParks.length} matches`)
        } else if (newParks.length === 1) {
          setParksMessage('One matching park')
        } else {
          setParksMessage(`${newParks.length} matching parks`)
        }
      } else {
        setParks(nearbyResults)
        if (nearbyResults === undefined) setParksMessage('Search for some parks to activate!')
        else if (nearbyResults.length === 0) setParksMessage('No parks nearby')
        else setParksMessage('Nearby parks')
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
        {refDatas.map((park, index) => (
          <POTAListItem
            key={park.ref}
            activityRef={park.ref}
            refData={park}
            allRefs={refs}
            styles={styles}
            settings={settings}
            online={online}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </Ham2kListSection>

      <ListRow>
        <Searchbar
          placeholder={'Parks by name or reference…'}
          value={search}
          onChangeText={setSearch}
        />
      </ListRow>

      <Ham2kListSection title={parksMessage}>
        {parks.map((park) => (
          <POTAListItem
            key={park.ref}
            activityRef={park.ref}
            allRefs={refs}
            refData={park}
            styles={styles}
            settings={settings}
            onPress={() => handleAddReference(park.ref) }
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </Ham2kListSection>
    </>
  )
}

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { List, Searchbar, Text } from 'react-native-paper'
import Geolocation from '@react-native-community/geolocation'

import { selectOperationCallInfo, setOperationData } from '../../store/operations'
import { filterRefs, replaceRefs } from '../../tools/refTools'
import { POTAAllParks } from './POTAAllParksData'
import { Info } from './POTAInfo'
import { POTAListItem } from './POTAListItem'
import { selectRuntimeOnline } from '../../store/runtime'
import { ListRow } from '../../screens/components/ListComponents'

export function POTAActivityOptions (props) {
  const NEARBY_DEGREES = 0.25

  const { styles, operation } = props

  const dispatch = useDispatch()

  const online = useSelector(selectRuntimeOnline)

  const ourInfo = useSelector(state => selectOperationCallInfo(state, operation?.uuid))

  const refs = useMemo(() => filterRefs(operation, Info.activationType), [operation]).filter(ref => ref.ref)

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
    Geolocation.getCurrentPosition(info => {
      const { latitude, longitude } = info.coords
      setLocation({ lat: latitude, lon: longitude })
    }, error => {
      console.error('Geolocation error', error)
      setLocation(undefined)
    })
  }, [])

  const [nearbyParks, setNearbyParks] = useState([])
  useEffect(() => {
    if (location?.lat && location?.lon) {
      const newParks = POTAAllParks.activeParks.filter(park => {
        return ((!ourInfo?.dxccCode || park.dxccCode === ourInfo.dxccCode) && Math.abs(park.lat - location.lat) < NEARBY_DEGREES && Math.abs(park.lon - location.lon) < NEARBY_DEGREES)
      }).sort((a, b) => {
        const distA = Math.sqrt((a.lat - location.lat) ** 2 + (a.lon - location.lon) ** 2)
        const distB = Math.sqrt((b.lat - location.lat) ** 2 + (b.lon - location.lon) ** 2)
        return distA - distB
      })
      setNearbyParks(newParks)
    }
  }, [ourInfo, location])

  useEffect(() => {
    if (search?.length > 2) {
      let newParks = POTAAllParks.activeParks.filter(park => {
        return (!ourInfo?.dxccCode || park.dxccCode === ourInfo.dxccCode) &&
            (park.ref.toLowerCase().includes(search.toLowerCase()) || park.name.toLowerCase().includes(search.toLowerCase())
            )
      })

      if (location?.lat && location?.lon) {
        newParks = newParks.sort((a, b) => {
          const distA = Math.sqrt((a.lat - location.lat) ** 2 + (a.lon - location.lon) ** 2)
          const distB = Math.sqrt((b.lat - location.lat) ** 2 + (b.lon - location.lon) ** 2)
          return distA - distB
        })
      }

      // Is the search term a plain reference, either with prefix or just digits?
      let nakedReference
      const parts = search.match(/^\s*([A-Z]*)[-]{0,1}(\d+|TEST)\s*$/i)
      if (parts && parts[2].length >= 4) {
        nakedReference = (parts[1]?.toUpperCase() || POTAAllParks.prefixByDXCCCode[ourInfo?.dxccCode] || 'K') + '-' + parts[2].toUpperCase()
      } else if (search.match(Info.referenceRegex)) {
        nakedReference = search
      }

      // If it's a naked reference, let's ensure the results include it, or else add a placeholder
      // just to cover any cases where the user knows about a new park not included in our data
      if (nakedReference && !newParks.find(park => park.ref === nakedReference)) {
        newParks.unshift({ ref: nakedReference })
      }

      setParks(newParks.slice(0, 10))
      if (newParks.length === 0) {
        setParksMessage('No parks found')
      } else if (newParks.length > 10) {
        setParksMessage(`… and ${newParks.length - 10} more`)
      } else {
        setParksMessage('')
      }
    } else {
      setParks(nearbyParks)
      if (nearbyParks === undefined) setParksMessage('Search for some parks to activate!')
      else if (nearbyParks.length === 0) setParksMessage('No parks nearby')
      else setParksMessage('')
    }
  }, [search, ourInfo, nearbyParks, location])

  const handleAddReference = useCallback((ref) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, [...refs.filter(r => r.ref !== ref), { type: Info.activationType, ref }]) }))
  }, [dispatch, operation, refs])

  const handleRemoveReference = useCallback((ref) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, refs.filter(r => r.ref !== ref)) }))
  }, [dispatch, operation, refs])

  return (
    <>
      <List.Section title={title}>
        {refs.map((ref, index) => (
          <POTAListItem
            key={ref.ref}
            activityRef={ref.ref}
            allRefs={refs}
            styles={styles}
            online={online}
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </List.Section>
      <List.Section title={refs.length > 0 ? 'Add more parks' : 'Add a park'}>
        <ListRow>

          <Searchbar
            placeholder={'Parks by name or reference…'}
            value={search}
            onChangeText={setSearch}
          />
        </ListRow>
        {parks.map((park) => (
          <POTAListItem
            key={park.ref}
            activityRef={park.ref}
            allRefs={refs}
            refData={park}
            styles={styles}
            onPress={() => handleAddReference(park.ref) }
            onAddReference={handleAddReference}
            onRemoveReference={handleRemoveReference}
          />
        ))}
        {parksMessage && <List.Item title={<Text style={{ textAlign: 'center' }}>{parksMessage}</Text>} />}
      </List.Section>
    </>
  )
}

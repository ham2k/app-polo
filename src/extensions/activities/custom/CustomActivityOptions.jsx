import React, { useState, useMemo, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { Button, List } from 'react-native-paper'

import { setOperationData } from '../../../store/operations'
import { filterRefs, replaceRefs } from '../../../tools/refTools'
import { Info } from './CustomInfo'
import { CustomListItem } from './CustomListItem'
import { ListRow } from '../../../screens/components/ListComponents'
import ThemedTextInput from '../../../screens/components/ThemedTextInput'

export function CustomActivityOptions (props) {
  const { styles, operation } = props

  const dispatch = useDispatch()

  const [mySig, setMySig] = useState('')
  const [mySigInfo, setMySigInfo] = useState('')
  const [name, setName] = useState('')
  const refs = useMemo(() => filterRefs(operation, Info.activationType), [operation]).filter(ref => ref.ref)

  const title = useMemo(() => {
    if (refs?.length === 0) return 'No references provided for activation'
    else return 'Activating references:'
  }, [refs])

  const handleAddReference = useCallback((refMySigInfo, refName, refMySig) => {
    const data = {
      type: Info.activationType,
      ref: [refMySig.trim(), refMySigInfo.trim()].filter(x => x).join(' '),
      name: refName,
      mySig: refMySig,
      mySigInfo: refMySigInfo
    }
    if (data.ref !== '') dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, [...refs.filter(r => r.ref !== data.ref), data]) }))
  }, [dispatch, operation, refs])

  const handleRemoveReference = useCallback((ref) => {
    dispatch(setOperationData({ uuid: operation.uuid, refs: replaceRefs(operation?.refs, Info.activationType, refs.filter(r => r.ref !== ref)) }))
  }, [dispatch, operation, refs])

  return (
    <>
      <List.Section title={title}>
        {refs.map((ref, index) => (
          <CustomListItem
            key={ref.ref}
            activityRef={ref}
            styles={styles}
            onRemoveReference={handleRemoveReference}
          />
        ))}
      </List.Section>
      <List.Section title={refs?.length === 0 ? 'Add more references' : 'Add a reference'}>
        <ListRow style={{ paddingBottom: styles.oneSpace * 1 }}>
          <ThemedTextInput
            label="Activity - MY_SIG in ADIF (Optional)"
            placeholder={'i.e. COTA…'}
            value={mySig}
            onChangeText={text => setMySig(text)}
          />
        </ListRow>
        <ListRow style={{ paddingBottom: styles.oneSpace * 1 }}>
          <ThemedTextInput
            label="Reference - MY_SIG_INFO in ADIF"
            placeholder={'i.e. XY-1234…'}
            value={mySigInfo}
            onChangeText={text => setMySigInfo(text)}
          />
        </ListRow>
        <ListRow style={{ paddingBottom: styles.oneSpace * 1 }}>
          <ThemedTextInput
            label="Name (Optional)"
            placeholder={'i.e. XYZ Castle…'}
            value={name}
            onChangeText={text => setName(text)}
          />
        </ListRow>
        <ListRow>
          <Button icon="plus-circle" mode="contained" onPress = {() => handleAddReference(mySigInfo, name, mySig) }>Add</Button>
        </ListRow>
      </List.Section>
    </>
  )
}

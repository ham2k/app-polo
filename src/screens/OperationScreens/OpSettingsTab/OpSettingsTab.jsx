/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView } from 'react-native'
import { List } from 'react-native-paper'

import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { useDispatch, useSelector } from 'react-redux'
import { addNewOperation, fillOperationFromTemplate, getAllOperationTemplates, getOperationTemplate, selectOperation, selectOperationsList, setOperationData } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { trackEvent } from '../../../distro'

function prepareStyles (baseStyles) {
  return {
    ...baseStyles,
    panel: {
      backgroundColor: baseStyles.theme.colors.secondaryContainer,
      borderBottomColor: baseStyles.theme.colors.secondaryLight,
      borderBottomWidth: 1
    },
    paperInput: {
      backgroundColor: baseStyles.theme.colors.surface,
      color: baseStyles.theme.colors.onSurface
    },
    nativeInput: {
      backgroundColor: baseStyles.theme.colors.surface,
      color: baseStyles.theme.colors.onSurface
    },
    container: {
      paddingHorizontal: baseStyles.oneSpace,
      paddingTop: baseStyles.oneSpace,
      paddingBottom: baseStyles.oneSpace,
      gap: baseStyles.halfSpace
    }
  }
}

export default function OpSettingsTab ({ navigation, route }) {
  const styles = useThemedStyles(prepareStyles)

  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  const dispatch = useDispatch()

  const [currentDialog, setCurrentDialog] = useState()

  const [templates, setTemplates] = useState()
  const [templateLimit, setTemplateLimit] = useState(3)
  useEffect(() => {
    if (operation._useTemplates) {
      dispatch(async (_dispatch, getState) => {
        const operations = selectOperationsList(getState())
        const newTemplates = getAllOperationTemplates({ operations, settings })
        const currentTemplate = getOperationTemplate({ operation, settings })
        setTemplates(newTemplates.filter(t => t.key !== currentTemplate.key))
        dispatch(setOperationData({ uuid: operation.uuid, _useTemplates: undefined }))
      })
    }
  }, [dispatch, operation, settings])

  useEffect(() => {
    if (operation.template) {
      const template = operation.template
      delete operation.template
      dispatch(setOperationData({ uuid: operation.uuid, template: undefined, _useTemplates: undefined }))
      dispatch(fillOperationFromTemplate(operation, template))
      setTemplates([])
    }
  }, [dispatch, operation])

  const [stationInfo, stationInfoColor] = useMemo(() => {
    let stationCall = operation?.stationCall ?? settings?.stationCall ?? settings?.operatorCall ?? ''
    if (operation.stationCallPlusArray && operation.stationCallPlusArray.length > 0) {
      stationCall += ` + ${operation.stationCallPlusArray.join(', ')}`
    }
    const operatorCall = operation?.local?.operatorCall ?? settings?.operatorCall ?? ''
    if (stationCall && operatorCall && stationCall !== operatorCall) {
      return [`\`${stationCall}\` (operated by \`${operatorCall}\`)`, styles.colors.onSurface]
    } else if (stationCall) {
      return [`\`${stationCall}\``, styles.colors.onSurface]
    } else {
      return ['NO STATION CALLSIGN DEFINED', styles.colors.error]
    }
  }, [operation, settings?.operatorCall, settings?.stationCall, styles.colors.error, styles.colors.onSurface])

  const refHandlers = useMemo(() => {
    const types = [...new Set((operation?.refs || []).map((ref) => ref?.type).filter(x => x))]
    const handlers = types.map(type => (
      findBestHook(`ref:${type}`) || defaultReferenceHandlerFor(type)
    ))
    return handlers
  }, [operation?.refs])

  const activityHooks = useMemo(() => findHooks('activity'), [])
  const opSettingsHooks = useMemo(() => findHooks('opSetting'), [])

  const cloneOperation = useCallback(async () => {
    const template = getOperationTemplate({ operation, settings })
    const newOperation = await dispatch(addNewOperation({ template, _useTemplates: false }))
    trackEvent('create_operation')

    navigation.navigate('Home')
    setTimeout(() => {
      navigation.navigate('Operation', { uuid: newOperation.uuid, operation: newOperation, _isNew: true }, false)
    }, 100)
  }, [dispatch, navigation, operation, settings])

  return (
    <ScrollView style={{ flex: 1 }}>

      {templates?.length > 0 && (
        <Ham2kListSection>
          {templates.slice(0, templateLimit).map((template) => (
            <Ham2kListItem
              key={template.key}
              title={`${template.callsDescription}`}
              description={`Template for ${template.refsDescription ?? 'General Operation'}`}
              titleStyle={{ color: styles.colors.important }}
              descriptionStyle={{ color: styles.colors.important }}
              left={() => <List.Icon color={styles.colors.important} style={{ marginLeft: styles.oneSpace * 2 }} icon="content-copy" />}
              onPress={() => { dispatch(setOperationData({ uuid: operation.uuid, template })) }}
            />
          ))}
          {templates.length > templateLimit && (
            <Ham2kListItem
              title={'Show More Templates'}
              description={`${templates.length - templateLimit} templates available`}
              titleStyle={{ color: styles.colors.important }}
              descriptionStyle={{ color: styles.colors.important }}
              onPress={() => { setTemplateLimit(templateLimit + 10) }}
            />
          )}
        </Ham2kListSection>
      )}

      <Ham2kListSection>
        <Ham2kListItem
          title="Station & Operator"
          description={() => <Ham2kMarkdown style={{ ...styles.list.description, color: stationInfoColor }} compact={true}>{stationInfo}</Ham2kMarkdown>}
          titleStyle={{ color: stationInfoColor }}
          left={() => <List.Icon color={stationInfoColor} style={{ marginLeft: styles.oneSpace * 2 }} icon="radio-tower" />}
          onPress={() => navigation.navigate('OperationStationInfo', { operation: operation.uuid })}
        />

        <Ham2kListItem
          title="Location"
          description={operation.grid ? `Grid ${operation.grid}` : 'No location set'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="map-marker-radius" />}
          onPress={() => navigation.navigate('OperationLocation', { operation: operation.uuid })}
        />

        <Ham2kListItem
          title={operation?.userTitle || 'Operation Details'}
          description={operation?.notes || operation?.userTitle ? 'Add notes for this operation' : 'Add a title or notes for this operation'}
          titleStyle={{ color: stationInfoColor }}
          left={() => <List.Icon color={stationInfoColor} style={{ marginLeft: styles.oneSpace * 2 }} icon="book-outline" />}
          onPress={() => navigation.navigate('OperationDetails', { operation: operation.uuid })}
        />

        {opSettingsHooks.filter(hook => hook.category === 'detail').map((hook) => (
          <hook.OpSettingItem key={hook.key} operation={operation} styles={styles} settings={settings} />
        ))}
      </Ham2kListSection>

      <Ham2kListSection title={'Activities'}>
        {refHandlers.map((handler) => (
          <Ham2kListItem
            key={handler.key}
            title={handler.name}
            description={(handler.description && handler.description(operation)) || handler.descriptionPlaceholder}
            left={
                  () => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={handler.icon} />
                }
            onPress={() => navigation.navigate('OperationActivityOptions', { operation: operation.uuid, activity: handler.key })}
          />
        ))}
        <Ham2kListItem
          key="addActivity"
          title="Add Activity"
          disabled={activityHooks.length === 0}
          style={{ opacity: activityHooks.length === 0 ? 0.5 : 1 }}
          description={activityHooks.length > 0 ? 'POTA, SOTA, Field Day and more!' : 'First enable some activity features in the main settings screen'}
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="plus" />}
          onPress={() => navigation.navigate('OperationAddActivity', { operation: operation.uuid })}
        />
      </Ham2kListSection>

      <Ham2kListSection title={'Operation Data'}>
        <Ham2kListItem
          title="Manage Operation Logs"
          description="Export, import and manage data"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="share" />}
          onPress={() => navigation.navigate('OperationData', { operation: operation.uuid })}
        />
        <Ham2kListItem
          title="Use as template"
          description="Start a new operation with similar settings"
          left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon="content-copy" />}
          onPress={cloneOperation}
        />
      </Ham2kListSection>

      <Ham2kListSection titleStyle={{ color: styles.theme.colors.error }} title={'The Danger Zone'}>
        <Ham2kListItem
          title="Delete Operation"
          titleStyle={{ color: styles.theme.colors.error }}
          left={() => <List.Icon color={styles.theme.colors.error} style={{ marginLeft: styles.oneSpace * 2 }} icon="delete" />}
          onPress={() => setCurrentDialog('delete')}
        />
        {currentDialog === 'delete' && (
          <DeleteOperationDialog
            settings={settings}
            operation={operation}
            styles={styles}
            visible={true}
            onDialogDone={() => setCurrentDialog('')}
          />
        )}
      </Ham2kListSection>
    </ScrollView>

  )
}

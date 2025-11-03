/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { trackEvent } from '../../../distro'

import { addNewOperation, fillOperationFromTemplate, getAllOperationTemplates, getOperationTemplate, selectOperation, selectOperationsList, setOperationData } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { H2kListItem, H2kListSection, H2kMarkdown } from '../../../ui'

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
        setTemplates(newTemplates.filter(t => t?.key !== currentTemplate?.key))
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
    const allCalls = [stationCall]

    if (operation.stationCallPlusArray && operation.stationCallPlusArray.length > 0) {
      allCalls.push(...operation.stationCallPlusArray)
      stationCall += ` + ${operation.stationCallPlusArray.join(', ')}`
    }
    const operatorCall = operation?.local?.operatorCall ?? settings?.operatorCall ?? ''

    const badCalls = allCalls.filter(c => {
      const info = parseCallsign(c)
      return !info.baseCall
    })

    if (badCalls.length === 1) {
      return [`Invalid Callsign ${stationCall}`, styles.colors.error]
    } else if (badCalls.length > 1) {
      return [`Invalid Callsigns ${badCalls.join(', ')}`, styles.colors.error]
    }

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

    navigation.popTo('Home')
    setTimeout(() => {
      navigation.navigate('Operation', { uuid: newOperation.uuid, operation: newOperation, _isNew: true }, false)
    }, 100)
  }, [dispatch, navigation, operation, settings])

  const safeAreaInsets = useSafeAreaInsets()

  return (
    <ScrollView style={{ flex: 1 }}>

      {templates?.length > 0 && (
        <H2kListSection>
          {templates.slice(0, templateLimit).map((template) => (
            <H2kListItem
              key={template.key}
              title={`${template.callsDescription}`}
              description={`Template for ${template.refsDescription ?? 'General Operation'}`}
              titleStyle={{ color: styles.colors.important, paddingRight: safeAreaInsets.right }}
              descriptionStyle={{ color: styles.colors.important, paddingRight: safeAreaInsets.right }}
              leftIcon={'content-copy'}
              leftIconColor={styles.colors.important}
              onPress={() => { dispatch(setOperationData({ uuid: operation.uuid, template })) }}
            />
          ))}
          {templates.length > templateLimit && (
            <H2kListItem
              title={'Show More Templates'}
              description={`${templates.length - templateLimit} templates available`}
              titleStyle={{ color: styles.colors.important, paddingRight: safeAreaInsets.right }}
              descriptionStyle={{ color: styles.colors.important, paddingRight: safeAreaInsets.right }}
              onPress={() => { setTemplateLimit(templateLimit + 10) }}
            />
          )}
        </H2kListSection>
      )}

      <H2kListSection>
        <H2kListItem
          title="Station & Operator"
          description={() => <H2kMarkdown style={{ ...styles.list.description, color: stationInfoColor }} compact={true}>{stationInfo}</H2kMarkdown>}
          titleStyle={{ color: stationInfoColor, paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ color: stationInfoColor, paddingRight: safeAreaInsets.right }}
          leftIcon={'radio-tower'}
          leftIconColor={stationInfoColor}
          onPress={() => navigation.navigate('OperationStationInfo', { operation: operation.uuid })}
        />

        <H2kListItem
          title="Location"
          description={operation.grid ? `Grid ${operation.grid}` : 'No location set'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          leftIcon={'map-marker-radius'}
          onPress={() => navigation.navigate('OperationLocation', { operation: operation.uuid })}
        />

        <H2kListItem
          title={operation?.userTitle || 'Operation Details'}
          description={operation?.notes || operation?.userTitle ? 'Add notes for this operation' : 'Add a title or notes for this operation'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          leftIcon={'book-outline'}
          onPress={() => navigation.navigate('OperationDetails', { operation: operation.uuid })}
        />

        {opSettingsHooks.filter(hook => hook.category === 'detail').map((hook) => (
          <hook.OpSettingItem
            key={hook.key}
            operation={operation}
            styles={styles}
            settings={settings}
            titleStyle={{ paddingRight: safeAreaInsets.right }}
            descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          />
        ))}
      </H2kListSection>

      <H2kListSection title={'Activities'}>
        {refHandlers.map((handler) => (
          <H2kListItem
            key={handler.key}
            title={handler.name}
            description={(handler.description && handler.description(operation)) || handler.descriptionPlaceholder}
            titleStyle={{ paddingRight: safeAreaInsets.right }}
            descriptionStyle={{ paddingRight: safeAreaInsets.right }}
            leftIcon={handler.icon}
            onPress={() => navigation.navigate('OperationActivityOptions', { operation: operation.uuid, activity: handler.key })}
          />
        ))}
        <H2kListItem
          key="addActivity"
          title="Add Activity"
          disabled={activityHooks.length === 0}
          style={{ opacity: activityHooks.length === 0 ? 0.5 : 1 }}
          description={activityHooks.length > 0 ? 'POTA, SOTA, Field Day and more!' : 'First enable some activity features in the main settings screen'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          leftIcon={'plus'}
          onPress={() => navigation.navigate('OperationAddActivity', { operation: operation.uuid })}
        />
      </H2kListSection>

      <H2kListSection title={'Operation Data'}>
        <H2kListItem
          title="Manage Operation Logs"
          description="Export, import and manage data"
          leftIcon={'share'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          onPress={() => navigation.navigate('OperationData', { operation: operation.uuid })}
        />
        <H2kListItem
          title="Use as template"
          description="Start a new operation with similar settings"
          leftIcon={'content-copy'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          onPress={cloneOperation}
        />
      </H2kListSection>

      <H2kListSection titleStyle={{ color: styles.theme.colors.error }} title={'The Danger Zone'}>
        <H2kListItem
          title="Delete Operation"
          titleStyle={{ color: styles.theme.colors.error, paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          leftIcon={'delete'}
          leftIconColor={styles.theme.colors.error}
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
      </H2kListSection>
      <View style={{ height: safeAreaInsets.bottom }} />
    </ScrollView>

  )
}

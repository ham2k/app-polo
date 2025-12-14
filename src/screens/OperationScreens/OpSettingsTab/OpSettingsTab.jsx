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
import { useTranslation } from 'react-i18next'

import { parseCallsign } from '@ham2k/lib-callsigns'

import { trackEvent } from '../../../distro'

import { addNewOperation, fillOperationFromTemplate, getAllOperationTemplates, getOperationTemplate, restoreOperation, selectOperation, selectOperationsList, setOperationData } from '../../../store/operations'
import { selectSettings } from '../../../store/settings'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import { DeleteOperationDialog } from './components/DeleteOperationDialog'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { defaultReferenceHandlerFor } from '../../../extensions/core/references'
import { H2kListItem, H2kListSection, H2kMarkdown } from '../../../ui'
import { joinCalls } from '../../../tools/joinAnd'

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
  const { t } = useTranslation()

  const styles = useThemedStyles(prepareStyles)
  const safeAreaInsets = useSafeAreaInsets()

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
        setTemplates(newTemplates.filter(tmpl => tmpl?.key !== currentTemplate?.key))
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
    const stationCall = operation?.stationCall ?? settings?.stationCall ?? settings?.operatorCall ?? ''
    const allCalls = [stationCall, ...(operation.stationCallPlusArray ?? [])]
    const operatorCall = operation?.local?.operatorCall ?? settings?.operatorCall ?? ''

    // if (operation.stationCallPlusArray && operation.stationCallPlusArray.length > 0) {
    //   allCalls.push(...operation.stationCallPlusArray)
    //   stationCall = joinCalls([stationCall, ...operation.stationCallPlusArray], { markdown: true })
    // }

    const badCalls = allCalls.filter(c => {
      const info = parseCallsign(c)
      return !info.baseCall
    })

    if (badCalls.length === 1) {
      return [t('screens.opSettingsTab.invalidCallsign', 'Invalid Callsign {{callsign}}', { callsign: stationCall }), styles.colors.error]
    } else if (badCalls.length > 1) {
      return [t('screens.opSettingsTab.invalidCallsigns', 'Invalid Callsigns {{callsigns}}', { callsigns: joinCalls(badCalls) }), styles.colors.error]
    }

    if (stationCall && operatorCall && stationCall !== operatorCall && !operation.stationCallPlusArray?.length) {
      return [t('screens.opSettingsTab.stationCallAndOperator', '{{station}} (operated by {{operator}}', { station: stationCall, operator: operatorCall }), styles.colors.onSurface]
    } else if (stationCall) {
      return [`${joinCalls(allCalls, { markdown: true })}`, styles.colors.onSurface]
    } else {
      return [t('screens.opSettingsTab.noStationCallsignDefined', 'NO STATION CALLSIGN DEFINED'), styles.colors.error]
    }
  }, [
    operation, settings?.operatorCall, settings?.stationCall,
    styles.colors.error, styles.colors.onSurface, t
  ])

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
              title={t('screens.opSettingsTab.showMoreTemplates', 'Show More Templates')}
              description={t('screens.opSettingsTab.templatesAvailable', '{{count}} templates available', { count: templates.length - templateLimit })}
              titleStyle={{ color: styles.colors.important, paddingRight: safeAreaInsets.right }}
              descriptionStyle={{ color: styles.colors.important, paddingRight: safeAreaInsets.right }}
              onPress={() => { setTemplateLimit(templateLimit + 10) }}
            />
          )}
        </H2kListSection>
      )}

      <H2kListSection>
        <H2kListItem
          title={t('screens.opSettingsTab.stationAndOperatorTitle', 'Station & Operator')}
          description={() => <H2kMarkdown style={{ ...styles.list.description, color: stationInfoColor }} compact={true}>{stationInfo}</H2kMarkdown>}
          titleStyle={{ color: stationInfoColor, paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ color: stationInfoColor, paddingRight: safeAreaInsets.right }}
          leftIcon={'radio-tower'}
          leftIconColor={stationInfoColor}
          onPress={() => navigation.navigate('OperationStationInfo', { operation: operation.uuid })}
        />

        <H2kListItem
          title={t('screens.opSettingsTab.locationTitle', 'Location')}
          description={() => <H2kMarkdown style={{ ...styles.list.description }} compact={true}>{
            [
              operation.grid ? t('screens.opSettingsTab.gridDescription-md', 'Grid `{{grid}}`', { grid: operation.grid }) : '',
              operation.county ? t('screens.opSettingsTab.countyDescription-md', 'County: `{{county}}`', { county: operation.county }) : '',
              operation.state ? t('screens.opSettingsTab.stateDescription-md', 'State: `{{state}}`', { state: operation.state }) : ''
            ].filter(Boolean).join(' • ') || t('screens.opSettingsTab.locationDescriptionNone-md', 'No location set')
          }</H2kMarkdown>}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          leftIcon={'map-marker-radius'}
          onPress={() => navigation.navigate('OperationLocation', { operation: operation.uuid })}
        />

        <H2kListItem
          title={operation?.userTitle || t('screens.opSettingsTab.operationDetailsTitle', 'Operation Details')}
          description={operation?.userTitle ? (operation?.notes || t('screens.opSettingsTab.operationDetailsDescription', 'Add notes for this operation')) : t('screens.opSettingsTab.addTitleOrNotesForOperation', 'Add a title or notes for this operation')}
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

      <H2kListSection title={t('screens.opSettingsTab.activitiesTitle', 'Activities')}>
        {refHandlers.map((handler) => (
          <H2kListItem
            key={handler.key}
            title={t(`extensions.${handler.key}.name`, handler.name)}
            description={(handler.description && handler.description(operation, { t })) || t(`extensions.${handler.key}.description`, handler.descriptionPlaceholder || '')}
            titleStyle={{ paddingRight: safeAreaInsets.right }}
            descriptionStyle={{ paddingRight: safeAreaInsets.right }}
            leftIcon={handler.icon}
            onPress={() => navigation.navigate('OperationActivityOptions', { operation: operation.uuid, activity: handler.key })}
          />
        ))}
        <H2kListItem
          key="addActivity"
          title={t('screens.opSettingsTab.addActivityTitle', 'Add Activity')}
          disabled={activityHooks.length === 0}
          style={{ opacity: activityHooks.length === 0 ? 0.5 : 1 }}
          description={activityHooks.length > 0 ? t('screens.opSettingsTab.addActivityDescription', 'POTA, SOTA, Field Day and more!') : t('screens.opSettingsTab.addActivityDescription-noFeatures', 'First enable some activity features in the main settings screen')}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          leftIcon={'plus'}
          onPress={() => navigation.navigate('OperationAddActivity', { operation: operation.uuid })}
        />
      </H2kListSection>

      <H2kListSection title={t('screens.opSettingsTab.operationDataTitle', 'Operation Data')}>
        <H2kListItem
          title={t('screens.opSettingsTab.manageOperationLogsTitle', 'Manage Operation Logs')}
          description={t('screens.opSettingsTab.manageOperationLogsDescription', 'Export, import and manage data')}
          leftIcon={'share'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          onPress={() => navigation.navigate('OperationData', { operation: operation.uuid })}
        />
        <H2kListItem
          title={t('screens.opSettingsTab.useAsTemplateTitle', 'Use as template')}
          description={t('screens.opSettingsTab.useAsTemplateDescription', 'Start a new operation with similar settings')}
          leftIcon={'content-copy'}
          titleStyle={{ paddingRight: safeAreaInsets.right }}
          descriptionStyle={{ paddingRight: safeAreaInsets.right }}
          onPress={cloneOperation}
        />
      </H2kListSection>

      <H2kListSection titleStyle={{ color: styles.theme.colors.error }} title={t('screens.opSettingsTab.dangerZoneTitle', 'The Danger Zone')}>
        {operation.deleted ? (
          <H2kListItem
            title={t('screens.opSettingsTab.undeleteOperationTitle', 'Undelete Operation')}
            titleStyle={{ color: styles.theme.colors.error, paddingRight: safeAreaInsets.right }}
            descriptionStyle={{ paddingRight: safeAreaInsets.right }}
            leftIcon={'delete-restore'}
            leftIconColor={styles.theme.colors.error}
            onPress={() => dispatch(restoreOperation(operation.uuid))}
          />
        ) : (
          <H2kListItem
            title={t('screens.opSettingsTab.deleteOperationTitle', 'Delete Operation')}
            titleStyle={{ color: styles.theme.colors.error, paddingRight: safeAreaInsets.right }}
            descriptionStyle={{ paddingRight: safeAreaInsets.right }}
            leftIcon={'delete'}
            leftIconColor={styles.theme.colors.error}
            onPress={() => setCurrentDialog('delete')}
          />
        )}
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

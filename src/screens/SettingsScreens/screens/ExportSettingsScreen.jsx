/* eslint-disable react/no-unstable-nested-components */
/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { selectExportSettings, selectSettings, setExportSettings } from '../../../store/settings'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'
import { findBestHook, findHooks } from '../../../extensions/registry'
import { basePartialTemplates, DATA_FORMAT_DESCRIPTIONS, runTemplateForOperation } from '../../../store/operations'
import { List, Switch, Text } from 'react-native-paper'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import ThemedTextInput from '../../components/ThemedTextInput'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'
import { fmtISODate } from '../../../tools/timeFormats'

export default function ExportSettingsScreen ({ navigation }) {
  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)
  const styles = useThemedStyles()

  const [expanded, setExpanded] = useState({})

  const now = useMemo(() => new Date(), [])
  const sampleTemplateData = useMemo(() => ({
    ourInfo: {
      call: 'N0CALL'
    },
    operation: {
      stationCall: 'N0CALL',
      startAtMillisMin: now.getTime(),
      startAtMillisMax: now.getTime() + 1000 * 60 * 60 * 2,
      refs: [{ type: 'potaActivation', ref: 'XX-1234' }, { type: 'wwff', ref: 'XXFF-0001' }]
    },
    qso: { notes: 'Good Contact!', their: { sent: '59', exchange: 'MA' }, our: { sent: '55', exchange: 'NY' } }
  }), [now])

  const exportTypes = useMemo(() => {
    const activityHooks = findHooks('activity')
    const newExportTypes = []

    const defaultRefSettings = selectExportSettings({ settings }, 'default-ref')
    const defaultPartials = basePartialTemplates({}) // without settings to get original defaults

    newExportTypes.push({
      key: 'default-ref',
      name: 'Default for Reference Activities',
      description: defaultRefSettings.active ? 'Using custom settings' : 'Using defaults',
      sampleData: {
        ...sampleTemplateData,
        ref: { type: 'potaActivation', ref: 'XX-1234' },
        handler: { key: 'pota', shortName: 'POTA', name: 'Parks On The Air' }
      },
      editableSettings: [
        {
          key: 'RefActivityNameNormal',
          label: 'File name for Reference Activities (Normal)',
          default: defaultPartials.RefActivityNameNormal
        },
        {
          key: 'RefActivityNameCompact',
          label: 'File name for Reference Activities (Compact)',
          default: defaultPartials.RefActivityNameCompact
        },
        {
          key: 'RefActivityTitle',
          label: 'Title for Reference Activities',
          default: defaultPartials.RefActivityTitle
        },
        {
          key: 'OtherActivityNameNormal',
          label: 'File name for Other Activities (Normal)',
          default: defaultPartials.OtherActivityNameNormal
        },
        {
          key: 'OtherActivityNameCompact',
          label: 'File name for Other Activities (Compact)',
          default: defaultPartials.OtherActivityNameCompact
        },
        {
          key: 'OtherActivityTitle',
          label: 'Title for Other Activities',
          default: defaultPartials.OtherActivityTitle
        },
        {
          key: 'ADIFNotes',
          label: 'ADIF QSO Notes',
          default: defaultPartials.ADIFNotes
        },
        {
          key: 'ADIFComment',
          label: 'ADIF QSO Comments',
          default: defaultPartials.ADIFComment
        },
        {
          key: 'ADIFQslMsg',
          label: 'ADIF QSL Message',
          default: defaultPartials.ADIFQslMsg
        }
      ],
      settings: defaultRefSettings
    })
    console.log(newExportTypes[0])
    activityHooks.forEach(hook => {
      const sampleOperations = (hook.sampleOperations && hook.sampleOperations({ settings })) || []
      sampleOperations.forEach(operation => {
        (operation?.refs || []).forEach(ref => {
          const refHook = findBestHook(`ref:${ref.type}`)
          if (refHook?.suggestExportOptions) {
            const options = (refHook.suggestExportOptions && refHook.suggestExportOptions({ operation, qsos: operation.qsos, ref, settings })) || []
            options.forEach(option => {
              const key = `${hook.key}-${option.format}-${option.exportType ?? 'ref'}`
              const exportSettings = selectExportSettings({ settings }, key)
              console.log('adding', { key, sampleTemplateData, operation, refs: operation.refs })
              const data = {
                key,
                name: `${option.exportName || hook.shortName} (${DATA_FORMAT_DESCRIPTIONS[option.format] || option.format})`,
                description: exportSettings.active ? 'Using custom settings' : 'Using defaults',
                hook,
                refHook,
                defaults: option,
                settings: exportSettings,
                sampleData: {
                  ...sampleTemplateData,
                  operation: { ...sampleTemplateData.operation, ...operation },
                  ref,
                  handler: hook
                },
                editableSettings: [
                  {
                    key: 'nameTemplate',
                    label: 'File name template',
                    default: option.nameTemplate
                  },
                  {
                    key: 'titleTemplate',
                    label: 'Title template',
                    default: option.titleTemplate
                  }
                ]
              }
              if (option.format === 'adif') {
                data.editableSettings.push({
                  key: 'ADIFNotesTemplate',
                  label: 'ADIF QSO Notes',
                  default: option.ADIFNotesTemplate || defaultPartials.ADIFNotes
                })
                data.editableSettings.push({
                  key: 'ADIFCommentTemplate',
                  label: 'ADIF QSO Comments',
                  default: option.ADIFCommentTemplate || defaultPartials.ADIFComment
                })
                data.editableSettings.push({
                  key: 'ADIFQslMsgTemplate',
                  label: 'ADIF QSL Message',
                  default: option.ADIFQslMsgTemplate || defaultPartials.ADIFQslMsg
                })
              }
              newExportTypes.push(data)
              console.log('added sample data', newExportTypes[newExportTypes.length - 1].sampleData)
            })
          }
        })
      })

      const exportHooks = findHooks('export').filter(h => h.key === hook.key)
      exportHooks.forEach(exportHook => {
        sampleOperations.forEach(operation => {
          const options = (exportHook.suggestExportOptions && exportHook.suggestExportOptions({ operation, qsos: operation.qsos, settings })) || []
          options.forEach(option => {
            const key = `${hook.key}-${option.format}-${option.exportType ?? 'export'}`
            const exportSettings = selectExportSettings({ settings }, key)
            const data = {
              key,
              name: `${option.exportName || hook.shortName} (${DATA_FORMAT_DESCRIPTIONS[option.format] || option.format})`,
              description: exportSettings.active ? 'Using custom settings' : 'Using defaults',
              hook,
              exportHook,
              sampleData: {
                ...sampleTemplateData,
                operation: { ...sampleTemplateData.operation, ...operation }
              },
              defaults: option,
              settings: exportSettings,
              editableSettings: [
                {
                  key: 'nameTemplate',
                  label: 'File name template',
                  default: option.nameTemplate
                },
                {
                  key: 'titleTemplate',
                  label: 'Title template',
                  default: option.titleTemplate
                }
              ]
            }
            if (option.format === 'adif') {
              data.editableSettings.push({
                key: 'ADIFNotesTemplate',
                label: 'ADIF QSO Notes',
                default: option.ADIFNotesTemplate || defaultPartials.ADIFNotes
              })
              data.editableSettings.push({
                key: 'ADIFCommentTemplate',
                label: 'ADIF QSO Comments',
                default: option.ADIFCommentTemplate || defaultPartials.ADIFComment
              })
              data.editableSettings.push({
                key: 'ADIFQslMsgTemplate',
                label: 'ADIF QSL Message',
                default: option.ADIFQslMsgTemplate || defaultPartials.ADIFQslMsg
              })
            }
            newExportTypes.push(data)
          })
        })
      })
    })
    return newExportTypes
  }, [sampleTemplateData, settings])

  const templateHelp = useMemo(() => {
    const call = 'N0CALL'
    const otherCalls = 'OTH3R, C4LLS'

    return `
Some sample template elements...

### Log Export
Attributes for the log being exported
\`{{log.station}}\` → \`${call}\` Station for this export
\`{{log.ref}}\` → \`XX-1234\` Reference for this export
\`{{log.refName}}\` → \`Example National Park\` Reference name for this export
\`{{log.refShortName}}\` → \`Example NP\` Short reference name for this export
\`{{log.handlerType}}\` → \`pota\` Handler type for this export
\`{{log.handlerName}}\` → \`Parks On The Air\` Handler name for this export
\`{{log.handlerShortName}}\` → \`POTA\` Short handler name for this export

### Operation Callsigns
\`{{op.station}}\` → \`${call}\` First station for the operation
\`{{op.operator}}\` → \`${call}\` Operator for the operation
\`{{op.allStations}}\` → \`${call}, ${otherCalls}\` All stations for the operation
\`{{op.otherStations}}\` → \`${otherCalls}\` Other stations for the operation

### Operation Date
\`{{op.date}}\` → \`${fmtISODate(now)}\`
\`{{compact op.date}}\` → \`${fmtISODate(now).replace(/-/g, '')}\`

### Other Operation Details
\`{{op.title}}\` → \`at XX-1234, XXFF-0001\`
\`{{op.userTitle}}\` → \`My Special Operation\`
\`{{op.userNotes}}\` → \`Went early in the morning…\`
\`{{op.uuid}}\` → \`123e4567-e89b-12d3-a456-426614174000\`
\`{{first8 op.uuid}}\` → \`123e4567\`

### QSO Information
\`{{qso.notes}}\` → \`Terrible audio!\`
\`{{qso.uuid}}\` → \`123e4567-e89b-12d3-a456-426614174000\`
\`{{first8 qso.uuid}}\` → \`123e4567\`
`
  }, [now])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection title={'Export Types'} />
        {exportTypes.map(exportType => (
          <React.Fragment key={exportType.key}>
            <Ham2kListItem
              title={exportType.name}
              description={exportType.description}
              left={() => <List.Icon style={{ marginLeft: styles.oneSpace * 2 }} icon={expanded[exportType.key] ? 'chevron-down' : 'chevron-right'} />}
              onPress={() => setExpanded({ ...expanded, [exportType.key]: !expanded[exportType.key] })}
            />
            {expanded[exportType.key] && (
              <View style={{ marginLeft: styles.oneSpace * 5, borderBottomWidth: 2, marginRight: styles.oneSpace * 2, paddingBottom: styles.oneSpace * 2, borderColor: styles.colors.border }}>
                <Ham2kListItem
                  title="Use custom settings"
                  // description={exportType.settings?.active ? 'Use settings the below' : 'Use default settings'}
                  right={() => <Switch value={!!exportType.settings?.active} onValueChange={(value) => dispatch(setExportSettings({ key: exportType.key, active: value })) } />}
                  onPress={() => dispatch(setExportSettings({ key: exportType.key, active: !exportType.settings?.active }))}
                />
                {exportType.editableSettings.map(setting => (
                  <View key={setting.key} style={{ marginLeft: styles.oneSpace * 1, marginBottom: styles.oneSpace * 2 }}>
                    <ThemedTextInput
                      style={{ width: '100%', flex: 1 }}
                      label={setting.label}
                      value={exportType?.settings?.active === false ? '' : exportType?.settings?.[setting.key] || setting.default || ''}
                      placeholder={setting.default}
                      disabled={exportType?.settings?.active === false}
                      onChangeText={(value) => dispatch(setExportSettings({ key: exportType.key, [setting.key]: value })) }
                    />
                    <Text style={{ marginTop: styles.oneSpace, fontSize: styles.smallerFontSize, marginHorizontal: styles.oneSpace * 1 }}>
                      {runTemplateForOperation(exportType?.settings?.[setting.key] || setting.default, { settings, ...exportType.sampleData })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </React.Fragment>
        ))}
        <Ham2kListSection title={'Template Help'}>
          <Ham2kMarkdown style={{ margin: styles.oneSpace * 2 }}>{templateHelp}</Ham2kMarkdown>
        </Ham2kListSection>
      </ScrollView>
    </ScreenContainer>
  )
}

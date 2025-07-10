/*
 * WavelogSettingsScreen.jsx
 * Settings screen for Wavelog integration (API URL + API Key + Station picker)
 */
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { View, ScrollView } from 'react-native';
import { Text, TextInput, Button, List, HelperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectSettings, setSettings } from '../../../store/settings';
import ScreenContainer from '../../components/ScreenContainer';
import { useThemedStyles } from '../../../styles/tools/useThemedStyles';

export default function WavelogSettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const styles = useThemedStyles();
  const settings = useSelector(selectSettings);
  const [apiUrl, setApiUrl] = useState(settings?.wavelog?.apiUrl || '');
  const [apiKey, setApiKey] = useState(settings?.wavelog?.apiKey || '');
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState(settings?.wavelog?.stationId || '');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStations = async () => {
    setFetching(true);
    setError('');
    setStations([]);
    try {
      const url = `${apiUrl.replace(/\/$/, '')}/api/station_info/${apiKey}`;
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error('Failed to fetch stations');
      const data = await response.json();
      if (Array.isArray(data)) {
        setStations(data);
      } else if (Array.isArray(data.payload)) {
        setStations(data.payload);
      } else {
        setError('No stations found or invalid response');
      }
    } catch (e) {
      setError('Error fetching stations: ' + e.message);
    }
    setFetching(false);
  };

  const saveConfig = () => {
    setSaving(true);
    dispatch(setSettings({
      wavelog: {
        apiUrl,
        apiKey,
        stationId
      },
    }));
    setSaving(false);
  };

  return (
    <ScreenContainer>
      <View style={{ flex: 1, padding: 16, paddingBottom: safeAreaInsets.bottom }}>
        <Text variant="titleLarge" style={{ marginBottom: 16 }}>Wavelog Configuration</Text>
        <TextInput
          label="Wavelog API URL"
          value={apiUrl}
          onChangeText={setApiUrl}
          style={{ marginBottom: 12 }}
          autoCapitalize="none"
        />
        <TextInput
          label="API Key"
          value={apiKey}
          onChangeText={setApiKey}
          style={{ marginBottom: 12 }}
          autoCapitalize="none"
        />
        <Button mode="outlined" onPress={fetchStations} loading={fetching} disabled={fetching || !apiUrl || !apiKey} style={{ marginBottom: 12 }}>
          Fetch Stations
        </Button>
        {error ? <HelperText type="error">{error}</HelperText> : null}
        {stations.length > 0 && (
          <ScrollView style={{ maxHeight: 300, marginBottom: 12 }}>
            <List.Section title="Select Station">
              {stations.map(station => {
                const id = station.id || station.station_profile_id || station.station_id;
                const profileName = station.station_profile_name || station.name || station.label || station.station_callsign || '';
                return (
                  <List.Item
                    key={id}
                    title={profileName}
                    description={station.station_callsign || station.label || ''}
                    onPress={() => setStationId(id)}
                    left={props => <List.Icon {...props} icon={stationId === id ? 'check-circle' : 'radiobox-blank'} />}
                    style={{ backgroundColor: stationId === id ? styles.colors.primaryLighter : undefined }}
                  />
                );
              })}
            </List.Section>
          </ScrollView>
        )}
        {stationId && (
          <HelperText type="info" style={{ marginBottom: 8 }}>
            Selected station:{' '}
            {(() => {
              const selected = stations.find(station =>
                (station.id || station.station_profile_id || station.station_id) === stationId
              );
              return selected
                ? (selected.station_profile_name || selected.name || selected.label || selected.station_callsign || stationId)
                : stationId;
            })()}
          </HelperText>
        )}
        <Button mode="contained" onPress={saveConfig} loading={saving} disabled={saving || !apiUrl || !apiKey || !stationId} style={{ marginTop: 16 }}>
          Save
        </Button>
      </View>
    </ScreenContainer>
  );
}

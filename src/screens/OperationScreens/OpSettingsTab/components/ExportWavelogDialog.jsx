import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { List, Button, Dialog, Portal, Text } from 'react-native-paper';
import { selectSettings } from '../../../../store/settings';
import { selectOperation } from '../../../../store/operations';
import { qsonToWavelog } from '../../../../tools/qsonToWavelog';

export function ExportWavelogDialog({ operation, qsos, visible, onDialogDone }) {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Reset status when dialog opens
  useEffect(() => {
    if (visible) {
      setStatus('');
      setExportSuccess(false);
    }
  }, [visible]);

  const handleExport = async () => {
    const wavelog = settings?.wavelog;
    console.log('Wavelog config:', wavelog, 'Types:', {
      apiUrl: typeof wavelog?.apiUrl,
      apiKey: typeof wavelog?.apiKey,
      stationId: typeof wavelog?.stationId,
      stationIdValue: wavelog?.stationId,
    });

    setLoading(true);
    setStatus('Exporting...');
    const result = await qsonToWavelog({ operation, qsos, settings });
    setStatus(result.message);
    if (result.success) {
      setExportSuccess(true);
    }
    setLoading(false);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDialogDone}>
        <Dialog.Title>Export QSOs to Wavelog</Dialog.Title>
        <Dialog.Content>
          <Text>{status || 'Export all QSOs for this operation to Wavelog.'}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          {exportSuccess ? (
            <Button onPress={onDialogDone}>Done</Button>
          ) : (
            <>
              <Button onPress={onDialogDone} disabled={loading}>Cancel</Button>
              <Button onPress={handleExport} loading={loading} disabled={loading}>Export</Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

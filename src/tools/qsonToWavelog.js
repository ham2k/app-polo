/*
 * qsonToWavelog.js
 * Export QSOs to Wavelog format and upload via API
 */
import { qsonToADIF } from './qsonToADIF';
import packageJson from '../../package.json';

/**
 * Export QSOs to Wavelog for an operation
 * @param {Object} params
 * @param {Object} params.operation
 * @param {Array} params.qsos
 * @param {Object} params.settings
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function qsonToWavelog({ operation, qsos, settings }) {
  const wavelog = settings?.wavelog;
  if (
    !wavelog?.apiUrl ||
    !wavelog?.apiKey ||
    !wavelog?.stationId
  ) {
    return { success: false, message: 'Wavelog config is incomplete. Please set API URL, API Key, and Station in settings.' };
  }

  // Ensure QSOs is a non-empty array
  if (!Array.isArray(qsos) || qsos.length === 0) {
    console.warn('[Wavelog Export] No QSOs provided for export. The QSOs array is empty or invalid.');
    return { success: false, message: 'No QSOs to export. Please ensure you have selected QSOs for export.' };
  }

  // Compose ADIF string using qsonToADIF
  let adifStr = qsonToADIF({ operation, qsos, settings, handler: { key: 'adif' }, combineSegmentRefs: true });
  console.log('[Wavelog Export] Exporting QSOs:', qsos);
  console.log('[Wavelog Export] ADIF string:', adifStr);

  // Prepare JSON payload for POST
  const payload = {
    key: wavelog.apiKey.trim(),
    station_profile_id: String(wavelog.stationId).trim(),
    type: 'adif',
    string: adifStr
  };
  const postData = JSON.stringify(payload);

  // Ensure the URL ends with /api/qso
  const apiUrl = wavelog.apiUrl.replace(/\/$/, '') + '/api/qso';
  console.log('[Wavelog Export] Uploading to URL:', apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Ham2K-PoLo/${packageJson.version}`
      },
      body: postData
    });

    if (response.ok) {
      // Any 2xx response is considered a success.
      // We can still check for an explicit failure message in the body, just in case.
      const responseText = await response.text();
      try {
        if (responseText) {
          const responseData = JSON.parse(responseText);
          if (responseData.status === 'failed') {
            return { success: false, message: 'Wavelog reported failure: ' + (responseData.reason || responseText) };
          }
        }
      } catch (e) {
        // Response is not JSON. Since status is OK, we assume success.
        console.log('[Wavelog Export] Non-JSON success response from Wavelog:', responseText);
      }
      return { success: true, message: 'QSOs exported to Wavelog.' };
    } else {
      // Not a 2xx response, so it's a failure.
      const responseText = await response.text();
      let reason = responseText;
      try {
        const responseData = JSON.parse(responseText);
        reason = responseData.reason || responseText;
      } catch (e) {
        // Not JSON, use the text.
      }
      return { success: false, message: `Wavelog upload failed: ${response.statusText} (${response.status}). ${reason.substring(0, 200)}` };
    }
  } catch (e) {
    console.error('[Wavelog Export] Network error:', e);
    return { success: false, message: 'Wavelog upload error: ' + e.message + ' (URL: ' + apiUrl + ')' };
  }
}

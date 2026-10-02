/**
 * geoapifyService.js — Centralized Geoapify Road Routing Service for EcoSaathi
 *
 * Calls the Geoapify Routing API to calculate actual road distance,
 * estimated travel duration, and roadway geometry along ordered stop coordinates.
 * Includes timeout handling and structured responses for resilient fallback.
 */

const https = require('https');

const GEOAPIFY_ROUTING_URL = 'https://api.geoapify.com/v1/routing';
const REQUEST_TIMEOUT_MS = 6000;

/**
 * Request real road routing through Geoapify for an ordered list of waypoints.
 *
 * @param {Array<{latitude: number, longitude: number}>} waypoints Ordered points (Starting Point + Stops)
 * @returns {Promise<{
 *   success: boolean,
 *   distanceKm?: number,
 *   durationMinutes?: number,
 *   routeGeometry?: object,
 *   polyline?: Array<[number, number]>,
 *   error?: string
 * }>}
 */
async function getRoadRoute(waypoints = []) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'GEOAPIFY_API_KEY is not configured on the server.',
    };
  }

  if (!waypoints || waypoints.length < 2) {
    return {
      success: false,
      error: 'At least 2 waypoints are required to compute a road route.',
    };
  }

  // Format waypoints: lat,lon|lat,lon|lat,lon
  const waypointsParam = waypoints
    .map((p) => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`)
    .join('|');

  const url = `${GEOAPIFY_ROUTING_URL}?waypoints=${waypointsParam}&mode=drive&apiKey=${apiKey}`;

  return new Promise((resolve) => {
    let resolved = false;

    const req = https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (resolved) return;
        resolved = true;

        if (res.statusCode !== 200) {
          console.warn(
            `[Geoapify] Routing API returned status ${res.statusCode}:`,
            data.slice(0, 150)
          );
          return resolve({
            success: false,
            error: `Geoapify Routing API HTTP error: ${res.statusCode}`,
          });
        }

        try {
          const parsed = JSON.parse(data);
          const feature = parsed.features?.[0];

          if (!feature) {
            return resolve({
              success: false,
              error: 'Geoapify returned an empty routing features list.',
            });
          }

          const meters = feature.properties?.distance || 0;
          const seconds = feature.properties?.time || 0;
          const geometry = feature.geometry;

          // Flatten coordinates into Leaflet [latitude, longitude] pairs
          const polyline = [];
          if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
            geometry.coordinates.forEach(([lon, lat]) => {
              if (lat !== undefined && lon !== undefined) polyline.push([lat, lon]);
            });
          } else if (
            geometry?.type === 'MultiLineString' &&
            Array.isArray(geometry.coordinates)
          ) {
            geometry.coordinates.forEach((segment) => {
              if (Array.isArray(segment)) {
                segment.forEach(([lon, lat]) => {
                  if (lat !== undefined && lon !== undefined) polyline.push([lat, lon]);
                });
              }
            });
          }

          const distanceKm = +(meters / 1000).toFixed(1);
          const durationMinutes = Math.max(1, Math.round(seconds / 60));

          resolve({
            success: true,
            distanceKm,
            durationMinutes,
            routeGeometry: geometry,
            polyline,
          });
        } catch (parseErr) {
          console.warn('[Geoapify] Failed to parse routing JSON:', parseErr.message);
          resolve({
            success: false,
            error: 'Failed to parse Geoapify response payload.',
          });
        }
      });
    });

    req.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      console.warn('[Geoapify] Routing request network error:', err.message);
      resolve({
        success: false,
        error: `Network error reaching Geoapify: ${err.message}`,
      });
    });

    // Timeout guard to prevent hanging requests
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      if (resolved) return;
      resolved = true;
      req.destroy();
      console.warn('[Geoapify] Routing request timed out after', REQUEST_TIMEOUT_MS, 'ms');
      resolve({
        success: false,
        error: 'Geoapify Routing API request timed out.',
      });
    });
  });
}

module.exports = {
  getRoadRoute,
};

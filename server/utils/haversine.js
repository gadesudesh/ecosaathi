/**
 * haversine.js — Lightweight straight-line distance utility for EcoSaathi
 *
 * Used exclusively for heuristic candidate scoring, proximity evaluation,
 * and baseline distance comparisons. (Not actual road distance).
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate straight-line distance in kilometers between two lat/lng coordinates
 * using the Haversine formula.
 *
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined ||
    lat1 === null ||
    lon1 === undefined ||
    lon1 === null ||
    lat2 === undefined ||
    lat2 === null ||
    lon2 === undefined ||
    lon2 === null
  ) {
    return 0;
  }

  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return +distance.toFixed(3);
}

/**
 * Calculate total cumulative distance of a path of coordinates.
 *
 * @param {Array<{latitude: number, longitude: number}>} points
 * @returns {number} Total distance in kilometers (rounded to 2 decimal places)
 */
function calculateTotalPathDistance(points = []) {
  if (!points || points.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1?.latitude && p1?.longitude && p2?.latitude && p2?.longitude) {
      total += calculateHaversineDistance(
        p1.latitude,
        p1.longitude,
        p2.latitude,
        p2.longitude
      );
    }
  }

  return +total.toFixed(2);
}

module.exports = {
  calculateHaversineDistance,
  calculateTotalPathDistance,
};

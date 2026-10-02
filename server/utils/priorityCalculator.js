/**
 * priorityCalculator.js
 * Rule-based priority engine for EcoRoute pickup requests.
 *
 * Score weights:
 *   Urgency      40%
 *   Quantity     25%
 *   Waiting time 20%
 *   Waste type   15%
 *
 * Final score: 0 – 100
 * Level:  80–100 → CRITICAL | 60–79 → HIGH | 40–59 → MEDIUM | 0–39 → LOW
 */

// ── Weight constants ────────────────────────────────────────────────────────
const WEIGHTS = {
  urgency:     0.40,
  quantity:    0.25,
  waitingTime: 0.20,
  wasteType:   0.15,
};

// ── Urgency map (out of 100) ────────────────────────────────────────────────
const URGENCY_SCORES = {
  low:    20,
  medium: 55,
  high:   100,
};

// ── Quantity map (out of 100) ───────────────────────────────────────────────
const QUANTITY_SCORES = {
  small:  25,
  medium: 60,
  large:  100,
};

// ── Waste type map (out of 100) — hazardous/problematic types score higher ──
const WASTE_TYPE_SCORES = {
  "e-waste":      100,  // hazardous, requires special handling
  "construction": 85,   // bulky, blocks public spaces
  "organic":      75,   // degrades and causes hygiene issues quickly
  "metal":        70,   // sharp, heavy, recyclable
  "glass":        65,   // fragile, safety hazard
  "mixed":        60,   // unpredictable contents
  "plastic":      50,   // recyclable but harmful if unattended
  "paper":        35,   // least urgent
  "other":        45,   // general items
};

/**
 * Calculate how many hours old the request is.
 * Waiting time score increases linearly up to 48 hours (capped at 100).
 * A brand-new request scores 0; a 48-hour-old request scores 100.
 *
 * @param {Date} createdAt
 * @returns {number} 0-100
 */
function waitingTimeScore(createdAt) {
  const now = Date.now();
  const createdMs = new Date(createdAt).getTime();
  const hoursWaited = (now - createdMs) / (1000 * 60 * 60);

  const MAX_HOURS = 48; // 48 h = full score
  const score = Math.min((hoursWaited / MAX_HOURS) * 100, 100);
  return Math.round(score);
}

/**
 * Map a 0-100 score to a priority level label.
 *
 * @param {number} score
 * @returns {"CRITICAL"|"HIGH"|"MEDIUM"|"LOW"}
 */
function scoreToLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/**
 * Calculate the priority score and level for a pickup request.
 *
 * @param {Object} request - Mongoose document or plain object
 * @param {string} request.urgency   - "low" | "medium" | "high"
 * @param {string} request.quantity  - "small" | "medium" | "large"
 * @param {string} request.wasteType - one of the supported waste types
 * @param {Date}   request.createdAt - creation timestamp
 *
 * @returns {{ priorityScore: number, priorityLevel: string }}
 */
function calculatePriorityScore(request) {
  const urgency     = URGENCY_SCORES[request.urgency]       ?? 20;
  const quantity    = QUANTITY_SCORES[request.quantity]      ?? 25;
  const wasteType   = WASTE_TYPE_SCORES[request.wasteType]   ?? 50;
  const waiting     = waitingTimeScore(request.createdAt || new Date());

  const rawScore =
    urgency   * WEIGHTS.urgency     +
    quantity  * WEIGHTS.quantity    +
    waiting   * WEIGHTS.waitingTime +
    wasteType * WEIGHTS.wasteType;

  const priorityScore = Math.round(Math.min(Math.max(rawScore, 0), 100));
  const priorityLevel = scoreToLevel(priorityScore);

  return { priorityScore, priorityLevel };
}

/**
 * Return detailed factor-by-factor breakdown of the priority score for Admin operations.
 *
 * @param {Object} request
 * @returns {Object}
 */
function getPriorityBreakdown(request) {
  const urgencyRaw   = URGENCY_SCORES[request.urgency]       ?? 20;
  const quantityRaw  = QUANTITY_SCORES[request.quantity]      ?? 25;
  const wasteTypeRaw = WASTE_TYPE_SCORES[request.wasteType]   ?? 50;
  const waitingRaw   = waitingTimeScore(request.createdAt || new Date());

  const urgencyWeighted   = Math.round(urgencyRaw * WEIGHTS.urgency);
  const quantityWeighted  = Math.round(quantityRaw * WEIGHTS.quantity);
  const waitingWeighted   = Math.round(waitingRaw * WEIGHTS.waitingTime);
  const wasteTypeWeighted = Math.round(wasteTypeRaw * WEIGHTS.wasteType);

  const totalScore = Math.round(
    Math.min(Math.max(urgencyWeighted + quantityWeighted + waitingWeighted + wasteTypeWeighted, 0), 100)
  );

  return {
    urgency:     { raw: urgencyRaw,   weighted: urgencyWeighted,   weightPct: 40, label: request.urgency },
    quantity:    { raw: quantityRaw,  weighted: quantityWeighted,  weightPct: 25, label: request.quantity },
    wasteType:   { raw: wasteTypeRaw, weighted: wasteTypeWeighted, weightPct: 15, label: request.wasteType },
    waitingTime: { raw: waitingRaw,   weighted: waitingWeighted,   weightPct: 20 },
    totalScore,
    priorityLevel: scoreToLevel(totalScore),
  };
}

module.exports = { calculatePriorityScore, getPriorityBreakdown };


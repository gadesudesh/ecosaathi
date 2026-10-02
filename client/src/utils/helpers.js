// Utility helpers shared across the frontend

// ── Status badge class ────────────────────────────────────────────────────────
export function getStatusBadgeClass(status) {
  switch (status?.toUpperCase()) {
    case 'PENDING':     return 'badge-pending';
    case 'ASSIGNED':    return 'badge-assigned';
    case 'IN_PROGRESS': return 'badge-inprogress';
    case 'COMPLETED':   return 'badge-completed';
    case 'CANCELLED':   return 'badge-cancelled';
    default:            return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

export function getStatusLabel(status) {
  switch (status?.toUpperCase()) {
    case 'IN_PROGRESS': return 'In Progress';
    default: return status ? status.charAt(0) + status.slice(1).toLowerCase() : '—';
  }
}

// ── Priority badge class ──────────────────────────────────────────────────────
export function getPriorityBadgeClass(level) {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return 'badge-critical';
    case 'HIGH':     return 'badge-high';
    case 'MEDIUM':   return 'badge-medium';
    case 'LOW':      return 'badge-low';
    default:         return 'badge-low';
  }
}

// ── Crew status badge class ───────────────────────────────────────────────────
export function getCrewStatusBadgeClass(status) {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE': return 'badge-available';
    case 'BUSY':      return 'badge-busy';
    case 'OFFLINE':   return 'badge-offline';
    default:          return 'badge-offline';
  }
}

// ── Waste type label ──────────────────────────────────────────────────────────
export function wasteTypeLabel(type) {
  const map = {
    organic:      'Organic',
    plastic:      'Plastic',
    paper:        'Paper',
    glass:        'Glass',
    metal:        'Metal',
    'e-waste':    'E-Waste',
    construction: 'Construction',
    mixed:        'Mixed Waste',
    other:        'Other Waste',
  };
  return map[type] || type || '—';
}

// ── Format date ───────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Short request ID ──────────────────────────────────────────────────────────
export function shortId(id) {
  if (!id) return '—';
  return '#' + id.toString().slice(-6).toUpperCase();
}

// ── Priority marker color for Leaflet ────────────────────────────────────────
export function priorityMarkerColor(level) {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH':     return '#ea580c';
    case 'MEDIUM':   return '#d97706';
    case 'LOW':      return '#16a34a';
    default:         return '#64748b';
  }
}

// ── Priority border accent class ─────────────────────────────────────────────
export function priorityAccentClass(level) {
  switch (level?.toUpperCase()) {
    case 'CRITICAL': return 'border-l-4 border-l-rose-500 bg-rose-50/20';
    case 'HIGH':     return 'border-l-4 border-l-amber-500 bg-amber-50/20';
    case 'MEDIUM':   return 'border-l-4 border-l-yellow-400 bg-yellow-50/20';
    case 'LOW':      return 'border-l-4 border-l-emerald-500 bg-emerald-50/20';
    default:         return 'border-l-4 border-l-slate-300';
  }
}

// ── Haversine straight-line distance in km ──────────────────────────────────
export function calculateDistanceKm(loc1, loc2) {
  if (!loc1?.latitude || !loc1?.longitude || !loc2?.latitude || !loc2?.longitude) {
    return null;
  }
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) *
      Math.cos(toRad(loc2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 10 ? d.toFixed(1) : Math.round(d).toString();
}

// ── Crew Priority Sorting ───────────────────────────────────────────────────
export function sortCrewPickups(requests = []) {
  const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...requests].sort((a, b) => {
    // 1. IN_PROGRESS active task first
    if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
    if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;

    // 2. ASSIGNED before COMPLETED
    const aIsActive = a.status === 'ASSIGNED';
    const bIsActive = b.status === 'ASSIGNED';
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;

    // 3. Priority level
    const aRank = priorityOrder[a.priorityLevel?.toUpperCase()] || 0;
    const bRank = priorityOrder[b.priorityLevel?.toUpperCase()] || 0;
    if (bRank !== aRank) {
      return bRank - aRank;
    }

    // 4. Older requests first
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

// ── Format waiting time from creation date ──────────────────────────────────
export function formatWaitingTime(createdAt) {
  if (!createdAt) return '—';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  if (diffMs <= 0) return 'Just now';

  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return remHours > 0 ? `Waiting for ${days}d ${remHours}h` : `Waiting for ${days}d`;
  }
  if (hours > 0) {
    const remMins = mins % 60;
    return remMins > 0 ? `Waiting for ${hours}h ${remMins}m` : `Waiting for ${hours}h`;
  }
  return `Waiting for ${mins}m`;
}

// ── Workload level classifier & badge style ─────────────────────────────────
export function getWorkloadBadge(count = 0) {
  if (count <= 2) {
    return {
      level: 'LIGHT',
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (count <= 5) {
    return {
      level: 'MODERATE',
      colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return {
    level: 'HIGH',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
  };
}

// ── Phone number normalization & Contact Links ──────────────────────────────
export function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  let internationalDigits = digits;
  if (digits.length === 10) {
    internationalDigits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    internationalDigits = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    internationalDigits = digits;
  }

  return {
    internationalDigits,
    telUri: `tel:+${internationalDigits}`,
    getWhatsAppUrl: (messageText = '') => {
      const base = `https://wa.me/${internationalDigits}`;
      return messageText ? `${base}?text=${encodeURIComponent(messageText)}` : base;
    },
  };
}

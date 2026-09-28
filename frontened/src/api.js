const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  getAlerts: () => fetchJson('/alerts'),
  getNarratives: () => fetchJson('/narratives'),
  getNarrative: (id) => fetchJson(`/narratives/${id}`),
  getNarrativeTimeline: (id) => fetchJson(`/narratives/${id}/timeline`),
  getNarrativeNetwork: (id) => fetchJson(`/narratives/${id}/network`),
  getNarrativeCommunities: (id) => fetchJson(`/narratives/${id}/communities`),
  getNarrativeMutationJourney: (id) => fetchJson(`/narratives/${id}/mutation-journey`),
  getTrends: () => fetchJson('/trends'),
  askAi: (query) => fetchJson('/ask', { method: 'POST', body: JSON.stringify({ query }) }),
  getDemographics: (id) => fetchJson(`/demographics/${id}`),
  getHealth: () => fetchJson('/health').catch(() => ({ status: 'offline' })),
  ingestSeed: () => fetchJson('/ingest/seed', { method: 'POST' }),
  getSystemUsage: () => fetchJson('/system/usage'),
  ingestTelegramLive: () => fetchJson('/ingest/telegram/live', { method: 'POST' }),
  resetToSeed: () => fetchJson('/system/reset-to-seed', { method: 'POST' })
};

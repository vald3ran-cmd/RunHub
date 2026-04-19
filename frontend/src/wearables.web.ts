// Web stub — wearables not supported on web.
export function isWearablesAvailable(): boolean { return false; }
export async function connectWearable() { return { ok: false, platform: 'web' }; }
export async function fetchWearableStats() { return null; }

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storeSettingsApi } from '../services/api.js';

export const FALLBACK_SETTINGS = { store_name: 'Tierra Mate Shop', whatsapp_number: null, whatsapp_url: null, reservation_minutes: 30, currency: 'ARS', updated_at: null };
export const StoreSettingsContext = createContext(FALLBACK_SETTINGS);

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  useEffect(() => {
    let active = true;
    storeSettingsApi.get().then(({ data }) => { if (active) setSettings({ ...FALLBACK_SETTINGS, ...data }); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <StoreSettingsContext.Provider value={useMemo(() => settings, [settings])}>{children}</StoreSettingsContext.Provider>;
}
export function useStoreSettings() { return useContext(StoreSettingsContext); }

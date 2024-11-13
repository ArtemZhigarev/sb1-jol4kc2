import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  airtableToken: string;
  airtableBase: string;
  airtableTable: string;
  isConfigured: boolean;
  setAirtableConfig: (token: string, base: string, table: string) => void;
  clearConfig: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      airtableToken: '',
      airtableBase: '',
      airtableTable: '',
      isConfigured: false,
      setAirtableConfig: (token, base, table) =>
        set({ airtableToken: token, airtableBase: base, airtableTable: table, isConfigured: true }),
      clearConfig: () =>
        set({ airtableToken: '', airtableBase: '', airtableTable: '', isConfigured: false }),
    }),
    {
      name: 'taskflow-settings',
    }
  )
);
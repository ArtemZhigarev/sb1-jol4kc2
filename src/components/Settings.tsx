import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, RefreshCw, Database, Table } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { fetchBases, fetchTables } from '../services/airtable';
import toast from 'react-hot-toast';

interface SettingsProps {
  onClose: () => void;
}

interface Base {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { airtableToken, airtableBase, airtableTable, setAirtableConfig } = useSettingsStore();
  const [token, setToken] = useState(airtableToken);
  const [selectedBase, setSelectedBase] = useState(airtableBase);
  const [selectedTable, setSelectedTable] = useState(airtableTable);
  const [bases, setBases] = useState<Base[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBases, setLoadingBases] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    if (token) {
      loadBases();
    }
  }, [token]);

  useEffect(() => {
    if (selectedBase) {
      loadTables();
    } else {
      setTables([]);
      setSelectedTable('');
    }
  }, [selectedBase]);

  const loadBases = async () => {
    setLoadingBases(true);
    try {
      const basesList = await fetchBases(token);
      setBases(basesList);
      if (!selectedBase && basesList.length > 0) {
        setSelectedBase(basesList[0].id);
      }
    } catch (error) {
      toast.error('Failed to load bases. Please check your API token.');
      setBases([]);
    } finally {
      setLoadingBases(false);
    }
  };

  const loadTables = async () => {
    if (!selectedBase) return;
    
    setLoadingTables(true);
    try {
      const tablesList = await fetchTables(token, selectedBase);
      setTables(tablesList);
      if (!selectedTable && tablesList.length > 0) {
        setSelectedTable(tablesList[0].id);
      }
    } catch (error) {
      toast.error('Failed to load tables.');
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetchTables(token, selectedBase); // Verify connection
      setAirtableConfig(token, selectedBase, selectedTable);
      toast.success('Settings saved successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to verify connection. Please check your settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Airtable API Token
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your Airtable API token"
                />
                {loadingBases && (
                  <RefreshCw className="w-5 h-5 absolute right-3 top-2.5 animate-spin text-gray-400" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Base
              </label>
              <div className="relative">
                <select
                  value={selectedBase}
                  onChange={(e) => setSelectedBase(e.target.value)}
                  disabled={!token || loadingBases}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a base</option>
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))}
                </select>
                <Database className="w-5 h-5 absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Table
              </label>
              <div className="relative">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  disabled={!selectedBase || loadingTables}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a table</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
                <Table className="w-5 h-5 absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleSave}
                disabled={loading || !token || !selectedBase || !selectedTable}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
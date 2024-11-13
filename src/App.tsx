import React, { useState, useEffect } from 'react';
import { TaskList } from './components/TaskList';
import { TaskDetail } from './components/TaskDetail';
import { Settings } from './components/Settings';
import { AddTaskForm } from './components/AddTaskForm';
import { LoadingBar } from './components/LoadingBar';
import { useTaskStore } from './store/taskStore';
import { useSettingsStore } from './store/settingsStore';
import { Plus, Settings as SettingsIcon, Wifi, WifiOff, RefreshCw, Sprout } from 'lucide-react';
import { loadTasks } from './services/airtable';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const { selectedTaskId, tasks, setTasks, appendTasks, syncPendingChanges, getCachedTasks } = useTaskStore();
  const { isConfigured } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(!isConfigured);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState<string>();
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [filterType, setFilterType] = useState<'upcoming' | 'all' | 'today'>('today');

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await syncPendingChanges();
        setCurrentOffset(undefined);
        setHasMore(true);
        await loadMoreTasks();
      } finally {
        setIsSyncing(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingChanges]);

  const loadMoreTasks = async () => {
    if (!isConfigured || isLoading || !hasMore) return;

    setIsLoading(true);
    setLoadError(undefined);
    try {
      if (!navigator.onLine) {
        const cachedTasks = getCachedTasks(filterType);
        if (cachedTasks) {
          setTasks(cachedTasks, filterType);
          setHasMore(false);
          return;
        }
        throw new Error('You are offline. No cached data available.');
      }

      const result = await loadTasks({ offset: currentOffset, filterType });
      if (currentOffset) {
        appendTasks(result.tasks);
      } else {
        setTasks(result.tasks, filterType);
      }
      setCurrentOffset(result.offset);
      setHasMore(result.hasMore);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      setCurrentOffset(undefined);
      setHasMore(true);
      loadMoreTasks();
    }
  }, [isConfigured, filterType]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100 &&
        !isLoading &&
        hasMore &&
        isOnline
      ) {
        loadMoreTasks();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore, currentOffset, isOnline]);

  return (
    <div className="min-h-screen bg-gray-100">
      <LoadingBar isVisible={isLoading} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sprout className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Garden Tasks</h1>
            </div>
            {isLoading ? (
              <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
            ) : isOnline ? (
              <div className="flex items-center gap-1">
                <Wifi className="w-5 h-5 text-green-500" />
                {isSyncing && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
              title="Settings"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowAddTask(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {!isConfigured && !showSettings && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please configure your Airtable connection in settings to sync your gardening tasks.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  You're currently offline. Using cached data and changes will be synced when you're back online.
                </p>
              </div>
            </div>
          </div>
        )}

        {loadError && loadError !== 'You are offline. Using cached tasks.' && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {loadError}
                </p>
              </div>
            </div>
          </div>
        )}

        <TaskList filterType={filterType} onFilterChange={setFilterType} />
        {selectedTaskId && <TaskDetail />}
        {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        {showAddTask && <AddTaskForm onClose={() => setShowAddTask(false)} />}
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}
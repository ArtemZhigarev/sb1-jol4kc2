import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, TaskStatus, DelayOption } from '../types/task';
import { addDays } from 'date-fns';
import { createTask, syncTask, deleteTask } from '../services/airtable';
import toast from 'react-hot-toast';

interface PendingChange {
  taskId: string;
  type: 'update' | 'delete';
  data?: Partial<Task>;
  timestamp: number;
}

interface TaskCache {
  tasks: Task[];
  timestamp: number;
  filterType: 'upcoming' | 'all' | 'active' | 'today';
}

interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  pendingChanges: PendingChange[];
  cache: Record<string, TaskCache>;
  setTasks: (tasks: Task[], filterType: string) => void;
  appendTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  delayTask: (id: string, days: DelayOption) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedTaskId: (id: string | null) => void;
  syncPendingChanges: () => Promise<void>;
  getCachedTasks: (filterType: string) => Task[] | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      selectedTaskId: null,
      pendingChanges: [],
      cache: {},
      setTasks: (tasks, filterType) => set(state => ({
        tasks,
        cache: {
          ...state.cache,
          [filterType]: {
            tasks,
            timestamp: Date.now(),
            filterType
          }
        }
      })),
      appendTasks: (newTasks) => set(state => ({
        tasks: [...state.tasks, ...newTasks]
      })),
      getCachedTasks: (filterType: string) => {
        const state = get();
        const cached = state.cache[filterType];
        if (!cached) return null;
        
        const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
        if (isExpired) return null;
        
        return cached.tasks;
      },
      addTask: async (taskData) => {
        try {
          const id = await createTask(taskData);
          if (!id) throw new Error('Failed to create task');

          const task = { ...taskData, id };
          set(state => ({
            tasks: [...state.tasks, task]
          }));
          toast.success('Task created successfully');
        } catch (error) {
          if (!navigator.onLine) {
            const tempId = `temp-${Date.now()}`;
            const task = { ...taskData, id: tempId };
            set(state => ({
              tasks: [...state.tasks, task],
              pendingChanges: [...state.pendingChanges, {
                taskId: tempId,
                type: 'update',
                data: taskData,
                timestamp: Date.now()
              }]
            }));
            toast.success('Task saved offline. Will sync when online.');
          } else {
            toast.error('Failed to create task');
            throw error;
          }
        }
      },
      updateTask: async (id, updates) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;

          const updatedTask = { ...task, ...updates };
          
          if (navigator.onLine) {
            await syncTask(updatedTask);
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
            }));
            toast.success('Task updated successfully');
          } else {
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
              pendingChanges: [...state.pendingChanges, {
                taskId: id,
                type: 'update',
                data: updates,
                timestamp: Date.now()
              }]
            }));
            toast.success('Task updated offline. Will sync when online.');
          }
        } catch (error) {
          toast.error('Failed to update task');
          throw error;
        }
      },
      updateTaskStatus: async (id, status) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;

          if (status === 'Done' && task.isRepeating && task.repeatEveryDays) {
            const newDueDate = addDays(new Date(), task.repeatEveryDays);
            const updatedTask = { ...task, dueDate: newDueDate, status: 'To do' };
            
            if (navigator.onLine) {
              await syncTask(updatedTask);
              set(state => ({
                tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
              }));
              toast.success('Task completed and rescheduled');
            } else {
              set(state => ({
                tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
                pendingChanges: [...state.pendingChanges, {
                  taskId: id,
                  type: 'update',
                  data: { dueDate: newDueDate, status: 'To do' },
                  timestamp: Date.now()
                }]
              }));
              toast.success('Task updated offline. Will sync when online.');
            }
            return;
          }

          const updates = {
            status,
            ...(status === 'Done' ? { completedDate: new Date() } : {})
          };

          const updatedTask = { ...task, ...updates };
          
          if (navigator.onLine) {
            await syncTask(updatedTask);
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
            }));
            toast.success(`Task marked as ${status}`);
          } else {
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
              pendingChanges: [...state.pendingChanges, {
                taskId: id,
                type: 'update',
                data: updates,
                timestamp: Date.now()
              }]
            }));
            toast.success(`Task marked as ${status} offline. Will sync when online.`);
          }
        } catch (error) {
          toast.error('Failed to update task status');
          throw error;
        }
      },
      delayTask: async (id, days) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          if (!task) return;

          const newDueDate = addDays(task.dueDate, days);
          const updatedTask = { ...task, dueDate: newDueDate };
          
          if (navigator.onLine) {
            await syncTask(updatedTask);
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t)
            }));
            toast.success(`Task delayed by ${days} day${days > 1 ? 's' : ''}`);
          } else {
            set(state => ({
              tasks: state.tasks.map(t => t.id === id ? updatedTask : t),
              pendingChanges: [...state.pendingChanges, {
                taskId: id,
                type: 'update',
                data: { dueDate: newDueDate },
                timestamp: Date.now()
              }]
            }));
            toast.success(`Task delayed offline. Will sync when online.`);
          }
        } catch (error) {
          toast.error('Failed to delay task');
          throw error;
        }
      },
      deleteTask: async (id) => {
        try {
          if (navigator.onLine) {
            await deleteTask(id);
            set(state => ({
              tasks: state.tasks.filter(t => t.id !== id),
              selectedTaskId: null
            }));
            toast.success('Task deleted successfully');
          } else {
            set(state => ({
              tasks: state.tasks.filter(t => t.id !== id),
              selectedTaskId: null,
              pendingChanges: [...state.pendingChanges, {
                taskId: id,
                type: 'delete',
                timestamp: Date.now()
              }]
            }));
            toast.success('Task deleted offline. Will sync when online.');
          }
        } catch (error) {
          toast.error('Failed to delete task');
          throw error;
        }
      },
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      syncPendingChanges: async () => {
        const state = get();
        if (state.pendingChanges.length === 0) return;

        const changes = [...state.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
        const failedChanges: PendingChange[] = [];

        for (const change of changes) {
          try {
            if (change.type === 'update') {
              const task = state.tasks.find(t => t.id === change.taskId);
              if (task) {
                await syncTask({ ...task, ...change.data });
              }
            } else if (change.type === 'delete') {
              await deleteTask(change.taskId);
            }
          } catch (error) {
            console.error('Failed to sync change:', error);
            failedChanges.push(change);
          }
        }

        set({ pendingChanges: failedChanges });
        
        if (failedChanges.length === 0) {
          toast.success('All changes synced successfully');
        } else {
          toast.error(`Failed to sync ${failedChanges.length} changes`);
        }
      }
    }),
    {
      name: 'task-storage',
      partialize: (state) => ({
        tasks: state.tasks.map(task => ({
          ...task,
          dueDate: task.dueDate.toISOString(),
          completedDate: task.completedDate?.toISOString(),
        })),
        pendingChanges: state.pendingChanges,
        cache: Object.fromEntries(
          Object.entries(state.cache).map(([key, value]) => [
            key,
            {
              ...value,
              tasks: value.tasks.map(task => ({
                ...task,
                dueDate: task.dueDate.toISOString(),
                completedDate: task.completedDate?.toISOString(),
              }))
            }
          ])
        )
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tasks = state.tasks.map(task => ({
            ...task,
            dueDate: new Date(task.dueDate),
            completedDate: task.completedDate ? new Date(task.completedDate) : undefined,
          }));
          
          state.cache = Object.fromEntries(
            Object.entries(state.cache).map(([key, value]) => [
              key,
              {
                ...value,
                tasks: value.tasks.map(task => ({
                  ...task,
                  dueDate: new Date(task.dueDate),
                  completedDate: task.completedDate ? new Date(task.completedDate) : undefined,
                }))
              }
            ])
          );
        }
      },
    }
  )
);
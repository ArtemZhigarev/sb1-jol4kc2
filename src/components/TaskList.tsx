import React, { useState } from 'react';
import { format, isValid } from 'date-fns';
import { Clock, ArrowRight, CheckCircle, PlayCircle, AlertTriangle, Flame } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useEmployeeStore } from '../store/employeeStore';
import { DelayOption, TaskStatus } from '../types/task';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'upcoming' | 'all' | 'today';

interface TaskListProps {
  filterType: FilterType;
  onFilterChange: (type: FilterType) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ filterType, onFilterChange }) => {
  const { tasks, delayTask, setSelectedTaskId, updateTaskStatus } = useTaskStore();
  const { employees } = useEmployeeStore();
  const [openDelayId, setOpenDelayId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const delayOptions: { days: DelayOption; label: string }[] = [
    { days: 1, label: 'Tomorrow' },
    { days: 2, label: '2 Days' },
    { days: 7, label: '1 Week' },
    { days: 14, label: '2 Weeks' },
  ];

  const formatDate = (date: Date) => {
    if (!isValid(date)) {
      return 'No date set';
    }
    return format(date, 'MMM d, yyyy');
  };

  const handleStatusChange = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'To do' ? 'In progress' : 'Done';
    updateTaskStatus(taskId, newStatus);
  };

  const handleDelayClick = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDelayId(openDelayId === taskId ? null : taskId);
  };

  const handleDelayOptionClick = async (taskId: string, days: DelayOption, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await delayTask(taskId, days);
      setOpenDelayId(null);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.delay-button') && !target.closest('.delay-options')) {
        setOpenDelayId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onFilterChange('upcoming')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            filterType === 'upcoming'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Next 7 Days
        </button>
        <button
          onClick={() => onFilterChange('today')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            filterType === 'today'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Today ±1 Day
        </button>
        <button
          onClick={() => onFilterChange('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
            filterType === 'all'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          All Tasks
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const assignee = employees.find(emp => emp.id === task.assigneeId);
            const isUrgent = task.importance === 'urgent';

            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={() => setSelectedTaskId(task.id)}
                className={`relative bg-white rounded-lg shadow-md overflow-visible cursor-pointer`}
              >
                <div
                  className={`absolute inset-0 rounded-lg ${
                    isUrgent ? 'border-4 border-orange-500 animate-urgent-pulse' : ''
                  } ${task.id.startsWith('temp-') ? 'border-2 border-yellow-400' : ''}`}
                />
                {isUrgent && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-orange-500 text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    Urgent
                  </div>
                )}
                <div className="relative p-4">
                  <div className="flex items-start gap-4">
                    {task.images[0] && !failedImages.has(task.images[0]) && (
                      <img
                        src={task.images[0]}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg"
                        onError={() => setFailedImages(prev => new Set(prev).add(task.images[0]))}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                          {task.title}
                        </h3>
                        {isUrgent && (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                        {assignee && (
                          <div className="flex items-center gap-2">
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm text-gray-600">{assignee.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'In progress'
                              ? 'bg-blue-100 text-blue-800'
                              : task.status === 'Done'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {task.status}
                        </span>
                        {task.isRepeating && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Repeating
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="relative">
                      <button
                        className="delay-button inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        onClick={(e) => handleDelayClick(task.id, e)}
                      >
                        Delay
                        <ArrowRight 
                          className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                            openDelayId === task.id ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {openDelayId === task.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="delay-options absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-xl z-50 py-1 border border-gray-200"
                          >
                            {delayOptions.map((option) => (
                              <button
                                key={option.days}
                                onClick={(e) => handleDelayOptionClick(task.id, option.days, e)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                {option.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id);
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {task.status === 'To do' ? (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
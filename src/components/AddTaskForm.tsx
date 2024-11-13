import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Calendar, AlignLeft, RefreshCw } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { ImageUpload } from './ImageUpload';
import toast from 'react-hot-toast';

interface AddTaskFormProps {
  onClose: () => void;
}

export const AddTaskForm: React.FC<AddTaskFormProps> = ({ onClose }) => {
  const { addTask } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [toDoDate, setToDoDate] = useState(new Date().toISOString().split('T')[0]);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatEveryDays, setRepeatEveryDays] = useState(1);

  // Prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(toDoDate),
        status: 'To do',
        priority: 'medium',
        images,
        assigneeId: null,
        isRepeating,
        repeatEveryDays: isRepeating ? repeatEveryDays : undefined,
      });
      onClose();
    } catch (error) {
      // Error handling is done in the store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center overflow-y-auto"
    >
      <div className="min-h-screen py-8 px-4 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-lg pointer-events-auto"
        >
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">New Task</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task description"
                />
              </div>

              <div>
                <label htmlFor="toDoDate" className="block text-sm font-medium text-gray-700 mb-1">
                  To Do Date
                </label>
                <input
                  type="date"
                  id="toDoDate"
                  value={toDoDate}
                  onChange={(e) => setToDoDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRepeating"
                    checked={isRepeating}
                    onChange={(e) => setIsRepeating(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRepeating" className="ml-2 block text-sm text-gray-900">
                    Repeating Task
                  </label>
                </div>

                {isRepeating && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="repeatEveryDays" className="text-sm text-gray-700">
                      Repeat every
                    </label>
                    <input
                      type="number"
                      id="repeatEveryDays"
                      value={repeatEveryDays}
                      onChange={(e) => setRepeatEveryDays(Math.max(1, parseInt(e.target.value)))}
                      min="1"
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-700">days</span>
                  </div>
                )}
              </div>

              <ImageUpload
                images={images}
                onImagesChange={setImages}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};
import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Clock, CheckCircle, Edit2, Save, User, Image as ImageIcon, RefreshCw, Trash2, Flame, AlertTriangle } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useEmployeeStore } from '../store/employeeStore';
import { motion } from 'framer-motion';
import { Task, TaskStatus } from '../types/task';
import { ImageUpload } from './ImageUpload';
import { ImageViewer } from './ImageViewer';
import toast from 'react-hot-toast';

export const TaskDetail: React.FC = () => {
  const { tasks, selectedTaskId, setSelectedTaskId, updateTask, updateTaskStatus, deleteTask } = useTaskStore();
  const { employees } = useEmployeeStore();
  const task = tasks.find((t) => t.id === selectedTaskId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task> | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  if (!task) return null;

  const assignee = employees.find(emp => emp.id === task.assigneeId);
  const currentTask = editedTask || task;

  const handleEdit = () => {
    setEditedTask(task);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedTask && selectedTaskId) {
      try {
        await updateTask(selectedTaskId, editedTask);
        setIsEditing(false);
        setEditedTask(null);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedTaskId || !window.confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    try {
      await deleteTask(selectedTaskId);
    } catch (error) {
      // Error handling is done in the store
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    if (selectedTaskId) {
      try {
        await updateTaskStatus(selectedTaskId, 'Done');
        setSelectedTaskId(null);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTask(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedTask((prev) => {
      if (!prev) return null;
      if (name === 'dueDate') {
        return {
          ...prev,
          [name]: new Date(value),
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const toggleUrgency = () => {
    setEditedTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        importance: prev.importance === 'urgent' ? 'normal' : 'urgent'
      };
    });
  };

  const handleImagesChange = (images: string[]) => {
    setEditedTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        images,
      };
    });
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseImageViewer = () => {
    setSelectedImageIndex(null);
  };

  const handleNextImage = () => {
    if (selectedImageIndex === null || !currentTask.images) return;
    setSelectedImageIndex((selectedImageIndex + 1) % currentTask.images.length);
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex === null || !currentTask.images) return;
    setSelectedImageIndex((selectedImageIndex - 1 + currentTask.images.length) % currentTask.images.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
    >
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          {isEditing ? (
            <input
              type="text"
              name="title"
              value={currentTask.title}
              onChange={handleInputChange}
              className="text-2xl font-bold bg-gray-50 border border-gray-300 rounded px-2 py-1 w-full"
            />
          ) : (
            <h2 className="text-2xl font-bold">{currentTask.title}</h2>
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 hover:bg-red-100 rounded-full text-red-600 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Trash2 className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-100 rounded-full text-green-600"
                >
                  <Save className="w-6 h-6" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {currentTask.images.map((image, index) => (
              <div
                key={index}
                className="relative cursor-pointer group"
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={image}
                  alt=""
                  className="w-full h-48 object-cover rounded-lg"
                  onError={() => setFailedImages(prev => new Set(prev).add(image))}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg" />
              </div>
            ))}
          </div>

          {selectedImageIndex !== null && (
            <ImageViewer
              images={currentTask.images}
              currentIndex={selectedImageIndex}
              onClose={handleCloseImageViewer}
              onNext={handleNextImage}
              onPrevious={handlePreviousImage}
            />
          )}

          {isEditing && (
            <ImageUpload
              images={currentTask.images}
              onImagesChange={handleImagesChange}
              disabled={false}
            />
          )}

          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={format(currentTask.dueDate, 'yyyy-MM-dd')}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    value={currentTask.status}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="To do">To do</option>
                    <option value="In progress">In progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Importance
                  </label>
                  <button
                    onClick={toggleUrgency}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                      currentTask.importance === 'urgent'
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {currentTask.importance === 'urgent' ? (
                      <>
                        <Flame className="w-5 h-5" />
                        Urgent
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        Normal
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={currentTask.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isRepeating"
                      checked={currentTask.isRepeating}
                      onChange={(e) => setEditedTask(prev => ({
                        ...prev!,
                        isRepeating: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Repeating Task
                    </label>
                  </div>
                  {currentTask.isRepeating && (
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-sm text-gray-700">
                        Repeat every
                      </label>
                      <input
                        type="number"
                        name="repeatEveryDays"
                        value={currentTask.repeatEveryDays || 1}
                        onChange={(e) => setEditedTask(prev => ({
                          ...prev!,
                          repeatEveryDays: Math.max(1, parseInt(e.target.value))
                        }))}
                        min="1"
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                      />
                      <span className="text-sm text-gray-700">days</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">
                      Due {format(currentTask.dueDate, 'MMMM d, yyyy')}
                    </span>
                  </div>
                  {assignee && (
                    <div className="flex items-center gap-2">
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-gray-600">{assignee.name}</span>
                    </div>
                  )}
                </div>
                {currentTask.importance === 'urgent' && (
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                    <Flame className="w-5 h-5" />
                    <span className="font-medium">Urgent Task</span>
                  </div>
                )}
                <p className="text-gray-600 leading-relaxed">
                  {currentTask.description}
                </p>
                {currentTask.isRepeating && (
                  <div className="text-sm text-gray-600">
                    Repeats every {currentTask.repeatEveryDays} day{currentTask.repeatEveryDays !== 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}

            {!isEditing && task.status !== 'Done' && (
              <button
                onClick={handleComplete}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
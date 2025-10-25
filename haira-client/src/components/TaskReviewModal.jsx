import { useState } from 'react';
import '../styles/TaskReviewModal.css';

function TaskReviewModal({ tasks, teammates, onSave, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedTasks, setEditedTasks] = useState(tasks.map(task => ({
    ...task,
    // Store assignee as teammate.id (not name) for consistency with backend
    assignedTo: task.assignedTo || (teammates.length > 0 ? (teammates[0].id || teammates[0].name) : '')
  })));
  const [error, setError] = useState('');

  const currentTask = editedTasks[currentIndex];

  const handleTaskChange = (field, value) => {
    const updated = [...editedTasks];
    updated[currentIndex] = { ...updated[currentIndex], [field]: value };
    setEditedTasks(updated);
    if (field === 'assignedTo' && value) setError('');
  };

  const handleNext = () => {
    // Validation: require an assignee
    if (!editedTasks[currentIndex].assignedTo) {
      setError('Please choose who this task is assigned to.');
      return;
    }
    if (currentIndex < editedTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSaveAll = () => {
    // Ensure all tasks have an assignee before saving
    const invalid = editedTasks.find(t => !t.assignedTo);
    if (invalid) {
      setError('All tasks must have an assignee before saving.');
      return;
    }
    onSave(editedTasks);
  };

  return (
    <div className="task-review-modal-overlay">
      <div className="task-review-modal">
        <div className="modal-header">
          <h2>Review & Edit Tasks</h2>
          <p className="task-counter">
            Task {currentIndex + 1} of {editedTasks.length}
          </p>
        </div>

        <div className="modal-body">
          <div className="task-form">
            <div className="form-group">
              <label>Task Description</label>
              <textarea
                value={currentTask.deliverable || currentTask.description}
                onChange={(e) => handleTaskChange('deliverable', e.target.value)}
                placeholder="Enter task description..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Assign To</label>
              <select
                value={currentTask.assignedTo}
                onChange={(e) => handleTaskChange('assignedTo', e.target.value)}
              >
                {teammates.map((teammate) => (
                  <option key={teammate.id || teammate.name} value={teammate.id || teammate.name}>
                    {teammate.type === 'human' ? '👤' : '🤖'} {teammate.name} - {teammate.role}
                  </option>
                ))}
              </select>
              {error && (
                <p className="error-text" style={{ color: '#B00020', marginTop: '6px' }}>
                  {error}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={currentTask.priority || 1}
                onChange={(e) => handleTaskChange('priority', parseInt(e.target.value))}
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
                <option value={4}>Critical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="navigation-buttons">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="btn-nav"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === editedTasks.length - 1}
              className="btn-nav"
            >
              Next →
            </button>
          </div>

          <div className="action-buttons">
            <button onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleSaveAll} className="btn-save">
              Save All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskReviewModal;

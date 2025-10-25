import { useState } from 'react';
import '../styles/TaskReviewModal.css';

function TaskReviewModal({ tasks, teammates, onSave, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedTasks, setEditedTasks] = useState(tasks.map(task => ({
    ...task,
    assignedTo: task.assignedTo || (teammates.length > 0 ? teammates[0].name : 'Unassigned')
  })));

  const currentTask = editedTasks[currentIndex];

  const handleTaskChange = (field, value) => {
    const updated = [...editedTasks];
    updated[currentIndex] = { ...updated[currentIndex], [field]: value };
    setEditedTasks(updated);
  };

  const handleNext = () => {
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
                  <option key={teammate.id || teammate.name} value={teammate.name}>
                    {teammate.type === 'human' ? '👤' : '🤖'} {teammate.name} - {teammate.role}
                  </option>
                ))}
              </select>
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

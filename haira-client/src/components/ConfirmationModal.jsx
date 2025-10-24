import React from 'react';
import '../styles/ConfirmationModal.css';

export default function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'OK', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  type = 'warning' // 'warning', 'danger', 'info'
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirmation-modal-backdrop" onClick={handleBackdropClick}>
      <div className={`confirmation-modal ${type}`}>
        <div className="confirmation-modal-header">
          <h3 className="confirmation-modal-title">{title}</h3>
          <button 
            className="confirmation-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="confirmation-modal-body">
          <p className="confirmation-modal-message">{message}</p>
        </div>
        
        <div className="confirmation-modal-footer">
          <button 
            className="confirmation-modal-btn confirmation-modal-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`confirmation-modal-btn confirmation-modal-btn-confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

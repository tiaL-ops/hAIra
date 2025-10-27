import React, { useState, useEffect } from 'react';
import '../styles/ReflectionModal.css';

function ReflectionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  aiFeedback, 
  aiGrades, 
  projectTitle,
  isLoading = false 
}) {
  const [reflectionData, setReflectionData] = useState({
    agreeWithFeedback: '',
    differentApproach: '',
    keyLearnings: '',
    futureImprovements: ''
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});

  const reflectionSteps = [
    {
      id: 'agreeWithFeedback',
      title: 'Do you agree with the AI feedback?',
      subtitle: 'Share your thoughts on the feedback you received',
      placeholder: 'I agree/disagree with the feedback because...',
      required: true
    },
    {
      id: 'differentApproach',
      title: 'What would you do differently?',
      subtitle: 'Which AI suggestions would you implement differently?',
      placeholder: 'I would approach this differently by...',
      required: true
    },
    {
      id: 'keyLearnings',
      title: 'What did you learn?',
      subtitle: 'Reflect on your key takeaways from this project',
      placeholder: 'The most important thing I learned was...',
      required: true
    },
    {
      id: 'futureImprovements',
      title: 'How would you improve next time?',
      subtitle: 'What would you do differently in future projects?',
      placeholder: 'Next time, I would focus on...',
      required: true
    }
  ];

  const currentStepData = reflectionSteps[currentStep];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setReflectionData({
        agreeWithFeedback: '',
        differentApproach: '',
        keyLearnings: '',
        futureImprovements: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (value) => {
    setReflectionData(prev => ({
      ...prev,
      [currentStepData.id]: value
    }));
    
    // Clear error for current field
    if (errors[currentStepData.id]) {
      setErrors(prev => ({
        ...prev,
        [currentStepData.id]: ''
      }));
    }
  };

  const validateCurrentStep = () => {
    const value = reflectionData[currentStepData.id].trim();
    if (!value && currentStepData.required) {
      setErrors(prev => ({
        ...prev,
        [currentStepData.id]: 'This field is required'
      }));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < reflectionSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Final validation
    const hasErrors = reflectionSteps.some(step => {
      if (step.required && !reflectionData[step.id].trim()) {
        setErrors(prev => ({
          ...prev,
          [step.id]: 'This field is required'
        }));
        return true;
      }
      return false;
    });

    if (!hasErrors) {
      onSubmit(reflectionData);
    }
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / reflectionSteps.length) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="reflection-modal-overlay">
      <div className="reflection-modal">
        {/* Header */}
        <div className="reflection-header">
          <div className="header-left">
            <div className="reflection-icon">🤔</div>
            <div className="header-content">
              <h2>Project Reflection</h2>
              <p>Share your thoughts on the AI feedback and your learning experience</p>
            </div>
          </div>
          <div className="progress-indicator">
            <span className="step-counter">{currentStep + 1} of {reflectionSteps.length}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="reflection-content">
          <div className="step-header">
            <h3>{currentStepData.title}</h3>
            <p>{currentStepData.subtitle}</p>
          </div>

          {/* Context Panel - Show relevant AI feedback */}
          {currentStep === 0 && aiFeedback && (
            <div className="context-panel">
              <div className="context-header">
                <span className="context-icon">💬</span>
                <span>AI Feedback Summary</span>
              </div>
              <div className="context-content">
                <p>{aiFeedback}</p>
              </div>
            </div>
          )}

          {currentStep === 1 && aiGrades && (
            <div className="context-panel">
              <div className="context-header">
                <span className="context-icon">📊</span>
                <span>Your Performance Scores</span>
              </div>
              <div className="context-content">
                <div className="scores-grid">
                  <div className="score-item">
                    <span className="score-label">Work Contribution</span>
                    <span className="score-value">{aiGrades.workPercentage?.score || 0}%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Responsiveness</span>
                    <span className="score-value">{aiGrades.responsiveness?.score || 0}%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Report Quality</span>
                    <span className="score-value">{aiGrades.reportQuality?.score || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="input-section">
            <textarea
              value={reflectionData[currentStepData.id]}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentStepData.placeholder}
              className={`reflection-textarea ${errors[currentStepData.id] ? 'error' : ''}`}
              rows={6}
              maxLength={1000}
            />
            <div className="input-footer">
              <span className="char-count">
                {reflectionData[currentStepData.id].length}/1000 characters
              </span>
              {errors[currentStepData.id] && (
                <span className="error-message">{errors[currentStepData.id]}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="reflection-footer">
          <div className="step-navigation">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="nav-btn prev-btn"
            >
              ← Previous
            </button>
            <div className="step-dots">
              {reflectionSteps.map((_, index) => (
                <div
                  key={index}
                  className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="nav-btn next-btn"
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Submitting...
                </>
              ) : currentStep === reflectionSteps.length - 1 ? (
                'Submit Reflection'
              ) : (
                'Next →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReflectionModal;

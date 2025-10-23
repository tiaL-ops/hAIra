import React, { useState, useEffect } from 'react';
import { checkChromeAIAvailability } from '../utils/chromeAPI';

export default function ChromeAIStatus() {
  const [status, setStatus] = useState({
    proofreader: 'checking',
    summarizer: 'checking',
    loading: true
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const availability = await checkChromeAIAvailability();
        setStatus({
          proofreader: availability.proofreaderStatus,
          summarizer: availability.summarizerStatus,
          loading: false
        });
      } catch (error) {
        setStatus({
          proofreader: 'unavailable',
          summarizer: 'unavailable',
          loading: false
        });
      }
    };

    checkStatus();
  }, []);

  if (status.loading) {
    return (
      <div className="chrome-ai-status loading">
        <div className="status-icon">⏳</div>
        <span>Checking Chrome AI...</span>
      </div>
    );
  }

  const allAvailable = status.proofreader === 'available' && status.summarizer === 'available';
  const partialAvailable = status.proofreader === 'available' || status.summarizer === 'available';

  return (
    <div className={`chrome-ai-status ${allAvailable ? 'success' : partialAvailable ? 'partial' : 'unavailable'}`}>
      <div className="status-icon">
        {allAvailable ? '✅' : partialAvailable ? '⚠️' : '❌'}
      </div>
      <div className="status-content">
        <span className="status-text">
          Chrome AI: {allAvailable ? 'Ready' : partialAvailable ? 'Partial' : 'Using Gemini'}
        </span>
        <div className="status-details">
          <span className={`feature ${status.proofreader === 'available' ? 'available' : 'unavailable'}`}>
            Proofreader {status.proofreader === 'available' ? '✓' : '🔄'}
          </span>
          <span className={`feature ${status.summarizer === 'available' ? 'available' : 'unavailable'}`}>
            Summarizer {status.summarizer === 'available' ? '✓' : '🔄'}
          </span>
        </div>
      </div>
    </div>
  );
}

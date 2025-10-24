// Chrome's built-in AI APIs with Gemini server-side fallback
// Using the official Chrome Proofreader API and Summarizer API

/**
 * Check if Chrome's built-in AI APIs are available
 */
export async function checkChromeAIAvailability() {
  const availability = {
    proofreader: false,
    summarizer: false,
    proofreaderStatus: 'unavailable',
    summarizerStatus: 'unavailable',
    error: null
  };

  try {
    // Check if APIs exist
    if (typeof window.Proofreader === 'undefined' && typeof window.Summarizer === 'undefined') {
      return availability;
    }

    // Check Proofreader API availability
    if (typeof window.Proofreader !== 'undefined') {
      const proofreaderAvailable = await window.Proofreader.availability();
      availability.proofreader = proofreaderAvailable === 'available';
      availability.proofreaderStatus = proofreaderAvailable;
    }

    // Check Summarizer API availability  
    if (typeof window.Summarizer !== 'undefined') {
      const summarizerAvailable = await window.Summarizer.availability();
      availability.summarizer = summarizerAvailable === 'available';
      availability.summarizerStatus = summarizerAvailable;
    }

     // Check Writer API availability  
     if (typeof window.Writer !== 'undefined') {
        const writerAvailable = await window.Writer.availability();
        availability.Writer = writerAvailable === 'available';
        availability.writerStatus = writerAvailable;
      }
  } catch (error) {
    availability.error = error.message;
  }

  return availability;
}


/**
 * Use Chrome's built-in Writer API with Gemini fallback
 */
export async function getChromeWriter(text, options, fallbackCallback) {
    try {
        // Check if Proofreader API is available
        if (typeof window.Writer === 'undefined') {
        throw new Error('Chrome Writer API not available');
        }

        const availability = await window.Writer.availability();
        
        if (availability === 'downloadable') {
        // Model needs to be downloaded - use fallback
        console.log('Chrome AI model downloading, using Gemini fallback...');
        return await fallbackCallback();
        }

        if (availability !== 'available') {
        throw new Error('Writer API not available');
        }
        // Create writer with options
        const writerOptions = {
            tone: options.tone || 'formal',
            format: 'markdown',
            length: options.length || 'medium',
            expectedInputLanguages: ['en'],
            expectedContextLanguages: ['en'],
            outputLanguage: 'en',
            sharedContext: options.context || 'You are Alex, the AI Project Manager for report writing. You are analytical, organized, calm, and professional. You focus on planning, tracking, and summarizing report sections.'
        };

        let writer;
        if (availability === 'available') {
            // Writer API can be used immediately
            writer = await window.Writer.create(writerOptions);
        } else {
            // Writer can be used after model download
            writer = await window.Writer.create({
            ...writerOptions,
            monitor(m) {
                m.addEventListener("downloadprogress", e => {
                console.log(`Model download progress: ${e.loaded * 100}%`);
                });
            }
            });
        }

        // Use the writer to create content
        const writerResult = await writer.write(text, {
            context: options.context || ''
        });

        // Clean up
        writer.destroy();

        return {
        content: writerResult,
        source: 'chrome-writer',
        error: null
        };
    } catch (error) {
        console.error('Chrome Writer API error:', error);
        console.log('Falling back to Gemini server-side...');
        return await fallbackCallback();
      }
} 

/**    
 * Use Chrome's built-in Proofreader API with Gemini fallback
 */
export async function getChromeProofreadSuggestions(text, fallbackCallback) {
    try {
      // Check if Proofreader API is available
      if (typeof window.Proofreader === 'undefined') {
        throw new Error('Chrome Proofreader API not available');
      }
  
      const availability = await window.Proofreader.availability();
      
      if (availability === 'downloadable') {
        // Model needs to be downloaded - use fallback
        console.log('Chrome AI model downloading, using Gemini fallback...');
        return await fallbackCallback();
      }
  
      if (availability !== 'available') {
        throw new Error('Proofreader API not available');
      }
  
      // Create proofreader instance
      const proofreader = await window.Proofreader.create({
        expectedInputLanguages: ['en'],
        expectedOutputLanguages: ['en'],
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Chrome AI Downloaded ${e.loaded * 100}%`);
          });
        }
      });
  
      // Get proofreading results
      const result = await proofreader.proofread(text);
      console.log('result',result);
      console.log('corrections',result.corrections);
  
      return {
        corrected: result.correctedInput,
        corrections: result.corrections,
        hasErrors: result.corrections.length > 0,
        errorCount: result.corrections.length,
        source: 'chrome'
      };
  
    } catch (error) {
      console.error('Chrome Proofreader API error:', error);
      console.log('Falling back to Gemini server-side...');
      return await fallbackCallback();
    }
}


/**
 * Use Chrome's built-in Summarizer API with Gemini fallback
 */
export async function getChromeSummary(text, fallbackCallback) {
  try {
    // Check if Summarizer API is available
    if (typeof window.Summarizer === 'undefined') {
      throw new Error('Chrome Summarizer API not available');
    }

    const availability = await window.Summarizer.availability();
    
    if (availability === 'downloadable') {
      // Model needs to be downloaded - use fallback
      console.log('Chrome AI model downloading, using Gemini fallback...');
      return await fallbackCallback();
    }

    if (availability !== 'available') {
      throw new Error('Summarizer API not available');
    }

    // Create summarizer instance with configuration
    const summarizer = await window.Summarizer.create({
      type: 'key-points', // Extract key points
      format: 'markdown', // Markdown format
      length: 'medium', // Medium length (5 bullet points)
      expectedInputLanguages: ['en'],
      outputLanguage: 'en',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Chrome AI Downloaded ${e.loaded * 100}%`);
        });
      }
    });

    // Get summary results
    const result = await summarizer.summarize(text);
    
    return {
      summary: result,
      wordCount: text.split(/\s+/).length,
      sentenceCount: text.split(/[.!?]+/).length,
      confidence: result.confidence || 0.9,
      source: 'chrome'
    };

  } catch (error) {
    console.error('Chrome Summarizer API error:', error);
    console.log('Falling back to Gemini server-side...');
    return await fallbackCallback();
  }
}

/**
 * Get different types of summaries using Chrome API
 */
export async function getChromeSummaryByType(text, type = 'key-points', fallbackCallback) {
  try {
    if (typeof window.Summarizer === 'undefined') {
      throw new Error('Chrome Summarizer API not available');
    }

    const availability = await window.Summarizer.availability();
    
    if (availability !== 'available') {
      throw new Error('Summarizer API not available');
    }

    // Create summarizer with specific type
    const summarizer = await window.Summarizer.create({
      type: type, // 'key-points', 'tldr', 'teaser', 'headline'
      format: 'markdown',
      length: 'medium',
      expectedInputLanguages: ['en'],
      outputLanguage: 'en'
    });

    const result = await summarizer.summarize(text);
    
    return {
      summary: result,
      type: type,
      source: 'chrome'
    };

  } catch (error) {
    console.error('Chrome Summarizer API error:', error);
    return await fallbackCallback();
  }
}

/**
 * Check if user activation is available (required for Chrome AI)
 */
export function hasUserActivation() {
  return navigator.userActivation && navigator.userActivation.isActive;
}

/**
 * Wait for user activation if needed
 */
export function waitForUserActivation() {
  return new Promise((resolve) => {
    if (hasUserActivation()) {
      resolve(true);
      return;
    }
    
    // Listen for user interaction
    const handleInteraction = () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      resolve(true);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
  });
}

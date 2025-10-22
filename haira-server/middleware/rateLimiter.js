// Rate limiting middleware for API endpoints

/**
 * In-memory rate limiter
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
export function createRateLimiter(maxRequests = 10, windowMs = 24 * 60 * 60 * 1000) {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = `${req.user?.uid || req.ip}_${req.params.id}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or initialize request history
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    
    // Filter out old requests
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      console.log(`[RateLimiter] Rate limit exceeded for ${key}: ${recentRequests.length}/${maxRequests}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, timestamps] of requests.entries()) {
        const filtered = timestamps.filter(t => t > windowStart);
        if (filtered.length === 0) {
          requests.delete(k);
        } else {
          requests.set(k, filtered);
        }
      }
    }
    
    next();
  };
}

/**
 * Project-specific rate limiter that checks message count in database
 * More accurate than in-memory but requires async operation
 */
export function createProjectRateLimiter(getUserMessageCountFn, maxMessages = 10) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.uid;
      const projectId = req.params.id;
      const projectData = req.projectData; // Assumes project data is loaded
      
      if (!userId || !projectId || !projectData?.project?.startDate) {
        return next();
      }
      
      const projectStart = new Date(projectData.project.startDate);
      const currentDay = Math.floor((Date.now() - projectStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      
      const count = await getUserMessageCountFn(projectId, userId, projectStart, currentDay);
      
      if (count >= maxMessages) {
        console.log(`[ProjectRateLimiter] User ${userId} exceeded daily limit: ${count}/${maxMessages}`);
        return res.status(429).json({ 
          error: `Daily message limit exceeded (${maxMessages} messages per day)`
        });
      }
      
      next();
    } catch (error) {
      console.error('[ProjectRateLimiter] Error checking rate limit:', error);
      next(); // Fail open - don't block on errors
    }
  };
}

import { generateAIContribution as callOpenAIContribution } from '../api/openaiService.js';
import { getDocumentById, getSubdocuments, updateDocument, getProjectWithTasks, getChatMessagesByUser } from './firebaseService.js';
import { COLLECTIONS } from '../schema/database.js';

export class AIGradingService {
  /**
   * Clean AI response by removing markdown code blocks and extra formatting
   */
  cleanAIResponse(response) {
    if (!response) return '{}';
    
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // If the response is empty or just whitespace, return empty object
    if (!cleaned || cleaned === '') {
      return '{}';
    }
    
    return cleaned;
  }

  async evaluateProject(projectId, userId) {
    try {
      console.log(`[AIGradingService] Starting AI evaluation for project ${projectId}, user ${userId}`);
      
      // Gather comprehensive project data
      const projectData = await this.gatherProjectData(projectId, userId);
      
      if (!projectData.project) {
        throw new Error('Project not found');
      }
      
      // Run AI evaluations in parallel
      const [responsiveness, workPercentage, reportQuality, globalFeedback] = await Promise.all([
        this.evaluateResponsiveness(projectData),
        this.evaluateWorkPercentage(projectData),
        this.evaluateReportQuality(projectData),
        this.generateGlobalFeedback(projectData)
      ]);
      
      // Calculate overall grade
      const overall = this.calculateOverallGrade(responsiveness, workPercentage, reportQuality);
      
      const grades = {
        responsiveness,
        workPercentage,
        reportQuality,
        overall,
        globalFeedback,
        evaluatedAt: Date.now()
      };
      
      console.log('AI evaluation completed:', grades);
      return grades;
      
    } catch (error) {
      console.error('AI Grading Error:', error);
      throw new Error(`Failed to evaluate project: ${error.message}`);
    }
  }
  
  async gatherProjectData(projectId, userId) {
    try {
      console.log(`[AIGradingService] Gathering project data for project: ${projectId}, user: ${userId}`);
      
      // Use the existing getProjectWithTasks function that properly loads tasks from subcollection
      const projectData = await getProjectWithTasks(projectId, userId);
      
      if (!projectData) {
        console.log('[AIGradingService] No project data found');
        return {
          project: null,
          chatMessages: [],
          tasks: [],
          projectDuration: 0,
          teamMembers: []
        };
      }
      
      console.log('[AIGradingService] Project data loaded:', {
        projectTitle: projectData.project?.title,
        tasksCount: projectData.tasks?.length || 0,
        projectId: projectData.project?.id
      });
      
      // Get chat messages from subcollection - filtered by user ID
      const chatMessages = await getChatMessagesByUser(COLLECTIONS.USER_PROJECTS, projectId, 'chatMessages', userId);
      console.log(`[AIGradingService] User chat messages loaded: ${chatMessages?.length || 0}`);
      
      const projectDuration = projectData.project ? (Date.now() - projectData.project.startDate) / (1000 * 60 * 60 * 24) : 0; // days
      const teamMembers = projectData.project?.team ? projectData.project.team.map(member => member.name) : [];
      
      console.log('[AIGradingService] Project data gathered:', {
        project: projectData.project,
        chatMessages: chatMessages || [],
        tasks: projectData.tasks || [],
        projectDuration: projectDuration.toFixed(1),
        teamMembers: teamMembers
      });
      
      return {
        project: projectData.project,
        chatMessages: chatMessages || [],
        tasks: projectData.tasks || [],
        projectDuration,
        teamMembers
      };
    } catch (error) {
      console.error('[AIGradingService] Error gathering project data:', error);
      throw error;
    }
  }
  
  async evaluateResponsiveness(projectData) {
    console.log(`[AIGradingService] Evaluating responsiveness for project: ${projectData.project?.title}`);
    console.log(`[AIGradingService] Chat messages count: ${projectData.chatMessages?.length || 0}`);
    
    const prompt = this.buildResponsivenessPrompt(projectData);
    const response = await callOpenAIContribution(prompt, { temperature: 0.3 }, '');
    
    try {
      const cleanedResponse = this.cleanAIResponse(response);
      const evaluation = JSON.parse(cleanedResponse);
      console.log(`[AIGradingService] Responsiveness evaluation result:`, evaluation);
      return {
        score: evaluation.score || 0,
        reasoning: evaluation.reasoning || 'No reasoning provided',
        strengths: evaluation.strengths || [],
        areasForImprovement: evaluation.areas_for_improvement || [],
        specificExamples: evaluation.specific_examples || []
      };
    } catch (error) {
      console.error('Failed to parse responsiveness evaluation:', error);
      console.error('Raw AI response:', response);
      return { 
        score: 0, 
        reasoning: 'Failed to evaluate responsiveness - AI response parsing error',
        strengths: [],
        areasForImprovement: [],
        specificExamples: []
      };
    }
  }
  
  async evaluateWorkPercentage(projectData) {
    console.log(`[AIGradingService] Evaluating work percentage for project: ${projectData.project?.title}`);
    console.log(`[AIGradingService] Tasks count: ${projectData.tasks?.length || 0}`);
    
    const prompt = this.buildWorkPercentagePrompt(projectData);
    const response = await callOpenAIContribution(prompt, { temperature: 0.3 }, '');
    
    try {
      const cleanedResponse = this.cleanAIResponse(response);
      const evaluation = JSON.parse(cleanedResponse);
      console.log(`[AIGradingService] Work percentage evaluation result:`, evaluation);
      return {
        score: evaluation.score || 0,
        reasoning: evaluation.reasoning || 'No reasoning provided',
        contributionBreakdown: evaluation.contribution_breakdown || {},
        specificExamples: evaluation.specific_examples || [],
        recommendations: evaluation.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse work percentage evaluation:', error);
      console.error('Raw AI response:', response);
      return { 
        score: 0, 
        reasoning: 'Failed to evaluate work percentage - AI response parsing error',
        contributionBreakdown: {},
        specificExamples: [],
        recommendations: []
      };
    }
  }
  
  async evaluateReportQuality(projectData) {
    const prompt = this.buildReportQualityPrompt(projectData);
    const response = await callOpenAIContribution(prompt, { temperature: 0.3 }, '');
    
    try {
      const cleanedResponse = this.cleanAIResponse(response);
      const evaluation = JSON.parse(cleanedResponse);
      return {
        score: evaluation.score || 0,
        reasoning: evaluation.reasoning || 'No reasoning provided',
        strengths: evaluation.strengths || [],
        areasForImprovement: evaluation.areas_for_improvement || [],
        specificExamples: evaluation.specific_examples || []
      };
    } catch (error) {
      console.error('Failed to parse report quality evaluation:', error);
      return { 
        score: 0, 
        reasoning: 'Failed to evaluate report quality - AI response parsing error',
        strengths: [],
        areasForImprovement: [],
        specificExamples: []
      };
    }
  }
  
  async generateGlobalFeedback(projectData) {
    try {
      const prompt = this.buildGlobalFeedbackPrompt(projectData);
      const response = await callOpenAIContribution(prompt, { temperature: 0.7 }, '');
      
      // For global feedback, we expect a direct text response, not JSON
      return {
        feedback: response.trim(),
        generatedAt: Date.now()
      };
    } catch (error) {
      console.error('Failed to generate global feedback:', error);
      return {
        feedback: 'Unable to generate comprehensive feedback at this time.',
        generatedAt: Date.now()
      };
    }
  }
  
  buildResponsivenessPrompt(projectData) {
    const { project, chatMessages, projectDuration, teamMembers } = projectData;
    
    return `You are an expert project manager evaluating a student's responsiveness in a collaborative AI team project.

PROJECT CONTEXT:
- Project: ${project?.title || 'Unknown Project'}
- Duration: ${projectDuration.toFixed(1)} days
- Team Members: ${teamMembers.join(', ') || 'No team members'}
- Start Date: ${project?.startDate ? new Date(project.startDate).toLocaleDateString() : 'Unknown'}

IMPORTANT: The chat messages below are ALL from the STUDENT (human user). Do not confuse AI teammates with the student. The student is the human participant in this project.

CHAT INTERACTION ANALYSIS:
${this.formatChatForAnalysis(chatMessages)}

EVALUATION CRITERIA:
Analyze the STUDENT'S responsiveness based on:
1. **Response Time**: How quickly the student responds to team messages
2. **Engagement Quality**: Depth and relevance of the student's responses  
3. **Proactive Communication**: Does the student initiate discussions or only respond?
4. **Collaboration Spirit**: How well the student works with AI teammates
5. **Meeting Participation**: Student's attendance and contribution to team discussions

GRADING SCALE:
- 90-100: Exceptional responsiveness, always engaged, proactive leader
- 80-89: Good responsiveness, generally reliable team player
- 70-79: Adequate responsiveness, some gaps in engagement
- 60-69: Poor responsiveness, frequently unresponsive
- 0-59: Failing responsiveness, rarely participates

Provide your evaluation in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<detailed explanation of the score - do not mention any names>",
  "strengths": ["<list of positive behaviors - do not mention any names>"],
  "areas_for_improvement": ["<list of areas to improve - do not mention any names>"],
  "specific_examples": ["<concrete examples from the data - do not mention any names>"]
}

IMPORTANT: Do not mention any names (like Kati, Sam, etc.) in your response. Focus only on the student's behavior and performance.`;
  }
  
  buildWorkPercentagePrompt(projectData) {
    const { project, tasks, chatMessages, projectDuration } = projectData;
    
    // Since tasks are already filtered by user ID, we can use them directly
    const userTasks = tasks; // All tasks are already user-assigned due to filtering
    const completedTasks = userTasks.filter(task => task.status === 'done');
    const totalTasks = tasks.length;
    
    return `You are an expert project manager evaluating a student's work contribution in a collaborative AI team project.

PROJECT CONTEXT:
- Project: ${project?.title || 'Unknown Project'}
- Duration: ${projectDuration.toFixed(1)} days
- Total Tasks: ${totalTasks}
- User-Assigned Tasks: ${userTasks.length}
- Completed Tasks: ${completedTasks.length}

TASK DATA:
${this.formatTaskData(tasks)}

CHAT CONTRIBUTIONS:
${this.formatUserContributions(chatMessages)}

REPORT CONTRIBUTIONS:
${this.formatReportContributions(project?.finalReport || project?.draftReport)}

EVALUATION CRITERIA:
Analyze the student's work contribution based on:
1. **Report Content**: The actual work documented in the final report (MOST IMPORTANT)
2. **Task Completion**: Percentage and quality of completed tasks
3. **Initiative Taking**: Creating new tasks, suggesting improvements
4. **Problem Solving**: Addressing challenges and blockers
5. **Leadership**: Taking ownership of project aspects

IMPORTANT: Focus primarily on the REPORT CONTENT as it represents the student's actual work and contributions. The report content is the most reliable indicator of what the student has accomplished.

GRADING SCALE:
- 90-100: Exceptional contribution, takes leadership, high initiative
- 80-89: Good contribution, reliable team member
- 70-79: Adequate contribution, meets basic expectations
- 60-69: Poor contribution, minimal effort
- 0-59: Failing contribution, very little work done

Provide your evaluation in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<detailed explanation of the score - do not mention any names>",
  "contribution_breakdown": {
    "task_completion": <percentage>,
    "initiative_score": <percentage>,
    "report_contribution": <percentage>,
    "leadership_demonstrated": <percentage>
  },
  "specific_examples": ["<concrete examples of their work - do not mention any names>"],
  "recommendations": ["<suggestions for improvement - do not mention any names>"]
}

IMPORTANT: Do not mention any names (like Kati, Sam, etc.) in your response. Focus only on the student's work and performance.`;
  }
  
  buildReportQualityPrompt(projectData) {
    const { project } = projectData;
    const reportContent = project?.finalReport?.content || project?.draftReport?.content || '';
    
    return `You are an expert academic evaluator assessing the quality of a student's final project report.

PROJECT CONTEXT:
- Project: ${project?.title || 'Unknown Project'}
- Report Length: ${reportContent.length} characters
- Report Type: Academic project report

REPORT CONTENT:
${(reportContent || '').substring(0, 5000)}${(reportContent || '').length > 5000 ? '...' : ''}

EVALUATION CRITERIA:
Analyze the report quality based on:
1. **Content Quality**: Depth, accuracy, and relevance of information
2. **Structure**: Organization, logical flow, and clarity
3. **Writing Style**: Grammar, clarity, and academic tone
4. **Completeness**: Coverage of required topics and thoroughness
5. **Originality**: Original thinking and analysis vs. generic content

GRADING SCALE:
- 90-100: Exceptional quality, well-structured, insightful analysis
- 80-89: Good quality, well-organized, clear writing
- 70-79: Adequate quality, some structural issues
- 60-69: Poor quality, significant problems
- 0-59: Failing quality, major issues

Provide your evaluation in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<detailed explanation of the score>",
  "strengths": ["<list of report strengths>"],
  "areas_for_improvement": ["<list of areas to improve>"],
  "specific_examples": ["<concrete examples from the report>"]
}`;
  }
  
  formatChatForAnalysis(chatMessages) {
    if (!chatMessages || chatMessages.length === 0) {
      return 'No chat messages available for analysis.';
    }
    
    console.log(`[AIGradingService] Formatting ${chatMessages.length} chat messages for analysis`);
    
    return chatMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(msg => {
        // Determine if this is a human message
        const isHuman = msg.senderType === 'human' || msg.senderId === 'user';
        return {
          sender: msg.senderName || msg.senderId,
          type: isHuman ? 'HUMAN' : 'AI',
          senderId: msg.senderId,
          timestamp: new Date(msg.timestamp).toLocaleString(),
          text: (msg.text || msg.content || '').substring(0, 200) + ((msg.text || msg.content || '').length > 200 ? '...' : ''),
          isActiveHours: msg.isActiveHours,
          isHuman: isHuman
        };
      })
      .slice(-50) // Last 50 messages for analysis
      .map(msg => `${msg.sender} (${msg.type}) [${msg.timestamp}]: ${msg.text}`)
      .join('\n');
  }
  
  formatTaskData(tasks) {
    if (!tasks || tasks.length === 0) {
      return 'No tasks available for analysis.';
    }
    
    console.log(`[AIGradingService] Formatting ${tasks.length} tasks for analysis`);
    
    // Separate user tasks from AI tasks
    const userTasks = tasks.filter(task => {
      const assignedTo = task.assignedTo?.toLowerCase();
      return assignedTo && !['rasoa', 'rakoto', 'alex', 'sam', 'ai_manager', 'ai_helper', 'manager'].includes(assignedTo);
    });
    
    const aiTasks = tasks.filter(task => {
      const assignedTo = task.assignedTo?.toLowerCase();
      return assignedTo && ['rasoa', 'rakoto', 'alex', 'sam', 'ai_manager', 'ai_helper', 'manager'].includes(assignedTo);
    });
    
    console.log(`[AIGradingService] Task breakdown: ${userTasks.length} user tasks, ${aiTasks.length} AI tasks`);
    console.log(`[AIGradingService] All tasks:`, tasks.map(task => ({
      title: task.title || task.text,
      assignedTo: task.assignedTo,
      status: task.status,
      isUserTask: userTasks.includes(task)
    })));
    
    return tasks.map(task => {
      const isUserTask = userTasks.includes(task);
      const isCompleted = task.status === 'done' || task.status === 'completed';
      
      return {
        title: task.title || task.text || 'Untitled Task',
        assignedTo: task.assignedTo,
        status: task.status,
        description: task.description?.substring(0, 100) + (task.description?.length > 100 ? '...' : ''),
        createdAt: new Date(task.createdAt).toLocaleString(),
        completedAt: task.completedAt ? new Date(task.completedAt).toLocaleString() : 'Not completed',
        isUserTask: isUserTask,
        isCompleted: isCompleted
      };
    })
    .map(task => `Task: ${task.title} | Assigned to: ${task.assignedTo} | Status: ${task.status} | User Task: ${task.isUserTask} | Completed: ${task.isCompleted} | Description: ${task.description}`)
    .join('\n');
  }
  
  formatUserContributions(chatMessages) {
    if (!chatMessages || chatMessages.length === 0) {
      return 'No user contributions available for analysis.';
    }
    
    // Since chatMessages are already filtered by user ID, we can use them directly
    console.log(`[AIGradingService] Found ${chatMessages.length} user messages for analysis`);
    console.log(`[AIGradingService] User messages:`, chatMessages.map(msg => ({
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderType: msg.senderType,
      text: (msg.text || msg.content || '').substring(0, 100)
    })));
    
    return chatMessages
      .map(msg => ({
        timestamp: new Date(msg.timestamp).toLocaleString(),
        text: (msg.text || msg.content || '').substring(0, 300) + ((msg.text || msg.content || '').length > 300 ? '...' : ''),
        senderId: msg.senderId,
        senderName: msg.senderName
      }))
      .map(msg => `[${msg.timestamp}] ${msg.senderName || msg.senderId}: ${msg.text}`)
      .join('\n');
  }
  
  formatReportContributions(draftReport) {
    if (!draftReport || !draftReport.content) {
      return 'No report content available for analysis.';
    }
    
    return `Report Content (${(draftReport.content || '').length} characters):
${(draftReport.content || '').substring(0, 2000)}${(draftReport.content || '').length > 2000 ? '...' : ''}`;
  }
  
  calculateOverallGrade(responsiveness, workPercentage, reportQuality) {
    const weights = {
      responsiveness: 0.3,
      workPercentage: 0.4,
      reportQuality: 0.3
    };
    
    return Math.round(
      (responsiveness.score * weights.responsiveness) +
      (workPercentage.score * weights.workPercentage) +
      (reportQuality.score * weights.reportQuality)
    );
  }
  
  buildGlobalFeedbackPrompt(projectData) {
    const { project, chatMessages, tasks, projectDuration, teamMembers } = projectData;
    console.log("AI Grading: Computing Score and Feedback for project:", project?.title);
    console.log("AI Grading: Project duration:", projectDuration.toFixed(1));
    console.log("AI Grading: Team members:", teamMembers.join(', '));
    console.log("AI Grading: Chat messages:", chatMessages);
    console.log("AI Grading: Tasks:", tasks);
    console.log("AI Grading: Draft report:", project?.draftReport);
    console.log("AI Grading: Final report:", project?.finalReport);
    console.log("AI Grading: Project data:", projectData);
    
    return `You are an expert project manager providing comprehensive feedback on a student's collaborative AI team project.

PROJECT CONTEXT:
- Project: ${project?.title || 'Unknown Project'}
- Duration: ${projectDuration.toFixed(1)} days


PROJECT DATA ANALYSIS:

CHAT INTERACTIONS:
${this.formatChatForAnalysis(chatMessages)}

TASK COMPLETION:
${this.formatTaskData(tasks)}

REPORT CONTENT:
${this.formatReportContributions(project?.finalReport || project?.draftReport)}

EVALUATION TASK:
Write a brief, direct feedback summary that considers ALL aspects of their work:
1. **Chat Interactions** - How they communicated and collaborated
2. **Task Completion** - What tasks they accomplished and their quality
3. **Report Content** - The actual work documented in their final report
4. **Overall Contribution** - Their role and impact on the project

EVALUATION APPROACH:
- Review their chat messages to understand their communication style and engagement
- Examine completed tasks to see what they accomplished
- Analyze the final report content to see the quality and depth of their work
- Consider how all these elements work together to show their overall contribution

FORMAT REQUIREMENTS:
- Write in a casual, friendly tone (like a mentor giving quick feedback)
- Use 1-2 short paragraphs (50-100 words total)
- Be direct and specific
- No formal greetings or signatures
- Focus on the most important points only
- Base your feedback on the COMPLETE picture of their work
- Do NOT mention any names (like Kati, Sam, etc.) - focus only on the student's work

Write as if giving quick feedback after reviewing their complete work - concise and to the point.`;
  }
}

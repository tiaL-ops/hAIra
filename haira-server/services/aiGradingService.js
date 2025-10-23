import { generateAIContribution as callOpenAIContribution } from '../api/openaiService.js';
import { getDocumentById, getSubdocuments, updateDocument } from './firebaseService.js';
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
      console.log(`Starting AI evaluation for project ${projectId}`);
      
      // Gather comprehensive project data
      const projectData = await this.gatherProjectData(projectId);
      
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
  
  async gatherProjectData(projectId) {
    try {
      const project = await getDocumentById(COLLECTIONS.USER_PROJECTS, projectId);
      const chatMessages = await getSubdocuments(COLLECTIONS.USER_PROJECTS, projectId, 'messages');
      const tasks = await getSubdocuments(COLLECTIONS.USER_PROJECTS, projectId, 'tasks');
      
      const projectDuration = project ? (Date.now() - project.startDate) / (1000 * 60 * 60 * 24) : 0; // days
      const teamMembers = project?.team ? project.team.map(member => member.name) : [];
      
      return {
        project,
        chatMessages: chatMessages || [],
        tasks: tasks || [],
        projectDuration,
        teamMembers
      };
    } catch (error) {
      console.error('Error gathering project data:', error);
      throw error;
    }
  }
  
  async evaluateResponsiveness(projectData) {
    const prompt = this.buildResponsivenessPrompt(projectData);
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
      console.error('Failed to parse responsiveness evaluation:', error);
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
    const prompt = this.buildWorkPercentagePrompt(projectData);
    const response = await callOpenAIContribution(prompt, { temperature: 0.3 }, '');
    
    try {
      const cleanedResponse = this.cleanAIResponse(response);
      const evaluation = JSON.parse(cleanedResponse);
      return {
        score: evaluation.score || 0,
        reasoning: evaluation.reasoning || 'No reasoning provided',
        contributionBreakdown: evaluation.contribution_breakdown || {},
        specificExamples: evaluation.specific_examples || [],
        recommendations: evaluation.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse work percentage evaluation:', error);
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

CHAT INTERACTION ANALYSIS:
${this.formatChatForAnalysis(chatMessages)}

EVALUATION CRITERIA:
Analyze the student's responsiveness based on:
1. **Response Time**: How quickly they respond to team messages
2. **Engagement Quality**: Depth and relevance of their responses  
3. **Proactive Communication**: Do they initiate discussions or only respond?
4. **Collaboration Spirit**: How well they work with AI teammates
5. **Meeting Participation**: Attendance and contribution to team discussions

GRADING SCALE:
- 90-100: Exceptional responsiveness, always engaged, proactive leader
- 80-89: Good responsiveness, generally reliable team player
- 70-79: Adequate responsiveness, some gaps in engagement
- 60-69: Poor responsiveness, frequently unresponsive
- 0-59: Failing responsiveness, rarely participates

Provide your evaluation in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<detailed explanation of the score>",
  "strengths": ["<list of positive behaviors>"],
  "areas_for_improvement": ["<list of areas to improve>"],
  "specific_examples": ["<concrete examples from the data>"]
}`;
  }
  
  buildWorkPercentagePrompt(projectData) {
    const { project, tasks, chatMessages, projectDuration } = projectData;
    
    const userTasks = tasks.filter(task => task.assignedTo === 'user');
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
${this.formatReportContributions(project?.draftReport)}

EVALUATION CRITERIA:
Analyze the student's work contribution based on:
1. **Task Completion**: Percentage and quality of completed tasks
2. **Initiative Taking**: Creating new tasks, suggesting improvements
3. **Report Writing**: Direct contributions to the final report
4. **Problem Solving**: Addressing challenges and blockers
5. **Leadership**: Taking ownership of project aspects

GRADING SCALE:
- 90-100: Exceptional contribution, takes leadership, high initiative
- 80-89: Good contribution, reliable team member
- 70-79: Adequate contribution, meets basic expectations
- 60-69: Poor contribution, minimal effort
- 0-59: Failing contribution, very little work done

Provide your evaluation in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<detailed explanation of the score>",
  "contribution_breakdown": {
    "task_completion": <percentage>,
    "initiative_score": <percentage>,
    "report_contribution": <percentage>,
    "leadership_demonstrated": <percentage>
  },
  "specific_examples": ["<concrete examples of their work>"],
  "recommendations": ["<suggestions for improvement>"]
}`;
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
${reportContent.substring(0, 5000)}${reportContent.length > 5000 ? '...' : ''}

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
    
    return chatMessages
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(msg => ({
        sender: msg.senderName,
        type: msg.senderType,
        timestamp: new Date(msg.timestamp).toLocaleString(),
        text: msg.text.substring(0, 200) + (msg.text.length > 200 ? '...' : ''),
        isActiveHours: msg.isActiveHours
      }))
      .slice(-50) // Last 50 messages for analysis
      .map(msg => `${msg.sender} (${msg.type}) [${msg.timestamp}]: ${msg.text}`)
      .join('\n');
  }
  
  formatTaskData(tasks) {
    if (!tasks || tasks.length === 0) {
      return 'No tasks available for analysis.';
    }
    
    return tasks.map(task => ({
      title: task.title,
      assignedTo: task.assignedTo,
      status: task.status,
      description: task.description?.substring(0, 100) + (task.description?.length > 100 ? '...' : ''),
      createdAt: new Date(task.createdAt).toLocaleString(),
      completedAt: task.completedAt ? new Date(task.completedAt).toLocaleString() : 'Not completed'
    }))
    .map(task => `Task: ${task.title} | Assigned to: ${task.assignedTo} | Status: ${task.status} | Description: ${task.description}`)
    .join('\n');
  }
  
  formatUserContributions(chatMessages) {
    if (!chatMessages || chatMessages.length === 0) {
      return 'No user contributions available for analysis.';
    }
    
    const userMessages = chatMessages.filter(msg => msg.senderType === 'human');
    return userMessages
      .map(msg => ({
        timestamp: new Date(msg.timestamp).toLocaleString(),
        text: msg.text.substring(0, 300) + (msg.text.length > 300 ? '...' : '')
      }))
      .map(msg => `[${msg.timestamp}] ${msg.text}`)
      .join('\n');
  }
  
  formatReportContributions(draftReport) {
    if (!draftReport || !draftReport.content) {
      return 'No report content available for analysis.';
    }
    
    return `Report Content (${draftReport.content.length} characters):
${draftReport.content.substring(0, 2000)}${draftReport.content.length > 2000 ? '...' : ''}`;
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
    
    return `You are an expert project manager providing comprehensive feedback on a student's collaborative AI team project.

PROJECT CONTEXT:
- Project: ${project?.title || 'Unknown Project'}
- Duration: ${projectDuration.toFixed(1)} days
- Team Members: ${teamMembers.join(', ') || 'No team members'}

PROJECT DATA ANALYSIS:

CHAT INTERACTIONS:
${this.formatChatForAnalysis(chatMessages)}

TASK COMPLETION:
${this.formatTaskData(tasks)}

REPORT CONTENT:
${this.formatReportContributions(project?.draftReport)}

EVALUATION TASK:
Write a brief, direct feedback summary that:
1. **Highlights key achievements** - What they did well
2. **Notes collaboration quality** - How they worked with AI teammates
3. **Suggests one improvement area** - One specific thing to work on
4. **Keeps it encouraging** - Positive but honest

FORMAT REQUIREMENTS:
- Write in a casual, friendly tone (like a mentor giving quick feedback)
- Use 1-2 short paragraphs (50-100 words total)
- Be direct and specific
- No formal greetings or signatures
- Focus on the most important points only

Write as if giving quick feedback after reviewing their work - concise and to the point.`;
  }
}

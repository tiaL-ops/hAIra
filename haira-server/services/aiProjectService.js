import { LEARNING_TOPICS } from '../config/projectRules.js';
import { generateAIProject } from './aiService.js';
import { 
  getUnusedTemplatesForTopic, 
  getLeastUsedTemplatesForTopic, 
  updateTemplateUsage 
} from './firebaseService.js';

export async function generateProjectForTopic(topic) {
  try {
    // Validate topic against LEARNING_TOPICS
    const validTopic = LEARNING_TOPICS.find(t => t.id === topic);
    if (!validTopic) {
      throw new Error(`Invalid topic: ${topic}. Must be one of: ${LEARNING_TOPICS.map(t => t.id).join(', ')}`);
    }

    // Updated topic-specific prompts based on the new topics
    const topicPrompts = {
      design: `Create a product design project focused on accessibility and user experience. 
      The project should teach design principles, user research, and accessibility considerations. 
      Include specific deliverables that demonstrate design thinking and user-centered approach.`,
      
      research: `Create a research project about AI tools and their applications in education. 
      The project should teach research methodology, benchmarking techniques, and analytical skills. 
      Include specific deliverables that demonstrate research competency and critical thinking.`,
      
      development: `Create a coding project that teaches programming concepts and technical skills. 
      The project should include hands-on coding, problem-solving, and technical implementation. 
      Include specific deliverables that demonstrate coding proficiency and technical understanding.`,
      
      business: `Create a business strategy project focused on workflow optimization and process improvement. 
      The project should teach business analysis, process mapping, and strategic thinking. 
      Include specific deliverables that demonstrate business acumen and process optimization skills.`,
      
      marketing: `Create a marketing project focused on campaign planning and content creation. 
      The project should teach marketing strategy, content planning, and creative execution. 
      Include specific deliverables that demonstrate marketing skills and creative thinking.`,
      
      'data analysis': `Create a data analysis project focused on survey data and student behavior insights. 
      The project should teach data collection, analysis techniques, and visualization skills. 
      Include specific deliverables that demonstrate analytical proficiency and data storytelling.`
    };

    const prompt = topicPrompts[topic] || "Create an educational project that teaches valuable skills.";
    
    // Call OpenAI to generate the project
    const aiResponse = await generateAIProject(prompt);
    
    // Parse and structure the response
    const projectData = {
      title: aiResponse.title || `${validTopic.name} Project`,
      description: aiResponse.description || validTopic.description,
      deliverables: aiResponse.deliverables || [validTopic.deliverable]
    };
    
    return projectData;
  } catch (error) {
    console.error('Error generating project for topic:', error);
    
    // Updated fallback projects based on the new topics
    const fallbackProjects = {
      design: {
        title: "Product Design Project",
        description: "Redesign an app feature for accessibility. Learn design principles, user research, and accessibility considerations.",
        deliverables: ["UX case study", "User Research", "Design Mockups", "Accessibility Report"]
      },
      research: {
        title: "Research & Innovation Project",
        description: "Benchmark AI writing tools for study help. Learn research methodology, benchmarking techniques, and analytical skills.",
        deliverables: ["Summary report & criteria list", "Tool Comparison", "Recommendations", "Implementation Guide"]
      },
      development: {
        title: "Development & Coding Project",
        description: "Build technical skills and coding projects. Learn programming concepts, problem-solving, and technical implementation.",
        deliverables: ["Codebase & technical documentation", "Code Implementation", "Testing", "Documentation"]
      },
      business: {
        title: "Business & Strategy Project",
        description: "Optimize a fictional company's workflow. Learn business analysis, process mapping, and strategic thinking.",
        deliverables: ["Process flowchart & proposal", "Workflow Analysis", "Optimization Plan", "Implementation Strategy"]
      },
      marketing: {
        title: "Marketing & Sales Project",
        description: "Plan a 3-day launch campaign for a school app. Learn marketing strategy, content planning, and creative execution.",
        deliverables: ["Content calendar & ad mockups", "Campaign Strategy", "Content Creation", "Performance Metrics"]
      },
      'data analysis': {
        title: "Data & Analytics Project",
        description: "Analyze survey data about student habits. Learn data collection, analysis techniques, and visualization skills.",
        deliverables: ["Insight dashboard/report", "Data Collection", "Statistical Analysis", "Visualization Dashboard"]
      }
    };
    
    return fallbackProjects[topic] || fallbackProjects.design;
  }
}

// Smart template selection: reuse existing templates or generate new ones
export async function getOrCreateProjectTemplate(topic, userId) {
  try {
    console.log(`[AIProjectService] Getting or creating template for topic: ${topic}, user: ${userId}`);
    
    // Step 1: Check for unused templates for this topic and user
    const unusedTemplates = await getUnusedTemplatesForTopic(topic, userId);
    if (unusedTemplates.length > 0) {
      const selectedTemplate = unusedTemplates[0]; // Use the first unused template
      console.log(`[AIProjectService] Found unused template: ${selectedTemplate.title} (${selectedTemplate.id})`);
      
      // Update template usage
      await updateTemplateUsage(selectedTemplate.id, userId);
      
      return {
        template: selectedTemplate,
        isReused: true,
        source: 'unused_template'
      };
    }
    
    // Step 2: Check for least-used templates for this topic
    const leastUsedTemplates = await getLeastUsedTemplatesForTopic(topic, 3);
    if (leastUsedTemplates.length > 0) {
      const selectedTemplate = leastUsedTemplates[0]; // Use the least-used template
      console.log(`[AIProjectService] Found least-used template: ${selectedTemplate.title} (${selectedTemplate.id})`);
      
      // Update template usage
      await updateTemplateUsage(selectedTemplate.id, userId);
      
      return {
        template: selectedTemplate,
        isReused: true,
        source: 'least_used_template'
      };
    }
    
    // Step 3: Generate new template if no suitable existing templates found
    console.log(`[AIProjectService] No suitable templates found, generating new template for topic: ${topic}`);
    const newProjectData = await generateProjectForTopic(topic);
    
    return {
      template: newProjectData,
      isReused: false,
      source: 'ai_generated'
    };
    
  } catch (error) {
    console.error('[AIProjectService] Error in getOrCreateProjectTemplate:', error);
    
    // Fallback to AI generation
    const fallbackProject = await generateProjectForTopic(topic);
    return {
      template: fallbackProject,
      isReused: false,
      source: 'fallback_generated'
    };
  }
}
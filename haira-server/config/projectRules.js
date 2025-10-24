//Project Management Rules
export const PROJECT_RULES = {
    MAX_TOTAL_PROJECTS: 3,        // Maximum 3 total projects (active + archived)
    MAX_ACTIVE_PROJECTS: 1,       // Maximum 1 active project at a time
    DEFAULT_DEADLINE_DAYS: 7      // 7-day deadline for new projects
  };
  
  export const LEARNING_TOPICS = [
    { 
      id: 'design', 
      name: 'Product Design', 
      icon: '🎨', 
      description: 'Redesign an app feature for accessibility.' ,
      deliverable: 'UX case study'
    },
    { 
      id: 'research', 
      name: 'Research & Innovation', 
      icon: '🔬', 
      description: 'Benchmark AI writing tools for study help.',
      deliverable: 'Summary report & criteria list'
    },
    { 
      id: 'development', 
      name: 'Development & Coding', 
      icon: '💻', 
      description: 'Build technical skills and coding projects',
      deliverable: 'Codebase & technical documentation'
    },
    { 
      id: 'business', 
      name: 'Business & Strategy', 
      icon: '📈', 
      description: 'Optimize a fictional company’s workflow.',
      deliverable: 'Process flowchart & proposal'
    },
    { 
      id: 'marketing', 
      name: 'Marketing & Sales', 
      icon: '📈', 
      description: 'Plan a 3-day launch campaign for a school app.' ,
      deliverable: 'Content calendar & ad mockups '
    },
    { 
      id: 'data analysis', 
      name: 'Data & Analytics', 
      icon: '📊', 
      description: 'Analyze survey data about student habits.',
      deliverable: 'Insight dashboard/report'
    }
  ];
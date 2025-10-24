import express from 'express';
import { verifyFirebaseToken } from '../middleware/authMiddleware.js';
import { 
  createProject, getUserProjects,
  updateUserActiveProject,
  updateDocument, getProjectWithTasks,
  canCreateNewProject, getActiveProject,
  createAIGeneratedProject, getProjectWithTemplate,
  archiveProject, getArchivedProjects, getInactiveProjects,
} from '../services/firebaseService.js';
import { generateProjectForTopic } from '../services/aiProjectService.js';
import { COLLECTIONS } from '../schema/database.js';
import { PROJECT_RULES, LEARNING_TOPICS } from '../config/projectRules.js';
import { AI_AGENTS } from '../config/aiAgents.js';

const router = express.Router();

// Get all projects for the authenticated user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const {includeArchived} = req.query;
    
    const projects = await getUserProjects(userId);

    //separate active, inactive, and archived projects
    const activeProjects = projects.filter(project => project.isActive === true);
    const inactiveProjects = await getInactiveProjects(userId);
    const archivedProjects = await getArchivedProjects(userId);

    //create project limits
    const canCreate = await canCreateNewProject(userId);
    const activeProject = await getActiveProject(userId);
    
    res.json({
      success: true,
      projects: includeArchived ? projects : activeProjects,
      activeProjects: activeProjects,
      inactiveProjects: inactiveProjects,
      archivedProjects: archivedProjects,
      canCreateNew: canCreate,
      activeProject: activeProject,
      hasActiveProject: activeProject ? true : false,
      projectLimits: {
        maxTotalProjects: PROJECT_RULES.MAX_TOTAL_PROJECTS,
        maxActiveProjects: PROJECT_RULES.MAX_ACTIVE_PROJECTS,
        currentTotalProjects: projects.length,
        currentActiveProjects: activeProjects.length,
      }
    });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create a new project
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    // Create the project
    const projectId = await createProject(userId, userName, title.trim());

    // Update user's active project
    await updateUserActiveProject(userId, projectId);

    res.status(201).json({
      success: true,
      projectId: projectId,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get project by ID
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    console.log(`[ProjectRoutes] Fetching project ${id} for user ${userId}`);
    
    const projectData = await getProjectWithTasks(id, userId);
    
    console.log(`[ProjectRoutes] Project data result:`, projectData ? 'Found' : 'Not found');
    
    if (!projectData) {
      console.log(`[ProjectRoutes] Project ${id} not found or access denied for user ${userId}`);
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log(`[ProjectRoutes] Returning project:`, projectData.project.id);
    res.json({
      success: true,
      project: projectData.project
    });
  } catch (error) {
    console.error('[ProjectRoutes] Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Set active project for user
router.post('/:projectId/activate', verifyFirebaseToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.uid;

    await updateUserActiveProject(userId, projectId);

    res.json({
      success: true,
      message: 'Active project updated'
    });
  } catch (error) {
    console.error('Error updating active project:', error);
    res.status(500).json({ error: 'Failed to update active project' });
  }
});

// Project details route
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Project ${id} details` });
});

// Update project team
router.post('/:id/team', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { team } = req.body;
    const userId = req.user.uid;

    if (!team || !Array.isArray(team)) {
      return res.status(400).json({ error: 'Team array is required' });
    }

    // Update the project with the new team
    await updateDocument(COLLECTIONS.USER_PROJECTS, id, {
      team: team,
      teamUpdatedAt: Date.now()
    });

    res.json({
      success: true,
      team: team,
      message: 'Team updated successfully'
    });
  } catch (error) {
    console.error('Error updating project team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// get archive project
router.get('/archived', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const archivedProjects = await getArchivedProjects(userId);
    res.json({
      success: true,
      archivedProjects: archivedProjects
    });
  } catch (error) {
    console.error('Error fetching archived projects:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch archived projects' });
  }
});

//archive a project
router.post('/:id/archive', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    await archiveProject(id, userId);

    res.json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: error.message || 'Failed to archive project' });
  }
});

//create a new project
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.uid;
    const userName = req.user.name;
    await createProject(userId, userName, title);
    res.json({
      success: true,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

// generate a new project
router.post('/generate-project', verifyFirebaseToken, async (req, res) => {
  try {
    const { topic } = req.body;  //chosen topic from the list of topics
    const userId = req.user.uid;
    const userName = req.user.name;

    const aiTeammates = [
      AI_AGENTS.rasoa.name,
      AI_AGENTS.rakoto.name,
      AI_AGENTS.alex.name,
    ];

    // Generate AI project
    const aiProject = await generateProjectForTopic(topic);
    const projectId = await createAIGeneratedProject(
      userId, userName, topic, aiProject
    );

    res.status(201).json({
      success: true,
      projectId: projectId,
      project: aiProject,
      message: 'AI-generated project created successfully'
    });
  } catch (error) {
    console.error('Error creating AI project:', error);
    res.status(500).json({ error: error.message || 'Failed to create AI project' });
  }
});


// Get project limits
router.get('/limits', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const canCreate = await canCreateNewProject(userId);
    const activeProject = await getActiveProject(userId);
    const projects = await getUserProjects(userId);
    
    res.json({
      success: true,
      canCreateNew: canCreate,
      hasActiveProject: !!activeProject,
      activeProject: activeProject,
      projectLimits: {
        maxTotal: PROJECT_RULES.MAX_TOTAL_PROJECTS,
        maxActive: PROJECT_RULES.MAX_ACTIVE_PROJECTS,
        currentTotal: projects.length,
        currentActive: projects.filter(p => p.isActive !== false).length
      }
    });
  } catch (error) {
    console.error('Error checking project limits:', error);
    res.status(500).json({ error: 'Failed to check project limits' });
  }
});

// Get project with template data
router.get('/:id/with-template', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const projectData = await getProjectWithTemplate(id, userId);
    
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      project: projectData.project,
      template: projectData.template
    });
  } catch (error) {
    console.error('Error fetching project with template:', error);
    res.status(500).json({ error: 'Failed to fetch project with template' });
  }
});

// Get learning topics
router.get('/topics', verifyFirebaseToken, async (req, res) => {
  try {
    res.json({
      success: true,
      topics: LEARNING_TOPICS
    });
  } catch (error) {
    console.error('Error fetching learning topics:', error);
    res.status(500).json({ error: 'Failed to fetch learning topics' });
  }
});
// Export the router so we can use it in index.js
export default router;
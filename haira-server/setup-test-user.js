// Quick setup script to create test user and project
import { setDocument, addDocument } from './services/databaseService.js';

async function setupTestUser() {
  try {
    
    const testUserId = 'test-user';
    
    // Create test user
    const userData = {
      name: 'Test User',
      email: 'hello@test.com',
      activeProjectId: null,
      summary: {
        xp: 0,
        level: 1,
        totalProjectsCompleted: 0,
        averageGrade: 0,
        achievements: []
      },
      preferences: {
        language: 'en'
      },
      createdAt: Date.now()
    };
    
    await setDocument('users', testUserId, userData);
    
    // Create test project
    const projectData = {
      userId: testUserId,
      title: 'My First Project',
      description: 'This is a test project to get started',
      status: 'active',
      isActive: true,
      startDate: Date.now(),
      team: [{ id: testUserId, name: 'Test User', role: 'owner', type: 'human' }],
      createdAt: Date.now()
    };
    
    const project = await addDocument('userProjects', projectData);
    
    // Update user's active project
    await setDocument('users', testUserId, { activeProjectId: project.id });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupTestUser();


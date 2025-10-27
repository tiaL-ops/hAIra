// Quick setup script to create test user and project
import { setDocument, addDocument } from './services/databaseService.js';

async function setupTestUser() {
  try {
    console.log('🚀 Creating test user and project...');
    
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
    console.log('✅ Test user created');
    
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
    console.log('✅ Test project created:', project.id);
    
    // Update user's active project
    await setDocument('users', testUserId, { activeProjectId: project.id });
    console.log('✅ User active project set');
    
    console.log('\n🎉 Setup complete!');
    console.log('📧 Email: hello@test.com');
    console.log('🔑 Password: password');
    console.log('📁 Project ID:', project.id);
    console.log('\n👉 Now you can login and start using the app!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupTestUser();


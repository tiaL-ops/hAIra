#!/usr/bin/env node

import { getDocuments, deleteDocument, updateDocument } from '../haira-server/services/firebaseService.js';

// Get user ID from command line argument or use default
const USER_ID = process.argv[2] || 'FrbmJMzZhTTRs0Mxau3HkwtIug12';

if (!process.argv[2]) {
  console.log('Usage: node scripts/delete-user-projects-flexible.js <userId>');
  console.log('Example: node scripts/delete-user-projects-flexible.js FrbmJMzZhTTRs0Mxau3HkwtIug12');
  console.log(`Using default user ID: ${USER_ID}`);
}

async function deleteUserProjects() {
  try {
    console.log(`🗑️  Deleting all projects for user: ${USER_ID}`);
    
    // Get all projects for this user
    console.log('📋 Fetching user projects...');
    const userProjects = await getDocuments('USER_PROJECTS', { userId: USER_ID });
    
    if (!userProjects || userProjects.length === 0) {
      console.log(`✅ No projects found for user ${USER_ID}`);
      return;
    }
    
    console.log(`📋 Found ${userProjects.length} projects to delete:`);
    userProjects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${project.id}: ${project.title} (${project.status})`);
    });
    
    // Delete each project
    console.log('\n🗑️  Starting deletion...');
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const project of userProjects) {
      try {
        console.log(`Deleting: ${project.title} (${project.id})`);
        await deleteDocument('USER_PROJECTS', project.id);
        console.log(`✅ Deleted: ${project.title}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${project.title} (${project.id}):`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n📊 Deletion Summary:`);
    console.log(`✅ Successfully deleted: ${deletedCount}`);
    console.log(`❌ Failed to delete: ${failedCount}`);
    console.log(`📋 Total projects: ${userProjects.length}`);
    
    // Clear user's activeProjectId
    console.log('\n🔄 Clearing user\'s activeProjectId...');
    try {
      await updateDocument('USERS', USER_ID, { activeProjectId: null });
      console.log(`✅ Cleared activeProjectId for user ${USER_ID}`);
    } catch (error) {
      console.log(`⚠️  Could not clear activeProjectId: ${error.message}`);
    }
    
    console.log('\n🎉 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
deleteUserProjects();

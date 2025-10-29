// Quick migration script to initialize teammates subcollection
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { initializeTeammates } from './services/teammateService.js';

// Initialize Firebase
const serviceAccount = JSON.parse(
  readFileSync('./config/serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateProject(projectId) {
  try {
    
    // Check if teammates already exist
    const teammatesSnap = await db
      .collection('userProjects')
      .doc(projectId)
      .collection('teammates')
      .get();
    
    if (teammatesSnap.size > 0) {
      return;
    }
    
    // Initialize teammates from team array
    await initializeTeammates(projectId);
    
  } catch (error) {
    console.error(`❌ Error migrating ${projectId}:`, error.message);
  }
}

async function main() {
  const projectIds = process.argv.slice(2);
  
  if (projectIds.length === 0) {
    process.exit(1);
  }
  
  for (const projectId of projectIds) {
    await migrateProject(projectId);
  }
  
  process.exit(0);
}

main();

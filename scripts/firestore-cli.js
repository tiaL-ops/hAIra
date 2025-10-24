#!/usr/bin/env node

//   node scripts/firestore-cli.js <collection> [--id <docId>] [--filter field=value] [--limit N] [--sub <subcollection>] [--delete] [--delete-user <userId>]

import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getDocumentById, getDocuments, queryDocuments, getSubdocuments, deleteDocument, updateDocument } from '../haira-server/services/firebaseService.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Usage: node scripts/firestore-cli.js <collection> [options]

Options:
  --id <docId>           Fetch a specific document by ID (usually a number like '1')
  --filter field=value   Filter documents by field=value
  --limit N              Limit results to N documents
  --sub <subcollection>  Fetch subcollection of a document (requires --id)
  --delete               Delete documents (use with --filter or --id)
  --delete-user <userId> Delete all projects for a specific user
  --clear-active         Clear user's activeProjectId

Examples:
  node scripts/firestore-cli.js userProjects
  node scripts/firestore-cli.js userProjects --id 1
  node scripts/firestore-cli.js userProjects --id 1 --sub chatMessages
  node scripts/firestore-cli.js userProjects --id 1 --sub tasks
  node scripts/firestore-cli.js userProjects --delete-user FrbmJMzZhTTRs0Mxau3HkwtIug12
  node scripts/firestore-cli.js userProjects --filter userId=FrbmJMzZhTTRs0Mxau3HkwtIug12 --delete
  node scripts/firestore-cli.js users --id FrbmJMzZhTTRs0Mxau3HkwtIug12 --clear-active
  `);
  process.exit(1);
}

const collection = args[0];
let docId = null;
let filter = null;
let limit = null;
let subcollection = null;
let shouldDelete = false;
let deleteUserId = null;
let clearActive = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--id' && args[i + 1]) {
    docId = args[i + 1];
    i++;
  } else if (args[i] === '--filter' && args[i + 1]) {
    filter = args[i + 1];
    i++;
  } else if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--sub' && args[i + 1]) {
    subcollection = args[i + 1];
    i++;
  } else if (args[i] === '--delete') {
    shouldDelete = true;
  } else if (args[i] === '--delete-user' && args[i + 1]) {
    deleteUserId = args[i + 1];
    i++;
  } else if (args[i] === '--clear-active') {
    clearActive = true;
  }
}

async function main() {
  try {
    // Case 0: Delete all projects for a specific user
    if (deleteUserId) {
      console.log(`🗑️  Deleting all projects for user: ${deleteUserId}`);
      
      // First, get all projects for this user
      const userProjects = await getDocuments('USER_PROJECTS', { userId: deleteUserId });
      
      if (!userProjects || userProjects.length === 0) {
        console.log(`✅ No projects found for user ${deleteUserId}`);
        return;
      }
      
      console.log(`📋 Found ${userProjects.length} projects to delete:`);
      userProjects.forEach(project => {
        console.log(`  - ${project.id}: ${project.title}`);
      });
      
      // Confirm deletion
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('⚠️  Are you sure you want to delete these projects? (yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled');
        return;
      }
      
      // Delete each project
      let deletedCount = 0;
      for (const project of userProjects) {
        try {
          await deleteDocument('USER_PROJECTS', project.id);
          console.log(`✅ Deleted project: ${project.title} (${project.id})`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete project ${project.id}:`, error.message);
        }
      }
      
      console.log(`🎉 Successfully deleted ${deletedCount}/${userProjects.length} projects`);
      
      // Clear user's activeProjectId
      try {
        await updateDocument('USERS', deleteUserId, { activeProjectId: null });
        console.log(`✅ Cleared activeProjectId for user ${deleteUserId}`);
      } catch (error) {
        console.log(`⚠️  Could not clear activeProjectId: ${error.message}`);
      }
      
      return;
    }
    
    // Case 0.5: Clear user's activeProjectId
    if (clearActive && docId) {
      console.log(`🔄 Clearing activeProjectId for user: ${docId}`);
      try {
        await updateDocument('USERS', docId, { activeProjectId: null });
        console.log(`✅ Cleared activeProjectId for user ${docId}`);
      } catch (error) {
        console.error(`❌ Failed to clear activeProjectId:`, error.message);
      }
      return;
    }
    
    // Case 0.6: Delete with filter
    if (shouldDelete && filter) {
      const [field, value] = filter.split('=');
      console.log(`🗑️  Deleting documents where ${field}=${value}`);
      
      const docs = await getDocuments(collection, { [field]: value });
      
      if (!docs || docs.length === 0) {
        console.log(`✅ No documents found to delete`);
        return;
      }
      
      console.log(`📋 Found ${docs.length} documents to delete:`);
      docs.forEach(doc => {
        console.log(`  - ${doc.id}`);
      });
      
      // Confirm deletion
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('⚠️  Are you sure you want to delete these documents? (yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled');
        return;
      }
      
      // Delete each document
      let deletedCount = 0;
      for (const doc of docs) {
        try {
          await deleteDocument(collection, doc.id);
          console.log(`✅ Deleted document: ${doc.id}`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete document ${doc.id}:`, error.message);
        }
      }
      
      console.log(`🎉 Successfully deleted ${deletedCount}/${docs.length} documents`);
      return;
    }
    
    // Case 0.7: Delete single document
    if (shouldDelete && docId) {
      console.log(`🗑️  Deleting document ${docId} from ${collection}`);
      
      // Confirm deletion
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('⚠️  Are you sure you want to delete this document? (yes/no): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled');
        return;
      }
      
      try {
        await deleteDocument(collection, docId);
        console.log(`✅ Successfully deleted document ${docId}`);
      } catch (error) {
        console.error(`❌ Failed to delete document:`, error.message);
      }
      return;
    }
    
    // Case 1: Fetch a document and its subcollection
    if (docId && subcollection) {
      // First check if the document exists
      const doc = await getDocumentById(collection, docId);
      if (!doc) {
        console.log(`❌ Document '${docId}' not found in '${collection}'. Try running without --id first to see available document IDs.`);
        return;
      }
      
      console.log(`📂 Fetching subcollection '${subcollection}' for document '${docId}' in '${collection}'`);
      const subdocs = await getSubdocuments(collection, docId, subcollection);
      
      if (!subdocs || subdocs.length === 0) {
        console.log(`🙁 No documents found in subcollection '${subcollection}'`);
        console.log(`💡 Available subcollections might include: chatMessages, tasks`);
      } else {
        console.log(`✅ Found ${subdocs.length} documents in subcollection '${subcollection}'`);
        console.log(JSON.stringify(subdocs, null, 2));
      }
      return;
    }
    
    // Case 2: Fetch a single document by ID
    if (docId) {
      console.log(`🔍 Fetching document '${docId}' from '${collection}'`);
      const doc = await getDocumentById(collection, docId);
      
      if (!doc) {
        console.log(`🙁 No document found with ID '${docId}' in '${collection}'`);
      } else {
        console.log(`✅ Found document '${docId}'`);
        console.log(JSON.stringify(doc, null, 2));
      }
      return;
    }

    // Case 3: Fetch documents with filter or limit
    console.log(`📋 Fetching documents from '${collection}'${limit ? ` (limit: ${limit})` : ''}`);
    let docs;
    if (filter) {
      const [field, value] = filter.split('=');
      console.log(`🔍 Filtering by ${field}=${value}`);
      docs = await getDocuments(collection, { [field]: value }, undefined);
    } else {
      docs = await queryDocuments(collection, { limit });
    }
    
    if (!docs || docs.length === 0) {
      console.log('🙁 No documents found.');
    } else {
      console.log(`✅ Found ${docs.length} documents`);
      
      // Extract document IDs for quick reference
      const docIds = docs.map(d => d.id).join(', ');
      console.log(`📝 Document IDs: ${docIds}`);
      
      console.log(JSON.stringify(docs, null, 2));
      
      // Show helpful hints
      if (collection === 'userProjects') {
        console.log(`
💡 Tip: To view subcollections for a specific project:
   node scripts/firestore-cli.js userProjects --id <ID> --sub chatMessages
   node scripts/firestore-cli.js userProjects --id <ID> --sub tasks`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();

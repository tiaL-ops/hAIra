#!/usr/bin/env node

//   node scripts/firestore-cli.js <collection> [--id <docId>] [--filter field=value] [--limit N] [--sub <subcollection>]

import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getDocumentById, getDocuments, queryDocuments, getSubdocuments } from '../haira-server/services/firebaseService.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Usage: node scripts/firestore-cli.js <collection> [options]

Options:
  --id <docId>           Fetch a specific document by ID (usually a number like '1')
  --filter field=value   Filter documents by field=value
  --limit N              Limit results to N documents
  --sub <subcollection>  Fetch subcollection of a document (requires --id)

Examples:
  node scripts/firestore-cli.js userProjects
  node scripts/firestore-cli.js userProjects --id 1
  node scripts/firestore-cli.js userProjects --id 1 --sub chatMessages
  node scripts/firestore-cli.js userProjects --id 1 --sub tasks
  `);
  process.exit(1);
}

const collection = args[0];
let docId = null;
let filter = null;
let limit = null;
let subcollection = null;

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
  }
}

async function main() {
  try {
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

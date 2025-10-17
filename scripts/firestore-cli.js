#!/usr/bin/env node

//   node scripts/firestore-cli.js <collection> [--id <docId>] [--filter field=value] [--limit N]

import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { getDocumentById, getDocuments, queryDocuments } from '../haira-server/services/firebaseService.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/firestore-cli.js <collection> [--id <docId>] [--filter field=value] [--limit N]');
  process.exit(1);
}

const collection = args[0];
let docId = null;
let filter = null;
let limit = null;

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
  }
}

async function main() {
  try {
    if (docId) {
      const doc = await getDocumentById(collection, docId);
      if (!doc) {
        console.log(` 🙁No document found with ID '${docId}' in '${collection}'`);
      } else {
        console.log(JSON.stringify(doc, null, 2));
      }
      return;
    }

    let docs;
    if (filter) {
      const [field, value] = filter.split('=');
      docs = await getDocuments(collection, { [field]: value }, undefined);
    } else {
      docs = await queryDocuments(collection, { limit });
    }
    if (!docs || docs.length === 0) {
      console.log(' 🙁 No documents found.');
    } else {
      console.log(JSON.stringify(docs, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();

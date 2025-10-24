// Simple migration: Use the firestore-cli to initialize teammates
import '../scripts/firestore-cli.js';

const projectId = process.argv[2];

if (!projectId) {
  console.log('❌ Usage: node simple-migrate.js <projectId>');
  console.log('Example: node simple-migrate.js 6I0t7Hj4UDPjiX1a45Il');
  process.exit(1);
}

console.log(`\n📝 To initialize teammates for project ${projectId}:`);
console.log(`\n1. Use the Firestore CLI:`);
console.log(`   node scripts/firestore-cli.js\n`);
console.log(`2. Then run these commands:`);
console.log(`   > use userProjects/${projectId}`);
console.log(`   > collection teammates`);
console.log(`   > add { "id": "75ctzRUGB0cqtPo0UO7NS2bOaxb2", "name": "You", "type": "human", "role": "Project Owner" }`);
console.log(`   > add { "id": "alex", "name": "Alex", "type": "ai", "role": "Code Reviewer", "avatar": "🔍" }`);
console.log(`   > add { "id": "rasoa", "name": "Rasoa", "type": "ai", "role": "Documentation Specialist", "avatar": "📝" }`);
console.log(`   > add { "id": "rakoto", "name": "Rakoto", "type": "ai", "role": "Testing Expert", "avatar": "🧪" }`);
console.log(`\nOR just use the HTTP endpoint to initialize automatically!\n`);

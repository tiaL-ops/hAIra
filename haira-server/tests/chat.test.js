import { expect } from 'chai';
import { db } from '../config/firebase.js';
import Message from '../models/Message.js';

describe('Chat Messages', () => {
  const testProjectId = 'test-project-1';
  let messageRef;

  beforeEach(async () => {
    // Clean up test messages before each test
    const snapshot = await db.collection('messages')
      .where('projectId', '==', testProjectId)
      .get();
    
    await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
  });

  it('should create a new message', async () => {
    const content = 'Hi from test!';
    const message = new Message(testProjectId, content);
    
    messageRef = await db.collection('messages').add(message.toFirestore());
    const doc = await messageRef.get();
    
    expect(doc.exists).to.be.true;
    expect(doc.data().content).to.equal(content);
    expect(doc.data().projectId).to.equal(testProjectId);
  });

  it('should retrieve messages for a project', async () => {
    // Create test messages
    const messages = [
      new Message(testProjectId, 'Message 1'),
      new Message(testProjectId, 'Message 2')
    ];

    await Promise.all(messages.map(msg => 
      db.collection('messages').add(msg.toFirestore())
    ));

    // Retrieve and verify
    const snapshot = await db.collection('messages')
      .where('projectId', '==', testProjectId)
      .orderBy('timestamp', 'asc')
      .get();

    expect(snapshot.docs).to.have.lengthOf(2);
    expect(snapshot.docs[0].data().content).to.equal('Message 1');
    expect(snapshot.docs[1].data().content).to.equal('Message 2');
  });

  after(async () => {
    // Final cleanup
    const snapshot = await db.collection('messages')
      .where('projectId', '==', testProjectId)
      .get();
    
    await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
  });
});
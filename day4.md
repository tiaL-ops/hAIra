ok so last day of basics! toafay Database and API call!

We gonna use Firestore database.
For that use the haira-devserviceAcountjson sent to you and put it in haira-server/config 
improtant , redouble cjeck gitignore, NEVER push it to commit!!

### database
les first establish our schema ( how teh data base will ook like , thisi is a imsple exmaple)


export const COLLECTIONS = {
  MESSAGES: 'messages'
};
export const MESSAGE_SCHEMA = {
  projectId: 'string',
  content: 'string',
  timestamp: 'number'
};

thatm ean our collection is messgaes and waht it containt is projectId, content, timetsamt

example in picture how i t til look like in firstore




goal : now we have our schema, 
let's refine our front end to send message to back , a text possible, send it to frieabse, and back confirming a answer. 

Before now you shoult de familair with https method Post , Get, put, delete, (try to look at https://api7.ai/learning-center/api-101/http-methods-in-apis) if not


now in our routes we want to get the message from front end 

sencond let's ee our firebase service

we had differnt function 
buildcredentail that extract our key fronm service account to have access 
db is getting our database

now function, adddocument is adding our doc tto firebase

notice add is when you do not have id and wantfirebase hae i for you

set when uou have id

update , delet...
getdocuments when u want all results

specific wraper getchats, add chat that use class end add document 

now in models/chsatmodels.js

i ceate a constructor  and tofirestore tobe like the one database,js

toFirestore() {
    // Always use schema from database.js
    const doc = {};
    for (const key of Object.keys(CHAT_SCHEMA)) {
      doc[key] = this[key];
    }
    return doc;
  }

static fromFirestore(snapshot) {
    const data = snapshot.data();
    return new Chat(data.projectId, data.content, data.timestamp);
  }



  now router
we had our 
router.get('/:id/chat', async (req, res)=>....
and instead of jsut meassage(hi form back)
 we use a message taht was in getmessgaes
we wanna request our messahe , and res as json messages 

then we wanna  send it to firebase and add a message 

so we post it.

now we req that paramet 
router.post('/:id/chat', async (req, res) 

again, this time content too.

const { id } = req.params;
  const { content } = req.body;

and we use addMessage from firebase ( we ll get ther soon)
so by
const result = await addMessage(id, content);
    res.status(201).json({
      success: true,
      message: 'Message sent to Firebase',
      data: result

      we sent it to firebase and haev a new meesage : message sent to firebase



  finallu front 
  we added const { id } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
modified to have small box and send


lastly to see your firebase 
node scripts/firestore-cli.js <collection> [--id <docId>] [--filter field=value] [--limit N]


for example
node scripts/firestore-cli.js chat

Firebase initialized
[
  {
    "id": "Sy2L8bErnzQ4osqB7ajy",
    "projectId": "2",
    "content": "oulala",
    "timestamp": 1760727116939
  },
  {
    "id": "kq5PLm1FJg13rvvoh4m9",
    "projectId": "1",
    "content": "hi 1",
    "timestamp": 1760727101576
  }
]
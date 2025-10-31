### Haira : A Human-AI teaming platform for developing research and collaboration skills.


> The name hAIra is derived from the Malagasy word “hay raha,” which translates as "the ability to create and critique art".

**Authors:**

  * **Landy Rakotoarison** (Computer Science Student '26)
  * **Fanamby Randri** (Data Scientist - Machine Learning Engineer)

---
### Project Overview

Generative AI is a great learning tool, but if we rely on it too much, it can make us think less and work together less. (Guilty ourselves :D) 
hAIra is a web platform built to change that , it helps students elevate problem-solving skills by practicing short term work with Ideal and non-ideal AI as a partner.

Using Chrome’s built-in AI, Google’s Gemini API, and Firebase, hAIra creates short, realistic projects where students and AI teammates work together and get feedback from an AI project manager.

**Our goal is to help people think better — not less — in the age of AI**


----

### Tech Stack

  * **AI (Client):** Chrome AI APIs (Writer, Proofreader, Summarizer)
  * **AI (Server):** Google's Gemini Developer API
  * **Frontend:** React
  * **Backend:** Node.js, Express
  * **Database:** Firebase (Firestore)


----

### Core Features & Dependencies

hAIra is built with a "local-first" and "fallback" philosophy, ensuring it runs even without server-side keys.

#### 1\. Dynamic AI Mode (Automatic Fallback)

The app automatically selects the best available AI provider:

1.  **Chrome AI (Client-Side):** The app will **always** try to use the browser's built-in `window.ai` APIs first for tasks like writing and proofreading.
2.  **Gemini (Server-Side):** If Chrome AI is unavailable, it falls back to the server-side `GEMINI_API_KEY` (required for multi-agent chat).
3.  **OpenAI (Server-Side):** If Gemini is unavailable, it will use the `OPENAI_API_KEY` as a final fallback.
4.  **No AI:** If no keys or browser support are found, all AI features are gracefully disabled.

#### 2\. Dynamic Storage Mode (Automatic Fallback)

The app automatically switches between a cloud database and local storage:

1.  **Firebase Mode (Production):** If a valid `serviceAccountKey.json` is found in the `haira-server/config` folder, the app will use Cloud Firestore for data storage and Firebase Auth.
2.  **localStorage Mode (Development):** If the service account key is **not** found, the app automatically runs in a local-only mode. All data is stored in your browser's `localStorage`, and you are auto-logged in as a `test-user`. This is perfect for development and testing.

----

### Quick Start

#### Prerequisites

  * Node.js (v16 or higher)
  * npm or yarn
  * Git

#### Installation & Setup

1.  **Clone the repository**

    ```bash
    git clone https://github.com/tiaL-ops/hAIra.git
    cd hAIra
    ```

2.  **Install dependencies** (for root, client, and server)

    ```bash
    npm install
    cd haira-client
    npm install
    cd ../haira-server
    npm install
    cd .. 
    ```

3.  **Configure Server**

      * Navigate to the server directory: `cd haira-server`
      * Create an environment file: `touch .env`
      * Add your API keys to the `.env` file (see `haira-server/.env.example` for all required variables).
        ```ini
        # Example: haira-server/.env
        GEMINI_API_KEY="your_gemini_key_here"
        OPENAI_API_KEY="your_openai_key_here"
        ```

4.  **Choose Storage Mode (Optional)**

      * **For Production (Firebase):**
        1.  Go to your Firebase project settings \> Service Accounts.
        2.  Generate a new private key and download the JSON file.
        3.  Rename the file to `serviceAccountKey.json`.
        4.  Place it in the `haira-server/config/` directory.
      * **For Development (localStorage):**
        1.  **Do nothing.** Just make sure there is no `serviceAccountKey.json` file in the `config` folder. The app will automatically fall back to this mode.

5.  **Start the application**

      * From the **root** directory:

    <!-- end list -->

    ```bash
    npm run dev
    ```

6.  **Access the application**

      * **Frontend:** `http://localhost:5173`
      * **Backend API:** `http://localhost:3002`

> **Note:** In `localStorage` mode, the app automatically logs you in with a default **`test-user`**.

----

###  Project Structure

```
hAIra/
├── haira-client/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── haira-server/         # Node.js backend
│   ├── api/              # AI service integrations
│   ├── config/           # Config files (serviceAccountKey.json goes here)
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── package.json
└── README.md
```

-----

### Available Scripts

#### Root

```bash
npm run dev     # Starts both client and server concurrently
```

#### Client (`haira-client`)

```bash
npm run dev     # Start development server
npm run build   # Build for production

```

#### Server (`haira-server`)

```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
```

-----

### Deployment

#### Firebase Hosting (Recommended)

1.  Install Firebase CLI: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize: `firebase init`
4.  Deploy: `firebase deploy`

#### Other Platforms ( why but okay)

1.  Build the client: `cd haira-client && npm run build`
2.  Deploy the static `dist` folder to your hosting platform.
3.  Deploy the `haira-server` directory to your preferred Node.js hosting service (like Render, Heroku, or a VPS).

----

### Database Schema

The app uses a flexible Firestore schema with the following collections and detailed field structures:

### Main Collections

**`users`** - User profiles and settings

```javascript
{
  name: String,
  email: String,
  avatarUrl: String,
  activeProjectId: String,
  summary: {
    xp: Number,
    level: Number,
    totalProjectsCompleted: Number,
    averageGrade: Number,
    achievements: Array
  },
  preferences: {
    language: String
  }
}
```

**`userProjects`** - User project instances

```javascript
{
  userId: String,
  templateId: String,
  title: String,
  status: String,       // "started", "in-progress", "submitted", "graded"
  startDate: Number,
  team: Array,
  isActive: Boolean,
  deadline: Number,
  draftReport: {
    content: String,
    lastSaved: Number
  },
  finalReport: {
    content: String,
    submittedAt: Number
  },
  finalReflection: String,
  grade: {
    overall: Number,
    workPercentage: Number,
    responsiveness: Number,
    reportQuality: Number
  }
}
```

**`projectTemplates`** - Reusable project templates

```javascript
{
  title: String,
  description: String,
  topic: String,
  durationDays: Number,
  managerName: String,
  deliverables: Array,
  availableTeammates: Array,
  usageCount: Number
}
```

#### Subcollections

**`userProjects/{projectId}/chatMessages`**

```javascript
{
  senderId: String,
  senderName: String,
  senderType: String,   // 'human' | 'ai'
  text: String,
  timestamp: Number,
  messageType: String   // 'regular', 'checkin', 'sleep_response'
}
```

**`userProjects/{projectId}/tasks`**

```javascript
{
  title: String,
  assignedTo: String,
  status: String,       // "todo", "in-progress", "done"
  description: String,
  createdAt: Number,
  priority: Number      // 1: Low, 2: Medium, 3: High
}
```

**`userProjects/{projectId}/teammates`**

```javascript
{
  id: String,
  name: String,
  type: String,         // 'ai' | 'human'
  role: String,
  avatar: String,
  config: {             // AI-only config
    prompt: String,
    activeDays: Array,
    activeHours: { start: Number, end: Number },
    sleepResponses: Array
  },
  state: {
    status: String,     // 'online' | 'offline'
    messagesLeftToday: Number
  }
}
```

###  API Documentation

The hAIra backend provides a REST API for all frontend operations.

#### Base URL

  * **Development**: `http://localhost:3002/api`
  * **Production**: `https://your-domain.com/api`

#### Authentication

Most endpoints require a Firebase ID token in the `Authorization: Bearer ${token}` header.

#### Core Endpoints

##### **Projects** (`/api/project`)

  * **GET `/`**: Get all user projects
  * **POST `/`**: Create new project
  * **GET `/:id`**: Get specific project
  * **POST `/:id/activate`**: Activate project
  * **POST `/:id/archive`**: Archive project
  * **POST `/generate-project`**: Generate AI project

##### **Chat** (`/api/project`)

  * **GET `/:id/chat`**: Get project chat messages
  * **POST `/:id/chat`**: Send chat message
  * **POST `/:id/init-teammates`**: Initialize AI teammates

##### **Submission** (`/api/project`)

  * **GET `/:id/submission`**: Get project submission data
  * **POST `/:id/submission/draft`**: Save draft report
  * **POST `/:id/submission`**: Submit final report

##### **AI Features** (`/api/project`)

  * **POST `/:id/ai/write`**: AI writing assistance
  * **POST `/:id/ai/proofread`**: AI proofreading
  * **POST `/:id/ai/summarize`**: AI summarization
  * **POST `/:id/ai/reflect`**: AI content reflection
  * **POST `/:id/ai/review`**: AI content review
  * **POST `/:id/ai/suggest`**: AI suggestions

##### **Kanban** (`/api/project`)

  * **GET `/:id/kanban`**: Get project tasks
  * **POST `/:id/tasks`**: Create new task
  * **PUT `/:id/tasks`**: Update task
  * **DELETE `/:id/tasks`**: Delete task

##### **Profile** (`/api/profile`)

  * **GET `/`**: Get user profile
  * **PATCH `/preferences`**: Update user preferences

##### **System** (`/api`)

  * **GET `/config`**: Get system configuration (storage mode, etc.)



###  Contributing ( Welcome!)

1.  Fork the repository
2.  Create a feature branch: `git checkout -b feature-name`
3.  Commit changes: `git commit -am 'Add feature'`
4.  Push to branch: `git push origin feature-name`
5.  Submit a pull request

----

### License

This project is licensed under the **GNU General Public License v3.0 or later (GPL-3.0+).**

This is a **copyleft** license. If you modify, distribute, or create a derivative work of this software, you **must** release your version under the same license, ensuring the code and its modifications remain free and open for everyone.

See the **`COPYING`** file for the full license text.

----

### Troubleshooting

#### Common Issues

**Port already in use:**

```bash
# Kill process on port 5173 (client)
lsof -ti:5173 | xargs kill -9

# Kill process on port 3002 (server)
lsof -ti:3002 | xargs kill -9
```

**Firebase connection issues:**

  * Ensure `serviceAccountKey.json` is in `haira-server/config/`.
  * Verify your Firebase project has Firestore enabled.

**AI features not working:**

  * Verify your API keys are set correctly in `haira-server/.env`.
  * Check the server console logs for AI configuration status on startup.
  * Ensure your API accounts have sufficient credits.

### Getting Help

If you encounter issues, please check the console logs, verify your environment variables, and ensure all dependencies are installed before opening an issue.

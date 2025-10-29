# hAIra - Human-AI Teaming Platform for Research and Collaboration Skills Development

> The name hAIra is derived from the Malagasy word “hay raha” which translates as "the ability to create and critique art".

**Authors:**

  * **Landy Rakotoarison**
  * **Fanamby Randri**

-----

## 💡 Project Overview

Generative Artificial Intelligence (AI) has become a powerful learning companion but risks diminishing students’ cognitive and collaborative skills if used passively. We present hAIra, an educational web platform designed to strengthen cognitive skills in the age of AI. hAIra integrates Chrome AI APIs (via client side), along with Google’s Gemini Developer API and Firebase to simulate realistic, short-term industry-style projects where students collaborate with AI teammates and are graded by an AI project manager.
The platform aims to enhance critical thinking, collaboration, and AI literacy. **With hAIra, we aim to help humans think better, not less.**

-----

## 💻 Tech Stack

  * Chrome AI APIs (via client side)
  * Google's Gemini Developer API
  * Firebase
  * React
  * Node.js
  * Express
  * Firebase

-----

## 🛑 Important Note on Non-Free Dependencies

While the hAIra source code is released under a free and open license (**GNU GPL-3.0+**), running the application with its full functionality **requires proprietary, non-free services** from third parties.

To enable the core AI teammate and grading features, you must obtain and use API keys for:

  * **OpenAI**
  * **Google Gemini**
  * **Firebase Service Account Key**

Without these keys, the application can run in a limited **localStorage Mode** but will not execute the multi-agent collaboration and feedback features that are central to the project's educational goals. We encourage contributors to explore and develop free alternatives.

-----

## 🚀 Quick Start

### Prerequisites

  - Node.js (v16 or higher)
  - npm or yarn
  - Git

### Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd hAIra
    ```

2.  **Install dependencies**

    ```bash
    # Install root dependencies
    npm install

    # Install client dependencies
    cd haira-client
    npm install

    # Install server dependencies
    cd ../haira-server
    npm install
    ```

3.  **Configure environment variables**

    Create a `.env` file in the `haira-server` directory:

    ```bash
    cd haira-server
    touch .env
    ```

    Add the following environment variables to `haira-server/.env`:

    ```env
    # AI Service Configuration
    OPENAI_API_KEY=your_openai_api_key_here
    GEMINI_API_KEY=your_gemini_api_key_here

    # Firebase Configuration (Optional - for production)
    FIREBASE_PROJECT_ID=your_firebase_project_id
    FIREBASE_CLIENT_EMAIL=your_firebase_client_email
    FIREBASE_PRIVATE_KEY=your_firebase_private_key

    # Server Configuration
    NODE_ENV=development
    PORT=3002
    ```

4.  **Configure Firebase (Optional)**

    **Option A: Use Firebase (Production)**

      * Place your Firebase service account key at: `haira-server/config/serviceAccountKey.json`
      * The app will automatically detect Firebase and use it for data storage

    **Option B: Use localStorage (Development)**

      * Remove or rename the service account key file
      * The app will automatically fall back to localStorage mode
      * Perfect for development and testing

5.  **Start the application**

    **Terminal 1 - Start the server:**

    ```bash
    cd haira-server
    npm run dev
    # or
    npm start
    ```

    **Terminal 2 - Start the client:**

    ```bash
    cd haira-client
    npm run dev
    ```

6.  **Access the application**

      * Frontend: `http://localhost:5173`
      * Backend API: `http://localhost:3002`

-----

## 🔧 Configuration

### Environment Variables

#### Required for AI Features

  - `OPENAI_API_KEY`: Your OpenAI API key for AI-powered features
  - `GEMINI_API_KEY`: Your Google Gemini API key (fallback or primary)

#### Optional Firebase Configuration

  - `FIREBASE_PROJECT_ID`: Your Firebase project ID
  - `FIREBASE_CLIENT_EMAIL`: Firebase service account email
  - `FIREBASE_PRIVATE_KEY`: Firebase service account private key

#### Server Configuration

  - `NODE_ENV`: Environment mode (development/production)
  - `PORT`: Server port (default: 3002)

### Chrome AI API Integration (Gemini Nano)

hAIra includes built-in support for Chrome's native AI APIs, providing a local fallback when server-side AI services are unavailable.

#### Prerequisites for Chrome AI

  - **Chrome Browser**: Version 126+ with AI features enabled
  - **Chrome Flags**: Enable experimental AI features
  - **User Activation**: Required for Chrome AI API calls

#### Enabling Chrome AI Features

1.  **Enable Chrome AI Flags**:

    ```bash
    # Start Chrome with AI flags enabled
    google-chrome --enable-features=ChromeAIPlatform,ChromeAIPlatformWriter,ChromeAIPlatformProofreader,ChromeAIPlatformSummarizer
    ```

2.  **Verify Chrome AI Availability**:

      * Open Chrome DevTools Console
      * Check for `window.Writer`, `window.Proofreader`, and `window.Summarizer` APIs
      * The app automatically detects and uses Chrome AI when available

#### Automatic Fallback

  - Chrome AI unavailable $\rightarrow$ Falls back to server-side Gemini
  - Server-side Gemini unavailable $\rightarrow$ Falls back to OpenAI
  - All APIs unavailable $\rightarrow$ AI features disabled

#### Official Documentation

For more details on using the Chrome AI APIs, refer to the official developer documentation:

  * **Built-in APIs Overview:** [developer.chrome.com/docs/ai/built-in-apis](https://developer.chrome.com/docs/ai/built-in-apis)
  * **Writer API:** [developer.chrome.com/docs/ai/writer-api](https://developer.chrome.com/docs/ai/writer-api)
  * **Proofreader API:** [developer.chrome.com/docs/ai/proofreader-api](https://developer.chrome.com/docs/ai/proofreader-api)
  * **Summarizer API:** [developer.chrome.com/docs/ai/summarizer-api](https://developer.chrome.com/docs/ai/summarizer-api)

### Firebase Setup (Optional)

1.  **Create a Firebase project** at [https://console.firebase.google.com](https://console.firebase.google.com)
2.  **Enable Firestore Database**
3.  **Create a service account:**
      * Go to Project Settings \> Service Accounts
      * Click "Generate new private key"
      * Download the JSON file
      * Rename it to `serviceAccountKey.json`
      * Place it in `haira-server/config/`

### AI Service Configuration

The app supports multiple AI providers with automatic fallback:

**AI Mode Detection:**

  - If both keys are present: Uses OpenAI as primary, Gemini as fallback
  - If only Gemini key is present: Uses Gemini only
  - If no keys are present: AI features will be disabled

-----

## 📁 Project Structure

```
hAIra/
├── haira-client/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── styles/        # CSS styles
│   ├── package.json
│   └── vite.config.js
├── haira-server/          # Node.js backend API
│   ├── api/               # AI service integrations
│   ├── config/            # Configuration files
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   └── package.json
└── README.md
```

-----

## ▶️ Available Scripts

### Client (haira-client)

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server (haira-server)

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

-----

## 🔄 Storage Modes

The application automatically detects and switches between storage modes:

### Firebase Mode

  - **When**: Firebase service account key is present
  - **Storage**: Cloud Firestore database
  - **Authentication**: Firebase Auth
  - **Best for**: Production deployment

### localStorage Mode

  - **When**: No Firebase credentials found
  - **Storage**: Browser localStorage + local JSON file
  - **Authentication**: Auto-login with test user
  - **Best for**: Development and testing

-----

## 🧪 Testing

### Default Test User (localStorage mode)

  - **UID**: `test-user`
  - **Email**: `test@example.com`
  - **Name**: `Test User`
  - **Password**: Not needed (auto-login)

-----

## 🚀 Deployment

### Firebase Hosting (Recommended)

1.  Install Firebase CLI: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize: `firebase init`
4.  Deploy: `firebase deploy`

### Other Platforms

  - Build the client: `cd haira-client && npm run build`
  - Deploy the `dist` folder to your hosting platform
  - Deploy the server to your preferred Node.js hosting service

-----

## 🗄️ Database Schema

The app uses a flexible Firestore schema with the following collections and detailed field structures:

### Main Collections

**`users`** - User profiles and settings

```javascript
{
  // Basic Info
  name: String,                    // User's display name
  email: String,                   // User's email address
  avatarUrl: String,               // Profile picture (base64 or URL)
  notifications: Array,            // User notifications
  
  // State
  activeProjectId: String,         // Reference to user's current active project
  
  // Profile Summary
  summary: {
    xp: Number,                    // Total XP (sum of all grades)
    level: Number,                 // Calculated from XP
    totalProjectsCompleted: Number,
    averageGrade: Number,
    achievements: Array            // e.g. ["first_project", "team_leader"]
  },
  
  // User Settings
  preferences: {
    language: String               // 'en' | 'fr'
  }
}
```

**`userProjects`** - User project instances (main collection)

```javascript
{
  // Basic Info
  userId: String,                  // Reference to the user who owns this project
  templateId: String,              // Reference to the template this project is based on
  title: String,                   // Project title
  status: String,                  // "started", "in-progress", "submitted", "graded"
  startDate: Number,               // Timestamp when project was started
  dailyMeetingTime: String,        // Preferred meeting time
  team: Array,                     // Array of team members (user and AI)
  
  // Project Management
  isActive: Boolean,               // true for active project, false for archived
  deadline: Number,                // 7-day deadline timestamp
  archivedAt: Number,              // When project was archived (null if not archived)
  
  // Content
  draftReport: {
    content: String,               // Draft project report (autosaved)
    lastSaved: Number
  },
  finalReport: {
    content: String,               // Final project submission
    submittedAt: Number
  },
  
  // Comments and Feedback
  comments: Array,                 // Array of comment objects
  commentsLastSaved: Number,       // Timestamp of last comment save
  finalReflection: String,         // AI-generated reflection
  reflectionUpdatedAt: Number,     // When reflection was last updated
  
  // Grading
  grade: {
    overall: Number,               // Overall project grade
    workPercentage: Number,        // Work percentage grade
    responsiveness: Number,        // Responsiveness grade
    reportQuality: Number          // Report quality grade
  }
}
```

**`projectTemplates`** - Reusable project templates

```javascript
{
  // Basic Info
  title: String,                   // Template name (e.g., "Product Design")
  description: String,             // Description of the project
  topic: String,                   // Project topic
  durationDays: Number,            // Expected duration in days
  managerName: String,             // Name of the AI project manager
  deliverables: Array,             // Array of required deliverables
  availableTeammates: Array,       // Array of AI teammates that can be selected
  createdAt: Number,               // Timestamp when the template was created
  
  // Template Reuse Tracking
  usedBy: Array,                   // Array of user IDs who have used this template
  usageCount: Number,              // Total number of times this template has been used
  lastUsed: Number,                // Timestamp of last usage (null if never used)
  isReusable: Boolean,             // Whether this template can be reused (default: true)
  maxReuses: Number                // Maximum number of reuses allowed (null for unlimited)
}
```

### Subcollections

**`userProjects/{projectId}/chatMessages`** - Project chat messages

```javascript
{
  senderId: String,                // ID of the sender ('user', 'rasoa', 'rakoto')
  senderName: String,              // Display name of the sender
  senderType: String,              // Type of sender ('human' or 'ai')
  text: String,                    // Message content
  timestamp: Number,               // Message timestamp
  reaction: String,                // Optional AI reaction to messages
  systemPrompt: String,            // System prompt used for AI messages
  isActiveHours: Boolean,          // Whether message was sent during AI active hours
  messageType: String              // Type of message ('regular', 'checkin', 'sleep_response')
}
```

**`userProjects/{projectId}/tasks`** - Project tasks

```javascript
{
  title: String,                   // Task title
  assignedTo: String,              // User or AI ID this task is assigned to
  status: String,                  // Task status ("todo", "in-progress", "done")
  description: String,             // Detailed description of the task
  createdAt: Number,               // Timestamp when task was created
  completedAt: Number,             // Timestamp when task was completed
  priority: Number                 // 1: Low, 2: Medium, 3: High, 4: Very High
}
```

**`userProjects/{projectId}/teammates`** - Project team members

```javascript
{
  // Identity
  id: String,                      // Unique teammate ID ('ai_manager', 'ai_helper', or userId)
  name: String,                    // Display name (e.g., "Alex (Project Manager)")
  type: String,                    // Teammate type: 'ai' | 'human'
  role: String,                    // Role in project (e.g., "Project Manager", "owner")
  
  // UI Properties
  avatar: String,                  // Avatar path or URL (e.g., "/src/images/Alex.png")
  color: String,                   // Color code for UI display (e.g., "#9b59b6")
  
  // AI Configuration (null for human teammates)
  config: {
    maxTokens: Number,             // Max tokens for AI response
    temperature: Number,           // AI temperature setting
    emoji: String,                 // Representative emoji
    personality: String,           // Personality traits
    prompt: String,                // Full system prompt for AI agent
    isActive: Boolean,             // Whether AI agent is currently active
    activeDays: Array,             // Days when AI is active (e.g., [1, 3, 6])
    activeHours: {
      start: Number,               // Start hour in UTC
      end: Number                  // End hour in UTC
    },
    maxMessagesPerDay: Number,     // Daily message limit
    sleepResponses: Array          // Array of responses when AI is offline
  },
  
  // Current State
  state: {
    status: String,                // Current status: 'online' | 'offline' | 'busy'
    currentTask: String,           // ID of current task being worked on
    assignedTasks: Array,          // Array of task IDs currently assigned
    lastActive: Number,            // Timestamp of last activity
    messagesLeftToday: Number      // Remaining daily message quota
  },
  
  // Statistics
  stats: {
    tasksAssigned: Number,         // Total number of tasks ever assigned
    tasksCompleted: Number,        // Total number of tasks completed
    messagesSent: Number,          // Total number of messages sent
    wordsContributed: Number       // Total words contributed to report
  }
}
```

**`users/{userId}/notifications`** - User notifications

```javascript
{
  type: Number,                    // Type 1: task deadline
  message: String,                 // Notification message
  sentAt: Date                     // When notification was sent
}
```

-----

## 📡 API Documentation

The hAIra backend provides a comprehensive REST API for all frontend operations. All endpoints require Firebase authentication unless otherwise specified.

### Base URL

  - **Development**: `http://localhost:3002/api`
  - **Production**: `https://your-domain.com/api`

### Authentication

Most endpoints require a Firebase ID token in the `Authorization` header:

```javascript
headers: {
  'Authorization': `Bearer ${firebaseIdToken}`,
  'Content-Type': 'application/json'
}
```

### Core Endpoints

#### **Projects** (`/api/project`)

  * **GET `/`**: Get all user projects
  * **POST `/`**: Create new project
  * **GET `/:id`**: Get specific project
  * **POST `/:id/activate`**: Activate project
  * **POST `/:id/archive`**: Archive project
  * **POST `/generate-project`**: Generate AI project

#### **Chat** (`/api/project`)

  * **GET `/:id/chat`**: Get project chat messages
  * **POST `/:id/chat`**: Send chat message
  * **POST `/:id/init-teammates`**: Initialize AI teammates

#### **Submission** (`/api/project`)

  * **GET `/:id/submission`**: Get project submission data
  * **POST `/:id/submission/draft`**: Save draft report
  * **POST `/:id/submission`**: Submit final report

#### **AI Features** (`/api/project`)

  * **POST `/:id/ai/write`**: AI writing assistance
  * **POST `/:id/ai/proofread`**: AI proofreading
  * **POST `/:id/ai/summarize`**: AI summarization
  * **POST `/:id/ai/reflect`**: AI content reflection
  * **POST `/:id/ai/review`**: AI content review
  * **POST `/:id/ai/suggest`**: AI suggestions

#### **Kanban** (`/api/project`)

  * **GET `/:id/kanban`**: Get project tasks
  * **POST `/:id/tasks`**: Create new task
  * **PUT `/:id/tasks`**: Update task
  * **DELETE `/:id/tasks`**: Delete task

#### **Profile** (`/api/profile`)

  * **GET `/`**: Get user profile
  * **PATCH `/preferences`**: Update user preferences

#### **System** (`/api`)

  * **GET `/config`**: Get system configuration (storage mode, etc.)

-----

## 🤝 Contributing

1.  Fork the repository
2.  Create a feature branch: `git checkout -b feature-name`
3.  Commit changes: `git commit -am 'Add feature'`
4.  Push to branch: `git push origin feature-name`
5.  Submit a pull request

-----

## 📝 License

This project is licensed under the **GNU General Public License v3.0 or later (GPL-3.0+).**

This is a **copyleft** license. If you modify, distribute, or create a derivative work of this software, you **must** release your version under the same license, ensuring the code and its modifications remain free and open for everyone.

See the **`COPYING`** file in the root directory for the full license text.

-----

## 🆘 Troubleshooting

### Common Issues

**Port already in use:**

```bash
# Kill process on port 5173 (client)
lsof -ti:5173 | xargs kill -9

# Kill process on port 3002 (server)
lsof -ti:3002 | xargs kill -9
```

**Firebase connection issues:**

  - Check that `serviceAccountKey.json` is in the correct location
  - Verify Firebase project settings
  - Check environment variables

**AI features not working:**

  - Verify API keys are set in environment variables
  - Check console logs for AI configuration status
  - Ensure you have sufficient API credits

### Getting Help

If you encounter issues:

1.  Check the console logs for error messages
2.  Verify all environment variables are set correctly
3.  Ensure all dependencies are installed
4.  Check that both client and server are running

-----

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.

**Happy coding\! 🎉**
# Agentic Legal Research Assistant

![Demo](https://github.com/nitij-taneja/A2A_LEGAL_RESEARCH/blob/main/agentic-legal-research_q7LIi0wV%20(online-video-cutter.com).gif)

A cutting-edge multi-agent AI platform showcasing advanced agentic patterns for legal case research. Watch as three specialized agents collaborate in real-time to research, synthesize, and deliver legal verdicts with complete transparency.

Live Link : https://a2a-legal-research.onrender.com

Video : https://drive.google.com/file/d/1lecZkFzPeMvg1O229anmLA-gjI1wmCY2/view?usp=sharing

## 🎯 Key Features

- **Multi-Agent Collaboration** - Three specialized agents (Lawyer, Web Researcher, Research Associate) work together seamlessly
- **Real-Time Visualization** - Node-based workflow diagram showing agent states and execution flow
- **Complete Transparency** - Detailed execution logs showing every agent action, decision, and reasoning
- **Gemini LLMs** - Unified Gemini models across all agents for consistent reasoning
- **Legal Research Integration** - Tavily API for finding relevant case law and statutes
- **Public Demo (No Auth)** - Fully accessible without sign-in
- **Agent-to-Agent (A2A) Protocol** - Structured inter-agent messaging for coordination, data handoff, and accountability
- **Professional UI** - Responsive design with Tailwind CSS and shadcn/ui components

## 🏗️ Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────┐
│                  Lawyer Agent (Gemini)              │
│         Coordinator | Goal Setting | Verdict        │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│ Web Researcher   │    │ Research Associate   │
│ (Gemini + Tavily)│    │ (Gemini)             │
│ Search Executor  │    │ Synthesizer          │
└──────────────────┘    └──────────────────────┘
```


### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Backend | Express 4 + tRPC 11 + Node.js |
| Database | SQLite + Drizzle ORM |
| LLMs | Google Gemini |
| Search | Tavily API + DuckDuckGo |
| Auth | None (public demo) |

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd agentic_legal_showcase
pnpm install
```

### 2. Configure Environment

Set the following environment variables:

```bash
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
DATABASE_URL=./local.db
JWT_SECRET=your_secret_key
```

### 3. Setup Database

```bash
pnpm db:push
```

### 4. Start Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` to access the application.

## 📖 Usage Guide

### Creating a Case

1. Click "Start New Research" on the dashboard
2. Fill in:
   - **Case Title** - Descriptive name (e.g., "Smith v. Jones - Contract Dispute")
   - **Description** - Optional context
   - **Legal Query** - The specific legal question to research
3. Click "Create Case"

### Executing the Workflow

1. Select your case from the list
2. Click the green "Execute" button
3. Watch the three agents collaborate:
   - **Lawyer Agent** initiates and coordinates
   - **Web Researcher Agent** searches for precedents (Gemini + Tavily)
   - **Research Associate Agent** synthesizes findings (Gemini)

### Viewing Results

- **Execution Trace** - Real-time log of all agent actions
- **Workflow Visualization** - Node diagram showing agent states
- **Final Results** - Summary, recommendations, and detailed findings

## 🔧 Core Components

### Backend (server/)

**agents.ts** - Multi-agent system implementation
- `webResearcherAgent()` - Searches for legal precedents
- `researchAssociateAgent()` - Synthesizes findings
- `lawyerAgent()` - Coordinates and delivers verdict
- `executeLegalResearchWorkflow()` - Orchestrates execution

**db.ts** - Database helpers
- Case management (create, list, get, update status)
- Agent log tracking (add, retrieve)
- Results storage and retrieval

**routers.ts** - tRPC procedures
- `cases.create` - Create new case
- `cases.execute` - Execute workflow
- `agentLogs.getByCaseId` - Retrieve logs
- `results.getByCaseId` - Get verdict

### Frontend (client/src/)

**pages/Home.tsx** - Landing page with feature showcase
**pages/Research.tsx** - Main research interface with:
- Case creation form
- Node-based workflow visualization
- Real-time execution trace
- Results display

## 📊 Database Schema

### Cases Table
```sql
CREATE TABLE cases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Agent Logs Table
```sql
CREATE TABLE agentLogs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  caseId INT NOT NULL,
  agentName VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  input TEXT,
  output TEXT,
  reasoning TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Results Table
```sql
CREATE TABLE results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  caseId INT NOT NULL,
  summary TEXT,
  findings JSON,
  precedents JSON,
  statutes JSON,
  recommendation TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 Security

- **OAuth Authentication** - Manus OAuth for secure user management
- **Protected Procedures** - All sensitive operations require authentication
- **Environment Variables** - API keys stored securely in environment
- **Input Validation** - All user inputs validated before processing
- **Rate Limiting** - Implement rate limits on LLM API calls

## 📈 Performance

- **Database Indexing** - Optimized queries with proper indexes
- **Lazy Loading** - Frontend code splitting for faster load times
- **Caching** - LLM response caching for common queries
- **Async Processing** - Non-blocking agent execution





### Example Test Case

**Query:** "What are the liability standards for breach of contract in commercial law?"

**Expected Flow:**
1. Lawyer Agent initiates research
2. Web Researcher searches for contract law precedents
3. Research Associate synthesizes findings
4. Lawyer Agent delivers verdict with recommendations


## 🔄 Workflow Execution Example

### Input
```
Case Title: Smith v. Jones - Contract Breach
Query: "What are the standards for proving breach of contract in commercial disputes?"
```

### Agent Execution

**1. Lawyer Agent (Initiated)**
- Receives case query
- Logs: "Lawyer Agent initiated research for case"

**2. Lawyer → Web Researcher (Delegated)**
- Formulates search queries using Gemini
- Searches for: "contract breach liability standards", "commercial contract law precedents"
- Returns: Relevant case law and statutes

**3. Lawyer → Research Associate (Delegated)**
- Receives search results
- Synthesizes using Gemini
- Identifies: Precedents, applicable statutes, legal principles

**4. Lawyer Agent (Finalized)**
- Analyzes synthesized findings
- Generates verdict with:
  - Summary of legal standards
  - Applicable precedents
  - Recommended arguments
  - Risk assessment

### Output
```json
{
  "summary": "Contract breach requires proof of: (1) valid contract, (2) performance or excuse, (3) breach, (4) damages",
  "analysis": "Commercial contracts governed by UCC Article 2 and common law principles...",
  "recommendation": "Recommend pursuing specific performance or damages claim based on precedents",
  "riskAssessment": "Strong legal position if contract is clearly documented..."
}
```

## 🤝 Contributing

This is a showcase project demonstrating agentic AI patterns. For modifications:

1. Update schema in `drizzle/schema.ts`
2. Run `pnpm db:push` to migrate
3. Add database helpers in `server/db.ts`
4. Create/update tRPC procedures in `server/routers.ts`
5. Build frontend components in `client/src/pages/`

## 📝 License

This project is provided as-is for educational and demonstration purposes.

## 🎓 Learning Resources

### Agentic AI Concepts

- **Goal Setting** - Lawyer Agent defines research objectives
- **Constraint Modeling** - Each agent has specific capabilities and constraints
- **Task Execution** - Agents execute specialized tasks (search, synthesis, analysis)
- **Agent Communication** - Structured delegation and result passing
- **Transparency** - Complete logging of all agent actions

### Key Patterns Demonstrated

1. **Hierarchical Agent Architecture** - Coordinator pattern with specialized agents
2. **Agent-to-Agent Communication** - Structured delegation and result passing
3. **Real-Time Execution Tracking** - Complete visibility into agent operations
4. **Structured Output** - JSON schemas for deterministic agent responses
5. **Error Handling** - Graceful failure modes and logging

## 📞 Support

For issues or questions:
1. Check the user guide (`userGuide.md`)
2. Review technical documentation (`TECHNICAL_DOCUMENTATION.md`)
3. Examine execution logs for error details


---

**Built with ❤️| Showcasing the future of agentic AI**

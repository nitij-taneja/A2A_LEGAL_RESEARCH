# Agentic Legal Research Platform - Technical Documentation

## Executive Summary

This document describes the architecture, implementation, and deployment of a multi-agent AI system for legal case research. The platform demonstrates advanced agentic AI patterns including goal-setting, constraint modeling, and task execution with real-time visualization of agent collaboration.

---

## System Architecture

### High-Level Overview

The platform consists of three core layers:

1. **Frontend Layer** - React 19 + TypeScript with real-time visualization
2. **Backend Layer** - Express 4 + tRPC with multi-agent orchestration
3. **Data Layer** - SQLLITE database with Drizzle ORM

### Multi-Agent System Design

**Three Specialized Agents:**

| Agent | LLM | Role | Responsibilities |
|-------|-----|------|------------------|
| **Lawyer Agent** | Gemini | Coordinator | Defines research goals, delegates tasks, delivers final verdict |
| **Web Researcher Agent** | Gemini | Executor | Formulates search queries, retrieves legal precedents and statutes |
| **Research Associate Agent** | Groq | Synthesizer | Analyzes search results, structures findings, identifies key principles |

**Agent-to-Agent Communication Flow:**

```
Lawyer Agent (Goal Setting)
    ↓
    ├─→ Delegates to Web Researcher Agent
    │   └─→ Searches for legal precedents
    │       └─→ Returns search results
    │
    └─→ Delegates to Research Associate Agent
        └─→ Synthesizes findings
            └─→ Returns structured analysis
    
    ↓
Lawyer Agent (Verdict Generation)
    └─→ Produces final legal opinion
```

---

## Database Schema

### Tables Overview

**Cases Table**
- Stores legal case queries and metadata
- Fields: id, userId, title, description, query, status, createdAt, updatedAt
- Status enum: pending, processing, completed, failed

**Agent Logs Table**
- Tracks every agent action and communication
- Fields: id, caseId, agentName, action, input, output, reasoning, timestamp
- Enables complete execution transparency

**Results Table**
- Stores final research findings and verdicts
- Fields: id, caseId, summary, findings, precedents, statutes, recommendation, createdAt
- Findings stored as JSON for structured data

### Database Relationships

```
Users (1) ──→ (Many) Cases
Cases (1) ──→ (Many) Agent Logs
Cases (1) ──→ (1) Results
```

---

## Backend Implementation

### tRPC Procedures

**Case Management:**
- `cases.create` - Create new legal case (protected)
- `cases.list` - List user's cases (protected)
- `cases.get` - Get case details (protected)
- `cases.execute` - Execute multi-agent workflow (protected)

**Data Retrieval:**
- `agentLogs.getByCaseId` - Retrieve execution logs (protected)
- `results.getByCaseId` - Get final verdict (protected)

### Agent Execution Flow

**Step 1: Lawyer Agent Initiates**
```typescript
// Log: "Lawyer Agent initiated research for case: {query}"
// Action: initiated
```

**Step 2: Lawyer Delegates to Web Researcher**
```typescript
// Log: "Lawyer Agent delegated research task to Web Researcher Agent"
// Action: delegated
// Web Researcher executes search queries using Gemini + Tavily
```

**Step 3: Lawyer Delegates to Research Associate**
```typescript
// Log: "Lawyer Agent delegated synthesis to Research Associate Agent"
// Action: delegated
// Associate synthesizes findings using Groq LLM
```

**Step 4: Lawyer Finalizes Verdict**
```typescript
// Log: "Lawyer Agent delivered final legal verdict and recommendations"
// Action: completed
// Produces structured JSON verdict with analysis and recommendations
```

### LLM Integration

**Gemini API Usage:**
- Lawyer Agent: Coordinates research and generates final verdict
- Web Researcher Agent: Formulates search queries and analyzes results
- Response format: JSON schema with structured outputs

**Groq API Usage:**
- Research Associate Agent: Synthesizes findings into structured analysis
- Response format: JSON schema with precedents, statutes, principles, arguments

**Tavily API Integration:**
- Web search for legal precedents and statutes
- Fallback to DuckDuckGo for additional search coverage

---

## Frontend Architecture

### Page Components

**Home.tsx**
- Landing page for unauthenticated users
- Feature showcase with three-column layout
- Call-to-action buttons for sign-in
- Authenticated dashboard redirect

**Research.tsx**
- Three-panel layout: Input Form | Visualization | Results
- Case creation form with title, description, query
- Node-based workflow visualization
- Real-time execution trace display
- Results panel with summary, findings, recommendations

### State Management

- React hooks for local state (title, description, query, selectedCaseId)
- tRPC useQuery/useMutation for server state
- Automatic refetching on case execution

### Real-Time Visualization

**Node-Based Workflow:**
- Three agent nodes with status indicators
- Color-coded states: blue (active), green (completed), red (failed)
- Animated pulse effect for active agents
- Vertical connection lines between agents

**Execution Trace:**
- Chronological log of all agent actions
- Icon indicators for action type (clock, check, alert)
- Expandable details for input/output/reasoning
- Max-height scrollable container

---

## API Integration Details

### Gemini API

**Endpoint:** Google Cloud AI API
**Authentication:** API key from environment variable `GEMINI_API_KEY`
**Usage:**
- Search query formulation (Web Researcher)
- Final verdict generation (Lawyer Agent)
- Response format: JSON schema with structured outputs

**Example Request:**
```typescript
const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are a legal research specialist..." },
    { role: "user", content: "Legal research needed for: {query}" }
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "search_queries",
      schema: { /* structured schema */ }
    }
  }
});
```

### Groq API

**Endpoint:** Groq API
**Authentication:** API key from environment variable `GROQ_API_KEY`
**Usage:** Research synthesis and analysis by Research Associate Agent
**Response Format:** JSON schema with structured findings

### Tavily API

**Endpoint:** Tavily Search API
**Authentication:** API key from environment variable `TAVILY_API_KEY`
**Usage:** Web search for legal precedents and statutes
**Fallback:** DuckDuckGo for additional search coverage

---

## Deployment Considerations

### Environment Variables

**Required Secrets:**
- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key
- `TAVILY_API_KEY` - Tavily API key
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Session signing secret

**Pre-configured System Variables:**
- `VITE_APP_ID` - OAuth application ID
- `OAUTH_SERVER_URL` - OAuth backend URL
- `VITE_OAUTH_PORTAL_URL` - OAuth login portal
- `OWNER_OPEN_ID` - Platform owner identifier

### Performance Optimization

1. **Database Indexing** - Add indexes on caseId, userId, timestamp
2. **Query Optimization** - Use pagination for large result sets
3. **LLM Caching** - Cache common legal research queries
4. **Frontend Optimization** - Code splitting and lazy loading

### Security Best Practices

1. **API Key Management** - Store all keys in environment variables
2. **Authentication** - Enforce OAuth for all protected routes
3. **Input Validation** - Validate case queries before processing
4. **Rate Limiting** - Implement rate limits on LLM API calls
5. **HTTPS** - Enforce SSL/TLS for all connections

---

## Testing & Validation

### Test Scenarios

**Scenario 1: Basic Case Creation**
1. Create case with title "Smith v. Jones"
2. Verify case appears in case list
3. Confirm status is "pending"

**Scenario 2: Agent Execution**
1. Execute case workflow
2. Monitor execution trace for all three agents
3. Verify logs show: initiated → delegated → searching → completed
4. Confirm results display with summary and recommendation

**Scenario 3: Error Handling**
1. Submit case with empty query
2. Verify error message displays
3. Confirm case status remains "failed"

---

## Future Enhancements

1. **WebSocket Support** - Real-time streaming of agent logs
2. **Advanced Visualization** - Interactive node graph with D3.js
3. **Custom Agents** - Allow users to define custom agent roles
4. **Export Functionality** - PDF, Word, JSON export of results
5. **Collaboration Features** - Share cases and results with team members
6. **Audit Logging** - Comprehensive compliance logging for legal use

---

## Troubleshooting

### Common Issues

**Issue: "Case not found" error**
- Verify case ID exists in database
- Check user authentication and authorization

**Issue: Agent execution timeout**
- Check API key validity
- Verify network connectivity to LLM services
- Review rate limiting on API calls

**Issue: Results not displaying**
- Verify JSON parsing of verdict data
- Check database connection
- Review agent logs for errors

---

## References

- [Gemini API Documentation](https://ai.google.dev/)
- [Groq API Documentation](https://console.groq.com/)
- [Tavily Search API](https://tavily.com/)
- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)

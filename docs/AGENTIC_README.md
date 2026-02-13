# 🤖 FinTrack Pro - Agentic AI Design Document

## Overview

This document outlines the **Agentic AI Layer** design for FinTrack Pro - a future enhancement that enables autonomous AI agents to perform complex financial analysis, automate workflows, and provide intelligent insights.

## Vision

Transform FinTrack Pro from a reactive financial dashboard into a **proactive financial copilot** that:
- Autonomously monitors spending patterns and alerts users to anomalies
- Suggests budget optimizations based on historical data and goals
- Automates recurring financial tasks (bill payments, investments, savings transfers)
- Provides natural language interface for complex queries ("How much did I spend on dining last quarter compared to Q1?")

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                   FinTrack Frontend                         │
│  (React + TypeScript + Zustand)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ REST API + WebSocket
                      │
┌─────────────────────▼───────────────────────────────────────┐
│               Agent Orchestration Layer                     │
│  - Task Queue (Redis)                                       │
│  - Agent Manager (Node.js + Bull Queue)                     │
│  - Task Execution Engine                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────────┐
        │             │                 │
┌───────▼──────┐ ┌───▼─────────┐ ┌─────▼────────┐
│   Backend    │ │ ML Service  │ │ External AI  │
│   (Express)  │ │  (FastAPI)  │ │ (Claude API) │
└──────────────┘ └─────────────┘ └──────────────┘
```

### Components

1. **Agent Manager Service** (New Microservice)
   - Language: Node.js + TypeScript
   - Queue: Bull (Redis-backed job queue)
   - Responsibilities:
     - Accept agent tasks via REST API
     - Route tasks to appropriate handlers
     - Manage task lifecycle (pending → running → completed/failed)
     - Store task results and logs

2. **Agent Types**
   - **Analysis Agent**: Performs complex financial analysis (trend detection, spending patterns)
   - **Automation Agent**: Executes recurring tasks (auto-save, bill reminders)
   - **Query Agent**: Answers natural language questions using LLM + RAG
   - **Optimization Agent**: Suggests budget/savings/investment improvements
   - **Alert Agent**: Monitors anomalies and sends proactive notifications

3. **Task Queue (Redis)**
   - Job priority levels: `critical`, `high`, `normal`, `low`
   - Retry mechanism with exponential backoff
   - Task timeout and cancellation support
   - Dead letter queue for failed tasks

## API Contract

### REST Endpoints

#### 1. Create Agent Task

```http
POST /api/agent/task
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "type": "analysis" | "automation" | "query" | "optimization" | "alert",
  "action": "analyze_spending" | "suggest_budget" | "answer_query" | "detect_anomalies",
  "payload": {
    "query": "How much did I spend on groceries last month?",
    "timeRange": { "start": "2024-01-01", "end": "2024-01-31" },
    "categories": ["Groceries", "Dining"],
    "userId": "user123"
  },
  "priority": "high",
  "timeout": 60000
}
```

**Response:**
```json
{
  "taskId": "task_abc123",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z",
  "estimatedCompletionTime": 30
}
```

#### 2. Get Task Status

```http
GET /api/agent/task/:taskId
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "taskId": "task_abc123",
  "type": "query",
  "status": "completed",
  "result": {
    "answer": "You spent $452.30 on groceries last month, which is 12% higher than your average.",
    "transactions": [
      { "id": "txn1", "amount": 85.20, "merchant": "Whole Foods", "date": "2024-01-05" }
    ],
    "insights": [
      "Your grocery spending increased by $50 compared to December",
      "Consider using your $25 Whole Foods coupon before it expires"
    ]
  },
  "startedAt": "2024-01-15T10:30:02Z",
  "completedAt": "2024-01-15T10:30:28Z",
  "duration": 26
}
```

#### 3. Cancel Task

```http
DELETE /api/agent/task/:taskId
Authorization: Bearer <jwt_token>
```

#### 4. List User Tasks

```http
GET /api/agent/tasks?status=completed&limit=20&offset=0
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "tasks": [
    { "taskId": "task_abc123", "type": "query", "status": "completed", "createdAt": "..." },
    { "taskId": "task_def456", "type": "analysis", "status": "running", "createdAt": "..." }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### WebSocket Events (Real-time Updates)

```typescript
// Client subscribes to task updates
socket.emit('subscribe:task', { taskId: 'task_abc123' });

// Server broadcasts task progress
socket.on('task:progress', (data) => {
  console.log(data); // { taskId, status, progress: 45, message: "Analyzing transactions..." }
});

// Server broadcasts task completion
socket.on('task:completed', (data) => {
  console.log(data); // { taskId, status: "completed", result: {...} }
});
```

## Task Schema

```typescript
interface AgentTask {
  taskId: string;
  userId: string;
  type: 'analysis' | 'automation' | 'query' | 'optimization' | 'alert';
  action: string; // Specific action within the type
  payload: Record<string, any>; // Task-specific data
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any; // Task output
  error?: string; // Error message if failed
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeout: number; // Milliseconds
  retries: number; // Retry count
  logs: Array<{ timestamp: Date; level: string; message: string }>;
}
```

## Security Model

### Authentication & Authorization

1. **JWT-based Auth**: All agent API requests require valid JWT token
2. **User Isolation**: Tasks can only access data belonging to the authenticated user
3. **Rate Limiting**: 50 task creations per hour per user (prevent abuse)
4. **Sandbox Execution**: LLM prompts are sanitized, no code execution allowed

### Data Privacy

- **PII Protection**: Never send raw transaction descriptions to external LLMs
- **Anonymization**: Aggregate data before sending to AI services
- **Audit Logging**: Track all agent actions with timestamps and user IDs
- **Consent**: Users must opt-in to AI features via settings toggle

## Technology Stack

### Agent Manager Service

```json
{
  "runtime": "Node.js 20+",
  "framework": "Express 4.18+",
  "queue": "Bull 4.x (Redis-backed)",
  "orm": "Mongoose 7.x",
  "validation": "Zod 3.x",
  "testing": "Vitest + Supertest"
}
```

### LLM Integration

```typescript
// app/services/llmService.ts
import Anthropic from '@anthropic-ai/sdk';

export class LLMService {
  private client: Anthropic;

  async answerQuery(query: string, context: FinancialContext): Promise<string> {
    const prompt = `
      You are a financial assistant for FinTrack Pro.
      User Question: ${query}
      Transaction Data: ${JSON.stringify(context.transactions, null, 2)}
      Budget Data: ${JSON.stringify(context.budgets, null, 2)}
      
      Provide a concise, accurate answer with actionable insights.
    `;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text;
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create `agent-service` microservice skeleton
- [ ] Setup Redis + Bull queue
- [ ] Implement basic task CRUD endpoints
- [ ] Add WebSocket support for task updates
- [ ] Create MongoDB schema for tasks

### Phase 2: Core Agents (Weeks 3-4)
- [ ] Implement **Query Agent** (natural language Q&A)
- [ ] Implement **Analysis Agent** (spending trends, patterns)
- [ ] Integrate Claude API for LLM calls
- [ ] Add task retry and timeout logic

### Phase 3: Automation (Weeks 5-6)
- [ ] Implement **Automation Agent** (scheduled tasks)
- [ ] Create recurring job scheduler (node-cron)
- [ ] Add email/SMS notifications via existing backend
- [ ] Implement **Alert Agent** (anomaly detection triggers)

### Phase 4: Intelligence (Weeks 7-8)
- [ ] Implement **Optimization Agent** (budget suggestions)
- [ ] Fine-tune ML models for better predictions
- [ ] Add RAG (Retrieval-Augmented Generation) for context
- [ ] Create agent dashboard in frontend

### Phase 5: Polish (Week 9)
- [ ] Add comprehensive error handling
- [ ] Write integration tests
- [ ] Performance optimization (caching, batching)
- [ ] Documentation and deployment guide

## Example Use Cases

### Use Case 1: Natural Language Query

**User Input**: "How much did I save compared to last month?"

**Agent Workflow**:
1. Frontend sends POST /api/agent/task with type=query
2. Query Agent retrieves current and previous month transactions
3. ML Service calculates spending trends
4. Claude API generates natural language summary
5. Result returned with supporting data and insights

### Use Case 2: Budget Optimization

**Trigger**: User sets goal "Save $500/month"

**Agent Workflow**:
1. Automation Agent creates recurring task (runs monthly)
2. Analysis Agent analyzes spending patterns
3. Optimization Agent identifies top 3 savings opportunities
4. Alert Agent sends notification with suggestions
5. User reviews and confirms optimizations

### Use Case 3: Anomaly Alert

**Trigger**: ML Service detects unusual transaction

**Agent Workflow**:
1. ML Service calls POST /api/agent/task (type=alert, action=investigate_anomaly)
2. Alert Agent retrieves transaction details
3. Checks if transaction matches known patterns (recurring bill, vacation)
4. If genuinely anomalous, sends push notification
5. User confirms or reports fraud

## Migration Path

To integrate the Agentic Layer into existing FinTrack Pro:

1. **No Breaking Changes**: Agent service is a new optional microservice
2. **Gradual Rollout**: Enable agent features behind feature flag
3. **Data Reuse**: Leverages existing MongoDB collections (no schema changes)
4. **API Extension**: New `/api/agent/*` routes coexist with existing endpoints
5. **Frontend Enhancement**: Add "AI Assistant" tab in settings and dashboard

## Configuration

### Environment Variables

```bash
# Agent Service
AGENT_SERVICE_PORT=8001
AGENT_SERVICE_URL=http://localhost:8001

# LLM Integration
ANTHROPIC_API_KEY=sk-ant-xxx
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_MAX_TOKENS=2048

# Queue Configuration
BULL_REDIS_URL=redis://:fintrack123@redis:6379/2
BULL_CONCURRENCY=5
TASK_TIMEOUT_MS=60000
MAX_RETRIES=3

# Security
AGENT_RATE_LIMIT_PER_HOUR=50
ENABLE_LLM_CACHING=true
ANONYMIZE_DATA_FOR_LLM=true
```

### Docker Compose Addition

```yaml
agent-service:
  build:
    context: ./agent-service
    dockerfile: Dockerfile
  container_name: fintrack-agent
  restart: unless-stopped
  ports:
    - "8001:8001"
  environment:
    NODE_ENV: production
    AGENT_SERVICE_PORT: 8001
    MONGODB_URI: mongodb://fintrack:fintrack123@mongodb:27017/fintrack-pro?authSource=admin
    REDIS_URL: redis://:fintrack123@redis:6379/2
    ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  depends_on:
    mongodb:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - fintrack-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## Testing Strategy

### Unit Tests

```typescript
// agent-service/tests/agents/queryAgent.test.ts
describe('QueryAgent', () => {
  it('should answer spending query with accurate data', async () => {
    const agent = new QueryAgent();
    const result = await agent.execute({
      query: 'How much did I spend on groceries?',
      userId: 'user123',
      timeRange: { start: '2024-01-01', end: '2024-01-31' }
    });

    expect(result.answer).toContain('$452.30');
    expect(result.transactions).toHaveLength(12);
  });
});
```

### Integration Tests

```typescript
// agent-service/tests/integration/taskWorkflow.test.ts
describe('Task Workflow', () => {
  it('should complete query task end-to-end', async () => {
    const response = await request(app)
      .post('/api/agent/task')
      .send({ type: 'query', action: 'spending_summary', payload: {...} })
      .expect(201);

    const taskId = response.body.taskId;

    // Wait for task completion
    await waitForTaskStatus(taskId, 'completed', 30000);

    const result = await request(app)
      .get(`/api/agent/task/${taskId}`)
      .expect(200);

    expect(result.body.status).toBe('completed');
    expect(result.body.result).toBeDefined();
  });
});
```

## Performance Considerations

- **Caching**: Cache LLM responses for identical queries (TTL: 1 hour)
- **Batching**: Group similar tasks to reduce LLM API calls
- **Queue Priority**: Critical alerts processed before normal queries
- **Horizontal Scaling**: Add more agent workers during peak times
- **Cost Optimization**: Use smaller models for simple tasks ($0.003/1K tokens vs $0.015/1K)

## Monitoring & Observability

```typescript
// Metrics to track
metrics.increment('agent.task.created', { type: 'query' });
metrics.timing('agent.task.duration', duration, { status: 'completed' });
metrics.gauge('agent.queue.depth', queueDepth);

// Logging
logger.info('Agent task completed', {
  taskId,
  userId,
  type,
  duration,
  tokensUsed: llmResponse.usage.total_tokens
});
```

## Ethical Considerations

1. **Transparency**: Users know when AI is making suggestions
2. **Human-in-the-Loop**: Critical actions (large transfers) require user confirmation
3. **Explainability**: AI provides reasoning for recommendations
4. **Bias Mitigation**: Test agents across diverse financial profiles
5. **Opt-Out**: Users can disable agentic features entirely

## Future Enhancements

- **Multi-Agent Collaboration**: Agents coordinate on complex tasks
- **Learning from Feedback**: Optimize suggestions based on user acceptance rates
- **Voice Interface**: Integrate with Alexa/Google Assistant
- **Predictive Maintenance**: Agent predicts when user might overspend
- **Social Features**: Anonymized benchmarking ("You save more than 65% of similar users")

---

## Getting Started (For Developers)

1. Clone agent-service template:
   ```bash
   git clone https://github.com/fintrack-pro/agent-service-template
   cd agent-service
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Add ANTHROPIC_API_KEY and other vars
   ```

3. Start local development:
   ```bash
   npm run dev
   # Agent service runs on http://localhost:8001
   ```

4. Test agent endpoint:
   ```bash
   curl -X POST http://localhost:8001/api/agent/task \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{
       "type": "query",
       "action": "spending_summary",
       "payload": { "timeRange": "last_month" }
     }'
   ```

---

**Status**: 📋 Design Phase - Implementation pending  
**Last Updated**: January 2025  
**Maintainer**: FinTrack Pro Engineering Team

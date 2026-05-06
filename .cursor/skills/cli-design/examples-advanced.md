# Advanced Examples

## Agent Chat with LangGraph Orchestration

Complex agent with state machine, tool calls, and human-in-the-loop interrupts.

### Agent Core (platform-agnostic)

```typescript
// packages/agent-core/src/graph/agent.ts
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';

const AgentState = Annotation.Root({
  messages: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  status: Annotation<string>(),
});

const model = new ChatAnthropic({ model: 'claude-sonnet-4-20250514' });

const callModel = async (state: typeof AgentState.State) => {
  const response = await model.invoke(state.messages);
  return { messages: [response], status: 'responded' };
};

const shouldContinue = (state: typeof AgentState.State) => {
  const last = state.messages[state.messages.length - 1];
  return last.tool_calls?.length ? 'tools' : END;
};

export function createAgent() {
  const graph = new StateGraph(AgentState)
    .addNode('agent', callModel)
    .addNode('tools', async (state) => {
      return { messages: [], status: 'tools_executed' };
    })
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent');

  return graph.compile();
}
```

### CLI Command wrapping LangGraph agent

```typescript
// packages/client-cli/src/commands/agent-chat.ts
import { Command } from 'commander';
import { intro, outro, text, spinner } from '@clack/prompts';
import { createAgent } from '@my-project/agent-core';
import chalk from 'chalk';

export function registerAgentChat(program: Command) {
  program
    .command('agent')
    .description('Chat with LangGraph agent')
    .action(async () => {
      intro(chalk.bgCyan(' Agent Active '));

      const agent = createAgent();
      const messages: any[] = [];

      while (true) {
        const input = await text({ message: 'You:' });
        if (!input || input === 'exit') break;

        messages.push({ role: 'user', content: String(input) });

        const s = spinner();
        s.start('Thinking...');

        const result = await agent.invoke({ messages, status: 'pending' });

        s.stop('');
        const last = result.messages[result.messages.length - 1];
        console.log(chalk.cyan(`\n  ${last.content}\n`));

        messages.push(...result.messages);
      }

      outro('Session closed.');
    });
}
```

---

## Streaming Chat with Ink TUI

Rich, dashboard-style terminal interface with real-time streaming.
Use `ink` + `react` when you need a stateful, component-driven terminal UI.

```typescript
// src/ui/ChatApp.tsx
import React, { useState, useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ChatApp({ model }: { model: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: 'user', content: input };
    const updated = [...messages, userMsg];
    setMessages([...updated, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const { textStream } = streamText({
      model: anthropic(model),
      messages: updated,
    });

    let full = '';
    for await (const chunk of textStream) {
      full += chunk;
      setMessages([...updated, { role: 'assistant', content: full }]);
    }

    setStreaming(false);
  }, [input, messages, model, streaming]);

  useInput((_, key) => {
    if (key.return) send();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((m, i) => (
          <Text key={i} color={m.role === 'user' ? 'yellow' : 'cyan'}>
            {m.role === 'user' ? '❯ ' : '⚡ '}
            {m.content}
          </Text>
        ))}
      </Box>
      {streaming && (
        <Text color="gray">
          <Spinner type="dots" /> Generating...
        </Text>
      )}
      <Box>
        <Text bold color="green">{'❯ '}</Text>
        <TextInput value={input} onChange={setInput} />
      </Box>
    </Box>
  );
}

export function startChat(model: string) {
  render(<ChatApp model={model} />);
}
```

### Registering Ink TUI from a Commander command

```typescript
// src/commands/tui-chat.ts
import { Command } from 'commander';
import { startChat } from '../ui/ChatApp';

export function registerTuiChat(program: Command) {
  program
    .command('tui')
    .description('Rich terminal chat UI')
    .option('-m, --model <id>', 'Model ID', 'claude-sonnet-4-20250514')
    .action((options) => {
      startChat(options.model);
    });
}
```

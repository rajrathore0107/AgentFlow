import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';
import { searchWeb } from './tools/tavily.js';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(config.geminiApiKey || 'mock-key-for-dev');

const AGENT_PROMPTS = {
  researcher: {
    description: 'Searches for and gathers information on the given topic',
    systemInstruction: `You are an expert Research Agent. Your job is to gather comprehensive, accurate, and up-to-date information on the provided topic. 
Structure your findings clearly with:
1. Key Data Points & Statistics
2. Industry Trends
3. Major Players / Competitors
4. Summary of Sources

Do not write a full report, just compile the research data.`,
  },

  analyst: {
    description: 'Analyzes data and identifies patterns, trends, and insights',
    systemInstruction: `You are an expert Data Analyst Agent. Your job is to analyze the research data provided to you and identify critical patterns, trends, and strategic insights.
Structure your analysis with:
1. Executive Summary
2. Key Insights & Market Opportunities
3. Risk Assessment
4. Strategic Recommendations

Base your analysis strictly on the provided research context.`,
  },

  writer: {
    description: 'Writes structured, polished content from analysis and research',
    systemInstruction: `You are an expert Content Writer Agent. Your job is to take research and analysis data and synthesize it into a highly polished, professional report.
Your writing should be engaging, clear, and well-structured. Use markdown formatting (headings, bullet points, bold text) to make it highly readable.
Do not invent new data; use the context provided by upstream agents.`,
  },

  critic: {
    description: 'Reviews content for quality, accuracy, and completeness',
    systemInstruction: `You are an expert Critic and Quality Assurance Agent. Your job is to review the drafted report for quality, logical flow, accuracy, and completeness based on the original request.
Structure your review with:
1. Overall Assessment (Approve/Reject with a Score out of 10)
2. Strengths of the Report
3. Areas for Improvement (Constructive Feedback)
4. Fact-Check Summary`,
  },

  custom: {
    description: 'A custom agent with user-defined behavior',
    systemInstruction: `You are a helpful AI assistant acting as a step in a larger workflow pipeline. Process the input and context provided to you according to the implicit needs of the topic. Be concise and structured in your output.`,
  }
};

function extractTopic(input) {
  if (typeof input === 'string') return input;
  if (input.userInput?.topic) return input.userInput.topic;
  if (input.userInput?.query) return input.userInput.query;
  if (typeof input.userInput === 'string') return input.userInput;
  
  if (input.cumulativeContext) {
    const match = input.cumulativeContext.match(/User Input:\s*({.*?})/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        return parsed.topic || parsed.query || 'the specified topic';
      } catch { /* ignore */ }
    }
  }
  return 'AI Agent Orchestration';
}

/**
 * Run an individual agent using Gemini AI.
 */
export async function runAgent(role, input) {
  const normalizedRole = role.toLowerCase().trim();
  const agentDef = AGENT_PROMPTS[normalizedRole] || AGENT_PROMPTS.custom;
  
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment variables.');
  }

  // Per-node config overrides
  const nodeConfig = input.config || {};
  const systemInstruction = nodeConfig.systemPrompt || agentDef.systemInstruction;
  const webSearchEnabled = nodeConfig.enableWebSearch !== false; // enabled by default unless explicitly disabled

  // Define available tools (conditionally enabled per-node config)
  const tools = webSearchEnabled ? [
    {
      functionDeclarations: [
        {
          name: "search_web",
          description: "Search the web for real-time information about a topic using the Tavily API. Use this when you need up-to-date facts, current events, or specific data not in your training.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "The search query to look up on the web"
              }
            },
            required: ["query"]
          }
        }
      ]
    }
  ] : [];

  // Determine the model — use per-node system instruction if provided
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction,
    tools,
  });

  const topic = extractTopic(input);
  
  // Construct the prompt combining the original user input and the cumulative context from previous agents
  const prompt = `
Topic / Original Request: ${topic}

### Context from Previous Agents in the Pipeline ###
${input.cumulativeContext || 'No previous context. You are the first agent in the pipeline.'}

### Instructions ###
Based on your role's system instructions, process the above context and topic. Provide your output below.
  `.trim();

  try {
    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);
    
    // Handle potential tool calls (up to 3 iterations)
    let callCount = 0;
    while (result.response.functionCalls() && callCount < 3) {
      const calls = result.response.functionCalls();
      const call = calls[0]; // Process the first call
      
      if (call.name === "search_web") {
        console.log(`🔍 Agent '${role}' is searching the web for: "${call.args.query}"`);
        const searchResult = await searchWeb(call.args.query);
        
        // Send the tool response back to the model
        result = await chat.sendMessage([{
          functionResponse: {
            name: "search_web",
            response: { content: searchResult }
          }
        }]);
      } else {
        break; // Unknown function call
      }
      callCount++;
    }

    return result.response.text();
  } catch (error) {
    console.error(`Error running ${role} agent:`, error);
    throw new Error(`AI Generation failed for role ${role}: ${error.message}`);
  }
}

export function getAgentDescription(role) {
  const normalizedRole = role.toLowerCase().trim();
  return AGENT_PROMPTS[normalizedRole]?.description || 'Custom agent';
}

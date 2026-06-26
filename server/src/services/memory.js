import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'vectorstore.json');

let vectorStore = null;
let embeddings = null;

async function initVectorStore() {
  if (!config.geminiApiKey) return;

  embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: config.geminiApiKey,
    modelName: 'embedding-001',
  });

  vectorStore = new MemoryVectorStore(embeddings);

  // Load from disk if exists
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      vectorStore.memoryVectors = data;
      console.log('🧠 Loaded vector memory from disk');
    } catch (e) {
      console.error('Failed to load vector memory:', e);
    }
  }
}

// Save memory to disk periodically or after writes
function saveToDisk() {
  if (!vectorStore) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(vectorStore.memoryVectors), 'utf-8');
}

/**
 * Save an execution output to the vector database so agents can remember it later
 */
export async function saveExecutionToMemory(pipelineName, topic, output) {
  if (!vectorStore && config.geminiApiKey) await initVectorStore();
  if (!vectorStore) return;

  const doc = new Document({
    pageContent: output,
    metadata: {
      source: 'execution',
      pipeline: pipelineName,
      topic: topic,
      timestamp: new Date().toISOString(),
    },
  });

  await vectorStore.addDocuments([doc]);
  saveToDisk();
}

/**
 * Agent tool to search past executions
 */
export async function searchPastMemory(query, topK = 2) {
  if (!vectorStore && config.geminiApiKey) await initVectorStore();
  if (!vectorStore || vectorStore.memoryVectors.length === 0) {
    return "No past memory found. The knowledge base is empty.";
  }

  const results = await vectorStore.similaritySearch(query, topK);
  
  if (results.length === 0) return "No relevant past executions found.";

  return results.map(r => `[From Pipeline: ${r.metadata.pipeline} | Topic: ${r.metadata.topic} | Date: ${r.metadata.timestamp}]\n${r.pageContent}`).join('\n\n---\n\n');
}

// Initialize on startup
initVectorStore();

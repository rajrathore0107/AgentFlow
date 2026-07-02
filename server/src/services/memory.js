import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'vectorstore.json');

let memoryVectors = [];
let embeddings = null;

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function initVectorStore() {
  if (!config.geminiApiKey) return;

  embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: config.geminiApiKey,
    modelName: 'embedding-001',
  });

  // Load from disk if exists
  if (fs.existsSync(DB_PATH)) {
    try {
      memoryVectors = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      console.log('🧠 Loaded vector memory from disk. Total records:', memoryVectors.length);
    } catch (e) {
      console.error('Failed to load vector memory:', e);
    }
  }
}

// Save memory to disk periodically or after writes
function saveToDisk() {
  fs.writeFileSync(DB_PATH, JSON.stringify(memoryVectors), 'utf-8');
}

/**
 * Save an execution output to the vector database so agents can remember it later
 */
export async function saveExecutionToMemory(pipelineName, topic, output) {
  if (!embeddings && config.geminiApiKey) await initVectorStore();
  if (!embeddings) return;

  try {
    // Generate embedding for the output
    const vector = await embeddings.embedQuery(output);
    
    memoryVectors.push({
      vector,
      pageContent: output,
      metadata: {
        source: 'execution',
        pipeline: pipelineName,
        topic: topic,
        timestamp: new Date().toISOString(),
      }
    });

    saveToDisk();
  } catch (error) {
    console.error("Error saving to memory:", error);
  }
}

/**
 * Agent tool to search past executions
 */
export async function searchPastMemory(query, topK = 2) {
  if (!embeddings && config.geminiApiKey) await initVectorStore();
  if (!embeddings || memoryVectors.length === 0) {
    return "No past memory found. The knowledge base is empty.";
  }

  try {
    const queryVector = await embeddings.embedQuery(query);
    
    // Calculate similarities
    const results = memoryVectors.map(record => ({
      ...record,
      similarity: cosineSimilarity(queryVector, record.vector)
    }));

    // Sort by most similar (descending)
    results.sort((a, b) => b.similarity - a.similarity);
    
    const topResults = results.slice(0, topK);

    if (topResults.length === 0) return "No relevant past executions found.";

    return topResults.map(r => `[From Pipeline: ${r.metadata.pipeline} | Topic: ${r.metadata.topic} | Date: ${r.metadata.timestamp}]\n${r.pageContent}`).join('\n\n---\n\n');
  } catch (error) {
    console.error("Error searching memory:", error);
    return "An error occurred while searching memory.";
  }
}

// Initialize on startup
initVectorStore();

import config from '../../config.js';

/**
 * Perform a web search using the Tavily API
 * @param {string} query - The search query
 * @returns {Promise<string>} - The search results summarized as a string
 */
export async function searchWeb(query) {
  if (!config.tavilyApiKey) {
    return "Error: TAVILY_API_KEY is not configured. Could not perform web search.";
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.tavilyApiKey,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tavily API Error:', errorText);
      return `Error: Failed to fetch search results. Status: ${response.status}`;
    }

    const data = await response.json();
    
    // Format the results
    let resultText = data.answer ? `Summary: ${data.answer}\n\n` : '';
    
    if (data.results && data.results.length > 0) {
      resultText += 'Sources:\n';
      data.results.forEach((r, index) => {
        resultText += `${index + 1}. [${r.title}](${r.url})\n   ${r.content}\n\n`;
      });
    }

    return resultText || "No relevant search results found.";
  } catch (error) {
    console.error('Web Search Tool Error:', error);
    return `Error performing search: ${error.message}`;
  }
}

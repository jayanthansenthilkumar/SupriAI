async function summarizeContent(content) {
  try {
    // Validate configuration
    if (!CONFIG || !CONFIG.GEMINI_API_KEY || !CONFIG.API_URL) {
      console.error('Configuration error:', { CONFIG });
      throw new Error('API configuration is missing. Please check assets/config/keys.js');
    }

    // Validate API key format
    if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('Please replace YOUR_GEMINI_API_KEY_HERE with your actual Gemini API key in assets/config/keys.js');
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('No content to summarize. Please make sure you are on a valid webpage.');
    }

    console.log('Sending request to Gemini API...');
    console.log('Content length:', content.length);

    const response = await fetch(`${CONFIG.API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Please provide a concise summary of the following content in at least 5 bullet points and at max 10 points. Return output in HTML format with proper <ul> and <li> tags:\n\n${content}`
          }]
        }]
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      
      if (response.status === 400) {
        throw new Error('Invalid request. Please check your API key and try again.');
      } else if (response.status === 403) {
        throw new Error('API key is invalid or doesn\'t have permission. Please check your Gemini API key.');
      } else if (response.status === 404) {
        const errorMsg = errorData.error?.message || '';
        if (errorMsg.includes('not found for API version')) {
          throw new Error('API endpoint error. The model may not be available. Please contact support or check the API configuration.');
        }
        throw new Error('API endpoint not found. Please check the configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again in a moment.');
      } else {
        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }
    }

    const data = await response.json();
    console.log('API Response:', data);

    // Validate response structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.error('Invalid response structure:', data);
      throw new Error('Received invalid response from API. Please try again.');
    }

    // Clean up the response by removing code fence markers if present
    let summary = data.candidates[0].content.parts[0].text;
    summary = summary.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    
    console.log('Summary generated successfully');
    return summary;

  } catch (error) {
    console.error('Error summarizing content:', error);
    
    // Return user-friendly error messages
    if (error.message) {
      return `<div class="error-message"><strong>Error:</strong> ${error.message}</div>`;
    }
    
    return '<div class="error-message"><strong>Error:</strong> Failed to generate summary. Please check the console for details and try again.</div>';
  }
} 
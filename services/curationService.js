class CurationService {
  constructor() {
    this.apiKey = CONFIG.GEMINI_API_KEY;
    this.apiUrl = CONFIG.API_URL;
  }

  // Step 1: Analyze Intent
  async analyzeTabsIntent(tabs) {
    console.log('Analyzing tabs:', tabs);  // Debug log
    const tabsInfo = tabs.map(tab => ({
      title: tab.title,
      url: tab.url
    }));

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a JSON output generator. Given these tabs:
              ${JSON.stringify(tabsInfo, null, 2)}
              
              Return ONLY a JSON object with two fields:
              1. "intent": Identify intent of the user based on the tabs. What is the user trying to do? There might be multiple tabs of different topics. Return single intent that is commong across most tabs. Do not club together multiple topics in a single intent.
              2. "relevant_tabs": an array of relevant tab titles as per classified intent
              
              DO NOT include any other text, markdown formatting, or explanation.`
            }]
          }]
        })
      });

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('Invalid API response structure:', data);
        return {
          intent: 'Error: Invalid API response',
          relevant_tabs: []
        };
      }

      // Clean up the response text
      let responseText = data.candidates[0].content.parts[0].text.trim();
      
      // If response contains any markdown code fences, extract just the JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      console.log('Cleaned response:', responseText);

      try {
        const parsed = JSON.parse(responseText);
        // Validate response structure
        if (!parsed.intent || !Array.isArray(parsed.relevant_tabs)) {
          throw new Error('Invalid response format');
        }
        console.log('Step 1 completed');
        return parsed;
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError, 'Raw text:', responseText);
        return {
          intent: 'Failed to parse intent',
          relevant_tabs: []
        };
      }
    } catch (error) {
      console.error('Error analyzing intents:', error);
      return {
        intent: 'Error analyzing tabs',
        relevant_tabs: []
      };
    }
    
  }
    
  // Step 2: Rate Content Quality
  async rateContent(tabs, intents) {
    const results = [];
    // Only process relevant tabs
    const relevantTabs = tabs.filter(tab => 
      intents.relevant_tabs.includes(tab.title)
    );

    for (const tab of relevantTabs) {
      try {
        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Rate this article based on its relevance to: "${intents.intent}"

                Title: ${tab.title}
                URL: ${tab.url}

                Return rating in this exact JSON format without any additional text:
                {
                  "rating": number between 0 and 10,
                  "explanation": "brief explanation of rating"
                }`
              }]
            }]
          })
        });

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid API response structure');
        }

        const responseText = data.candidates[0].content.parts[0].text
          .replace(/^```json\n?/, '')
          .replace(/\n?```$/, '')
          .trim();

        const parsed = JSON.parse(responseText);
        // Validate response structure
        if (typeof parsed.rating !== 'number' || !parsed.explanation) {
          throw new Error('Invalid rating format');
        }

        results.push({
          tabId: tab.id,
          ...parsed
        });
      } catch (error) {
        console.error(`Error rating content for tab ${tab.id}:`, error);
        results.push({
          tabId: tab.id,
          rating: 0,
          explanation: `Error: ${error.message || 'Failed to rate content'}`
        });
      }
    }
    return results;
  }

  // Step 3: Generate Learning Plan and Actions
  async generateLearningPlan(highRatedTabs) {
    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a structured learning plan from these high-rated articles.
              Return ONLY a JSON object with this exact structure:
              {
                "readingSequence": [
                  {
                    "title": "string",
                    "estimatedTime": "number"
                  }
                ],
                "practicalExercises": ["string"],
                "implementationSteps": ["string"],
                "nextActions": ["string"]
              }
              
              Articles: ${JSON.stringify(highRatedTabs)}
              
              DO NOT include any other text, markdown formatting, or explanation.`
            }]
          }]
        })
      });

      const data = await response.json();
      console.log('Step 3 data:', data);
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid API response structure');
      }
      
      // Clean up the response text
      let responseText = data.candidates[0].content.parts[0].text.trim();
      
      // If response contains any markdown code fences, extract just the JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }
      
      console.log('Cleaned learning plan:', responseText);
      
      const parsed = JSON.parse(responseText);
      
      // Validate the structure
      if (!Array.isArray(parsed.readingSequence) || 
          !Array.isArray(parsed.practicalExercises) ||
          !Array.isArray(parsed.implementationSteps) ||
          !Array.isArray(parsed.nextActions)) {
        throw new Error('Invalid learning plan format');
      }
      
      // Format the reading sequence
      parsed.readingSequence = parsed.readingSequence.map(item => ({
        title: item.title || 'Untitled',
        estimatedTime: typeof item.estimatedTime === 'number' ? 
          item.estimatedTime : 
          parseInt(item.estimatedTime) || 30
      }));
      
      return parsed;

    } catch (error) {
      console.error('Error generating learning plan:', error);
      return {
        readingSequence: [],
        practicalExercises: ['Failed to generate exercises'],
        implementationSteps: ['Failed to generate steps'],
        nextActions: ['Please try again']
      };
    }
  }
} 
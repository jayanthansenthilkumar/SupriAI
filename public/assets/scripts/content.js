function extractPageContent() {
  // Get main content, excluding navigation, footer, etc.
  try {
    // Try to get main content area first
    let content = '';
    
    // Try common content selectors
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.post-content',
      '.article-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim().length > 100) {
        content = element.innerText;
        console.log(`Content extracted from: ${selector}`);
        break;
      }
    }
    
    // Fallback to body if no main content found
    if (!content) {
      content = document.body.innerText;
      console.log('Content extracted from: body');
    }
    
    // Basic cleaning of the content
    const cleanContent = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n+/g, ' ')   // Replace newlines with spaces
      .trim()
      .slice(0, 8000); // Increased limit for better summaries
    
    if (cleanContent.length < 50) {
      throw new Error('Page content is too short to summarize');
    }
    
    console.log('Extracted content length:', cleanContent.length);
    return cleanContent;
    
  } catch (error) {
    console.error('Error extracting content:', error);
    throw error;
  }
}

// Listen for message from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    try {
      const content = extractPageContent();
      console.log('Sending content to popup...');
      sendResponse({ content: content, success: true });
    } catch (error) {
      console.error('Content extraction failed:', error);
      sendResponse({ 
        content: '', 
        success: false, 
        error: error.message || 'Could not extract page content' 
      });
    }
    return true; // Required for async response
  }
}); 
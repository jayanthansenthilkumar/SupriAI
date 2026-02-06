class CurationWorkflow {
  constructor(curationService) {
    this.curationService = curationService;
    this.currentStep = 1;
    this.workflowData = {
      selectedTabs: [],
      intents: {},
      ratings: [],
      learningPlan: null
    };
  }

  async startWorkflow(domain) {
    try {
      console.log('Starting workflow for domain:', domain);
      const tabs = await this.getTabsForDomain(domain);
      console.log('Found tabs:', tabs);
      
      if (!tabs || tabs.length === 0) {
        throw new Error('No tabs found for this domain');
      }

      // Step 1: Analyze Intents
      this.workflowData.selectedTabs = tabs;
      this.workflowData.intents = await this.curationService.analyzeTabsIntent(tabs);
      this.updateUI();

      // Wait for user to click continue before proceeding
      return;

      // Step 2: Rate content quality
      this.workflowData.ratings = await this.curationService.rateContent(
        tabs,
        this.workflowData.intents
      );
      
      // Filter high-rated tabs (rating >= 7)
      const highRatedTabs = this.workflowData.ratings
        .filter(r => r.rating >= 7)
        .map(r => ({
          ...r,
          tab: this.workflowData.selectedTabs.find(t => t.id === r.tabId)
        }));
      
      this.updateUI();

      // Step 3: Generate learning plan
      this.workflowData.learningPlan = await this.curationService.generateLearningPlan(
        highRatedTabs
      );
      this.updateUI();
    } catch (error) {
      console.error('Workflow error:', error);
      const container = document.getElementById('curationWorkflow');
      if (container) {
        container.innerHTML = `
          <div class="error-message">
            <p>Error: ${error.message}</p>
            <p>Please try again or select a different domain.</p>
          </div>
        `;
      }
    }
  }

  async getTabsForDomain(domain) {
    console.log('Querying tabs for domain:', domain);  // Debug log
    return new Promise((resolve) => {
      chrome.tabs.query({ url: `*://*.${domain}/*` }, (tabs) => {
        console.log('Query result:', tabs);  // Debug log
        resolve(tabs);
      });
    });
  }

  updateUI() {
    const container = document.getElementById('curationWorkflow');
    if (!container) return;

    switch (this.currentStep) {
      case 1:
        this.renderStepOne(container);
        break;
      case 2:
        this.renderStepTwo(container);
        break;
      case 3:
        this.renderStepThree(container);
        break;
    }
  }

  renderStepOne(container) {
    container.innerHTML = `
      <div class="step-container">
        <h3>Step 1: Intent Analysis</h3>
        
        <div class="intent-summary">
          <h4>Identified Intent:</h4>
          <p class="intent-description">${this.workflowData.intents.intent}</p>
        </div>

        <div class="relevant-tabs">
          <h4>Relevant Tabs:</h4>
          <ul class="tabs-list">
            ${this.workflowData.intents.relevant_tabs.map(title => `
              <li class="tab-item">
                <span class="tab-title">${title}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="step-actions">
          <button class="primary-button" id="proceedToStep2">
            Continue to Rating
          </button>
        </div>
      </div>
    `;

    // Add event listener after rendering
    document.getElementById('proceedToStep2')
      ?.addEventListener('click', () => this.proceedToStep2());
  }

  renderStepTwo(container) {
    container.innerHTML = `
      <div class="step-container">
        <h3>Step 2: Content Quality Ratings</h3>
        <div class="ratings-list">
          ${this.workflowData.ratings.map(rating => `
            <div class="rating-item ${rating.rating >= 7 ? 'high-rated' : ''}">
              <h4>${this.workflowData.selectedTabs.find(t => t.id === rating.tabId)?.title}</h4>
              <p>Rating: ${rating.rating}/10</p>
              <p>Explanation: ${rating.explanation}</p>
            </div>
          `).join('')}
        </div>
        <div class="step-actions">
          <button class="primary-button" id="proceedToStep3">
            Generate Learning Plan
          </button>
        </div>
      </div>
    `;

    // Add event listener after rendering
    document.getElementById('proceedToStep3')
      ?.addEventListener('click', () => this.proceedToStep3());
  }

  renderStepThree(container) {
    if (!this.workflowData.learningPlan) {
      container.innerHTML = `
        <div class="error-message">
          <p>Learning plan not available.</p>
          <p>Please complete the previous steps first.</p>
        </div>
      `;
      return;
    }

    const plan = this.workflowData.learningPlan;
    container.innerHTML = `
      <div class="step-container">
        <h3>Step 3: Your Learning Plan</h3>
        
        <div class="learning-plan">
          <h4>Reading Sequence</h4>
          <ol>
            ${plan.readingSequence.map(item => `
              <li>
                <div class="reading-item">
                  <span class="reading-title">${item.title}</span>
                  <span class="reading-time">${item.estimatedTime} mins</span>
                </div>
              </li>
            `).join('')}
          </ol>

          <h4>Practical Exercises</h4>
          <ul>
            ${plan.practicalExercises.map(exercise => `
              <li>${exercise}</li>
            `).join('')}
          </ul>

          <h4>Implementation Steps</h4>
          <ol>
            ${plan.implementationSteps.map(step => `
              <li>${step}</li>
            `).join('')}
          </ol>

          <h4>Next Actions</h4>
          <div class="checklist">
            ${plan.nextActions.map(action => `
              <label class="checkbox-item">
                <input type="checkbox">
                <span>${action}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="step-actions">
          <button class="primary-button" id="savePlan">Save Learning Plan</button>
          <button class="secondary-button" id="closeUnusedTabs">Close Unused Tabs</button>
        </div>
      </div>
    `;

    // Add event listeners after rendering
    document.getElementById('savePlan')
      ?.addEventListener('click', () => this.saveLearningPlan());
    document.getElementById('closeUnusedTabs')
      ?.addEventListener('click', () => this.closeUnusedTabs());
  }

  async proceedToStep2() {
    try {
      this.currentStep = 2;
      // Step 2: Rate content quality
      this.workflowData.ratings = await this.curationService.rateContent(
        this.workflowData.selectedTabs,
        this.workflowData.intents
      );
      this.updateUI();
    } catch (error) {
      console.error('Error in step 2:', error);
      this.showError(error.message);
    }
  }

  async proceedToStep3() {
    try {
      this.currentStep = 3;
      const highRatedTabs = this.workflowData.ratings
        .filter(r => r.rating >= 7)
        .map(r => ({
          ...r,
          tab: this.workflowData.selectedTabs.find(t => t.id === r.tabId)
        }));

      this.workflowData.learningPlan = await this.curationService.generateLearningPlan(
        highRatedTabs
      );
      this.updateUI();
    } catch (error) {
      console.error('Error in step 3:', error);
      this.showError(error.message);
    }
  }

  showError(message) {
    const container = document.getElementById('curationWorkflow');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <p>Error: ${message}</p>
          <p>Please try again or select a different domain.</p>
        </div>
      `;
    }
  }

  async saveLearningPlan() {
    // Save to chrome.storage
    await chrome.storage.local.set({
      learningPlans: {
        ...(await chrome.storage.local.get('learningPlans')).learningPlans,
        [Date.now()]: this.workflowData.learningPlan
      }
    });
  }

  async closeUnusedTabs() {
    const lowRatedTabIds = this.workflowData.ratings
      .filter(r => r.rating < 7)
      .map(r => r.tabId);
    
    await chrome.tabs.remove(lowRatedTabIds);
  }
} 
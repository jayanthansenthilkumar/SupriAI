/**
 * Database Service for SupriAI
 * Uses IndexedDB to store tab history and browsing data
 * Schema is designed to be compatible with SQLite for future server-side sync
 */

class DatabaseService {
  constructor() {
    this.dbName = "SupriAI_DB";
    this.version = 1;
    this.db = null;
  }

  /**
   * Initialize the database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("Database failed to open:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("Database opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create tabs store (equivalent to tabs table in SQLite)
        if (!db.objectStoreNames.contains("tabs")) {
          const tabsStore = db.createObjectStore("tabs", {
            keyPath: "id",
            autoIncrement: true,
          });

          // Create indexes for efficient querying
          tabsStore.createIndex("tabId", "tabId", { unique: false });
          tabsStore.createIndex("url", "url", { unique: false });
          tabsStore.createIndex("domain", "domain", { unique: false });
          tabsStore.createIndex("timestamp", "timestamp", { unique: false });
          tabsStore.createIndex("sessionId", "sessionId", { unique: false });
          tabsStore.createIndex("date", "date", { unique: false });
        }

        // Create sessions store (browsing sessions)
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionsStore = db.createObjectStore("sessions", {
            keyPath: "id",
            autoIncrement: true,
          });

          sessionsStore.createIndex("sessionId", "sessionId", { unique: true });
          sessionsStore.createIndex("startTime", "startTime", {
            unique: false,
          });
          sessionsStore.createIndex("endTime", "endTime", { unique: false });
        }

        // Create domain_stats store (aggregate statistics per domain)
        if (!db.objectStoreNames.contains("domain_stats")) {
          const domainStatsStore = db.createObjectStore("domain_stats", {
            keyPath: "id",
            autoIncrement: true,
          });

          domainStatsStore.createIndex("domain", "domain", { unique: false });
          domainStatsStore.createIndex("date", "date", { unique: false });
          domainStatsStore.createIndex("domain_date", ["domain", "date"], {
            unique: true,
          });
        }

        // Create tab_events store (detailed tab activity events)
        if (!db.objectStoreNames.contains("tab_events")) {
          const tabEventsStore = db.createObjectStore("tab_events", {
            keyPath: "id",
            autoIncrement: true,
          });

          tabEventsStore.createIndex("tabId", "tabId", { unique: false });
          tabEventsStore.createIndex("eventType", "eventType", {
            unique: false,
          });
          tabEventsStore.createIndex("timestamp", "timestamp", {
            unique: false,
          });
          tabEventsStore.createIndex("sessionId", "sessionId", {
            unique: false,
          });
        }

        console.log("Database setup complete");
      };
    });
  }

  /**
   * Save a tab to the database
   */
  async saveTab(tabData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tabs"], "readwrite");
      const store = transaction.objectStore("tabs");

      const tab = {
        tabId: tabData.tabId,
        url: tabData.url,
        domain: tabData.domain,
        title: tabData.title || "",
        favicon: tabData.favicon || "",
        timestamp: tabData.timestamp || Date.now(),
        sessionId: tabData.sessionId,
        activeTime: tabData.activeTime || 0,
        date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
        metadata: JSON.stringify(tabData.metadata || {}),
      };

      const request = store.add(tab);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("Error saving tab:", request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all tabs for a specific session
   */
  async getTabsBySession(sessionId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tabs"], "readonly");
      const store = transaction.objectStore("tabs");
      const index = store.index("sessionId");
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all tabs for a specific domain
   */
  async getTabsByDomain(domain) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tabs"], "readonly");
      const store = transaction.objectStore("tabs");
      const index = store.index("domain");
      const request = index.getAll(domain);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get tabs within a date range
   */
  async getTabsByDateRange(startDate, endDate) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tabs"], "readonly");
      const store = transaction.objectStore("tabs");
      const index = store.index("timestamp");

      const range = IDBKeyRange.bound(
        new Date(startDate).getTime(),
        new Date(endDate).getTime(),
      );

      const request = index.getAll(range);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Create a new browsing session
   */
  async createSession() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sessions"], "readwrite");
      const store = transaction.objectStore("sessions");

      const session = {
        sessionId: this.generateSessionId(),
        startTime: Date.now(),
        endTime: null,
        tabCount: 0,
        totalActiveTime: 0,
      };

      const request = store.add(session);

      request.onsuccess = () => {
        resolve(session.sessionId);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update a session
   */
  async updateSession(sessionId, updates) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sessions"], "readwrite");
      const store = transaction.objectStore("sessions");
      const index = store.index("sessionId");

      const getRequest = index.get(sessionId);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          Object.assign(session, updates);
          const updateRequest = store.put(session);

          updateRequest.onsuccess = () => {
            resolve(session);
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error("Session not found"));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Save domain statistics
   */
  async saveDomainStats(domain, date, stats) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["domain_stats"], "readwrite");
      const store = transaction.objectStore("domain_stats");
      const index = store.index("domain_date");

      const getRequest = index.get([domain, date]);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;

        const domainStat = existing || {
          domain,
          date,
          visitCount: 0,
          totalActiveTime: 0,
          tabCount: 0,
          lastVisit: null,
        };

        // Update stats
        domainStat.visitCount =
          (domainStat.visitCount || 0) + (stats.visitCount || 1);
        domainStat.totalActiveTime =
          (domainStat.totalActiveTime || 0) + (stats.activeTime || 0);
        domainStat.tabCount =
          (domainStat.tabCount || 0) + (stats.tabCount || 1);
        domainStat.lastVisit = Date.now();

        const saveRequest = existing
          ? store.put(domainStat)
          : store.add(domainStat);

        saveRequest.onsuccess = () => {
          resolve(domainStat);
        };

        saveRequest.onerror = () => {
          reject(saveRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Get domain statistics for a date range
   */
  async getDomainStats(startDate, endDate) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["domain_stats"], "readonly");
      const store = transaction.objectStore("domain_stats");
      const request = store.getAll();

      request.onsuccess = () => {
        const allStats = request.result;
        const filtered = allStats.filter((stat) => {
          return stat.date >= startDate && stat.date <= endDate;
        });
        resolve(filtered);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Log a tab event
   */
  async logTabEvent(eventData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tab_events"], "readwrite");
      const store = transaction.objectStore("tab_events");

      const event = {
        tabId: eventData.tabId,
        eventType: eventData.eventType, // 'opened', 'closed', 'activated', 'updated', 'idle'
        timestamp: eventData.timestamp || Date.now(),
        sessionId: eventData.sessionId,
        url: eventData.url || "",
        domain: eventData.domain || "",
        metadata: JSON.stringify(eventData.metadata || {}),
      };

      const request = store.add(event);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get tab events for a specific tab
   */
  async getTabEvents(tabId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tab_events"], "readonly");
      const store = transaction.objectStore("tab_events");
      const index = store.index("tabId");
      const request = index.getAll(tabId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all tabs (with optional limit)
   */
  async getAllTabs(limit = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tabs"], "readonly");
      const store = transaction.objectStore("tabs");
      const request = store.getAll(limit);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear old data (data older than specified days)
   */
  async clearOldData(daysToKeep = 30) {
    if (!this.db) await this.init();

    const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ["tabs", "tab_events"],
        "readwrite",
      );

      // Clear old tabs
      const tabsStore = transaction.objectStore("tabs");
      const tabsIndex = tabsStore.index("timestamp");
      const tabsRange = IDBKeyRange.upperBound(cutoffDate);
      const tabsRequest = tabsIndex.openCursor(tabsRange);

      let deletedCount = 0;

      tabsRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      // Clear old events
      const eventsStore = transaction.objectStore("tab_events");
      const eventsIndex = eventsStore.index("timestamp");
      const eventsRange = IDBKeyRange.upperBound(cutoffDate);
      const eventsRequest = eventsIndex.openCursor(eventsRange);

      eventsRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve({ deletedCount });
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  /**
   * Export database to JSON (for backup or sync)
   */
  async exportToJSON() {
    if (!this.db) await this.init();

    const data = {
      tabs: await this.getAllTabs(),
      sessions: await this.getAllSessions(),
      domainStats: await this.getAllDomainStats(),
      exportDate: new Date().toISOString(),
    };

    return data;
  }

  /**
   * Get all sessions
   */
  async getAllSessions() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["sessions"], "readonly");
      const store = transaction.objectStore("sessions");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all domain stats
   */
  async getAllDomainStats() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["domain_stats"], "readonly");
      const store = transaction.objectStore("domain_stats");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export as singleton
const dbService = new DatabaseService();

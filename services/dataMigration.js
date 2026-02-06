/**
 * Data Migration Utility
 * Migrates existing chrome.storage data to the new IndexedDB database
 */

class DataMigration {
  /**
   * Migrate existing tab data from chrome.storage to IndexedDB
   */
  static async migrateExistingData() {
    console.log('Starting data migration...');
    
    try {
      // Get existing data from chrome.storage
      const { tabData, tabGroups, currentSessionId } = await chrome.storage.local.get([
        'tabData',
        'tabGroups',
        'currentSessionId'
      ]);

      if (!tabData || Object.keys(tabData).length === 0) {
        console.log('No existing data to migrate');
        return { success: true, migratedCount: 0 };
      }

      console.log(`Found ${Object.keys(tabData).length} tabs to migrate`);

      // Initialize database
      await dbService.init();

      // Get or create session
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await dbService.createSession();
        await chrome.storage.local.set({ currentSessionId: sessionId });
      }

      let migratedCount = 0;
      const today = new Date().toISOString().split('T')[0];

      // Migrate each tab
      for (const [tabId, tab] of Object.entries(tabData)) {
        try {
          // Save tab to database
          await dbService.saveTab({
            tabId: parseInt(tabId),
            url: tab.url,
            domain: tab.domain,
            title: '', // Not available in old data
            favicon: '',
            timestamp: tab.startTime,
            sessionId: sessionId,
            activeTime: tab.totalActiveTime || 0
          });

          // Log tab event
          await dbService.logTabEvent({
            tabId: parseInt(tabId),
            eventType: tab.isActive ? 'activated' : 'idle',
            timestamp: tab.lastActiveTime,
            sessionId: sessionId,
            url: tab.url,
            domain: tab.domain
          });

          // Update domain stats
          if (tab.totalActiveTime > 0) {
            await dbService.saveDomainStats(tab.domain, today, {
              activeTime: tab.totalActiveTime,
              tabCount: 1,
              visitCount: 1
            });
          }

          migratedCount++;
        } catch (error) {
          console.error(`Error migrating tab ${tabId}:`, error);
        }
      }

      // Update session with migrated data
      const totalActiveTime = Object.values(tabData)
        .reduce((sum, tab) => sum + (tab.totalActiveTime || 0), 0);

      await dbService.updateSession(sessionId, {
        tabCount: migratedCount,
        totalActiveTime: totalActiveTime,
        endTime: Date.now()
      });

      console.log(`Migration complete! Migrated ${migratedCount} tabs`);

      return {
        success: true,
        migratedCount,
        sessionId
      };

    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify migration was successful
   */
  static async verifyMigration() {
    try {
      const tabs = await dbService.getAllTabs();
      const sessions = await dbService.getAllSessions();
      const stats = await dbService.getAllDomainStats();

      console.log('Migration Verification:');
      console.log(`- Total tabs in database: ${tabs.length}`);
      console.log(`- Total sessions: ${sessions.length}`);
      console.log(`- Total domain stats: ${stats.length}`);

      return {
        success: true,
        tabCount: tabs.length,
        sessionCount: sessions.length,
        statsCount: stats.length
      };
    } catch (error) {
      console.error('Verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Backup existing chrome.storage data before migration
   */
  static async backupChromeStorage() {
    try {
      const data = await chrome.storage.local.get(null);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supri-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Backup created successfully');
      return { success: true };
    } catch (error) {
      console.error('Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete migration workflow
   */
  static async runFullMigration() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║           SupriAI Data Migration Utility               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Step 1: Backup
    console.log('Step 1: Creating backup...');
    const backupResult = await this.backupChromeStorage();
    if (!backupResult.success) {
      console.error('Backup failed. Aborting migration.');
      return;
    }
    console.log('✓ Backup created\n');

    // Step 2: Migrate
    console.log('Step 2: Migrating data...');
    const migrationResult = await this.migrateExistingData();
    if (!migrationResult.success) {
      console.error('Migration failed:', migrationResult.error);
      return;
    }
    console.log(`✓ Migrated ${migrationResult.migratedCount} tabs\n`);

    // Step 3: Verify
    console.log('Step 3: Verifying migration...');
    const verifyResult = await this.verifyMigration();
    if (!verifyResult.success) {
      console.error('Verification failed:', verifyResult.error);
      return;
    }
    console.log('✓ Verification complete\n');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              Migration Completed Successfully          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`- Tabs migrated: ${migrationResult.migratedCount}`);
    console.log(`- Tabs in database: ${verifyResult.tabCount}`);
    console.log(`- Sessions created: ${verifyResult.sessionCount}`);
    console.log(`- Domain stats: ${verifyResult.statsCount}`);
  }

  /**
   * Clean up old chrome.storage data after successful migration
   * WARNING: This will delete the old data!
   */
  static async cleanupOldData() {
    const confirmed = confirm(
      'Are you sure you want to delete the old chrome.storage data?\n\n' +
      'This action cannot be undone. Make sure you have a backup!'
    );

    if (!confirmed) {
      console.log('Cleanup cancelled');
      return { success: false, cancelled: true };
    }

    try {
      // Keep settings, only remove tab data
      await chrome.storage.local.remove(['tabData', 'tabGroups']);
      
      console.log('Old data cleaned up successfully');
      return { success: true };
    } catch (error) {
      console.error('Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore from backup
   */
  static async restoreFromBackup(backupData) {
    try {
      await chrome.storage.local.set(backupData);
      console.log('Backup restored successfully');
      return { success: true };
    } catch (error) {
      console.error('Restore failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Auto-run migration on first load (only if needed)
async function autoMigrate() {
  try {
    // Check if migration has already been done
    const { migrationCompleted } = await chrome.storage.local.get(['migrationCompleted']);
    
    if (migrationCompleted) {
      console.log('Migration already completed');
      return;
    }

    // Check if there's data to migrate
    const { tabData } = await chrome.storage.local.get(['tabData']);
    
    if (!tabData || Object.keys(tabData).length === 0) {
      console.log('No data to migrate');
      await chrome.storage.local.set({ migrationCompleted: true });
      return;
    }

    // Run migration
    console.log('Auto-migration starting...');
    const result = await DataMigration.migrateExistingData();
    
    if (result.success) {
      await chrome.storage.local.set({ migrationCompleted: true });
      console.log('Auto-migration completed successfully');
    }
  } catch (error) {
    console.error('Auto-migration failed:', error);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataMigration;
}

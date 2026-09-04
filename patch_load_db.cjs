const fs = require('fs');

let content = fs.readFileSync('src/services/db.ts', 'utf8');

const oldLoad = `export async function loadDatabaseFromStorage(): Promise<AppDatabaseState> {
  try {
    // 1. API backend is the authoritative production source of truth
    let prodDb = await fetchDatabaseFromAPI();
    if (!prodDb) {
      console.warn("No prod DB found, falling back to fresh database");
      prodDb = createFreshDatabase(false);
    }
    
    // 2. Discard stale offline local storage for financial records
    // Always trust the server authoritative database
    
    // Ensure prodDb arrays exist
    prodDb.members = prodDb.members || [];
    prodDb.admissions = prodDb.admissions || [];
    prodDb.collections = prodDb.collections || [];
    prodDb.capitalDeposits = prodDb.capitalDeposits || [];
    prodDb.journalEntries = prodDb.journalEntries || [];
    prodDb.journalLines = prodDb.journalLines || [];
    prodDb.cashTransactions = prodDb.cashTransactions || [];
    prodDb.expenses = prodDb.expenses || [];
    prodDb.incomes = prodDb.incomes || [];
    prodDb.welfareTransactions = prodDb.welfareTransactions || [];
    prodDb.contraTransactions = prodDb.contraTransactions || [];
    prodDb.memberExits = prodDb.memberExits || [];
    prodDb.loans = prodDb.loans || [];

    // Repair/ensure integrity
    repairAccounts(prodDb.accounts);
    repairJournalEntriesAndLines(prodDb);
    repairUsers(prodDb);
    repairLateFeeWaivers(prodDb);
    repairDuplicateCollections(prodDb);
    
    // Overwrite localforage with the single source of truth from the server
    try {
      await localforage.setItem(STORAGE_KEY, JSON.stringify(prodDb));
    } catch (err) {
      console.warn("Could not write offline cache to localforage", err);
    }
    
    return prodDb;
  } catch (e) {
    console.error("Failed to load production DB, falling back to clean initial state", e);
    return createFreshDatabase(false);
  }
}`;

const newLoad = `export async function loadDatabaseFromStorage(): Promise<AppDatabaseState> {
  try {
    // 1. API backend is the authoritative production source of truth
    let prodDb;
    try {
      prodDb = await fetchDatabaseFromAPI();
    } catch (apiErr) {
      console.error("API Fetch failed, checking local cache", apiErr);
      // Fallback to local cache if API is offline
      const localStr = await localforage.getItem<string>(STORAGE_KEY);
      if (localStr) {
        prodDb = JSON.parse(localStr);
        console.log("Loaded fallback from local cache");
      }
    }

    if (!prodDb) {
      // Try local cache one more time just in case it didn't throw but returned null
      const localStr = await localforage.getItem<string>(STORAGE_KEY);
      if (localStr) {
        prodDb = JSON.parse(localStr);
        console.log("Loaded fallback from local cache (API returned null)");
      } else {
        console.warn("No prod DB found and no local cache, falling back to fresh database");
        prodDb = createFreshDatabase(false);
      }
    }
    
    // 2. Discard stale offline local storage for financial records
    // Always trust the server authoritative database
    
    // Ensure prodDb arrays exist
    prodDb.members = prodDb.members || [];
    prodDb.admissions = prodDb.admissions || [];
    prodDb.collections = prodDb.collections || [];
    prodDb.capitalDeposits = prodDb.capitalDeposits || [];
    prodDb.journalEntries = prodDb.journalEntries || [];
    prodDb.journalLines = prodDb.journalLines || [];
    prodDb.cashTransactions = prodDb.cashTransactions || [];
    prodDb.expenses = prodDb.expenses || [];
    prodDb.incomes = prodDb.incomes || [];
    prodDb.welfareTransactions = prodDb.welfareTransactions || [];
    prodDb.contraTransactions = prodDb.contraTransactions || [];
    prodDb.memberExits = prodDb.memberExits || [];
    prodDb.loans = prodDb.loans || [];

    // Repair/ensure integrity
    repairAccounts(prodDb.accounts);
    repairJournalEntriesAndLines(prodDb);
    repairUsers(prodDb);
    repairLateFeeWaivers(prodDb);
    repairDuplicateCollections(prodDb);
    
    // Overwrite localforage with the single source of truth from the server
    try {
      await localforage.setItem(STORAGE_KEY, JSON.stringify(prodDb));
    } catch (err) {
      console.warn("Could not write offline cache to localforage", err);
    }
    
    return prodDb;
  } catch (e) {
    console.error("Failed to load production DB, falling back to local cache or clean state", e);
    const localStr = await localforage.getItem<string>(STORAGE_KEY).catch(() => null);
    if (localStr) {
      return JSON.parse(localStr);
    }
    return createFreshDatabase(false);
  }
}`;

content = content.replace(oldLoad, newLoad);
fs.writeFileSync('src/services/db.ts', content, 'utf8');
console.log('Patched loadDatabaseFromStorage');

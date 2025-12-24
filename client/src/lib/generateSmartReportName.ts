/**
 * Generates a smart report name based on selections
 * Format: "{Account} • {N} {type} • {date}"
 * 
 * Examples:
 * - "Nike USA • 3 campaigns • Dec 23"
 * - "Adidas • 1 account • Dec 23"
 * - "Multiple accounts • 5 campaigns • Dec 23"
 */

interface SelectionsData {
  accounts: string[];
  campaigns: string[];
  adsets: string[];
  ads: string[];
  creatives: string[];
}

interface AccountInfo {
  id: string;
  name: string;
}

/**
 * Get the most significant selection type and count
 */
function getMostSignificantSelection(selections: SelectionsData): { type: string; count: number } {
  // Priority: campaigns > adsets > ads > creatives > accounts
  if (selections.campaigns.length > 0) {
    return { type: 'campaign', count: selections.campaigns.length };
  }
  if (selections.adsets.length > 0) {
    return { type: 'ad set', count: selections.adsets.length };
  }
  if (selections.ads.length > 0) {
    return { type: 'ad', count: selections.ads.length };
  }
  if (selections.creatives.length > 0) {
    return { type: 'creative', count: selections.creatives.length };
  }
  return { type: 'account', count: selections.accounts.length };
}

/**
 * Pluralize a word based on count
 */
function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  
  // Special cases
  if (word === 'ad set') return 'ad sets';
  
  return word + 's';
}

/**
 * Format current date as "Dec 23" style
 */
function formatShortDate(): string {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const day = now.getDate();
  return `${month} ${day}`;
}

/**
 * Truncate account name if too long
 */
function truncateAccountName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '…';
}

/**
 * Generate smart report name
 * 
 * @param selections - Current selections (accounts, campaigns, etc.)
 * @param accounts - Array of account info with id and name
 * @param existingNames - Array of existing report names to avoid duplicates
 */
export function generateSmartReportName(
  selections: SelectionsData,
  accounts: AccountInfo[],
  existingNames: string[] = []
): string {
  // Get account name(s)
  let accountPart: string;
  
  if (selections.accounts.length === 0) {
    accountPart = 'New Report';
  } else if (selections.accounts.length === 1) {
    const accountId = selections.accounts[0];
    const account = accounts.find(a => a.id === accountId);
    accountPart = truncateAccountName(account?.name || 'Account');
  } else {
    accountPart = `${selections.accounts.length} accounts`;
  }

  // Get most significant selection
  const { type, count } = getMostSignificantSelection(selections);
  const countPart = `${count} ${pluralize(type, count)}`;

  // Date part
  const datePart = formatShortDate();

  // Compose name
  let baseName = `${accountPart} • ${countPart} • ${datePart}`;

  // Ensure uniqueness
  if (existingNames.length > 0) {
    let finalName = baseName;
    let counter = 1;
    
    while (existingNames.includes(finalName)) {
      counter++;
      finalName = `${baseName} (${counter})`;
    }
    
    return finalName;
  }

  return baseName;
}

export default generateSmartReportName;

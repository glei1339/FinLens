export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Utilities',
  'Housing',
  'Travel',
  'Education',
  'Personal Care',
  'Subscriptions',
  'Income',
  'Transfers',
  'Fees & Charges',
  'Uncategorized',
]

export const CATEGORY_COLORS = {
  'Food & Dining':   '#f97316',
  'Groceries':       '#84cc16',
  'Transportation':  '#3b82f6',
  'Entertainment':   '#a855f7',
  'Shopping':        '#ec4899',
  'Healthcare':      '#ef4444',
  'Utilities':       '#06b6d4',
  'Housing':         '#8b5cf6',
  'Travel':          '#14b8a6',
  'Education':       '#f59e0b',
  'Personal Care':   '#e879f9',
  'Subscriptions':   '#6366f1',
  'Income':          '#22c55e',
  'Transfers':       '#64748b',
  'Fees & Charges':  '#dc2626',
  'Uncategorized':   '#9ca3af',
}

// Each entry: [category, [...keywords]]
// Keywords are lowercase, matched against lowercase description
const RULES = [
  ['Income', [
    'payroll', 'direct deposit', 'salary', 'paycheck', 'wages', 'dividend',
    'tax refund', 'irs treas', 'social security', 'ssa treas', 'va treas',
    'cashback reward', 'interest earned', 'interest payment',
  ]],
  ['Transfers', [
    'venmo', 'zelle', 'paypal', 'cash app', 'cashapp', 'wire transfer',
    'account transfer', 'online transfer', 'bank transfer', 'square cash',
    'apple cash', 'google pay transfer',
  ]],
  ['Fees & Charges', [
    'overdraft fee', 'monthly fee', 'service charge', 'late fee', 'nsf fee',
    'atm fee', 'foreign transaction', 'annual fee', 'penalty', 'finance charge',
    'wire fee', 'returned item',
  ]],
  ['Groceries', [
    'walmart', 'kroger', 'safeway', 'whole foods', 'trader joe', 'aldi',
    'publix', 'costco', 'stop & shop', 'food lion', 'giant food',
    'wegmans', 'h-e-b', 'heb ', 'meijer', 'winn-dixie', 'sprouts',
    'fresh market', 'market basket', 'smart & final', 'stater bros',
    'harris teeter', 'save a lot', 'winco', 'food 4 less', 'piggly wiggly',
    'grocery', 'supermarket', 'fresh thyme', 'natural grocers',
  ]],
  ['Food & Dining', [
    'mcdonald', 'starbucks', 'restaurant', 'cafe ', 'coffee', 'pizza',
    'burger', 'sushi', 'chipotle', 'subway', "wendy's", 'wendys', 'taco bell',
    'taco ', 'doordash', 'uber eats', 'ubereats', 'grubhub', 'panera',
    'dunkin', 'domino', 'kfc', 'popeyes', 'chick-fil-a', 'chickfila',
    'olive garden', "applebee's", "denny's", 'dennys', 'ihop', 'waffle house',
    'sonic drive', "hardee's", "jack in the box", 'panda express', 'cinco de mayo',
    'five guys', 'shake shack', 'wingstop', 'raising cane', "zaxby's",
    'cracker barrel', "chili's", "friday's", 'longhorn', 'red lobster',
    'outback', 'texas roadhouse', 'buffalo wild wings', 'bww', 'culver',
    'in-n-out', 'whataburger', 'del taco', "arby's", 'arbys',
    'little caesars', 'papa john', "papa murphy", 'pizza hut',
    'noodles', 'bar & grill', 'diner', 'eatery', 'dining',
    'brunch', 'bakery', 'deli', 'bistro', 'steakhouse', 'grill',
    'smoothie', 'juice bar', 'boba', 'bubble tea',
  ]],
  ['Transportation', [
    'uber ', 'lyft', 'shell ', 'chevron', 'bp ', 'exxon', 'mobil ',
    'speedway', 'circle k', 'wawa ', 'sunoco', 'marathon oil',
    'valero', 'pilot travel', 'flying j', 'loves travel',
    'parking', 'metro ', 'mta ', 'transit', 'toll ', 'e-zpass',
    'autozone', 'jiffy lube', 'valvoline', 'firestone', 'midas',
    'pep boys', "o'reilly auto", 'napa auto', 'advance auto',
    'car wash', 'aaa ', 'gasoline', 'fuel', 'electric vehicle',
    'tesla supercharg', 'blink charging', 'evgo', 'chargepoint',
    'amtrak', 'greyhound', 'megabus', 'via ', 'zipcar',
  ]],
  ['Entertainment', [
    'netflix', 'spotify', 'hulu', 'disney+', 'disney plus', 'disneyplus',
    'amazon prime', 'youtube premium', 'hbo max', 'hbomax', 'peacock',
    'paramount+', 'paramount plus', 'apple tv+', 'apple tv plus',
    'cinema', 'theater', 'movie', 'ticketmaster', 'eventbrite',
    'steam', 'playstation', 'xbox', 'nintendo', 'twitch', 'epic games',
    'gamestop', 'bowling', 'laser tag', 'escape room', 'miniature golf',
    'dave & buster', 'chuck e cheese', 'amc ', 'regal cinema',
    'cinemark', 'alamo drafthouse', 'comedy club',
    'concert', 'festival', 'sports ticket', 'nfl ', 'nba ', 'mlb ',
    'nhl ', 'live nation',
  ]],
  ['Subscriptions', [
    'adobe', 'microsoft 365', 'office 365', 'dropbox', 'google one',
    'icloud', 'lastpass', '1password', 'nordvpn', 'expressvpn',
    'malwarebytes', 'norton ', 'mcafee', 'lifelock',
    'ancestry', 'myheritage', 'duolingo', 'masterclass', 'skillshare',
    'medium ', 'substack', 'the athletic', 'new york times', 'nytimes',
    'washington post', 'wall street journal', 'wsj ',
    'linkedin premium', 'indeed premium', 'patreon',
  ]],
  ['Shopping', [
    'amazon', 'ebay ', 'etsy ', 'best buy', 'apple store', 'ikea',
    'home depot', "lowe's", 'lowes ', 'macys', "macy's", 'nordstrom',
    'tj maxx', 'tjmaxx', 'ross dress', 'marshalls', 'gap ', 'old navy',
    'zara ', 'h&m ', 'nike ', 'adidas ', 'under armour',
    'target ', 'dollar general', 'dollar tree', 'family dollar',
    "bed bath", 'pier 1', 'pottery barn', 'williams sonoma',
    'crate and barrel', 'wayfair', 'overstock', 'chewy',
    'petco', 'petsmart', 'michaels ', 'hobby lobby',
    'joann fabric', 'craft', 'office depot', 'staples ',
    'walgreens photo', 'shutterfly',
  ]],
  ['Healthcare', [
    'cvs ', 'walgreens', 'rite aid', 'pharmacy', 'hospital', 'clinic',
    'doctor', 'dental', 'dentist', 'vision', 'optometry', 'optical',
    'medical', 'health ', 'urgent care', 'prescription', 'rx ',
    'labcorp', 'quest diagnostics', 'radiology', 'imaging center',
    'physical therapy', 'chiropractor', 'dermatology', 'orthopedic',
    'cardiology', 'oncology', 'surgery center', 'patient first',
    'carefirst', 'blue cross', 'aetna', 'cigna', 'humana',
    'united health', 'anthem ', 'insurance premium',
  ]],
  ['Utilities', [
    'electric', 'electricity', 'water bill', 'utility', 'pg&e',
    'duke energy', 'national grid', 'con ed', 'comed',
    'dominion energy', 'southern company', 'aps energy', 'xcel energy',
    'nv energy', 'pseg ', 'sewage', 'trash', 'garbage',
    'comcast', 'xfinity', 'spectrum ', 'cox cable', 'cox comm',
    'att ', 'at&t', 'verizon', 't-mobile', 'sprint ',
    'dish network', 'directv', 'internet', 'cable bill',
  ]],
  ['Housing', [
    'rent ', 'mortgage', 'hoa ', 'apartment', 'self storage',
    'u-haul', 'real estate', 'property tax', 'homeowners insurance',
    'renters insurance', 'zillow', 'management co', 'rental payment',
  ]],
  ['Travel', [
    'hotel', 'airbnb', 'vrbo', 'marriott', 'hilton', 'hyatt',
    'holiday inn', 'best western', 'hampton inn', 'doubletree',
    'westin ', 'sheraton', 'radisson', 'motel',
    'delta air', 'united airlines', 'southwest', 'american airlines',
    'jetblue', 'frontier airlines', 'spirit airlines', 'alaska air',
    'expedia', 'booking.com', 'kayak', 'priceline', 'hotels.com',
    'trivago', 'enterprise rent', 'hertz ', 'avis ', 'budget car',
    'national car', 'alamo car', 'tsa precheck', 'global entry',
    'passport', 'foreign currency', 'cruise',
  ]],
  ['Education', [
    'tuition', 'coursera', 'udemy', 'chegg', 'khan academy',
    'school', 'university', 'college', 'community college',
    'student loan', 'sallie mae', 'navient', 'nelnet', 'fedloan',
    'pearson', 'mcgraw hill', 'cengage', 'textbook',
    'tutoring', 'learning center',
  ]],
  ['Personal Care', [
    'salon', 'spa ', 'barber', 'hair cut', 'haircut', 'hair salon',
    'nail salon', 'nails ', 'beauty supply', 'sephora', 'ulta beauty',
    'bath & body', 'lush ', 'massage', 'tanning',
    'gym', 'fitness', 'planet fitness', 'la fitness', 'anytime fitness',
    "gold's gym", '24 hour fitness', 'equinox', 'orangetheory',
    'crossfit', 'yoga', 'pilates', 'peloton',
  ]],
]

/**
 * Categorizes a transaction description string into one of the CATEGORIES.
 */
export function categorize(description) {
  if (!description) return 'Uncategorized'
  const lower = description.toLowerCase()

  for (const [category, keywords] of RULES) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category
    }
  }

  return 'Uncategorized'
}

/**
 * Applies categorization to an array of transaction objects.
 */
export function categorizeAll(transactions) {
  return transactions.map((t) => ({
    ...t,
    category: t.category || categorize(t.description),
  }))
}

// Expense categories — these represent money going OUT
const EXPENSE_CATEGORIES = new Set([
  'Food & Dining', 'Groceries', 'Transportation', 'Entertainment', 'Shopping',
  'Healthcare', 'Utilities', 'Housing', 'Travel', 'Education',
  'Personal Care', 'Subscriptions', 'Fees & Charges',
])

/**
 * Detects whether transaction signs are inverted (credit card convention).
 *
 * Credit card PDFs often list charges as positive numbers and payments as
 * negative — the opposite of what we want. This function categorizes a sample
 * of transactions using keyword rules and checks whether recognisable expenses
 * (Starbucks, Amazon, Shell, etc.) are predominantly positive. If they are,
 * the caller should negate all amounts.
 *
 * Returns true if signs should be flipped.
 */
export function needsSignFlip(transactions) {
  const expenseMatches = transactions.filter(t =>
    EXPENSE_CATEGORIES.has(categorize(t.description))
  )
  if (expenseMatches.length < 3) return false  // not enough signal
  const positiveExpenses = expenseMatches.filter(t => t.amount > 0).length
  return positiveExpenses / expenseMatches.length > 0.6
}

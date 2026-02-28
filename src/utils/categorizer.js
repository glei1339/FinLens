export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Utilities',
  'Housing',
  'Mortgage',
  'Repairs',
  'Travel',
  'Education',
  'Personal Care',
  'Subscriptions',
  'Software',
  'Legal',
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
  'Mortgage':        '#7c3aed',
  'Repairs':         '#b45309',
  'Travel':          '#14b8a6',
  'Education':       '#f59e0b',
  'Personal Care':   '#e879f9',
  'Subscriptions':   '#6366f1',
  'Software':        '#8b5cf6',
  'Legal':           '#1e40af',
  'Income':          '#22c55e',
  'Transfers':       '#64748b',
  'Fees & Charges':  '#dc2626',
  'Uncategorized':   '#9ca3af',
}

// ── Description normalizer ────────────────────────────────────────────────────
// Strips common bank/card transaction prefixes so "SQ *STARBUCKS" → "starbucks"
const PREFIX_RE = new RegExp(
  '^(' + [
    'pos purchase', 'pos debit', 'pos credit', 'pos transaction',
    'checkcard', 'check card', 'debit card purchase', 'debit purchase',
    'credit card purchase', 'purchase authorized on \\S+',
    'ach payment', 'ach debit', 'ach credit', 'ach deposit', 'ach transfer',
    'electronic payment', 'electronic transfer', 'e-payment',
    'online purchase', 'online payment', 'online banking transfer',
    'recurring payment', 'automatic payment', 'autopay', 'auto pay',
    'preauth', 'pre-auth', 'pre auth', 'preauthorized',
    'web payment', 'web pmnt', 'mobile payment', 'contactless',
    'bill payment', 'bill pay', 'billpay',
    'sq \\*', 'sq\\*', 'tst\\*', 'tst \\*', 'bt\\*', 'bt \\*',
    'pp \\*', 'paypal \\*',
    'aplpay ', 'apl pay ',  // Apple Pay prefix (Chase/Amex style)
  ].join('|') + ')\\s*[-–—#*:;,.]?\\s*',
  'i',
)

function normalizeDesc(raw) {
  if (!raw) return ''
  // Lowercase, strip prefix codes, trim trailing reference numbers/codes
  return raw
    .toLowerCase()
    .replace(PREFIX_RE, '')
    .replace(/\s+#?\d{4,}\s*$/, '')   // trailing ref numbers
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Word-boundary safe match (for short / ambiguous terms) ────────────────────
function wb(lower, term) {
  const idx = lower.indexOf(term)
  if (idx === -1) return false
  const pre  = idx === 0 || !/[a-z0-9]/.test(lower[idx - 1])
  const post = idx + term.length >= lower.length || !/[a-z0-9]/.test(lower[idx + term.length])
  return pre && post
}

// ── Rules ─────────────────────────────────────────────────────────────────────
// Format: [category, plainKeywords, wordBoundedKeywords?]
// plainKeywords  – matched with lower.includes(kw)
// wordBoundedKeywords – matched with wb() for short/ambiguous terms
const RULES = [

  // ── Income ────────────────────────────────────────────────────────────────
  ['Income', [
    // Payroll & employers
    'payroll', 'direct deposit', 'salary', 'paycheck', 'wages', 'wage payment',
    'employer payment', 'company payment',
    // Payroll processors
    'adp direct', 'adp payroll', 'adp wage', 'gusto payroll', 'gusto inc',
    'paychex', 'rippling payroll', 'justworks', 'bambee', 'paylocity',
    'paycom', 'ceridian', 'trinet', 'heartland payroll', 'intuit payroll',
    'workday payroll', 'payroll direct',
    // Government & benefits
    'irs treas', 'us treasury', 'tax refund', 'irs refund', 'state refund',
    'state tax refund', 'tax return deposit',
    'social security', 'ssa treas', 'ssa deposit', 'social sec',
    'va treas', 'department of veterans', 'va benefit',
    'unemployment', 'dept of labor', 'workforce commission',
    'state benefits', 'disability payment', 'ssdi deposit',
    'stimulus payment', 'economic impact payment', 'eidl advance',
    'child tax credit', 'advance ctc', 'snap benefit',
    // Investment & interest income
    'dividend', 'dividends', 'dividend payment', 'dividend credit',
    'interest earned', 'interest payment', 'interest income', 'interest credit',
    'investment income', 'capital gain', 'schwab deposit', 'fidelity deposit',
    'vanguard deposit', 'td ameritrade', 'etrade deposit', 'e*trade',
    'robinhood deposit', 'stash deposit', 'acorns found',
    'cashback reward', 'cash back reward', 'cash reward', 'reward credit',
    // Misc income
    'reimbursement', 'expense reimbursement', 'employee reimbursement',
    'commission payment', 'sales commission',
    'bonus payment', 'signing bonus', 'performance bonus', 'annual bonus',
    'referral bonus', 'referral payment', 'affiliate payment',
    'freelance', 'consulting fee', 'contractor payment', 'contract payment',
    'stipend', 'fellowship', 'scholarship deposit', 'grant payment',
    'royalty', 'licensing fee',
    // Rental income & housing payments (credits)
    'rent received', 'rent collected', 'rental income', 'rental payment received',
    'cmha',  // housing authority / rent-collection platform credits = income (turbotenant → Subscriptions)
    // Refunds (positive transactions from merchants)
    'merchant refund', 'purchase refund', 'return credit',
  ], [
    // Word-bounded (avoid false matches like "adj" in "adjustment")
    'ach cr', 'ach dep',
  ]],

  // ── Transfers ─────────────────────────────────────────────────────────────
  ['Transfers', [
    // Credit card payments (paying off the card — not income)
    'autopay payment', 'payment thank you', 'autopay - thank you', 'autopay thank you',
    'payment received',
    // P2P apps (zelle and wire transfers excluded so user can classify manually)
    'venmo', 'cash app', 'cashapp', 'square cash',
    'paypal', 'apple cash', 'google pay', 'samsung pay transfer',
    'wise transfer', 'revolut', 'current ', 'chime transfer',
    // Bank transfers (wire / zelle excluded for manual categorization)
    'account transfer', 'online transfer', 'bank transfer', 'internal transfer',
    'interbank transfer', 'funds transfer', 'money transfer',
    // International remittance
    'western union', 'moneygram', 'remitly', 'xoom ', 'ria transfer',
    'sendwave', 'worldremit',
    // Brokerage/investment account moves
    'brokerage transfer', 'investment transfer', 'schwab transfer',
    'fidelity transfer', 'vanguard transfer',
    // Crypto (transfers to/from exchanges)
    'coinbase', 'binance', 'kraken ', 'gemini transfer', 'blockchain.com',
  ], []],

  // ── Fees & Charges ────────────────────────────────────────────────────────
  ['Fees & Charges', [
    // Bank fees
    'overdraft fee', 'overdraft charge', 'nsf fee', 'insufficient funds',
    'monthly fee', 'monthly service fee', 'maintenance fee', 'account fee',
    'service charge', 'service fee', 'banking fee',
    'paper statement fee', 'stop payment fee', 'returned item fee',
    'check printing fee', 'inactivity fee', 'dormancy fee',
    'atm fee', 'atm surcharge', 'non-network atm', 'out-of-network atm',
    // Late & penalty
    'late fee', 'late payment', 'late charge', 'past due fee',
    'penalty fee', 'penalty charge', 'returned payment',
    // Credit / lending
    'annual fee', 'finance charge', 'interest charge', 'cash advance fee',
    'balance transfer fee', 'foreign transaction fee', 'foreign exchange fee',
    'currency conversion', 'fx fee',
    // Wire & misc
    'wire fee', 'transfer fee', 'processing fee', 'origination fee',
    'returned check', 'bounced check', 'dishonored',
    // Subscription billing issues
    'failed payment fee', 'payment reversal fee',
  ], []],

  // ── Groceries ─────────────────────────────────────────────────────────────
  ['Groceries', [
    // National chains
    'walmart grocery', 'walmart supercenter', 'walmart neighborhood',
    'kroger', 'safeway', 'whole foods', 'trader joe',
    'aldi ', 'publix', 'costco', 'sams club', "sam's club",
    'stop & shop', 'stop and shop', 'food lion', 'giant food',
    'wegmans', 'h-e-b', 'heb ', 'meijer', 'winn dixie', 'winn-dixie',
    'sprouts', 'fresh market', 'the fresh market',
    'smart & final', 'smart and final', 'stater bros', 'stater brothers',
    'harris teeter', 'save a lot', 'winco foods', 'winco ', 'food 4 less',
    'piggly wiggly', 'ingles market', 'brookshire', 'natural grocers',
    'fresh thyme', 'earth fare',
    // Regional west
    'vons ', 'pavilions', "fry's food", "fry's grocery",
    'smiths food', "smith's food", 'king soopers', 'city market', 'dillons ',
    'ralphs', 'ralph s ', 'food co ', 'fred meyer', 'qfc ', 'pick n save',
    'metro market', 'copps ', 'marianos', "mariano's",
    // Regional east / midwest
    'shoprite', 'shop-rite', 'acme markets', 'giant eagle', 'price chopper',
    'market 32', 'tops markets', 'tops friendly', 'hannaford',
    'price rite', 'hy-vee', 'hy vee', 'fareway',
    'schnucks', 'dierbergs', 'meijer grocery',
    'wholefds', 'whole foods market', 'sunrise mart ',  // Whole Foods, Asian grocery
    // Regional south
    'brookshires', 'super 1 foods', 'county market', 'foodland',
    'harveys supermarket', 'lowes foods', 'bilo ',
    // Specialty & ethnic
    'h mart', 'hmart', '99 ranch', 'ranch 99', 'mitsuwa', 'marukai',
    'vallarta supermarket', 'cardenas market', 'superior grocers',
    'fiesta mart', 'el super ', 'seafood city',
    // Online grocery delivery
    'instacart', 'shipt ', 'fresh direct', 'freshdirect',
    'imperfect foods', 'misfit market', 'amazon fresh',
    'thrive market', 'grove collaborative',
    // Wholesale
    'bjs wholesale', "bj's wholesale", 'restauarnt depot',
    // Generic patterns
    'supermarket', 'grocery', 'groceries', 'food mart', 'food market',
    'farmers market', 'farm fresh', 'organic market',
  ], ['aldi']],   // word-bound: avoid matching "cataldi" etc.

  // ── Food & Dining ─────────────────────────────────────────────────────────
  ['Food & Dining', [
    // Coffee & cafes
    'starbucks', 'dunkin', "dunkin'", 'dutch bros', 'peets coffee', "peet's coffee",
    'caribou coffee', 'tim horton', 'the coffee bean', 'coffee beanery',
    'la madeleine', 'panera', 'einstein bagel', 'brueggers', 'bagel ',
    'coffee ', 'cafe ', 'caffee', 'espresso', 'cappuccino',
    // Fast food — burgers
    'mcdonald', 'burger king', 'wendy', 'wendys', "hardee's", 'hardees',
    "carl's jr", 'carls jr', 'jack in the box', 'whataburger', 'in-n-out',
    'five guys', 'shake shack', 'smashburger', 'culvers', "culver's",
    'sonic drive', 'rally s ', "rally's", 'checkers ', 'del taco',
    'white castle', 'fatburger', 'fuddruckers', 'steak n shake',
    // Fast food — chicken
    'chick-fil-a', 'chickfila', 'popeyes', 'kfc ', 'raising cane',
    "zaxby's", 'zaxbys', 'wingstop', 'buffalo wild wings', "bdubs",
    "church's chicken", 'churchs chicken', 'el pollo loco', 'bojangles',
    'golden corral',
    // Fast food — mexican
    'taco bell', 'chipotle', 'moe s ', "moe's", 'qdoba', 'taco cabana',
    'taco bueno', 'del taco', 'baja fresh', 'willy s ',
    // Fast food — pizza
    'domino', 'pizza hut', 'papa john', 'papa murphy', 'little caesars',
    "little caesar's", 'round table pizza', 'sbarro', 'jet s pizza',
    "jet's pizza", "hungry howie", "marco's pizza", "cici's",
    // Fast food — subs & sandwiches
    'subway ', 'jimmy john', 'jersey mike', 'firehouse subs',
    "mcalister's", 'mcalisters', "jason's deli", 'jasons deli',
    "quiznos", 'blimpie', 'potbelly', 'which wich', "schlotzkys",
    'schlotzsky', "arby's", 'arbys',
    // Fast food — other
    'panda express', 'five below food', 'noodles and company',
    'noodles & company', 'el pollo', 'flame broiler',
    // Sit-down chains
    'olive garden', "applebee's", "applebees", "denny's", 'dennys',
    'ihop ', 'waffle house', 'cracker barrel', "chili's", "chilies",
    "friday's", 'tgi friday', 'longhorn steakhouse', 'red lobster',
    'outback steakhouse', 'texas roadhouse', 'steak 48',
    'red robin', 'bob evans', 'perkins restaurant', 'village inn',
    'friendly s ', "friendly's", 'sizzler', 'shoneys',
    'bonefish grill', 'carrabba', 'bahama breeze', 'yard house',
    'the cheesecake factory', 'cheesecake factory', 'pf chang',
    "p.f. chang", 'maggiano', 'claim jumper',
    'first watch', 'broken egg', 'eggs up',
    // Food delivery
    'doordash', 'door dash', 'uber eats', 'ubereats', 'grubhub', 'grub hub',
    'postmates', 'seamless ', 'caviar app', 'delivery.com',
    'instacart restaurant', 'gopuff', 'goPuff',
    // Smoothie / juice / specialty
    'smoothie king', 'tropical smoothie', 'jamba juice', 'jamba ',
    'robeks', 'booster juice', 'pressed juicery',
    'boba ', 'bubble tea', 'kung fu tea', 'gong cha', 'tiger sugar',
    'hawaiian shave', 'shaved ice', 'cold stone', 'dairy queen',
    'baskin robbins', 'baskin-robbins', 'marble slab', 'tcby ',
    // Chase/Amex-style merchants (often after AplPay prefix)
    'uber eats', 'ubereats', 'ramen setagaya', 'koba korean', 'tst* japan vi', 'japan vi ', 'la dong',
    'hbrwc ',  // Hattie B's / restaurant
    'raku soho', 'bagel pub', 'oliver coffee', 'cream coffee', 'burgerfi', 'osaka fusion',
    'banh anh em', 'yin ji', 'tous les jours', 'paris baguette', 'beans & malt', 'kazunori',
    'woodam ', 'heytea', 'verse ', 'mountain house east', 'duck wong', 'new ipoh', 'acre ',
    'fantuan', 'hungry panda', 'bt*hungrypand',
    // Generic patterns — must stay last
    'restaurant', 'eatery', 'bistro', 'grill ', 'grille ', 'steakhouse',
    'diner ', 'tavern ', 'kitchen ', 'cantina ', 'trattoria ',
    'pizzeria ', 'pizza ', 'sushi ', 'ramen ', 'poke bowl',
    'thai food', 'chinese food', 'indian food', 'mediterranean',
    'taqueria', 'burritos ', 'tacos ', 'wings ', 'bbq ',
    'bakery ', 'patisserie', 'deli ', 'sandwich shop',
    'brunch ', 'dining ', 'buffet ',
    'bar & grill', 'bar and grill', 'pub ',
    'juice bar', 'smoothie ', 'ice cream',
  ], []],

  // ── Transportation ────────────────────────────────────────────────────────
  ['Transportation', [
    // Ride sharing
    'uber ', 'lyft ', 'via rideshare', 'wingz driver',
    // Gas stations — national (bp#, amoco# = Chase-style BP/Amoco)
    'shell ', 'chevron', 'exxon', 'mobil ', 'bp gas', 'bp#', 'amoco#',
    'sunoco', 'marathon oil', 'marathon gas', 'speedway',
    'circle k', 'wawa ', 'valero ', 'pilot travel', 'flying j',
    'loves travel', "love's travel",
    // Gas stations — regional
    'quiktrip', 'quicktrip', 'kwik trip', "casey's general", 'caseys ',
    'racetrac', 'raceway ', 'racetrack gas', 'murphy usa', 'murphy oil',
    'maverick gas', 'holiday station', 'kum & go', 'kum and go',
    'cumby s ', "cumbys", 'thorntons', 'sheetz ',
    'getgo ', 'get go gas', 'rutters', "rutter's",
    'bucee s ', "buc-ee's", 'stinker gas', 'maverik ',
    'hess gas', 'gulf oil', 'conoco ', 'phillips 66',
    'kroger fuel', 'costco gas', 'sams club fuel', 'bjs gas',
    // Electric vehicle charging
    'tesla supercharg', 'tesla charging', 'supercharger',
    'chargepoint', 'charge point', 'evgo ', 'blink charging',
    'electrify america', 'volta charging', 'greenlots',
    // Parking
    'parking ', 'park mobile', 'parkmobile', 'spothero', 'spot hero',
    'laz parking', 'sp+ parking', 'impark', 'parking meter',
    'parking garage', 'city parking', 'airport parking',
    'metropolis parking',
    // Tolls
    'e-zpass', 'ezpass', 'tollpass', 'fastrak', 'sunpass',
    'peach pass', 'nc quick pass', 'txdot toll', 'pikepass',
    'kta safe pay', 'i-pass toll',
    // Public transit
    'metro ', 'mta ', 'transit ', 'bart ', 'wmata', 'septa',
    'mbta ', 'cta fare', 'rtd ', 'marta ', 'dart transit',
    'trimet', 'max fare', 'link light rail', 'clipper card',
    'city bus', 'bus fare', 'train fare', 'light rail', 'subway fare',
    'amtrak', 'greyhound', 'megabus', 'flixbus', 'boltbus', 'peter pan bus',
    // Car rental / sharing
    'enterprise rent', 'zipcar', 'hertz', 'avis car', 'budget car',
    'national car', 'alamo car', 'sixt rent', 'dollar rent', 'thrifty car',
    'turo ', 'getaround',
    // Auto maintenance & parts
    'jiffy lube', 'valvoline', 'firestone', 'midas auto', 'pep boys',
    "o'reilly auto", 'oreilly auto', 'napa auto', 'advance auto',
    'autozone', 'discount tire', 'ntb tire', 'goodyear tire',
    'monro muffler', 'brake masters', 'mavis tire',
    'car wash', 'auto wash', 'express wash',
    // Roadside & associations
    'aaa ', 'roadside assist',
    // Generic fuel/gas patterns
    'gasoline', 'gas station', 'fuel purchase', 'petrol',
    'electric vehicle charge', 'ev charge',
  ], ['bp ']],   // word-bounded: "bp" to avoid "bp" in "bps" or other words

  // ── Entertainment ─────────────────────────────────────────────────────────
  ['Entertainment', [
    // Video streaming
    'netflix', 'hulu ', 'disney plus', 'disney+', 'disneyplus',
    'hbo max', 'hbomax', 'max subscription', 'hbo now',
    'amazon prime video', 'prime video', 'peacock tv', 'peacock premium',
    'paramount plus', 'paramount+', 'paramountplus',
    'apple tv+', 'apple tv plus', 'apple tv subscription',
    'showtime ', 'starz ', 'epix ', 'mubi ', 'criterion channel',
    'discovery plus', 'discoveryplus', 'discovery+',
    'amc plus', 'amc+', 'britbox', 'acorn tv', 'sundance now',
    'crunchyroll', 'funimation', 'vrv subscription',
    // Music streaming
    'spotify', 'apple music', 'tidal ', 'amazon music', 'youtube music',
    'pandora premium', 'deezer', 'iheart radio', 'soundcloud go',
    // Gaming — platforms
    'playstation', 'xbox game', 'nintendo ', 'steam ',
    'playstation plus', 'ps plus', 'xbox live', 'xbox gamepass',
    'nintendo switch online', 'nintendo eshop',
    'ea sports', 'ea play', 'ubisoft', 'blizzard', 'riot games',
    'activision', 'epic games', 'epic store', 'roblox', 'minecraft',
    'twitch ', 'discord nitro',
    // Gaming — retail
    'gamestop',
    // Theaters & events
    'cinema', 'movie ticket', 'amc theater', 'amc cinemas',
    'regal cinema', 'regal entertain', 'cinemark', 'alamo drafthouse',
    'showcase cinema', 'marcus theater', 'harkins theater',
    'ticketmaster', 'ticketek', 'eventbrite', 'axs ticket',
    'stubhub', 'vivid seats', 'seatgeek',
    'live nation', 'concert ticket', 'live event',
    // Sports events/streaming
    'espn plus', 'espn+', 'nba league pass', 'mlb.tv', 'nfl plus',
    'nhl.tv', 'dazn ',
    // Attractions
    'bowling', 'bowlero', 'lucky strike', 'kings bowling',
    'laser tag', 'escape room', 'miniature golf', 'mini golf',
    "dave & buster", "dave and buster", 'main event',
    'chuck e cheese', 'round 1 entertainment', 'round one',
    'arcade ', 'trampoline park', 'sky zone', 'altitude trampoline',
    'topgolf', 'golf topgolf',
    'ziplining', 'zip line', 'go kart', 'paintball',
  ], []],

  // ── Subscriptions (incl. phone & internet — monthly recurring) ─────────────
  ['Subscriptions', [
    // Phone & internet (monthly recurring)
    'verizon', 'verizon wireless', 'verizon fios', 'verizon.com', 'verizon wrls', 'vzw ',
    'iphone', 'apple.com/bill', 'apple.com/us',
    'at&t', 'att wireless', 'att internet', 'att uverse', 't-mobile', 'tmobile', 'sprint wireless',
    'cricket wireless', 'boost mobile', 'metro by t-mobile', 'metropcs',
    'straight talk', 'mint mobile', 'visible ', 'visible wireless', 'google fi',
    'ting wireless', 'us cellular', 'republic wireless', 'tracfone', 'simple mobile',
    'comcast', 'xfinity', 'spectrum internet', 'spectrum tv', 'cox cable', 'cox communications', 'cox internet',
    'mediacom', 'wow internet', 'optimum ', 'astound broadband', 'centurylink', 'lumen ',
    'frontier internet', 'frontier commun', 'fidium fiber', 'ziply fiber', 'cableone', 'sparklight',
    'dish network', 'directv', 'hulu live', 'youtube tv', 'sling tv', 'fubo tv', 'fubo ',
    'phone bill', 'wireless bill', 'cell phone bill', 'mobile bill', 'internet bill', 'cable bill', 'cable tv', 'internet service',
    // Property / rent software
    'turbotenant',
    // Membership fees
    'membership fee',
    // Productivity & software
    'adobe ', 'adobe creative', 'adobe acrobat', 'adobe photoshop',
    'microsoft 365', 'office 365', 'microsoft office', 'microsoft 365',
    'google workspace', 'google one', 'google storage',
    'dropbox ', 'box.com', 'icloud storage', 'icloud+',
    'notion ', 'notionhq', 'figma ', 'canva ', 'canva pro',
    'grammarly', 'loom ', 'miro ', 'monday.com', 'asana ',
    'trello ', 'jira ', 'confluence', 'github ', 'gitlab ',
    'heroku ', 'netlify ', 'vercel ', 'digitalocean',
    'zoom subscription', 'zoom pro', 'webex', 'ring central',
    'slack pro', 'slack subscription',
    // VPN & security
    'nordvpn', 'expressvpn', 'surfshark', 'protonvpn', 'mullvad',
    'cyberghost', 'private internet', 'ipvanish',
    'lastpass', '1password', 'dashlane', 'bitwarden premium', 'keeper pass',
    'norton ', 'mcafee ', 'malwarebytes', 'bitdefender', 'kaspersky',
    'lifelock',
    // News & media subscriptions
    'new york times', 'nytimes', 'the atlantic', 'the athletic',
    'washington post', 'wall street journal', 'wsj sub',
    'economist', 'bloomberg ', 'financial times',
    'medium ', 'substack', 'patreon',
    'ancestry', 'myheritage', '23andme', 'apptopia',
    // Learning subscriptions
    'masterclass', 'skillshare', 'duolingo', 'babbel ', 'rosetta stone',
    'linkedin premium', 'linkedin learning', 'pluralsight', 'coursera plus',
    'udemy subscription',
    // Health & wellness apps
    'calm app', 'headspace', 'noom ', 'weight watchers', 'ww subscription',
    'myfitnesspal', 'fitbit premium', 'whoop ',
    // Delivery memberships (not food)
    'amazon prime membership', 'prime annual', 'shipt membership',
    'instacart express', 'doordash dash pass', 'dashpass',
    // Cloud/hosting
    'aws ', 'azure ', 'google cloud', 'cloudflare',
    // AI / dev tools (Chase-style descriptions)
    'claude.ai', 'cursor ', 'cursor, ai', 'tradingview',
    'x corp. paid', 'dealcheck', 'youtubepremi', 'youtube premi',
  ], []],

  // ── Legal (before Subscriptions so LegalZoom matches here) ─────────────────
  ['Legal', [
    'legalzoom', 'legal zoom',
    'lawyer', 'attorney', 'law firm', 'legal fee', 'legal services',
    'court fee', 'filing fee', 'notary',
  ], []],

  // ── Shopping ──────────────────────────────────────────────────────────────
  ['Shopping', [
    // Online marketplaces (Chase-style: AMAZON MARKEPLACE NA PA, Amazon Prime)
    'amazon.com', 'amazon mktplace', 'amazon marketplace', 'amzn mktp',
    'amazon prime', 'amazon tips',
    'ebay ', 'etsy ', 'wish.com', 'shein.com', 'temu.com', 'aliexpress',
    'alibaba.com', 'dhgate',
    // Electronics & tech (incl. device payment plans)
    'apple store', 'apple.com/bill', 'apple.com/us', 'best buy', 'bestbuy',
    'iphone citizens', 'citizens one', 'citizensoneloan',
    'newegg', 'b&h photo', 'bhphotovideo', 'adorama',
    'microsoft store', 'dell.com', 'hp.com', 'lenovo.com',
    // Department stores
    'walmart ', 'target ', 'kohl', 'jcpenney', 'belk ', "dillard's",
    'macy', "macy's", 'macys ', 'nordstrom', 'bloomingdale', 'bloomingdales', 'saks fifth',
    'byredo ', 'ode a la rose',
    'lord & taylor', 'neiman marcus', 'tj maxx', 'tjmaxx',
    'ross dress', 'marshalls', 'burlington coat',
    // Clothing & apparel
    'gap ', 'old navy', 'banana republic', 'j crew', 'j.crew',
    'ann taylor', 'loft ', 'torrid ', 'lane bryant',
    'zara ', 'h&m ', 'uniqlo',
    'nike ', 'adidas ', 'under armour', 'new balance',
    'vans ', 'converse ', 'columbia sportswear', 'north face',
    'patagonia', 'rei ', 'outdoor voices',
    'express store', 'american eagle', 'ae.com', 'abercrombie',
    'hollister', 'forever 21', 'urban outfitters', 'anthropologie',
    'free people', 'aerie ',
    // Home & furniture
    'home depot', 'lowes ', "lowe's",
    'ikea ', 'wayfair', 'overstock', 'houzz',
    'pottery barn', 'williams sonoma', 'west elm', 'restoration hardware',
    'room and board', 'crate and barrel', 'crate & barrel',
    'world market', 'pier 1', 'tuesday morning',
    'ashley furniture', 'rooms to go', 'bob s furniture',
    "bob's discount", 'havertys', 'art van',
    'bath bed beyond', 'bed bath', 'kirklands', "at home store",
    // Pet supplies
    'chewy', 'petco', 'petsmart', 'pet supplies', 'pet smart',
    // Craft & hobby
    'hobby lobby', 'michaels store', 'jo-ann fabric', 'joann ',
    'ac moore', 'craft supply',
    // Office supplies
    'office depot', 'officemax', 'staples store',
    // Dollar & discount
    'dollar general', 'dollar tree', 'five below', 'family dollar',
    '99 cents', 'ollie s ', "ollie's",
    // Books & media
    'barnes noble', "barnes & noble", 'half price book', 'books-a-million',
    'amazon books',
    // Misc retail
    'walgreens photo', 'shutterfly', 'minted ', 'vistaprint',
    'spencers', 'hot topic', 'box lunch',
    'sporting goods', 'dicks sporting', "dick's sporting", 'academy sports',
    'bass pro', 'cabela',
    // Generic patterns
    'online purchase', 'marketplace', 'retail store',
  ], ['sears', 'gap']],

  // ── Healthcare ────────────────────────────────────────────────────────────
  ['Healthcare', [
    // Pharmacies
    'cvs pharmacy', 'cvs.com', 'walgreens', 'rite aid', 'pharmacy',
    'costco pharmacy', 'sam s club pharmacy', 'publix pharmacy',
    'kroger pharmacy', 'winn dixie pharmacy', 'kinney drugs',
    // Hospitals & clinics
    'hospital', 'medical center', 'health system', 'clinic ', 'clinics ',
    'urgent care', 'patient first', 'concentra', 'minuteclinic',
    'carenow', 'nextcare', 'fastmed', 'american family care',
    'surgery center', 'surgical center', 'outpatient center',
    'emergency room', 'er visit', 'medexpress',
    // Doctors
    'doctor', 'physician', 'pediatrician', 'family practice',
    'internal medicine', 'primary care', 'md office', 'medical office',
    // Specialists
    'dermatology', 'dermatologist', 'orthopedic', 'cardiology',
    'oncology', 'neurology', 'gastroenterology', 'rheumatology',
    'endocrinology', 'pulmonology', 'urology ', 'nephrology',
    'obstetrics', 'gynecology', 'obgyn', 'prenatal',
    // Dental
    'dental ', 'dentist', 'orthodontist', 'oral surgery', 'denture',
    'aspen dental', 'family dentistry', 'smile direct',
    // Vision
    'optometry', 'optometrist', 'ophthalmology', 'eye care', 'eye doctor',
    'vision center', 'lenscrafters', 'warby parker', 'america s best',
    "america's best", 'visionworks', 'pearle vision', 'for eyes ',
    'national vision', 'eyeglass world',
    // Labs & imaging
    'labcorp', 'quest diagnostics', 'lab corp', 'clinical pathology',
    'bioreference', 'any lab test',
    'radiology', 'imaging center', 'mri center', 'x-ray',
    // Therapy & mental health
    'physical therapy', 'rehab clinic', 'sports medicine',
    'chiropractor', 'chiropractic', 'acupuncture',
    'therapist', 'therapy', 'psychologist', 'psychiatrist',
    'counseling', 'mental health', 'betterhelp', 'talkspace',
    'cerebral health', 'monument health',
    // Health insurance
    'health insurance', 'insurance premium', 'medical insurance',
    'blue cross', 'blue shield', 'bcbs ', 'aetna ', 'cigna ',
    'humana ', 'united health', 'unitedhealthcare', 'anthem ',
    'kaiser', 'kaiser permanente', 'oscar health', 'molina ',
    'wellcare', 'carefirst', 'medica ', 'tufts health',
    // Medical supplies
    'medical supply', 'medical supplies', 'diabetic supply',
    'home health', 'durable medical', 'cpap supplies',
    // Generic
    'medical ', 'prescription', 'health ', 'healthcare', 'rx ',
    'flu shot', 'vaccine', 'mammogram', 'colonoscopy', 'blood test',
  ], []],

  // ── Utilities ─────────────────────────────────────────────────────────────
  ['Utilities', [
    // Electric
    'electric bill', 'electricity bill', 'power bill', 'electric company',
    'pg&e', 'pacific gas', 'duke energy', 'national grid', 'con edison',
    'consolidated edison', 'comed ', 'commonwealth electric',
    'dominion energy', 'dominion virginia', 'southern company',
    'aps energy', 'arizona public service', 'xcel energy',
    'nv energy', 'pseg ', 'fpl ', 'florida power', 'tampa electric',
    'georgia power', 'evergy ', 'we energies', 'alliant energy',
    'ohio edison', 'firstenergy', 'aes ', 'ameren ', 'dte energy',
    'consumers energy', 'entergy ', 'cleco ',
    // Gas (natural gas)
    'gas bill', 'natural gas', 'gas company', 'gas & electric',
    'piedmont natural gas', 'atmos energy', 'centerpoint energy',
    'spire gas', 'semco energy', 'new jersey resources',
    'southwest gas', 'nicor gas', 'laclede gas',
    'national fuel gas', 'vectren ', 'new england gas',
    // Water & sewer
    'water bill', 'water company', 'water authority',
    'sewer bill', 'sewage', 'wastewater', 'water & sewer',
    'trash collection', 'garbage pickup', 'waste management',
    'republic services', 'clean harbors',
    // Chase/Amex-style utility descriptors (phone/internet → Subscriptions)
    'neorsd internet', 'water internet ', 'firstenergy', 'dominion energy',
    'enbridge gas', 'enbridgegas', 'cityclevela',
    // Generic
    'utility bill', 'utility payment', 'utilities',
    'electric utility', 'gas utility', 'municipal utility',
  ], []],

  // ── Mortgage ──────────────────────────────────────────────────────────────
  ['Mortgage', [
    'fay servicing', 'mortgage payment', 'home loan', 'mortgage pmt',
    'wells fargo home', 'chase mortgage', 'rocket mortgage', 'mr cooper',
    'loancare', 'pennymac', 'sls mortgage', 'nationstar',
    'quicken loans', 'fairway mortgage', 'caliber home', 'lakeview loan',
  ], []],

  // ── Repairs (before Housing so Zelle→Hector matches here) ──────────────────
  ['Repairs', [
    'zelle payment to hector', 'hector handyman',
  ], []],

  // ── Housing ───────────────────────────────────────────────────────────────
  ['Housing', [
    // Rent (mortgage servicers are in Mortgage category)
    'rent payment', 'monthly rent', 'rental payment', 'apartment rent',
    // Property
    'property tax', 'real estate tax', 'hoa payment', 'hoa dues',
    'homeowners association', 'condo fee', 'condo assoc',
    // Insurance
    'homeowners insurance', 'renters insurance', 'home insurance',
    'allstate home', 'progressive home',
    'liberty mutual home', 'nationwide home', 'farmers home',
    'usaa home',
    // Appraisal / inspection / property
    'uwm appraisal', 'appraisal direct', 'frontline inspection', 'frontlineo',
    'affordablehousing', 'bridge ln network', 'outta here llc',
    // Storage
    'self storage', 'storage unit', 'public storage', 'extra space',
    'life storage', 'cube smart', 'u-haul storage',
    // Moving
    'u-haul', 'uhaul', 'penske truck', 'budget truck', 'two men and a truck',
    'moving company', 'moving truck',
    // Property management
    'management co', 'property management', 'real estate mgmt',
    'resident portal', 'buildium', 'appfolio payment', 'entrata ',
    // Home services
    'home repair', 'home improvement', 'handyman', 'contractor',
    'roofing', 'plumber', 'plumbing', 'electrician',
    'hvac service', 'ac repair', 'heating repair', 'furnace',
    'pest control', 'exterminator', 'terminix', 'orkin ', 'rentokil',
    'lawn service', 'lawn care', 'landscaping', 'lawn mowing',
    'snow removal', 'gutter cleaning', 'power washing', 'pressure wash',
    'cleaning service', 'house cleaning', 'maid service', 'housekeeper',
    'molly maid', 'merry maids',
    'alarm system', 'adt security', 'vivint ', 'ring alarm',
    'home depot installation',
    // Short-term/vacation
    'extended stay', 'furnished finder', 'corporate housing',
    // Generic
    'rent ', 'apartment', 'lease payment',
  ], []],

  // ── Travel ────────────────────────────────────────────────────────────────
  ['Travel', [
    // Hotels — major brands
    'marriott', 'westin ', 'sheraton', 'w hotel', 'st regis',
    'renaissance hotel', 'ritz-carlton', 'ritz carlton',
    'hilton hotel', 'doubletree', 'hampton inn', 'homewood suites',
    'home2 suites', 'hilton garden', 'curio collection',
    'hyatt hotel', 'park hyatt', 'andaz hotel', 'grand hyatt',
    'ihg hotel', 'holiday inn', 'crowne plaza', 'kimpton hotel',
    'intercontinental', 'regent hotel', 'staybridge',
    'wyndham hotel', 'ramada ', 'days inn', 'super 8',
    'la quinta', 'wingate hotel', 'baymont inn',
    'choice hotels', 'comfort inn', 'quality inn', 'sleep inn',
    'best western', 'motel 6', 'red roof inn', 'econo lodge',
    'loews hotel', 'omni hotel', 'waldorf astoria',
    'four seasons hotel',
    // Vacation rentals
    'airbnb', 'vrbo ', 'homeaway', 'vacasa ', 'sonder ',
    'vacatia', 'evolve vacation',
    // Airlines — major US
    'delta air', 'delta airlines', 'united airlines', 'american airlines',
    'southwest airlines', 'southwest air', 'jetblue', 'alaska airlines',
    'alaska air', 'frontier airlines', 'spirit airlines',
    'allegiant air', 'sun country', 'avelo airlines', 'breeze airways',
    'hawaiian airlines', 'silver airways',
    // Airlines — international
    'air canada', 'lufthansa', 'british airways', 'air france',
    'klm ', 'emirates', 'qatar airways', 'singapore airlines',
    'cathay pacific', 'ana airlines',
    // Travel booking
    'expedia', 'booking.com', 'kayak.com', 'priceline', 'hotels.com',
    'trivago', 'hopper ', 'google flights', 'orbitz',
    'cheap tickets', 'travelport', 'travelocity',
    // Car rental
    'hertz car', 'enterprise rent', 'enterprise car',
    'avis car', 'budget car', 'national car rental', 'alamo car',
    'sixt rent a car', 'dollar car rental', 'thrifty car',
    'payless car rental', 'fox rent a car', 'ace rent a car',
    // Cruises
    'carnival cruise', 'royal caribbean', 'norwegian cruise',
    'celebrity cruise', 'princess cruise', 'holland america',
    'disney cruise', 'viking cruise',
    // Travel programs
    'tsa precheck', 'global entry', 'clear travel',
    // Luggage & accessories
    'luggage', 'away luggage', 'samsonite',
    // Generic
    'hotel ', 'motel ', 'inn ', 'resort ', 'lodge ',
    'flight ', 'airline ', 'airport ',
    'foreign currency', 'currency exchange', 'travel insurance',
    'passport', 'visa fee', 'entry fee',
  ], []],

  // ── Education ─────────────────────────────────────────────────────────────
  ['Education', [
    // Higher ed & admin
    'tuition', 'tuition payment', 'college tuition', 'university fee',
    'school fee', 'university', 'college payment', 'community college',
    'student services',
    // Student loans
    'student loan', 'sallie mae', 'navient', 'nelnet ', 'fedloan',
    'great lakes student', 'aidvantage', 'edfinancial',
    'mohela ', 'commonbond', 'sofi student',
    // Online learning
    'coursera', 'udemy ', 'edx ', 'khan academy', 'chegg ',
    'linkedin learning', 'pluralsight', 'codecademy', 'treehouse',
    'skillshare learning', 'frontend masters', 'egghead ',
    'brilliant.org', 'datacamp', 'udacity', 'lambdaschool', 'springboard',
    'thinkific', 'teachable', 'podia ',
    // Books & supplies
    'textbook', 'pearson', 'mcgraw hill', 'cengage',
    'chegg textbook', 'vitalsource', 'redshelf',
    'school supply', 'campus store', 'bookstore',
    // Test prep
    'princeton review', 'kaplan test', 'magoosh', 'prep scholar',
    'sat prep', 'act prep', 'gre prep', 'gmat prep',
    // Tutoring
    'tutoring', 'tutor.com', 'varsity tutors', 'wyzant',
    'learning center', 'kumon ', 'sylvan learning', 'mathnasium',
    // K-12 / childcare
    'daycare', 'day care', 'preschool', 'childcare', 'child care',
    'learning academy', 'kids club',
    // Language learning
    'duolingo', 'babbel', 'rosetta stone', 'pimsleur',
  ], []],

  // ── Personal Care ─────────────────────────────────────────────────────────
  ['Personal Care', [
    // Hair salons & barbers
    'hair salon', 'hair cut', 'haircut', 'hair color', 'hair studio',
    'barber shop', 'barbershop', 'barber ',
    'supercuts', 'great clips', 'sport clips', "sports clips", 'cost cutters',
    'hair cuttery', 'regis salon', 'fantastic sams', 'first choice',
    'floyd s ', "floyd's", 'bishop s barbershop',
    'drybar ', 'blowout bar', 'salonsuite',
    // Nails
    'nail salon', 'nail spa', 'nails by ', 'mani pedi', 'manicure',
    'pedicure', 'nail art', 'dashing diva', 'sns nails',
    // Skin & esthetics
    'facial ', 'skin care', 'skincare', 'esthetics', 'aesthetics',
    'spa ', 'day spa', 'medspa', 'med spa', 'wax center',
    'european wax', 'waxing the city', 'hydrafacial',
    'laser hair', 'laser skin', 'botox ', 'filler ',
    // Massage
    'massage ', 'massage envy', 'hand and stone', 'elements massage',
    'sports massage', 'deep tissue',
    // Body & beauty
    'tanning salon', 'tanning bed', 'spray tan', 'sunless tan',
    'eyebrow threading', 'eyebrow wax', 'lash extensions', 'lash lift',
    // Fitness — gyms
    'planet fitness', 'la fitness', 'anytime fitness', "gold's gym",
    '24 hour fitness', 'equinox', 'lifetime fitness', 'life time ',
    'ymca ', 'snap fitness', 'blink fitness', 'crunch fitness',
    'ifit ', 'puregym',
    // Fitness — boutique
    'orangetheory', 'orange theory', 'soulcycle', 'soul cycle',
    "barry's bootcamp", 'barrys bootcamp', 'f45 ', 'solidcore',
    'cyclebar', 'rowhouse', 'pure barre', 'club pilates', 'corepower',
    'classpass', 'mindbody',
    // Home fitness
    'peloton', 'mirror fitness',
    // Yoga & pilates
    'yoga ', 'yoga studio', 'pilates studio', 'hot yoga', 'bikram yoga',
    // Sports
    'crossfit', 'boxing gym', 'mma gym', 'martial arts',
    // Beauty products
    'sephora', 'ulta beauty', 'ulta ', 'sally beauty', 'cosmoprof',
    'bath & body', 'bath and body', 'lush ', 'the body shop',
    'beauty supply',
  ], []],
]

// ── Matching engine ───────────────────────────────────────────────────────────

function matchRule(lower, [_cat, plain, bounded = []]) {
  for (const kw of plain) {
    if (lower.includes(kw)) return true
  }
  for (const kw of bounded) {
    if (wb(lower, kw)) return true
  }
  return false
}

/**
 * Categorizes a transaction description, optionally using the sign of the
 * amount to improve accuracy (positive amounts are more likely Income or
 * Transfers, negative amounts are more likely expenses).
 */
export function categorize(description, amount) {
  if (!description) return 'Uncategorized'
  const lower = normalizeDesc(description)
  if (!lower) return 'Uncategorized'

  // If amount is clearly negative (expense), skip Income check first
  // to avoid false positives like "interest payment" on a fee transaction.
  if (amount !== undefined && amount < 0) {
    for (const rule of RULES) {
      if (rule[0] === 'Income') continue
      if (matchRule(lower, rule)) return rule[0]
    }
    // Still fall through to Income check as a last resort (sign-flip edge case)
    const incomeRule = RULES.find(r => r[0] === 'Income')
    if (incomeRule && matchRule(lower, incomeRule)) return 'Income'
    return 'Uncategorized'
  }

  // Positive amount or unknown — check all rules in priority order
  for (const rule of RULES) {
    if (matchRule(lower, rule)) return rule[0]
  }

  return 'Uncategorized'
}

/**
 * Applies categorization to an array of transaction objects.
 * Preserves any category already set on the transaction.
 */
export function categorizeAll(transactions) {
  return transactions.map((t) => ({
    ...t,
    category: t.category || categorize(t.description, t.amount),
  }))
}

// ── Sign-flip detection ───────────────────────────────────────────────────────

// Expense categories — these represent money going OUT
const EXPENSE_CATEGORIES = new Set([
  'Food & Dining', 'Groceries', 'Transportation', 'Entertainment', 'Shopping',
  'Healthcare', 'Utilities', 'Housing', 'Mortgage', 'Repairs', 'Travel', 'Education',
  'Personal Care', 'Subscriptions', 'Software', 'Legal', 'Fees & Charges',
])

/**
 * Detects whether transaction signs are inverted (credit card convention).
 * Returns true if amounts should be negated before displaying.
 */
export function needsSignFlip(transactions) {
  const expenseMatches = transactions.filter(t =>
    EXPENSE_CATEGORIES.has(categorize(t.description))
  )
  if (expenseMatches.length < 3) return false
  const positiveExpenses = expenseMatches.filter(t => t.amount > 0).length
  return positiveExpenses / expenseMatches.length > 0.6
}

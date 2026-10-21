'use strict';

/**
 * FixGH Official Master Authorities Registry
 * Contains the 40 Ghanaian public authorities, their official emails,
 * jurisdictions, report classifications, and matching keywords.
 */
const AUTHORITIES = [
  {
    id: '1',
    name: 'Ghana Police Service',
    email: 'hq.pro@police.gov.gh',
    category: 'Security & Law Enforcement',
    reportTypes: 'Crime, theft, assault, threats, security',
    keywords: [
      'crime', 'theft', 'stolen', 'robbery', 'armed robber', 'armed robbery',
      'gunpoint', 'thief', 'burglary',
      'assault', 'attacked', 'violence', 'threat', 'threatening', 'security',
      'murder', 'extortion', 'scam', 'weapon', 'gun', 'knife', 'police',
      'fraud', 'harassment', 'kidnap', 'break-in', 'vandalism',
    ],
  },
  {
    id: '2',
    name: 'Ghana National Fire Service',
    email: 'info@gnfs.gov.gh',
    category: 'Fire & Rescue',
    reportTypes: 'Fire, fire hazards',
    keywords: [
      'fire', 'blaze', 'burning', 'flame', 'smoke', 'fire hazard', 'gas leak',
      'lpg leak', 'gas explosion', 'fire hydrant', 'flammable', 'inferno',
      'bushfire', 'electrical fire', 'fire safety',
    ],
  },
  {
    id: '3',
    name: 'National Ambulance Service',
    email: 'nas@nas.gov.gh',
    category: 'Emergency Health & Rescue',
    reportTypes: 'Medical emergencies',
    keywords: [
      'medical emergency', 'ambulance', 'casualty', 'collapsed person',
      'unconscious', 'severe injury', 'paramedic', 'cardiac arrest',
      'patient emergency', 'profuse bleeding', 'trauma rescue', 'urgent hospital transfer',
    ],
  },
  {
    id: '4',
    name: 'Environmental Protection Authority',
    email: 'info@epa.gov.gh',
    category: 'Environment & Pollution',
    reportTypes: 'Pollution, environmental damage',
    keywords: [
      'pollution', 'toxic waste', 'chemical spill', 'galamsey', 'illegal mining',
      'river pollution', 'factory smoke', 'hazardous waste', 'environmental damage',
      'noise pollution', 'industrial fumes', 'chemical dumping', 'air pollution',
      'water contamination', 'environmental degradation',
    ],
  },
  {
    id: '5',
    name: 'Food and Drugs Authority',
    email: 'fda@fda.gov.gh',
    category: 'Public Health & Consumer Safety',
    reportTypes: 'Unsafe food, drugs, cosmetics',
    keywords: [
      'unsafe food', 'rotten food', 'food poisoning', 'expired food', 'fake drugs',
      'counterfeit medication', 'unregistered medicine', 'bad cosmetics',
      'skin bleaching creams', 'contaminated water sachet', 'expired drinks',
      'harmful cosmetics', 'drug safety', 'spoilt meat',
    ],
  },
  {
    id: '6',
    name: 'Electricity Company of Ghana',
    email: 'ecgho@ecggh.com',
    category: 'Electricity Infrastructure',
    reportTypes: 'Power outages, electrical infrastructure',
    keywords: [
      'power outage', 'power cut', 'electricity', 'ecg', 'dumsor', 'transformer',
      'fallen electric pole', 'exposed wire', 'high voltage', 'faulty meter',
      'spark', 'electric pole', 'prepaid meter', 'blackout', 'cable spark',
      'low voltage', 'electrical shock hazard',
    ],
  },
  {
    id: '7',
    name: 'Ghana Water Company',
    email: 'info@gwcl.com.gh',
    category: 'Water Infrastructure',
    reportTypes: 'Water supply, damaged water infrastructure',
      keywords: [
      'water supply', 'gwcl', 'burst pipe', 'broken pipe', 'leaking pipe',
      'water outage', 'no water', 'dirty water', 'tap water', 'low water pressure',
      'broken water main', 'water crisis', 'flooding pipe', 'water tanker shortage',
      'water pipe', 'pipe burst', 'burst water pipe', 'water main', 'main pipe',
      'pipe leak', 'water leak',
      ],
  },
  {
    id: '8',
    name: 'Public Utilities Regulatory Commission',
    email: 'info@purc.com.gh',
    category: 'Utilities Regulation & Consumer Rights',
    reportTypes: 'Electricity/water utility complaints',
    keywords: [
      'purc', 'utility complaint', 'electricity billing', 'water billing',
      'tariff overcharge', 'utility extortion', 'overbilling', 'utility regulatory',
      'ecg dispute', 'gwcl dispute', 'wrong utility bill', 'unjust tariff',
    ],
  },
  {
    id: '9',
    name: 'National Communications Authority',
    email: 'info@nca.org.gh',
    category: 'Telecommunications',
    reportTypes: 'Telecom/network complaints',
    keywords: [
      'nca', 'telecom', 'cellular network', 'mtn network', 'telecel', 'at ghana',
      'sim registration', 'call drop', 'data bundle deduction', 'bad network',
      'internet outage', 'cell tower', 'mast', 'broadband disruption',
    ],
  },
  {
    id: '10',
    name: 'Driver and Vehicle Licensing Authority',
    email: 'info@dvla.gov.gh',
    category: 'Transport Licensing',
    reportTypes: 'Driver/licensing/vehicle issues',
    keywords: [
      'dvla', 'driver license', 'drivers license', 'roadworthy', 'road worthiness',
      'vehicle registration', 'license plate', 'number plate', 'driving test',
      'fake license', 'vehicle inspection', 'dvla renewal',
    ],
  },
  {
    id: '11',
    name: 'National Road Safety Authority',
    email: 'info@nrsa.gov.gh',
    category: 'Road Safety',
    reportTypes: 'Road safety problems',
    keywords: [
      'road safety', 'nrsa', 'accident hotspot', 'black spot', 'speed ramps',
      'speed bump', 'zebra crossing', 'missing road sign', 'traffic hazard',
      'pedestrian danger', 'speeding', 'reckless driving', 'road signage',
      'unmarked intersection',
    ],
  },
  {
    id: '12',
    name: 'Department of Urban Roads',
    email: 'info@dur.gov.gh',
    category: 'Urban Roads & Streets',
    reportTypes: 'Roads, potholes, urban road infrastructure',
    keywords: [
      'urban road', 'city road', 'street pothole', 'pothole', 'street erosion',
      'inner city road', 'residential road', 'damaged street', 'culvert street',
      'town road', 'unpaved street', 'road maintenance', 'urban asphalt',
    ],
  },
  {
    id: '13',
    name: 'Ghana Highway Authority',
    email: 'info@highways.gov.gh',
    category: 'Highways & Trunk Infrastructure',
    reportTypes: 'Major highways/road infrastructure',
    keywords: [
      'highway', 'trunk road', 'motorway', 'accra-tema motorway', 'accra-kumasi highway',
      'highway bridge', 'intercity road', 'highway pothole', 'toll booth',
      'expressway', 'bypass', 'dual carriageway', 'highway cave-in',
    ],
  },
  {
    id: '14',
    name: 'Accra Metropolitan Assembly',
    email: 'info@ama.gov.gh',
    category: 'Local Assembly - Accra Metro',
    reportTypes: 'Accra sanitation, waste, local infrastructure',
    keywords: [
      'ama', 'accra sanitation', 'garbage accra', 'refuse accra', 'makola',
      'osu', 'adabraka', 'circle', 'james town', 'central accra', 'accra waste',
      'choked gutters accra', 'unlawful structure accra', 'odaw river trash',
    ],
    locations: ['accra', 'makola', 'osu', 'adabraka', 'circle', 'jamestown', 'ministries'],
  },
  {
    id: '15',
    name: 'Ga Central Municipal Assembly',
    email: 'info@gcma.gov.gh',
    category: 'Local Assembly - Ga Central',
    reportTypes: 'Local sanitation/infrastructure',
    keywords: [
      'ga central', 'gcma', 'sowutuom', 'anyaa', 'santa maria', 'chantan',
      'ablekuma', 'kwashieman', 'ga central sanitation', 'ga central road',
    ],
    locations: ['sowutuom', 'anyaa', 'santa maria', 'chantan', 'ablekuma'],
  },
  {
    id: '16',
    name: 'Ga East Municipal Assembly',
    email: 'info@gema.gov.gh',
    category: 'Local Assembly - Ga East',
    reportTypes: 'Local sanitation/infrastructure',
    keywords: [
      'ga east', 'gema', 'abokobi', 'dome', 'haatso', 'taifa', 'kwabenya',
      'agbogba', 'ga east sanitation', 'ga east roads', 'ga east drain',
    ],
    locations: ['abokobi', 'dome', 'haatso', 'taifa', 'kwabenya', 'agbogba'],
  },
  {
    id: '17',
    name: 'Ga North Municipal Assembly',
    email: 'info@gnma.gov.gh',
    category: 'Local Assembly - Ga North',
    reportTypes: 'Local sanitation/infrastructure',
    keywords: [
      'ga north', 'gnma', 'ofankor', 'pokuase', 'tantra hill', 'trobu',
      'amasaman border', 'ga north sanitation', 'ga north roads', 'ga north gutter',
    ],
    locations: ['ofankor', 'pokuase', 'tantra hill', 'trobu'],
  },
  {
    id: '18',
    name: 'Ga South Municipal Assembly',
    email: 'info@gsma.gov.gh',
    category: 'Local Assembly - Ga South',
    reportTypes: 'Local sanitation/infrastructure',
    keywords: [
      'ga south', 'gsma', 'weija', 'ngleshie amanfro', 'gbawe', 'bortianor',
      'galilea', 'kokrobite', 'ga south sanitation', 'ga south roads',
    ],
    locations: ['weija', 'ngleshie amanfro', 'gbawe', 'bortianor', 'galilea', 'kokrobite'],
  },
  {
    id: '19',
    name: 'Okaikwei North Municipal Assembly',
    email: 'info@onma.gov.gh',
    category: 'Local Assembly - Okaikwei North',
    reportTypes: 'Local sanitation/infrastructure',
    keywords: [
      'okaikwei north', 'onma', 'achimota', 'tesano', 'abeka', 'lapaz',
      'fadama', 'akweteyman', 'okaikwei sanitation', 'lapaz gutter',
    ],
    locations: ['achimota', 'tesano', 'abeka', 'lapaz', 'fadama', 'akweteyman'],
  },
  {
    id: '20',
    name: 'Ghana Revenue Authority',
    email: 'info@gra.gov.gh',
    category: 'Revenue & Customs',
    reportTypes: 'Tax/customs complaints',
    keywords: [
      'gra', 'tax', 'customs', 'vat evasion', 'tax extortion', 'illegal duty',
      'import tax', 'tin number', 'port customs', 'customs harassment',
      'tax bribery', 'revenue authority', 'e-levy complaint',
    ],
  },
  {
    id: '21',
    name: 'National Insurance Commission',
    email: 'info@nicgh.org',
    category: 'Insurance Regulation',
    reportTypes: 'Insurance complaints',
    keywords: [
      'nic', 'insurance complaint', 'unpaid insurance claim', 'motor insurance',
      'life insurance', 'insurance fraud', 'insurance company delay',
      'premium dispute', 'claims rejection', 'insurance broker scam',
    ],
  },
  {
    id: '22',
    name: 'National Labour Commission',
    email: 'info@nlcghana.org',
    category: 'Labour & Workplace',
    reportTypes: 'Employment/labour disputes',
    keywords: [
      'nlc', 'labour commission', 'employment dispute', 'wrongful dismissal',
      'unpaid salary', 'unpaid wages', 'unlawful sacking', 'employer abuse',
      'workplace exploitation', 'strike action', 'severance pay', 'labour violation',
    ],
  },
  {
    id: '23',
    name: 'Pharmacy Council Ghana',
    email: 'info@pcghana.org',
    category: 'Pharmacy Regulation',
    reportTypes: 'Pharmacy/professional complaints',
    keywords: [
      'pharmacy council', 'chemist', 'drug store', 'over the counter medicine',
      'quack pharmacist', 'unlicensed pharmacy', 'dispensing error',
      'medicine seller', 'pharmacy negligence', 'unauthorized drug shop',
    ],
  },
  {
    id: '24',
    name: 'Medical and Dental Council',
    email: 'info@mdc.gov.gh',
    category: 'Medical Standards',
    reportTypes: 'Medical/dental professional complaints',
    keywords: [
      'medical council', 'dental council', 'doctor negligence', 'medical malpractice',
      'quack doctor', 'hospital negligence', 'surgical error', 'clinic malpractice',
      'dental malpractice', 'unlicensed clinic', 'hospital mistreatment',
    ],
  },
  {
    id: '25',
    name: 'National Identification Authority',
    email: 'info@nia.gov.gh',
    category: 'Civic Identity',
    reportTypes: 'Ghana Card/identity issues',
    keywords: [
      'nia', 'ghana card', 'national id', 'id card registration', 'card collection',
      'name correction', 'national identification', 'ghana card delay', 'nia office',
      'biometric registration glitch',
    ],
  },
  {
    id: '26',
    name: 'National Information Technology Agency',
    email: 'info@nita.gov.gh',
    category: 'Government IT & Digital Public Infrastructure',
    reportTypes: 'Government IT/digital-service issues',
    keywords: [
      'nita', 'government website down', 'ghana.gov', 'digital service issue',
      'government portal', 'public cybersecurity', 'government network',
      'e-services error', 'national data centre',
    ],
  },
  {
    id: '27',
    name: 'Public Procurement Authority',
    email: 'info@ppa.gov.gh',
    category: 'Public Procurement',
    reportTypes: 'Public procurement complaints',
    keywords: [
      'ppa', 'public procurement', 'tender rigging', 'sole sourcing',
      'government contract fraud', 'kickback', 'procurement irregularity',
      'bidding corruption', 'inflated tender', 'contract padding',
    ],
  },
  {
    id: '28',
    name: 'National Petroleum Authority',
    email: 'info@npa.gov.gh',
    category: 'Petroleum & Fuel Standards',
    reportTypes: 'Fuel/petroleum complaints',
    keywords: [
      'npa', 'petroleum', 'fuel adulteration', 'bad petrol', 'bad diesel',
      'fuel station', 'filling station cheating', 'pump under-dispensing',
      'illegal gas station', 'lpg cylinder', 'substandard fuel',
    ],
  },
  {
    id: '29',
    name: 'Energy Commission',
    email: 'info@energycom.gov.gh',
    category: 'Energy Standards & Regulations',
    reportTypes: 'Energy-sector complaints',
    keywords: [
      'energy commission', 'electrical wiring', 'certified electrician',
      'appliance energy efficiency', 'star rating', 'renewable energy regulations',
      'solar installation standards', 'wiring certification',
    ],
  },
  {
    id: '30',
    name: 'Forestry Commission',
    email: 'info.hq@fcghana.org',
    category: 'Forestry & Wildlife Protection',
    reportTypes: 'Illegal logging/forest issues',
    keywords: [
      'forestry commission', 'illegal logging', 'timber poaching', 'chainsaw operator',
      'forest reserve', 'rosewood', 'deforestation', 'wildlife poaching',
      'game reserve encroachment', 'tree felling',
    ],
  },
  {
    id: '31',
    name: 'Ghana Maritime Authority',
    email: 'info@ghanamaritime.org',
    category: 'Maritime & Water Transport',
    reportTypes: 'Maritime/sea-related issues',
    keywords: [
      'maritime authority', 'sea safety', 'boat accident', 'volta lake disaster',
      'ferry safety', 'fishing vessel', 'marine pollution', 'sea vessel',
      'coastal waters', 'drowning boat',
    ],
  },
  {
    id: '32',
    name: 'Ghana Ports and Harbours Authority',
    email: 'headquarters@ghanaports.gov.gh',
    category: 'Ports & Harbours',
    reportTypes: 'Port-related complaints',
    keywords: [
      'gpha', 'tema port', 'takoradi port', 'container delay', 'demurrage dispute',
      'port clearance', 'wharf', 'harbour', 'cargo damage', 'port congestion',
    ],
  },
  {
    id: '33',
    name: 'Ghana Post',
    email: 'info@ghanapost.com.gh',
    category: 'Postal & Digital Address',
    reportTypes: 'Postal-service complaints',
    keywords: [
      'ghana post', 'ghanapost gps', 'postal service', 'missing mail', 'lost parcel',
      'ems tracking', 'courier delay', 'digital address error', 'post office',
    ],
  },
  {
    id: '34',
    name: 'National Media Commission',
    email: 'admin@nmc.org.gh',
    category: 'Media & Broadcasting Ethics',
    reportTypes: 'Media complaints',
    keywords: [
      'nmc', 'media commission', 'fake news', 'defamatory broadcast',
      'hate speech radio', 'tv content violation', 'journalist harassment',
      'broadcast violation', 'press complaint', 'illegal frequency',
    ],
  },
  {
    id: '35',
    name: 'National Pensions Regulatory Authority',
    email: 'info@npra.gov.gh',
    category: 'Pensions Regulation',
    reportTypes: 'Pension complaints',
    keywords: [
      'npra', 'pension', 'ssnit delay', 'tier 1', 'tier 2', 'tier 3',
      'pension trustee', 'unpaid pension', 'retirement benefits',
      'pension contribution default',
    ],
  },
  {
    id: '36',
    name: 'Electoral Commission',
    email: 'info@ec.gov.gh',
    category: 'Elections & Civic Registry',
    reportTypes: 'Electoral complaints',
    keywords: [
      'electoral commission', 'ec ghana', 'voter registration', 'voters register',
      'polling station', 'voting machine', 'ballot', 'election irregularity',
      'exhibition of register', 'voter transfer',
    ],
  },
  {
    id: '37',
    name: 'Public Services Commission',
    email: 'info@psc.gov.gh',
    category: 'Civil & Public Service Standards',
    reportTypes: 'Public-service complaints',
    keywords: [
      'public services commission', 'civil service conduct', 'government bureaucrat delay',
      'civil servant misconduct', 'public office abuse', 'public service appointment',
      'administrative neglect',
    ],
  },
  {
    id: '38',
    name: 'Commission on Human Rights and Administrative Justice',
    email: 'info@chraj.gov.gh',
    category: 'Human Rights & Anti-Corruption',
    reportTypes: 'Human-rights/administrative complaints',
    keywords: [
      'chraj', 'human rights violation', 'unlawful arrest', 'administrative injustice',
      'state harassment', 'corruption', 'whistleblowing', 'discrimination',
      'fundamental rights', 'abuse of power by official',
    ],
  },
  {
    id: '39',
    name: 'National Disaster Management Organisation',
    email: 'info@nadmo.gov.gh',
    category: 'Disaster & Crisis Management',
    reportTypes: 'Floods, disasters, emergencies',
    keywords: [
      'nadmo', 'flood', 'severe flooding', 'disaster relief', 'rainstorm disaster',
      'tidal wave', 'collapsed building disaster', 'emergency shelter',
      'disaster victim relief', 'mudslide', 'natural catastrophe',
    ],
  },
  {
    id: '40',
    name: "Registrar-General's Department",
    email: 'info@rgd.gov.gh',
    category: 'Business & Company Registration',
    reportTypes: 'Business/company registration issues',
    keywords: [
      'registrar general', 'rgd', 'orc', 'registrar of companies', 'business registration',
      'company name reservation', 'annual returns', 'company filing',
      'business certificate', 'business portal failure',
    ],
  },
];

/**
 * Map by authority ID for O(1) lookups
 */
const AUTHORITIES_BY_ID = AUTHORITIES.reduce((acc, auth) => {
  acc[auth.id] = auth;
  return acc;
}, {});

/**
 * Map by authority email for O(1) lookups
 */
const AUTHORITIES_BY_EMAIL = AUTHORITIES.reduce((acc, auth) => {
  acc[auth.email.toLowerCase()] = auth;
  return acc;
}, {});

module.exports = {
  AUTHORITIES,
  AUTHORITIES_BY_ID,
  AUTHORITIES_BY_EMAIL,
};

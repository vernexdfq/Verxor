import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/rent-line/area-codes?country=US
 * Area-code directory for the countries SignalWire supports. Used to power
 * the picker in "Get a Phone Number"; the chosen code is passed to the live
 * SignalWire search, which filters real availability.
 * Retail / API only — this service is not offered to child panels.
 */

type AreaCode = { code: string; label: string };

// NANP area codes (US + CA share the North American numbering plan).
const NANP: Array<[string, string]> = [
  ['201', 'NJ — Jersey City'], ['202', 'DC — Washington'], ['203', 'CT — New Haven'], ['205', 'AL — Birmingham'],
  ['206', 'WA — Seattle'], ['207', 'ME'], ['208', 'ID'], ['209', 'CA — Stockton'], ['210', 'TX — San Antonio'],
  ['212', 'NY — Manhattan'], ['213', 'CA — Los Angeles'], ['214', 'TX — Dallas'], ['215', 'PA — Philadelphia'],
  ['216', 'OH — Cleveland'], ['217', 'IL — Springfield'], ['218', 'MN — Duluth'], ['219', 'IN — Gary'],
  ['224', 'IL — Evanston'], ['225', 'LA — Baton Rouge'], ['228', 'MS — Biloxi'], ['229', 'GA — Albany'],
  ['231', 'MI — Traverse City'], ['234', 'OH — Akron'], ['239', 'FL — Fort Myers'], ['240', 'MD — Silver Spring'],
  ['248', 'MI — Troy'], ['251', 'AL — Mobile'], ['252', 'NC — Greenville'], ['253', 'WA — Tacoma'],
  ['254', 'TX — Killeen'], ['256', 'AL — Huntsville'], ['260', 'IN — Fort Wayne'], ['262', 'WI — Kenosha'],
  ['267', 'PA — Philadelphia'], ['269', 'MI — Kalamazoo'], ['270', 'KY — Bowling Green'], ['276', 'VA — Martinsville'],
  ['281', 'TX — Houston'], ['301', 'MD — Silver Spring'], ['302', 'DE'], ['303', 'CO — Denver'],
  ['304', 'WV'], ['305', 'FL — Miami'], ['307', 'WY'], ['308', 'NE — North Platte'], ['309', 'IL — Peoria'],
  ['310', 'CA — Santa Monica'], ['312', 'IL — Chicago'], ['313', 'MI — Detroit'], ['314', 'MO — St. Louis'],
  ['315', 'NY — Syracuse'], ['316', 'KS — Wichita'], ['317', 'IN — Indianapolis'], ['318', 'LA — Shreveport'],
  ['319', 'IA — Cedar Rapids'], ['320', 'MN — St. Cloud'], ['321', 'FL — Orlando'], ['323', 'CA — Los Angeles'],
  ['325', 'TX — Abilene'], ['330', 'OH — Youngstown'], ['331', 'IL — Naperville'], ['334', 'AL — Montgomery'],
  ['336', 'NC — Greensboro'], ['337', 'LA — Lafayette'], ['339', 'MA — Boston'], ['347', 'NY — Brooklyn'],
  ['351', 'MA — Lowell'], ['352', 'FL — Gainesville'], ['360', 'WA — Vancouver'], ['361', 'TX — Corpus Christi'],
  ['385', 'UT — Salt Lake City'], ['386', 'FL — Daytona Beach'], ['401', 'RI'], ['402', 'NE — Omaha'],
  ['404', 'GA — Atlanta'], ['405', 'OK — Oklahoma City'], ['406', 'MT'], ['407', 'FL — Orlando'],
  ['408', 'CA — San Jose'], ['409', 'TX — Beaumont'], ['410', 'MD — Baltimore'], ['412', 'PA — Pittsburgh'],
  ['413', 'MA — Springfield'], ['414', 'WI — Milwaukee'], ['415', 'CA — San Francisco'], ['416', 'ON — Toronto'],
  ['417', 'MO — Springfield'], ['418', 'QC — Quebec City'], ['419', 'OH — Toledo'], ['423', 'TN — Chattanooga'],
  ['424', 'CA — Los Angeles'], ['425', 'WA — Bellevue'], ['430', 'TX — Tyler'], ['432', 'TX — Midland'],
  ['434', 'VA — Charlottesville'], ['435', 'UT — St. George'], ['440', 'OH — Elyria'], ['443', 'MD — Baltimore'],
  ['469', 'TX — Dallas'], ['470', 'GA — Atlanta'], ['478', 'GA — Macon'], ['479', 'AR — Fort Smith'],
  ['480', 'AZ — Mesa'], ['484', 'PA — Allentown'], ['501', 'AR — Little Rock'], ['502', 'KY — Louisville'],
  ['503', 'OR — Portland'], ['504', 'LA — New Orleans'], ['505', 'NM — Albuquerque'], ['507', 'MN — Rochester'],
  ['508', 'MA — Worcester'], ['509', 'WA — Spokane'], ['510', 'CA — Oakland'], ['512', 'TX — Austin'],
  ['513', 'OH — Cincinnati'], ['514', 'QC — Montreal'], ['515', 'IA — Des Moines'], ['516', 'NY — Nassau County'],
  ['517', 'MI — Lansing'], ['518', 'NY — Albany'], ['519', 'ON — London'], ['520', 'AZ — Tucson'],
  ['530', 'CA — Redding'], ['539', 'OK — Tulsa'], ['540', 'VA — Roanoke'], ['541', 'OR — Eugene'],
  ['551', 'NJ — Hackensack'], ['559', 'CA — Fresno'], ['561', 'FL — West Palm Beach'], ['562', 'CA — Long Beach'],
  ['563', 'IA — Davenport'], ['567', 'OH — Toledo'], ['570', 'PA — Scranton'], ['571', 'VA — Arlington'],
  ['573', 'MO — Columbia'], ['574', 'IN — South Bend'], ['575', 'NM — Roswell'], ['580', 'OK — Lawton'],
  ['585', 'NY — Rochester'], ['586', 'MI — Warren'], ['601', 'MS — Jackson'], ['602', 'AZ — Phoenix'],
  ['603', 'NH'], ['605', 'SD'], ['606', 'KY — Ashland'], ['607', 'NY — Binghamton'], ['608', 'WI — Madison'],
  ['609', 'NJ — Trenton'], ['610', 'PA — Allentown'], ['612', 'MN — Minneapolis'], ['614', 'OH — Columbus'],
  ['615', 'TN — Nashville'], ['616', 'MI — Grand Rapids'], ['617', 'MA — Boston'], ['618', 'IL — Belleville'],
  ['619', 'CA — San Diego'], ['620', 'KS — Dodge City'], ['623', 'AZ — Phoenix'], ['626', 'CA — Pasadena'],
  ['630', 'IL — Aurora'], ['631', 'NY — Suffolk County'], ['636', 'MO — St. Charles'], ['641', 'IA — Mason City'],
  ['646', 'NY — Manhattan'], ['650', 'CA — San Mateo'], ['651', 'MN — St. Paul'], ['660', 'MO — Sedalia'],
  ['661', 'CA — Bakersfield'], ['662', 'MS — Tupelo'], ['667', 'MD — Baltimore'], ['669', 'CA — San Jose'],
  ['678', 'GA — Atlanta'], ['681', 'WV'], ['682', 'TX — Fort Worth'], ['684', 'AS — American Samoa'],
  ['701', 'ND'], ['702', 'NV — Las Vegas'], ['703', 'VA — Arlington'], ['704', 'NC — Charlotte'],
  ['706', 'GA — Augusta'], ['707', 'CA — Santa Rosa'], ['708', 'IL — Cicero'], ['709', 'NL — Newfoundland'],
  ['712', 'IA — Sioux City'], ['713', 'TX — Houston'], ['714', 'CA — Anaheim'], ['715', 'WI — Eau Claire'],
  ['716', 'NY — Buffalo'], ['717', 'PA — Harrisburg'], ['718', 'NY — Queens'], ['719', 'CO — Colorado Springs'],
  ['720', 'CO — Denver'], ['724', 'PA — New Castle'], ['725', 'NV — Las Vegas'], ['726', 'TX — San Antonio'],
  ['727', 'FL — St. Petersburg'], ['731', 'TN — Jackson'], ['732', 'NJ — New Brunswick'], ['734', 'MI — Ann Arbor'],
  ['737', 'TX — Austin'], ['740', 'OH — Zanesville'], ['743', 'NC — Greensboro'], ['754', 'FL — Fort Lauderdale'],
  ['757', 'VA — Norfolk'], ['760', 'CA — Oceanside'], ['762', 'GA — Augusta'], ['763', 'MN — Brooklyn Park'],
  ['765', 'IN — Muncie'], ['770', 'GA — Marietta'], ['772', 'FL — Port St. Lucie'], ['773', 'IL — Chicago'],
  ['774', 'MA — Brockton'], ['775', 'NV — Reno'], ['781', 'MA — Waltham'], ['785', 'KS — Topeka'],
  ['786', 'FL — Miami'], ['801', 'UT — Salt Lake City'], ['802', 'VT'], ['803', 'SC — Columbia'],
  ['804', 'VA — Richmond'], ['805', 'CA — Oxnard'], ['806', 'TX — Amarillo'], ['808', 'HI — Honolulu'],
  ['810', 'MI — Flint'], ['812', 'IN — Evansville'], ['813', 'FL — Tampa'], ['814', 'PA — Erie'],
  ['815', 'IL — Rockford'], ['816', 'MO — Kansas City'], ['817', 'TX — Fort Worth'], ['818', 'CA — San Fernando Valley'],
  ['828', 'NC — Asheville'], ['830', 'TX — New Braunfels'], ['831', 'CA — Salinas'], ['832', 'TX — Houston'],
  ['843', 'SC — Charleston'], ['845', 'NY — Poughkeepsie'], ['847', 'IL — Evanston'], ['848', 'NJ — Toms River'],
  ['850', 'FL — Tallahassee'], ['856', 'NJ — Camden'], ['857', 'MA — Boston'], ['858', 'CA — San Diego'],
  ['859', 'KY — Lexington'], ['860', 'CT — Hartford'], ['862', 'NJ — Newark'], ['863', 'FL — Lakeland'],
  ['864', 'SC — Greenville'], ['865', 'TN — Knoxville'], ['870', 'AR — Jonesboro'], ['872', 'IL — Chicago'],
  ['878', 'PA — Pittsburgh'], ['901', 'TN — Memphis'], ['903', 'TX — Tyler'], ['904', 'FL — Jacksonville'],
  ['905', 'ON — Mississauga'], ['906', 'MI — Marquette'], ['907', 'AK'], ['908', 'NJ — Elizabeth'],
  ['909', 'CA — San Bernardino'], ['910', 'NC — Fayetteville'], ['912', 'GA — Savannah'], ['913', 'KS — Overland Park'],
  ['914', 'NY — White Plains'], ['915', 'TX — El Paso'], ['916', 'CA — Sacramento'], ['917', 'NY — New York City'],
  ['918', 'OK — Tulsa'], ['919', 'NC — Raleigh'], ['920', 'WI — Green Bay'], ['925', 'CA — Concord'],
  ['928', 'AZ — Flagstaff'], ['929', 'NY — Queens'], ['931', 'TN — Clarksville'], ['936', 'TX — Conroe'],
  ['937', 'OH — Dayton'], ['938', 'AL — Huntsville'], ['940', 'TX — Denton'], ['941', 'FL — Sarasota'],
  ['947', 'MI — Troy'], ['949', 'CA — Irvine'], ['951', 'CA — Riverside'], ['952', 'MN — Bloomington'],
  ['954', 'FL — Fort Lauderdale'], ['956', 'TX — Laredo'], ['970', 'CO — Fort Collins'], ['971', 'OR — Portland'],
  ['972', 'TX — Dallas'], ['973', 'NJ — Newark'], ['978', 'MA — Lowell'], ['979', 'TX — College Station'],
  ['980', 'NC — Charlotte'], ['984', 'NC — Raleigh'], ['985', 'LA — Houma'], ['989', 'MI — Saginaw'],
];

const DIRECTORY: Record<string, AreaCode[]> = {
  US: NANP.map(([code, label]) => ({ code, label })),
  CA: NANP.filter(([code]) =>
    ['204', '226', '236', '249', '250', '263', '289', '306', '343', '354', '365', '367', '382', '387', '403',
     '416', '418', '428', '431', '437', '438', '450', '468', '474', '506', '514', '519', '548', '579', '581',
     '584', '587', '604', '613', '639', '647', '683', '705', '709', '742', '753', '778', '780', '782', '807',
     '819', '825', '867', '873', '879', '902', '905'].includes(code),
  ).map(([code, label]) => ({ code, label })),
  GB: [
    { code: '20', label: 'London' }, { code: '113', label: 'Leeds' }, { code: '114', label: 'Sheffield' },
    { code: '115', label: 'Nottingham' }, { code: '116', label: 'Leicester' }, { code: '117', label: 'Bristol' },
    { code: '118', label: 'Reading' }, { code: '121', label: 'Birmingham' }, { code: '131', label: 'Edinburgh' },
    { code: '141', label: 'Glasgow' }, { code: '151', label: 'Liverpool' }, { code: '161', label: 'Manchester' },
    { code: '191', label: 'Newcastle/Sunderland' }, { code: '1223', label: 'Cambridge' },
    { code: '1224', label: 'Aberdeen' }, { code: '1273', label: 'Brighton' }, { code: '1274', label: 'Bradford' },
    { code: '1382', label: 'Dundee' }, { code: '1865', label: 'Oxford' }, { code: '1904', label: 'York' },
    { code: '1752', label: 'Plymouth' }, { code: '2392', label: 'Portsmouth' }, { code: '2920', label: 'Cardiff' },
    { code: '1515', label: 'Wrexham' },
  ],
  IE: [
    { code: '1', label: 'Dublin' }, { code: '21', label: 'Cork' }, { code: '41', label: 'Drogheda' },
    { code: '45', label: 'Kildare' }, { code: '51', label: 'Waterford' }, { code: '61', label: 'Limerick' },
    { code: '71', label: 'Sligo' }, { code: '74', label: 'Donegal' }, { code: '91', label: 'Galway' },
    { code: '94', label: 'Mayo' }, { code: '90', label: 'Mullingar' },
  ],
  AU: [
    { code: '2', label: 'NSW / ACT' }, { code: '3', label: 'VIC / TAS' }, { code: '7', label: 'QLD' },
    { code: '8', label: 'SA / WA / NT' },
  ],
  NZ: [
    { code: '3', label: 'Christchurch / South Island' }, { code: '4', label: 'Wellington' },
    { code: '6', label: 'Hamilton / Bay of Plenty' }, { code: '7', label: 'Central North Island' },
    { code: '9', label: 'Auckland' },
  ],
};

export async function GET(req: NextRequest) {
  const country = (req.nextUrl.searchParams.get('country') || 'US').trim().toUpperCase();
  const list = DIRECTORY[country] || [];
  return NextResponse.json({
    ok: true,
    country,
    areaCodes: list,
    note:
      'Pick a code to narrow the live search. Not every code has stock at all times — if a search comes back empty, try another code or leave it on "Any".',
  });
}

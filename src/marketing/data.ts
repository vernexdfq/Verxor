export type ServiceInfo = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  intro: string;
  benefits: { title: string; description: string }[];
  steps: { title: string; description: string }[];
  faqs: [string, string][];
  note: string;
};

export const servicePages: ServiceInfo[] = [
  {
    slug: 'virtual-numbers',
    title: 'Virtual numbers for supported SMS verification',
    shortTitle: 'Virtual numbers',
    eyebrow: 'SMS VERIFICATION',
    description:
      'Buy virtual phone numbers for supported SMS verification across WhatsApp, Telegram, Google, Instagram and more, with live pricing and order status.',
    intro:
      'Virtual numbers help you receive a verification message without using your primary phone number. Available countries, platforms, number types and delivery depend on live inventory and the rules of the service you select.',
    benefits: [
      { title: 'Check availability first', description: 'Review the countries and services currently listed in your account before you commit to an order.' },
      { title: 'Follow the order status', description: 'Use the status shown for your order to understand whether it is waiting, completed or needs attention.' },
      { title: 'Know the limitations', description: 'Some platforms restrict virtual or non-VoIP numbers. Acceptance and message delivery cannot be guaranteed for every service.' },
    ],
    steps: [
      { title: 'Choose a service', description: 'Select the supported platform and country from the available inventory.' },
      { title: 'Review the quote', description: 'Confirm the displayed price, number type and applicable order rules.' },
      { title: 'Receive and track', description: 'Follow the order screen for the verification status and any available message.' },
    ],
    faqs: [
      ['Are all countries available?', 'No. Country availability changes with current inventory. Check the country list in your account before ordering.'],
      ['Will every website accept the number?', 'No. Third-party platforms decide which number types they accept and may block virtual numbers. Verxor cannot guarantee acceptance by every platform.'],
      ['Is OTP delivery always instant?', 'Delivery time depends on the upstream provider, platform and network. Check the order status and applicable refund or replacement rules if a message does not arrive.'],
    ],
    note: 'Only use verification services with accounts and platforms you are authorized to access. Number type, country coverage, price and delivery depend on current inventory.',
  },
  {
    slug: 'number-rentals',
    title: 'Rent a number for a selected period',
    shortTitle: 'Number rentals',
    eyebrow: 'DEDICATED RENTALS',
    description:
      'Rent virtual numbers for a defined period with clear start and end times, renewal visibility and status tracking in your Verxor account.',
    intro:
      'A number rental is intended for use over a defined period rather than a single verification attempt. Supported features, message access, rental duration and renewal options depend on the specific number and provider.',
    benefits: [
      { title: 'Defined rental period', description: 'Review the start time, end time and duration before confirming your rental.' },
      { title: 'Renewal visibility', description: 'Where renewal is supported, check the renewal window and price before the current term ends.' },
      { title: 'Manage active rentals', description: 'Use the rental view to review active terms and available actions.' },
    ],
    steps: [
      { title: 'Choose inventory', description: 'Select from the rental numbers and regions currently offered.' },
      { title: 'Confirm the term', description: 'Review duration, price, supported message types and renewal conditions.' },
      { title: 'Monitor expiry', description: 'Check your rental status and renew only where the option is available.' },
    ],
    faqs: [
      ['Can every rental be renewed?', 'No. Renewal depends on the number, provider and inventory rules. The rental details shown before purchase take precedence.'],
      ['Can I use one rental on multiple platforms?', 'Only where the number and each platform permit it. Multi-platform acceptance is not guaranteed.'],
      ['What happens when a rental expires?', 'Access may end when the rental term expires. Review the displayed end time and any renewal rules to avoid unexpected loss of access.'],
    ],
    note: 'Rental periods, renewals, supported message types and continuity are provider-dependent. Confirm the terms displayed for the selected number.',
  },
  {
    slug: 'smm',
    title: 'Boost social accounts with supported SMM services',
    shortTitle: 'Boost account',
    eyebrow: 'SOCIAL GROWTH',
    description:
      'Browse social media marketing services for supported platforms, review delivery details and place orders from your Verxor wallet.',
    intro:
      'SMM services can help you explore supported growth options such as engagement packages for selected platforms. Delivery speed, quality and permanence depend on the service definition and upstream fulfillment.',
    benefits: [
      { title: 'Review the package first', description: 'Check the platform, quantity, estimated delivery window and any stated limitations before ordering.' },
      { title: 'Track order progress', description: 'Follow the status shown in your account for started, in-progress and completed orders.' },
      { title: 'Understand variability', description: 'Social platforms change rules often. Results and retention can vary and are never guaranteed.' },
    ],
    steps: [
      { title: 'Select a service', description: 'Choose the platform and package currently listed in the catalog.' },
      { title: 'Confirm the details', description: 'Enter the required profile or post link and review the displayed price.' },
      { title: 'Monitor delivery', description: 'Use the order status and history to follow progress and any applicable terms.' },
    ],
    faqs: [
      ['Are results permanent?', 'No. Platform algorithms, policy changes and account settings can affect retention. Treat SMM as a temporary growth tool.'],
      ['How fast is delivery?', 'Estimated delivery windows are shown per service. Actual timing depends on queue load and the upstream provider.'],
      ['Can any account be boosted?', 'Only where the service and platform rules allow it. Private, restricted or non-compliant profiles may not receive delivery.'],
    ],
    note: 'Use SMM services only on accounts you own or are authorized to manage. Verxor does not guarantee platform acceptance, retention or ranking outcomes.',
  },
  {
    slug: 'accounts-logs',
    title: 'Buy accounts and logs for supported use cases',
    shortTitle: 'Accounts & logs',
    eyebrow: 'ACCOUNT MARKETPLACE',
    description:
      'Browse supported account and log listings with clear category filters, pricing and purchase terms inside Verxor.',
    intro:
      'Account and log listings are offered only where inventory and category rules allow. Availability, quality signals and acceptable use depend on the listing details shown before purchase.',
    benefits: [
      { title: 'Category clarity', description: 'Review the listed type, region and any stated attributes before you buy.' },
      { title: 'Price before commit', description: 'Confirm the displayed price and any replacement or review window in the order flow.' },
      { title: 'Status tracking', description: 'Keep the transaction reference and follow the status shown after purchase.' },
    ],
    steps: [
      { title: 'Browse inventory', description: 'Filter by the categories currently available in your account.' },
      { title: 'Review the listing', description: 'Read the description, price and applicable terms carefully.' },
      { title: 'Complete purchase', description: 'Confirm with wallet balance and follow delivery instructions in the order screen.' },
    ],
    faqs: [
      ['Are all accounts guaranteed active?', 'No. Status can change after listing. Follow the replacement or review rules shown for that category.'],
      ['Can I resell purchased accounts?', 'Only where local law and the listing terms allow it. Unauthorized resale or misuse is prohibited.'],
      ['What if credentials fail?', 'Use the support or replacement path shown for that order within the stated window, if any.'],
    ],
    note: 'Purchase and use accounts only for lawful purposes and platforms you are authorized to access. Follow the terms displayed for each listing.',
  },
  {
    slug: 'proxies',
    title: 'Proxy options for supported network workflows',
    shortTitle: 'Proxies',
    eyebrow: 'NETWORK TOOLS',
    description:
      'Explore residential and datacenter proxy options with transparent pricing, session types and usage guidance on Verxor.',
    intro:
      'Proxies can help route traffic through supported endpoints for testing, localization or other permitted workflows. Protocol, location, session type and bandwidth limits depend on the plan you select.',
    benefits: [
      { title: 'Know the proxy type', description: 'Residential and datacenter pools behave differently. Match the type to your use case.' },
      { title: 'Review limits', description: 'Check bandwidth, concurrent sessions and rotation rules before funding a plan.' },
      { title: 'Secure credentials', description: 'Treat proxy authentication details as sensitive and rotate them if exposed.' },
    ],
    steps: [
      { title: 'Choose a pool', description: 'Select residential or datacenter inventory currently offered.' },
      { title: 'Confirm plan details', description: 'Review location, protocol, duration and price.' },
      { title: 'Connect and monitor', description: 'Use the provided endpoints and track usage in your account.' },
    ],
    faqs: [
      ['Are all locations available?', 'No. Available regions change with capacity. Check the list shown before purchase.'],
      ['Can proxies be used for any website?', 'Only for lawful use cases. Target sites may block datacenter or shared IPs.'],
      ['What happens when a plan ends?', 'Access typically stops at expiry unless you renew under the current plan rules.'],
    ],
    note: 'Use proxies only for lawful activities. Verxor does not support abuse, credential stuffing or prohibited scraping.',
  },
  {
    slug: 'esim',
    title: 'eSIM data profiles and device compatibility',
    shortTitle: 'eSIM',
    eyebrow: 'TRAVEL CONNECTIVITY',
    description:
      'Get digital eSIM data profiles for supported countries with instant delivery guidance and compatibility checks.',
    intro:
      'An eSIM lets compatible devices install a data plan without a physical SIM. Coverage, speed, fair-use policy and activation steps depend on the selected plan and destination.',
    benefits: [
      { title: 'Check device support', description: 'Confirm your device is eSIM-capable and unlocked before purchase.' },
      { title: 'Understand the plan', description: 'Review data allowance, validity period and any speed or fair-use limits.' },
      { title: 'Install carefully', description: 'Follow the installation steps shown after purchase to avoid failed activation.' },
    ],
    steps: [
      { title: 'Select a destination', description: 'Choose a country or region plan from current inventory.' },
      { title: 'Confirm compatibility', description: 'Verify device support and any carrier lock restrictions.' },
      { title: 'Install and activate', description: 'Use the provider instructions and note when the plan begins to expire.' },
    ],
    faqs: [
      ['Will every phone support eSIM?', 'No. Support depends on the device model, OS version and whether the device is unlocked.'],
      ['Is data speed guaranteed?', 'No. Speed depends on the local network, congestion and plan policy.'],
      ['Can I transfer an eSIM?', 'Usually no. Most plans are bound to one device installation. Check the plan terms.'],
    ],
    note: 'Confirm device compatibility before purchase. Coverage and performance depend on local networks and plan rules.',
  },
  {
    slug: 'gift-cards',
    title: 'Sell gift cards with clear trade terms',
    shortTitle: 'Sell gift cards',
    eyebrow: 'GIFT CARD TRADING',
    description:
      'Trade supported gift cards at displayed rates with transparent review status and transaction history in Verxor.',
    intro:
      'Gift card trading lets you submit supported brands for review under the rates and rules shown at the time of trade. Acceptance, payout timing and evidence requirements depend on the card type.',
    benefits: [
      { title: 'Review the current quote', description: 'Rates can change. Confirm the displayed quote and expiry conditions before proceeding.' },
      { title: 'Understand requirements', description: 'Check supported brands, regions, denominations and the evidence required for review.' },
      { title: 'Track your trade', description: 'Keep the transaction reference and follow the status shown in the trade history.' },
    ],
    steps: [
      { title: 'Choose a supported card', description: 'Check that the brand, region and card format are accepted.' },
      { title: 'Submit trade details', description: 'Provide only the requested card information and evidence through the designated flow.' },
      { title: 'Follow review status', description: 'Wait for the transaction review and follow the displayed outcome and terms.' },
    ],
    faqs: [
      ['Are all gift cards accepted?', 'No. Acceptance depends on the listed brands, regions, card type and current trade rules.'],
      ['Is the displayed rate guaranteed?', 'Rates may change before a trade is accepted. The quote and conditions shown at confirmation govern that transaction.'],
      ['How long does review take?', 'Review times depend on the card type and verification requirements. Check the status and terms for your trade.'],
    ],
    note: 'Trade only cards you lawfully own or are authorized to submit. Never share gift card codes outside the official transaction flow.',
  },
  {
    slug: 'virtual-cards',
    title: 'Get virtual dollar cards for online payments',
    shortTitle: 'Virtual dollar cards',
    eyebrow: 'DIGITAL PAYMENTS',
    description:
      'Explore virtual USD card issuance with clear fees, funding rules, spending limits and security guidance.',
    intro:
      'Virtual cards can support online payments where the merchant and card program accept them. Issuance, funding currency, fees and acceptance depend on the specific card product and your eligibility.',
    benefits: [
      { title: 'Review costs upfront', description: 'Check issuance, funding, transaction, foreign-exchange and maintenance fees where applicable.' },
      { title: 'Understand acceptance', description: 'A merchant or subscription may decline a card based on its own policies or card-program rules.' },
      { title: 'Keep credentials private', description: 'Treat card details and one-time authentication codes as sensitive financial information.' },
    ],
    steps: [
      { title: 'Check eligibility', description: 'Review supported regions and identity requirements for the specific card program.' },
      { title: 'Review fees and limits', description: 'Confirm the currency, funding rules, limits and any recurring charges.' },
      { title: 'Use securely', description: 'Keep card credentials private and follow the issuer’s security guidance.' },
    ],
    faqs: [
      ['Will every merchant accept the card?', 'No. Acceptance is controlled by the merchant and the card network rules.'],
      ['Is funding instant?', 'Funding speed depends on the payment method and card program. Check the status after you fund.'],
      ['Can I withdraw unused balance?', 'Withdrawal or refund rules vary by product. Review the terms shown for your card.'],
    ],
    note: 'Virtual cards are subject to eligibility, fees and merchant acceptance. Use them only for lawful purchases.',
  },
  {
    slug: 'airtime',
    title: 'Buy mobile airtime for Nigerian networks',
    shortTitle: 'Airtime',
    eyebrow: 'EVERYDAY UTILITY',
    description:
      'Top up airtime on supported Nigerian networks instantly from your Verxor wallet with clear status and history.',
    intro:
      'Airtime top-ups let you fund supported mobile networks for voice and basic connectivity. Successful delivery depends on the network, the phone number format and current provider availability.',
    benefits: [
      { title: 'Supported networks', description: 'Choose from the networks currently listed in the airtime catalog.' },
      { title: 'Wallet-based payment', description: 'Pay from your Verxor balance and review the debit before confirming.' },
      { title: 'Order history', description: 'Keep a record of top-ups with status and reference for support if needed.' },
    ],
    steps: [
      { title: 'Select network', description: 'Pick the recipient network from the supported list.' },
      { title: 'Enter number and amount', description: 'Use a valid local number and an amount within the allowed range.' },
      { title: 'Confirm and track', description: 'Approve the wallet debit and follow the transaction status.' },
    ],
    faqs: [
      ['Is every network supported?', 'Only networks shown in the current catalog. Availability can change.'],
      ['How fast is delivery?', 'Most successful top-ups complete quickly, but network delays can occur. Check status in history.'],
      ['What if the number is wrong?', 'Double-check before confirming. Incorrect numbers may still be debited depending on network rules.'],
    ],
    note: 'Confirm the recipient number and network before purchase. Delivery depends on the mobile network and provider status.',
  },
  {
    slug: 'data',
    title: 'Buy mobile data bundles for Nigerian networks',
    shortTitle: 'Data',
    eyebrow: 'EVERYDAY UTILITY',
    description:
      'Purchase supported mobile data plans for Nigerian networks with transparent pricing and delivery status in Verxor.',
    intro:
      'Data bundles provide internet access on supported networks for a defined volume or validity period. Plan names, allowances and validity follow the network’s published offers as listed in Verxor.',
    benefits: [
      { title: 'Plan clarity', description: 'Review data size, validity and network before you buy.' },
      { title: 'Live pricing', description: 'Prices shown at checkout reflect the current catalog entry.' },
      { title: 'Status visibility', description: 'Track success or failure in your transaction history.' },
    ],
    steps: [
      { title: 'Choose network and plan', description: 'Select from currently listed data products.' },
      { title: 'Enter the phone number', description: 'Ensure the number matches the selected network.' },
      { title: 'Pay and confirm', description: 'Debit your wallet and monitor activation status.' },
    ],
    faqs: [
      ['Do plans match official network offers?', 'Listed plans mirror supported provider products. Names and validity can change when networks update offers.'],
      ['Can I buy for any phone?', 'Only numbers on the selected network and within plan rules.'],
      ['What if data does not activate?', 'Check status and contact support with the transaction reference within a reasonable window.'],
    ],
    note: 'Data plan activation depends on the mobile network. Verify the number and plan details before confirming.',
  },
  {
    slug: 'exam-pin',
    title: 'Buy exam pins for supported examination bodies',
    shortTitle: 'Exam pin',
    eyebrow: 'EDUCATION',
    description:
      'Purchase exam registration or result-checker pins for supported Nigerian examination bodies from your Verxor wallet.',
    intro:
      'Exam pins are digital codes used for registration or result checking with supported examination bodies. Availability and pin type depend on the body and current inventory.',
    benefits: [
      { title: 'Supported bodies', description: 'Select from examination bodies currently listed in the catalog.' },
      { title: 'Instant code delivery', description: 'Successful purchases show the pin in the order result when the provider returns it.' },
      { title: 'Keep a record', description: 'Store the pin securely and keep the transaction reference.' },
    ],
    steps: [
      { title: 'Choose exam body', description: 'Pick the supported body and pin type.' },
      { title: 'Confirm price', description: 'Review the displayed amount before wallet debit.' },
      { title: 'Receive the pin', description: 'Copy the code from the success screen and store it safely.' },
    ],
    faqs: [
      ['Which exam bodies are available?', 'Only those listed at the time of purchase. Inventory can change.'],
      ['Is the pin reusable?', 'Usually no. Follow the examination body’s rules for single-use or limited-use pins.'],
      ['What if the pin is invalid?', 'Contact support with your transaction reference promptly and follow any replacement policy shown.'],
    ],
    note: 'Use exam pins only for legitimate registration or result checking. Keep codes private and follow the examination body’s guidelines.',
  },
  {
    slug: 'electricity',
    title: 'Pay electricity bills and buy tokens',
    shortTitle: 'Electricity',
    eyebrow: 'BILL PAYMENT',
    description:
      'Pay supported electricity bills and purchase prepaid tokens with meter validation and clear transaction status.',
    intro:
      'Electricity payments cover supported prepaid and postpaid services where the disco and meter type are listed. Successful token generation or bill settlement depends on the utility provider.',
    benefits: [
      { title: 'Meter validation', description: 'Confirm meter number and disco before paying to reduce failed transactions.' },
      { title: 'Token visibility', description: 'Prepaid successes typically return a token to load on the meter.' },
      { title: 'Payment history', description: 'Retain references for disputes or reprints where supported.' },
    ],
    steps: [
      { title: 'Select disco and meter', description: 'Enter the meter number and choose the correct electricity company.' },
      { title: 'Enter amount', description: 'Use an amount within the allowed range for that meter type.' },
      { title: 'Pay and collect token', description: 'Confirm wallet debit and save any returned token or receipt.' },
    ],
    faqs: [
      ['Which discos are supported?', 'Only those shown in the current catalog. Support can expand or change.'],
      ['How long before a token works?', 'Most prepaid tokens can be loaded immediately, but network delays at the disco can occur.'],
      ['Can I reverse a payment?', 'Utility payments are often final once accepted by the provider. Verify details before confirming.'],
    ],
    note: 'Double-check meter number and disco. Utility payments depend on the electricity provider’s systems.',
  },
  {
    slug: 'bet-funding',
    title: 'Fund supported betting wallets',
    shortTitle: 'Bet wallet funding',
    eyebrow: 'WALLET TOP-UP',
    description:
      'Fund supported sports-betting wallets from Verxor with clear operator lists, amounts and transaction status.',
    intro:
      'Bet wallet funding lets you top up supported betting platforms using your Verxor balance. Successful credit depends on the operator, account identifier and current provider connectivity.',
    benefits: [
      { title: 'Supported operators', description: 'Choose from betting platforms currently available in the catalog.' },
      { title: 'Amount controls', description: 'Stay within minimum and maximum limits shown before confirm.' },
      { title: 'Status tracking', description: 'See whether the funding completed, is pending or failed.' },
    ],
    steps: [
      { title: 'Select operator', description: 'Pick the betting platform from the supported list.' },
      { title: 'Enter account ID', description: 'Use the exact user ID or phone format required by that operator.' },
      { title: 'Confirm funding', description: 'Approve the wallet debit and monitor the result.' },
    ],
    faqs: [
      ['Which betting sites are supported?', 'Only operators listed at purchase time. The list can change.'],
      ['Is funding instant?', 'Often yes, but operator systems can delay credit. Check status and the betting app balance.'],
      ['What if I enter the wrong ID?', 'Incorrect IDs may still debit depending on the operator. Verify carefully before confirming.'],
    ],
    note: 'Gambling is restricted in some regions. Fund only accounts you own and comply with local law and the operator’s terms.',
  },
  {
    slug: 'cable-tv',
    title: 'Pay cable TV subscriptions',
    shortTitle: 'Cable TV',
    eyebrow: 'BILL PAYMENT',
    description:
      'Renew supported cable TV packages such as DStv, GOtv and StarTimes with bouquet selection and payment status tracking.',
    intro:
      'Cable TV payments let you renew or change supported bouquets for listed providers. Successful renewal depends on the smartcard or IUC number, bouquet code and provider systems.',
    benefits: [
      { title: 'Provider list', description: 'Select from cable providers currently integrated in Verxor.' },
      { title: 'Bouquet clarity', description: 'Review package name and price before confirming.' },
      { title: 'Confirmation reference', description: 'Keep the transaction ID for support with the provider if needed.' },
    ],
    steps: [
      { title: 'Choose provider', description: 'Pick DStv, GOtv, StarTimes or another listed service.' },
      { title: 'Enter smartcard / IUC', description: 'Validate the number and select the desired bouquet.' },
      { title: 'Pay and confirm', description: 'Debit your wallet and wait for the success receipt.' },
    ],
    faqs: [
      ['Which bouquets are available?', 'Only those returned by the provider for the entered smartcard at that time.'],
      ['How long until the package activates?', 'Often within minutes, but provider delays can occur. Check the decoder status.'],
      ['Can I change bouquet mid-cycle?', 'Depends on the provider’s rules for upgrades, downgrades and pro-rating.'],
    ],
    note: 'Confirm smartcard number and bouquet before payment. Activation depends on the cable TV provider.',
  },
  {
    slug: 'vtu-api',
    title: 'VTU and utility API for developers',
    shortTitle: 'VTU API',
    eyebrow: 'DEVELOPER ACCESS',
    description:
      'Integrate airtime, data, electricity, cable TV and related utilities through documented Verxor partner API access.',
    intro:
      'The VTU API is for approved partners who need programmatic access to supported digital utilities. Access requires partnership approval, funded balance, and adherence to rate limits and documentation.',
    benefits: [
      { title: 'Utility catalog', description: 'Call supported products for airtime, data, bills and related services.' },
      { title: 'Documented endpoints', description: 'Use the partner documentation for authentication, requests and webhooks where available.' },
      { title: 'Wallet-backed usage', description: 'Fund a partner wallet and track usage per transaction reference.' },
    ],
    steps: [
      { title: 'Apply for access', description: 'Submit partnership details through the API partnership flow.' },
      { title: 'Receive credentials', description: 'After approval, configure keys and environment endpoints securely.' },
      { title: 'Integrate and monitor', description: 'Implement against the docs, handle errors and monitor balances.' },
    ],
    faqs: [
      ['Is the API open to everyone?', 'No. Access is subject to partnership review and compliance requirements.'],
      ['Which products are on the API?', 'Supported products are listed in the partner documentation and can expand over time.'],
      ['How are failures handled?', 'Use the documented error codes, retries and transaction query endpoints.'],
    ],
    note: 'API access is for approved partners only. Protect credentials and use the API only for lawful customer transactions.',
  },
];

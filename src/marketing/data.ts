export type ServiceInfo = {
  slug: string; title: string; shortTitle: string; description: string; eyebrow: string; intro: string;
  benefits: { title: string; description: string }[];
  steps: { title: string; description: string }[];
  faqs: [string, string][];
  note: string;
};

export const servicePages: ServiceInfo[] = [
  {
    slug: 'virtual-numbers', title: 'Virtual numbers for supported SMS verification', shortTitle: 'Virtual numbers', eyebrow: 'SMS VERIFICATION',
    description: 'Explore virtual numbers for supported SMS verification services with clear availability and order status.',
    intro: 'Virtual numbers can help you receive a verification message without using your primary phone number. Available countries, platforms, number types and delivery depend on live inventory and the rules of the service you select.',
    benefits: [
      { title: 'Check availability first', description: 'Review the countries and services currently listed in your account before you commit to an order.' },
      { title: 'Follow the order status', description: 'Use the status shown for your order to understand whether it is waiting, completed or needs attention.' },
      { title: 'Know the limitations', description: 'Some platforms restrict virtual or non-VoIP numbers. Acceptance and message delivery cannot be guaranteed for every service.' },
    ],
    steps: [{ title: 'Choose a service', description: 'Select the supported platform and country from the available inventory.' }, { title: 'Review the quote', description: 'Confirm the displayed price, number type and applicable order rules.' }, { title: 'Receive and track', description: 'Follow the order screen for the verification status and any available message.' }],
    faqs: [['Are all countries available?', 'No. Country availability changes with current inventory. Check the country list in your account before ordering.'], ['Will every website accept the number?', 'No. Third-party platforms decide which number types they accept and may block virtual numbers. Verxor cannot guarantee acceptance by every platform.'], ['Is OTP delivery always instant?', 'Delivery time depends on the upstream provider, platform and network. Check the order status and applicable refund or replacement rules if a message does not arrive.']],
    note: 'Only use verification services with accounts and platforms you are authorized to access. Number type, country coverage, price and delivery depend on current inventory.'
  },
  {
    slug: 'number-rentals', title: 'Rent a number for a selected period', shortTitle: 'Number rentals', eyebrow: 'DEDICATED RENTALS',
    description: 'Understand number rental periods, renewal rules and ongoing access for supported rental inventory.',
    intro: 'A number rental is intended for use over a defined period rather than a single verification attempt. The supported features, message access, rental duration and renewal options depend on the specific number and provider.',
    benefits: [{ title: 'Defined rental period', description: 'Review the start time, end time and duration before confirming your rental.' }, { title: 'Renewal visibility', description: 'Where renewal is supported, check the renewal window and price before the current term ends.' }, { title: 'Manage active rentals', description: 'Use the rental view to review active terms and available actions.' }],
    steps: [{ title: 'Choose inventory', description: 'Select from the rental numbers and regions currently offered.' }, { title: 'Confirm the term', description: 'Review duration, price, supported message types and renewal conditions.' }, { title: 'Monitor expiry', description: 'Check your rental status and renew only where the option is available.' }],
    faqs: [['Can every rental be renewed?', 'No. Renewal depends on the number, provider and inventory rules. The rental details shown before purchase take precedence.'], ['Can I use one rental on multiple platforms?', 'Only where the number and each platform permit it. Multi-platform acceptance is not guaranteed.'], ['What happens when a rental expires?', 'Access may end when the rental term expires. Review the displayed end time and any renewal rules to avoid unexpected loss of access.']],
    note: 'Rental periods, renewals, supported message types and continuity are provider-dependent. Confirm the terms displayed for the selected number.'
  },
  {
    slug: 'vtu-api', title: 'Airtime, data and utility API for Nigeria', shortTitle: 'VTU API', eyebrow: 'DIGITAL UTILITIES',
    description: 'Explore API access for supported Nigerian airtime, data bundles, cable TV and electricity token services.',
    intro: 'A VTU integration can help a product automate supported digital utility purchases. Verxor partner access is subject to approval, plan limits, wallet funding, available providers and the endpoints documented for your account.',
    benefits: [{ title: 'Utility catalog', description: 'Review supported networks, bundles and utility products exposed by your approved plan.' }, { title: 'Track fulfillment', description: 'Use order references and documented status responses to reconcile requests.' }, { title: 'Build with controls', description: 'Integrate authentication, request validation, idempotency and error handling into your application.' }],
    steps: [{ title: 'Apply for access', description: 'Share your use case and technical contact for review.' }, { title: 'Configure credentials', description: 'Use approved API credentials and the documentation provided for your plan.' }, { title: 'Test and go live', description: 'Validate responses and status handling before serving real customer transactions.' }],
    faqs: [['Which networks are supported?', 'Supported networks and products depend on the current catalog and your approved API plan. Confirm coverage in the API documentation.'], ['Does every request complete instantly?', 'Fulfillment depends on upstream availability. Your integration should handle pending, successful and failed states according to the API documentation.'], ['Can I set my own retail prices?', 'Pricing permissions depend on the agreement and product model. Applicable floor-price rules are enforced server-side.']],
    note: 'Do not assume a product, network or endpoint is available until it appears in the documentation and catalog assigned to your account.'
  },
  {
    slug: 'smm', title: 'Social media marketing services', shortTitle: 'SMM services', eyebrow: 'SOCIAL TOOLS',
    description: 'Explore social media service options, order requirements and delivery tracking in one place.',
    intro: 'Social media marketing panels list services with different platforms, quantities, delivery estimates and requirements. Results and availability depend on the specific listing and the relevant platform rules.',
    benefits: [{ title: 'Compare service details', description: 'Review the selected platform, service description, minimums, maximums and delivery notes.' }, { title: 'Know before ordering', description: 'Check account or post requirements and any refill, cancellation or refund conditions shown.' }, { title: 'Track progress', description: 'Follow the order status and keep the reference if you need support.' }],
    steps: [{ title: 'Select a listing', description: 'Choose a supported platform and read the service requirements.' }, { title: 'Submit valid details', description: 'Provide the requested public URL or other allowed order information.' }, { title: 'Monitor status', description: 'Use the order history to follow processing and completion.' }],
    faqs: [['Are engagement results guaranteed?', 'No. Delivery depends on the selected service and upstream provider. Social platforms can change their systems and policies.'], ['Can I cancel after ordering?', 'Cancellation depends on the service status and listing rules. Check the applicable terms before submitting.'], ['Do I need to share my password?', 'Do not submit passwords or account recovery codes for an SMM order. Only provide the specific information the listing requires.']],
    note: 'Use services in accordance with the relevant social platform’s terms and applicable law. Avoid sharing account passwords or sensitive credentials.'
  },
  {
    slug: 'proxies', title: 'Proxy options for supported network workflows', shortTitle: 'Proxies', eyebrow: 'NETWORK TOOLS',
    description: 'Learn the differences between residential and datacenter proxies, with availability and terms confirmed per plan.',
    intro: 'A proxy routes network traffic through an intermediary IP address. Residential and datacenter proxies differ in their IP source, performance characteristics, availability and pricing. Exact locations, session controls and usage limits depend on the offered product.',
    benefits: [{ title: 'Understand proxy types', description: 'Compare the documented characteristics of residential and datacenter options before choosing.' }, { title: 'Review locations', description: 'Check the locations actually listed for your selected plan rather than assuming global coverage.' }, { title: 'Know the limits', description: 'Review traffic, session, concurrency and acceptable-use rules before integrating.' }],
    steps: [{ title: 'Choose a type', description: 'Select the proxy category that fits your legitimate technical use case.' }, { title: 'Check plan details', description: 'Confirm location, traffic allowance, authentication and renewal terms.' }, { title: 'Configure responsibly', description: 'Use the supplied connection details and comply with the acceptable-use policy.' }],
    faqs: [['Are all countries available?', 'No. Locations depend on the product and current inventory. Check the plan details before purchase.'], ['What is the difference between residential and datacenter?', 'Residential IPs are associated with consumer internet access, while datacenter IPs are hosted in data-centre infrastructure. Availability and performance vary.'], ['Can proxies be used for any activity?', 'No. Usage must comply with applicable law, provider rules and the terms of the services you access.']],
    note: 'Availability, IP source, location, rotation, traffic and session rules vary by product. Follow all applicable acceptable-use requirements.'
  },
  {
    slug: 'esim', title: 'eSIM data profiles and compatibility', shortTitle: 'eSIM', eyebrow: 'TRAVEL CONNECTIVITY',
    description: 'Learn how eSIM data profiles work and what to check before choosing a supported travel data plan.',
    intro: 'An eSIM is a digital SIM profile that can be installed on a compatible device. Coverage, data allowance, validity, activation method and roaming arrangements depend on the specific plan and destination.',
    benefits: [{ title: 'Check device support', description: 'Confirm your device supports eSIM and is not restricted by a carrier lock.' }, { title: 'Review destination coverage', description: 'Read the country or region list and plan validity before buying.' }, { title: 'Understand activation', description: 'Follow the provider’s installation and activation instructions, including when the plan validity begins.' }],
    steps: [{ title: 'Choose a plan', description: 'Select a destination and review data, validity and coverage details.' }, { title: 'Check compatibility', description: 'Confirm device compatibility and any installation requirements.' }, { title: 'Install and activate', description: 'Use the provider’s instructions and check when the plan begins to expire.' }],
    faqs: [['Does every phone support eSIM?', 'No. Support depends on the exact device model, region variant and carrier restrictions. Verify compatibility with the device manufacturer and provider.'], ['Does a plan include a phone number?', 'Many travel eSIM plans are data-only. Check the selected plan description for voice and SMS support.'], ['When does validity begin?', 'Activation rules differ by provider. Read the plan terms before installation or first connection.']],
    note: 'Do not purchase until you have checked the exact device model, destination coverage, data allowance and activation rules.'
  },
  {
    slug: 'virtual-cards', title: 'Virtual card services and spending terms', shortTitle: 'Virtual cards', eyebrow: 'DIGITAL PAYMENTS',
    description: 'Review virtual card use cases, eligibility, fees, supported currencies and provider terms.',
    intro: 'A virtual card is a digital payment credential issued under a provider’s card program. Features such as currency, merchant acceptance, funding, fees, limits and availability are determined by the issuing provider and your eligibility.',
    benefits: [{ title: 'Review costs upfront', description: 'Check issuance, funding, transaction, foreign-exchange and maintenance fees where applicable.' }, { title: 'Understand acceptance', description: 'A merchant or subscription may decline a card based on its own policies or card-program rules.' }, { title: 'Keep credentials private', description: 'Treat card details and one-time authentication codes as sensitive financial information.' }],
    steps: [{ title: 'Check eligibility', description: 'Review supported regions and identity requirements for the specific card program.' }, { title: 'Review fees and limits', description: 'Confirm the currency, funding rules, limits and any recurring charges.' }, { title: 'Use securely', description: 'Keep card credentials private and follow the issuer’s security guidance.' }],
    faqs: [['Will a virtual card work at every merchant?', 'No. Acceptance depends on the merchant, card network, issuing program, region and transaction rules.'], ['What fees apply?', 'Fees and limits vary by card program. Review the applicable fee schedule before creating or funding a card.'], ['Is a virtual card the same as a bank account?', 'No. A virtual card is a payment credential; it does not automatically provide a bank account or deposit protection.']],
    note: 'Card issuance, identity checks, supported regions, fees, limits and acceptance depend on the issuing provider and applicable terms.'
  },
  {
    slug: 'gift-cards', title: 'Gift card trading with clear transaction terms', shortTitle: 'Gift cards', eyebrow: 'GIFT CARD SERVICES',
    description: 'Understand supported gift card types, rate quotes, submission requirements and transaction status.',
    intro: 'Gift card trading depends on the card brand, region, denomination, card condition and current market rate. Review the quote, accepted formats and required evidence before submitting a trade.',
    benefits: [{ title: 'Review the current quote', description: 'Rates can change. Confirm the displayed quote and expiry conditions before proceeding.' }, { title: 'Understand requirements', description: 'Check supported brands, regions, denominations and the evidence required for review.' }, { title: 'Track your trade', description: 'Keep the transaction reference and follow the status shown in the trade history.' }],
    steps: [{ title: 'Choose a supported card', description: 'Check that the brand, region and card format are accepted.' }, { title: 'Submit trade details', description: 'Provide only the requested card information and evidence through the designated flow.' }, { title: 'Follow review status', description: 'Wait for the transaction review and follow the displayed outcome and terms.' }],
    faqs: [['Are all gift cards accepted?', 'No. Acceptance depends on the listed brands, regions, card type and current trade rules.'], ['Is the displayed rate guaranteed?', 'Rates may change before a trade is accepted. The quote and conditions shown at confirmation govern that transaction.'], ['How long does review take?', 'Review times depend on the card type and verification requirements. Check the status and terms for your trade.']],
    note: 'Trade only cards you lawfully own or are authorized to submit. Never share gift card codes outside the official transaction flow or with unsolicited contacts.'
  },
];

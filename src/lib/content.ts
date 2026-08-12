/**
 * Editable campaign content.
 *
 * Everything a non-developer may need to change lives here: the emergency
 * figures, the sources behind them and the copy.
 *
 * Editorial rule this file is written against — a visitor should understand
 * five things within the first screen and the first scroll:
 *   1. A Colombian onchain builder created this after living the earthquake.
 *   2. The campaign helps affected people across Colombia, not only Cali.
 *   3. ReFi Colombia receives, manages and distributes the funds.
 *   4. Donations are publicly verifiable onchain.
 *   5. Offchain use of the money is reported publicly by ReFi Colombia.
 * Copy that helps none of those five should be deleted rather than polished.
 */

export const EVENT = {
  magnitude: "7.4",
  /** Local Colombian time (UTC-5). */
  struckAt: "2026-08-10T07:34:00-05:00",
  epicenter: {
    en: "Near San José del Palmar, Chocó",
    es: "Cerca de San José del Palmar, Chocó",
  },
} as const;

/**
 * Nationwide figures, shown with `asOf` rendered next to them.
 *
 * Nationwide ONLY, deliberately. An earlier version put Cali and national
 * counts side by side, which made the campaign read as Cali-specific and — by
 * mixing two reporting rounds — once showed more injured in Cali than in the
 * whole country. If these cannot be actively maintained, delete the figures
 * before deleting anything else: a stale casualty count is worse than none.
 */
export const FIGURES = {
  asOf: "2026-08-11T18:00:00-05:00",
  deaths: 181,
  injured: 1246,
  structuresCollapsed: 152,
} as const;

export const SOURCES = [
  {
    label: "Infobae",
    url: "https://www.infobae.com/colombia/2026/08/10/en-vivo-fuerte-temblor-de-74-se-sintio-en-colombia-cali-y-manizales-reportan-derrumbes-en-edificaciones/",
  },
  {
    label: "CNN en Español",
    url: "https://cnnespanol.cnn.com/2026/08/10/colombia/live-news/sismo-magnitud-7-4-en-vivo-orix",
  },
  {
    label: "El Tiempo",
    url: "https://www.eltiempo.com/colombia/otras-ciudades/terremoto-en-colombia-de-7-4-en-vivo-el-comandante-del-ejercito-nacional-se-encuentra-en-choco-coordinando-las-labores-de-atencion-de-la-emergencia-3577491",
  },
  {
    label: "La FM",
    url: "https://www.lafm.com.co/actualidad/terremoto-colombia-balance-cifra-muertos-11-agosto-2026-407503",
  },
  {
    label: "Wikipedia",
    url: "https://es.wikipedia.org/wiki/Terremoto_de_Colombia_de_2026",
  },
] as const;

export type Lang = "en" | "es";

/**
 * Not `as const`: a deeply-literal COPY makes `COPY[lang]` a union of two
 * distinct types, and calling `.map()` over a union of readonly tuples is a
 * type error at every call site. Plain object types keep the components clean.
 */
export const COPY = {
  en: {
    nav: { onchain: "Why onchain", transparency: "Transparency", faq: "FAQ" },
    hero: {
      eyebrow: "Colombia earthquake · August 10, 2026",
      title: "Asking the crypto community to help Colombia",
      cta: "Donate now",
      secondary: "Why onchain?",
      ctaProof:
        "Every donation has a public transaction. The total raised can be verified from the chain, not from a number we control.",
    },
    /**
     * The letter. This is the page.
     *
     * Each of the four paragraphs makes ONE point and no other paragraph
     * repeats it. Before this existed the custody claim was restated seven
     * times across separate sections and verifiability twelve — which is why
     * the page felt long, not because it covered too much. Everything below
     * the letter is optional detail a reader can open.
     *
     * `{deaths}`, `{injured}` and `{structures}` are filled from FIGURES so
     * the letter cannot quietly drift from the sourced numbers.
     */
    letter: {
      /**
       * Written by Camilo, not by anyone else. Edit only with him.
       *
       * `{deaths}`, `{injured}` and `{structures}` are filled from FIGURES so
       * the letter cannot drift from the sourced numbers when they change.
       * `photosAfter` marks which paragraph the contact sheet follows.
       */
      photosAfter: 1,
      paragraphs: [
        "I was born in Cali and have lived here all my life, one of the cities most affected by the 7.4 magnitude earthquake that struck Colombia on August 10.",
        "At the time of writing this, public reports speak of {deaths} people killed, {injured} injured, and {structures} collapsed structures across the country.",
        "I had been following with sadness, from a distance, what happened in Venezuela in recent weeks, but this time it was different because I had to live through it firsthand.",
        "I had never felt so much fear: fear of losing my life and fear that my loved ones might no longer be there. Everything happened in less than two minutes, but to me it felt like much longer.",
        "It is hard to describe how every movement increased the sense of hopelessness, and then how the collapse of communications made the anxiety even worse, not knowing how my family was doing.",
        "I was fortunate that my loved ones are still alive and that we only suffered material damage, but this is not the reality for many people in my country.",
        "There are still many people missing beneath the rubble, many family members desperate for answers, people who from one day to the next were left without a home, and many other situations that arise when a tragedy like this happens.",
        "That is why I want to turn to the community that, over the last few years, has meant so much in my life — a community where I have grown, learned, shared knowledge, and dedicated so many hours of my life. A community I have always identified with because of its values and what it seeks to contribute to humanity.",
        "That is why I decided to build an onchain donation channel so that anyone who wants to contribute to this cause can do so. For this, I joined forces with ReFi Colombia, a node of ReFi DAO, a decentralized community focused on the regeneration of the planet, so they can distribute all these donations among foundations, organizations, and the people who need them most.",
        "If the crypto community has contributed to your life, this is the moment for you to do the same for a cause that is truly worth it.",
      ],
      photoCredit: "Buildings I walked past in Cali. I took these photos myself.",
      /**
       * Links out rather than quoting. The thread cannot be read
       * programmatically, and paraphrasing someone's account of the day they
       * lived through is exactly the kind of invention this page must avoid.
       */
      threadLink: "I wrote about what that day was like, and what happened to my apartment",
    },
    detailsTitle: "The detail, if you want it",
    onchain: {
      title: "Why donate onchain?",
      body: "With a traditional donation account, the public usually has to trust the total reported by the organiser. Here, anyone can independently verify the donations that arrived, the amount received and the movements between the published wallets.",
      body2:
        "The blockchain does not prove what happens after funds are converted or spent offchain. That is why ReFi Colombia's public reporting is the other half of the transparency model.",
      traditionalLabel: "Traditional",
      traditionalBody: "Public sees the total reported by the organiser.",
      onchainLabel: "Onchain",
      onchainBody: "Public can independently inspect the donation transactions.",
    },
    flow: {
      title: "How your contribution moves",
      lede: "The donation is public onchain. ReFi Colombia manages what happens after it arrives.",
      steps: [
        {
          title: "You donate from your wallet",
          body: "Send USDC or USDT using one of the supported networks.",
        },
        {
          title: "The donation becomes publicly verifiable",
          body: "Once settled, the amount and transaction hash appear in the public donation ledger.",
        },
        {
          title: "ReFi Colombia manages the funds",
          body: "ReFi Colombia controls the donation wallets and decides how funds are distributed to affected communities.",
        },
        {
          title: "Their use is reported publicly",
          body: "Onchain movements remain visible here. ReFi Colombia will publish public updates about how resources are used after they leave the onchain treasury.",
        },
      ],
    },
    figures: {
      title: "What happened in Colombia",
      deaths: "deaths reported",
      injured: "injured",
      structures: "structures collapsed",
      asOf: "Last updated",
      disclaimer:
        "These figures come from public reporting during an evolving emergency and may change.",
      sources: "Sources",
    },
    stats: {
      raised: "Raised so far",
      donors: "Contributions",
      lastDonation: "Most recent",
      none: "Be the first",
      liveNote: "Updated automatically when a payment settles onchain.",
      unavailable:
        "The live counter is still being connected. Every contribution is already recorded onchain and can be checked at the wallet addresses below.",
    },
    donate: {
      title: "Make a contribution",
      subtitle:
        "Donate with USDC or USDT on Celo, Base, Arbitrum, Polygon or BNB Chain. Your payment settles to ReFi Colombia's donation wallet.",
      custom: "Other amount",
      amountLabel: "Amount (USD)",
      visibilityLegend: "How would you like your contribution to appear?",
      anonymousOption: "Donate anonymously",
      anonymousHint:
        "Your amount and transaction remain public, but your name is not shown on this site.",
      namedOption: "Donate with my name",
      namedHint:
        "Your name or organisation will appear next to your contribution in the public donation ledger.",
      nameLabel: "Name or organisation",
      namePlaceholder: "How you want to appear",
      nameHelpPublic: "This will be public.",
      certificateLegend: "Would you like your «We Stand With Colombia» certificate?",
      certificateYes: "Yes, create mine",
      certificateNo: "No, thanks",
      certificateHint:
        "A shareable certificate with your name, registered on Celo and linked to your onchain contribution. It appears here as soon as your payment settles — there is nothing to wait for by email. It is not a tax receipt and does not prove how the funds were later spent.",
      submit: "Continue to payment",
      submitting: "Creating your invoice…",
      minError: "Enter an amount greater than zero.",
      nameRequired: "Enter the name you want listed, or choose to donate anonymously.",
      genericError: "Something went wrong. Please try again.",
      notConfigured:
        "Donations are not open yet — the payment account is still being connected. Nothing can be charged right now.",
    },
    funds: {
      title: "How the funds will be used",
      lede: "We are not promising fixed percentages in advance. Needs can change quickly during an emergency. ReFi Colombia is responsible for deciding how the funds are allocated across affected communities in Colombia and for coordinating with organisations, foundations and people who need support.",
      reporting:
        "The blockchain shows how much was received and the movements between published wallets. ReFi Colombia will publish updates through its public channels explaining how the resources are ultimately used.",
    },
    manager: {
      title: "Who manages the donations?",
      body: "ReFi Colombia receives and manages the campaign funds. They are responsible for deciding the disbursements, connecting with organisations and affected people, and publishing public updates about how the resources are used.",
      body2: "DonaOnchain does not control the treasury and cannot move the funds.",
    },
    transparency: {
      title: "Verify it yourself",
      lede: "You do not have to trust the totals shown by this site. The donation wallet, treasury wallet and onchain movements are public.",
      intakeLabel: "Donation intake wallet",
      intakeNote:
        "Donations first settle here. This wallet is controlled by a single key and is not intended for long-term storage; funds are moved to the multi-signature treasury.",
      treasuryLabel: "Multi-signature treasury",
      treasuryNote:
        "This is where funds are held before disbursement. Moving funds requires approval from multiple signers.",
      walletPending: "Being published — the address will appear here before donations open.",
      ledgerTitle: "Public donation ledger",
      ledgerEmpty:
        "No donations yet. The first settled contribution will appear here with its transaction hash.",
      anonymousDonor: "Anonymous",
      colWhen: "When",
      colAmount: "Amount",
      colNetwork: "Network",
      colTx: "Transaction",
      viewTx: "View",
      outflowsTitle: "Onchain wallet movements",
      outflowsLede: "Read from the blockchain, not from a number manually entered by us.",
      outflowsEmpty:
        "No onchain movements yet. Once the addresses are published and the first donation settles, every transfer will appear here automatically.",
      outflowsUnavailable:
        "Onchain tracking is not configured yet. It switches on as soon as the wallet addresses are published.",
      colDirection: "Direction",
      inbound: "In",
      outbound: "Out",
      colCounterparty: "Counterparty",
    },
    orgs: {
      technologyTitle: "With the support of",
    },
    faq: {
      title: "Questions",
      groups: [
        {
          title: "The money",
          items: [
            { q: "Who receives and manages the money?", a: "ReFi Colombia. Donations settle into a wallet they control and they are responsible for deciding how the funds are distributed. DonaOnchain does not control the treasury and cannot move the money." },
            { q: "Who decides how the funds are used?", a: "ReFi Colombia. We are intentionally not publishing fixed percentages in advance because needs can change during the emergency. ReFi Colombia will decide the disbursements and publish updates through its public channels." },
            { q: "What happens if something goes wrong after the donation settles?", a: "ReFi Colombia controls the funds. DonaOnchain cannot reverse or recover funds on a donor's behalf after settlement. The purpose of the public wallets and ledger is to make the movements visible rather than asking donors to trust our internal records." },
          ],
        },
        {
          title: "Verifying it",
          items: [
            { q: "How is this different from sending money to a bank account?", a: "With a traditional donation account, the public normally has to trust the total reported by the organiser. Here, the donation transactions and published wallet movements can be independently checked onchain. That does not prove how money is used after it is converted or spent offchain. ReFi Colombia is responsible for publishing updates about that part." },
            { q: "What exactly can I verify onchain?", a: "You can verify the donation transaction, amount, transaction hash, receiving address and movements between the published wallets. The blockchain cannot by itself verify an offchain purchase or the final use of converted funds." },
            { q: "Why are there two wallets?", a: "Donations first settle into an intake wallet so payments can work across the supported networks. That wallet is controlled by one key, so it is not intended for storage. Funds are moved to a multi-signature treasury where multiple signers are required to approve movements." },
          ],
        },
        {
          title: "Donating",
          items: [
            { q: "Which tokens and networks can I use?", a: "USDC and USDT on Celo, Base, Arbitrum One, Polygon and BNB Chain." },
            { q: "Are there fees?", a: "A 1% payment-processing fee is deducted at settlement. Network gas is paid by the donor." },
            { q: "Can I donate anonymously?", a: "Yes. Anonymous is the default. Your contribution and transaction remain public onchain, but DonaOnchain will not attach your name to the public ledger." },
            { q: "Why would I add my name?", a: "People, companies and DAO treasuries that want to publicly support the campaign can choose to appear by name beside their contribution. This is optional." },
            { q: "Is the donation tax-deductible?", a: "No. DonaOnchain is not a registered charity and contributions are not being presented as tax-deductible donations." },
          ],
        },
        {
          title: "The certificate",
          items: [
            { q: "What is the contribution certificate?", a: "If enabled, named donors can request an optional shareable certificate linked to their onchain contribution. It is not a tax receipt and it does not certify how the funds were later spent." },
          ],
        },
      ],
    },
    thanks: {
      title: "Your contribution has arrived 🇨🇴",
      checking: "Confirming your payment onchain…",
      paid: "Thank you. Your contribution reached ReFi Colombia's wallet and is now publicly recorded onchain.",
      paidProof: "The transaction below is the proof: no one can edit or delete it.",
      paidClosing: "From Cali, thank you for standing with Colombia.",
      pending:
        "We haven't seen your payment settle yet. If you have just paid, this can take a moment — keep this page open.",
      expired:
        "This payment link expired before a payment arrived. Nothing was charged. You can start a new contribution any time.",
      refunded:
        "Your payment arrived after the link expired, so it was automatically returned to your wallet. Nothing was collected. Please start a new contribution if you would still like to give.",
      amountLabel: "Amount",
      networkLabel: "Network",
      receivedLabel: "Received",
      txLabel: "Transaction",
      shareTitle: "Help this reach further",
      shareLead: "Your contribution already matters. Now you can help more people join.",
      shareLead2:
        "Sharing DonaOnchain can take this initiative to people and communities I could never reach on my own.",
      shareOnX: "Share on X",
      shareOnWhatsApp: "Share on WhatsApp",
      shareOnTelegram: "Share on Telegram",
      copyLink: "Copy link",
      copied: "Copied",
      // The campaign URL is appended by each target, so it is deliberately not
      // written into this sentence — X and Telegram take it as its own field
      // and would otherwise show it twice.
      shareCopy:
        "Today I joined the onchain community supporting Colombia after the earthquake. 🇨🇴\n\nIf you want to help too:",
      certificateCta: "View my certificate",
      certPending: "Your certificate is being issued and will appear here in a moment.",
      backHome: "Back to the campaign",
    },
    footer: {
      built: "DonaOnchain — a community effort for Colombia.",
      disclaimer:
        "DonaOnchain is not a registered charity. Contributions are not tax-deductible. Any emergency figures shown on this page are preliminary and include their source and last-updated time.",
    },
  },
  es: {
    nav: { onchain: "Por qué onchain", transparency: "Transparencia", faq: "Preguntas" },
    hero: {
      eyebrow: "Terremoto en Colombia · 10 de agosto de 2026",
      title: "Pidiéndole a la comunidad cripto que ayude a Colombia",
      cta: "Donar ahora",
      secondary: "¿Por qué onchain?",
      ctaProof:
        "Cada donación tiene una transacción pública. El total recaudado se puede verificar desde la blockchain, no desde un número que nosotros controlemos.",
    },
    letter: {
      photosAfter: 1,
      paragraphs: [
        "Nací y he vivido toda mi vida en Cali, una de las ciudades más afectadas por el terremoto de magnitud 7.4 que sacudió a Colombia el pasado 10 de agosto.",
        "Hasta el momento en que escribo esto, los reportes públicos hablan de {deaths} personas fallecidas, {injured} heridas y {structures} estructuras colapsadas en todo el país.",
        "Había seguido con tristeza, desde la distancia, lo ocurrido en Venezuela en las semanas pasadas, pero esta vez fue diferente porque me tocó vivirlo en carne propia.",
        "Nunca había sentido tanto miedo: miedo de perder la vida y miedo de que mis seres queridos ya no estuvieran. Todo pasó en menos de dos minutos, pero para mí se sintió como mucho más tiempo.",
        "Es inexplicable cómo cada movimiento aumentaba la desesperanza y, luego, cómo el colapso de las comunicaciones aumentaba la ansiedad de no saber cómo estaban mis familiares.",
        "Tuve la fortuna de que mis seres queridos sigan vivos y de que solamente hayamos tenido daños materiales, pero esta no es la realidad de muchas personas en mi país.",
        "Aún hay muchas personas desaparecidas bajo los escombros, muchos familiares desesperados por tener respuestas, personas que de un día para otro quedaron sin hogar y muchas otras situaciones que surgen cuando ocurre una tragedia como esta.",
        "Por eso quiero acudir a la comunidad que en los últimos años ha significado tanto para mi vida, una comunidad en la que he crecido, aprendido, compartido conocimiento y a la que he dedicado muchísimas horas de mi vida. Una comunidad con la que siempre me he identificado por sus valores y por lo que busca aportar a la humanidad.",
        "Por eso decidí construir un canal de donaciones onchain para que todas las personas que quieran contribuir a esta causa puedan hacerlo. Para esto me uní a ReFi Colombia, un nodo de ReFi DAO, una comunidad descentralizada enfocada en la regeneración del planeta, para que distribuyan todas estas donaciones entre fundaciones, entidades y personas que más lo necesitan.",
        "Si la comunidad cripto ha contribuido a tu vida, este es el momento de que tú también lo hagas por una causa que realmente vale la pena.",
      ],
      photoCredit: "Edificios con los que me encontré en Cali. Estas fotos las tomé yo.",
      threadLink: "Escribí sobre cómo fue ese día y cómo quedó mi apartamento",
    },
    detailsTitle: "El detalle, si lo quieres",
    onchain: {
      title: "¿Por qué donar onchain?",
      body: "Con una cuenta de donaciones tradicional, normalmente el público tiene que confiar en el total que reporta el organizador. Aquí, cualquier persona puede verificar de forma independiente las donaciones que llegaron, el monto recibido y los movimientos entre las wallets publicadas.",
      body2:
        "La blockchain no prueba qué ocurre después de que los fondos se convierten o se gastan fuera de la cadena. Por eso los reportes públicos de ReFi Colombia son la otra mitad del modelo de transparencia.",
      traditionalLabel: "Tradicional",
      traditionalBody: "El público ve el total que reporta el organizador.",
      onchainLabel: "Onchain",
      onchainBody:
        "El público puede inspeccionar por su cuenta las transacciones de las donaciones.",
    },
    flow: {
      title: "Cómo se mueve tu contribución",
      lede: "La donación es pública onchain. ReFi Colombia administra lo que ocurre después de recibirla.",
      steps: [
        {
          title: "Donas desde tu wallet",
          body: "Envías USDC o USDT usando una de las redes disponibles.",
        },
        {
          title: "La donación queda públicamente verificable",
          body: "Una vez liquidada, el monto y el hash de la transacción aparecen en el libro público de donaciones.",
        },
        {
          title: "ReFi Colombia administra los recursos",
          body: "ReFi Colombia controla las wallets de donaciones y decide cómo se distribuyen los recursos entre las comunidades afectadas.",
        },
        {
          title: "Su uso se reporta públicamente",
          body: "Los movimientos onchain siguen visibles aquí. ReFi Colombia publicará actualizaciones sobre cómo se utilizan los recursos después de salir de la tesorería onchain.",
        },
      ],
    },
    figures: {
      title: "Qué pasó en Colombia",
      deaths: "fallecidos reportados",
      injured: "heridos",
      structures: "estructuras colapsadas",
      asOf: "Última actualización",
      disclaimer:
        "Estas cifras provienen de reportes públicos durante una emergencia que sigue evolucionando y pueden cambiar.",
      sources: "Fuentes",
    },
    stats: {
      raised: "Recaudado hasta ahora",
      donors: "Contribuciones",
      lastDonation: "Más reciente",
      none: "Sé el primero",
      liveNote: "Se actualiza automáticamente cuando un pago se liquida onchain.",
      unavailable:
        "El contador en vivo todavía se está conectando. Cada contribución ya queda registrada onchain y se puede verificar en las direcciones de abajo.",
    },
    donate: {
      title: "Haz una contribución",
      subtitle:
        "Dona con USDC o USDT en Celo, Base, Arbitrum, Polygon o BNB Chain. Tu pago se liquida en la wallet de donaciones de ReFi Colombia.",
      custom: "Otro monto",
      amountLabel: "Monto (USD)",
      visibilityLegend: "¿Cómo quieres que aparezca tu contribución?",
      anonymousOption: "Donar como anónimo",
      anonymousHint:
        "Tu monto y la transacción siguen siendo públicos, pero tu nombre no aparece en este sitio.",
      namedOption: "Donar con mi nombre",
      namedHint:
        "Tu nombre u organización aparecerá junto a tu contribución en el libro público de donaciones.",
      nameLabel: "Nombre u organización",
      namePlaceholder: "Cómo quieres aparecer",
      nameHelpPublic: "Esto será público.",
      certificateLegend: "¿Quieres tu certificado «We Stand With Colombia»?",
      certificateYes: "Sí, quiero el mío",
      certificateNo: "No, gracias",
      certificateHint:
        "Un certificado compartible con tu nombre, registrado en Celo y vinculado a tu contribución onchain. Aparece aquí apenas se liquide tu pago — no tienes que esperar ningún correo. No es un certificado tributario y no prueba cómo se gastaron posteriormente los recursos.",
      submit: "Continuar al pago",
      submitting: "Creando tu factura…",
      minError: "Ingresa un monto mayor a cero.",
      nameRequired: "Escribe el nombre con el que quieres aparecer, o elige donar como anónimo.",
      genericError: "Algo salió mal. Inténtalo de nuevo.",
      notConfigured:
        "Las donaciones aún no están abiertas — la cuenta de pagos se está conectando. Por ahora no se puede cobrar nada.",
    },
    funds: {
      title: "Cómo se utilizarán los recursos",
      lede: "No vamos a prometer porcentajes fijos por adelantado. Las necesidades pueden cambiar rápidamente durante una emergencia. ReFi Colombia es responsable de decidir cómo se distribuyen los recursos entre las comunidades afectadas en Colombia y de coordinar con organizaciones, fundaciones y personas que necesiten apoyo.",
      reporting:
        "La blockchain muestra cuánto se recibió y los movimientos entre las wallets publicadas. ReFi Colombia publicará a través de sus canales actualizaciones sobre cómo se utilizan finalmente los recursos.",
    },
    manager: {
      title: "¿Quién administra las donaciones?",
      body: "ReFi Colombia recibe y administra los recursos de la campaña. Ellos son responsables de decidir los desembolsos, conectarse con organizaciones y personas afectadas, y publicar actualizaciones sobre cómo se utilizan los recursos.",
      body2: "DonaOnchain no controla la tesorería ni puede mover los fondos.",
    },
    transparency: {
      title: "Verifícalo tú mismo",
      lede: "No tienes que confiar en los totales que muestra este sitio. La wallet de donaciones, la wallet de tesorería y los movimientos onchain son públicos.",
      intakeLabel: "Wallet de entrada de donaciones",
      intakeNote:
        "Las donaciones se liquidan primero aquí. Esta wallet está controlada por una sola llave y no está pensada para guardar fondos a largo plazo; los recursos se trasladan a la tesorería multifirma.",
      treasuryLabel: "Tesorería multifirma",
      treasuryNote:
        "Aquí se custodian los fondos antes de los desembolsos. Mover recursos requiere la aprobación de varios firmantes.",
      walletPending:
        "Pendiente de publicación — la dirección aparecerá aquí antes de abrir las donaciones.",
      ledgerTitle: "Libro público de donaciones",
      ledgerEmpty:
        "Aún no hay donaciones. La primera contribución liquidada aparecerá aquí con su hash de transacción.",
      anonymousDonor: "Anónimo",
      colWhen: "Cuándo",
      colAmount: "Monto",
      colNetwork: "Red",
      colTx: "Transacción",
      viewTx: "Ver",
      outflowsTitle: "Movimientos de las wallets onchain",
      outflowsLede:
        "Leídos desde la blockchain, no desde un número ingresado manualmente por nosotros.",
      outflowsEmpty:
        "Aún no hay movimientos onchain. Cuando se publiquen las direcciones y se liquide la primera donación, cada transferencia aparecerá aquí automáticamente.",
      outflowsUnavailable:
        "El rastreo onchain todavía no está configurado. Se enciende apenas se publiquen las direcciones de las wallets.",
      colDirection: "Dirección",
      inbound: "Entra",
      outbound: "Sale",
      colCounterparty: "Contraparte",
    },
    orgs: {
      technologyTitle: "Con el apoyo de",
    },
    faq: {
      title: "Preguntas",
      groups: [
        {
          title: "El dinero",
          items: [
            { q: "¿Quién recibe y administra el dinero?", a: "ReFi Colombia. Las donaciones se liquidan en una wallet que ellos controlan y son responsables de decidir cómo se distribuyen los recursos. DonaOnchain no controla la tesorería ni puede mover el dinero." },
            { q: "¿Quién decide cómo se utilizan los recursos?", a: "ReFi Colombia. Intencionalmente no estamos publicando porcentajes fijos por adelantado porque las necesidades pueden cambiar durante la emergencia. ReFi Colombia decidirá los desembolsos y publicará actualizaciones a través de sus canales." },
            { q: "¿Qué pasa si algo sale mal después de que la donación se liquida?", a: "ReFi Colombia controla los recursos. DonaOnchain no puede reversar ni recuperar fondos en nombre de un donante después de la liquidación. El propósito de las wallets públicas y del libro de donaciones es hacer visibles los movimientos en lugar de pedirle a los donantes que confíen en nuestros registros internos." },
          ],
        },
        {
          title: "Cómo verificarlo",
          items: [
            { q: "¿En qué se diferencia esto de enviar dinero a una cuenta bancaria?", a: "Con una cuenta de donaciones tradicional, normalmente el público tiene que confiar en el total reportado por el organizador. Aquí, las transacciones de las donaciones y los movimientos de las wallets publicadas se pueden verificar de forma independiente onchain. Eso no prueba cómo se utiliza el dinero después de convertirlo o gastarlo fuera de la cadena. ReFi Colombia es responsable de publicar actualizaciones sobre esa parte." },
            { q: "¿Qué puedo verificar exactamente onchain?", a: "Puedes verificar la transacción de la donación, el monto, el hash, la dirección que recibió los fondos y los movimientos entre las wallets publicadas. La blockchain por sí sola no puede verificar una compra fuera de la cadena ni el uso final de recursos ya convertidos." },
            { q: "¿Por qué hay dos wallets?", a: "Las donaciones primero se liquidan en una wallet de entrada para que los pagos funcionen en las redes compatibles. Esa wallet está controlada por una sola llave, por lo que no está pensada para guardar los fondos. Los recursos se trasladan a una tesorería multifirma donde se requiere la aprobación de varios firmantes para moverlos." },
          ],
        },
        {
          title: "Donar",
          items: [
            { q: "¿Qué tokens y redes puedo usar?", a: "USDC y USDT en Celo, Base, Arbitrum One, Polygon y BNB Chain." },
            { q: "¿Hay comisiones?", a: "Se descuenta un 1% de procesamiento al liquidar. El gas de red lo paga el donante." },
            { q: "¿Puedo donar de forma anónima?", a: "Sí. Es la opción predeterminada. Tu contribución y la transacción siguen siendo públicas onchain, pero DonaOnchain no asociará tu nombre al libro público." },
            { q: "¿Por qué querría agregar mi nombre?", a: "Las personas, empresas y tesorerías de DAOs que quieran apoyar públicamente la campaña pueden elegir aparecer con su nombre junto a su contribución. Es opcional." },
            { q: "¿La donación es deducible de impuestos?", a: "No. DonaOnchain no es una entidad sin ánimo de lucro registrada y estas contribuciones no se presentan como donaciones deducibles de impuestos." },
          ],
        },
        {
          title: "El certificado",
          items: [
            { q: "¿Qué es el certificado de contribución?", a: "Si está habilitado, quienes donen con su nombre pueden solicitar un certificado compartible vinculado a su contribución onchain. No es un certificado tributario ni certifica cómo se gastaron posteriormente los recursos." },
          ],
        },
      ],
    },
    thanks: {
      title: "Tu contribución ya llegó 🇨🇴",
      checking: "Confirmando tu pago onchain…",
      paid: "Gracias. Tu contribución llegó a la wallet de ReFi Colombia y quedó registrada públicamente onchain.",
      paidProof: "La transacción de abajo es la prueba: nadie puede editarla ni borrarla.",
      paidClosing: "Desde Cali, gracias por estar con Colombia.",
      pending:
        "Todavía no vemos tu pago liquidado. Si acabas de pagar, puede tardar un momento — deja esta página abierta.",
      expired:
        "Este enlace de pago expiró antes de que llegara un pago. No se cobró nada. Puedes iniciar una nueva contribución cuando quieras.",
      refunded:
        "Tu pago llegó después de que el enlace expirara, así que se devolvió automáticamente a tu wallet. No se recibió nada. Inicia una nueva contribución si aún quieres aportar.",
      amountLabel: "Monto",
      networkLabel: "Red",
      receivedLabel: "Recibido",
      txLabel: "Transacción",
      shareTitle: "Ayuda a que esto llegue más lejos",
      shareLead: "Tu contribución ya cuenta. Ahora puedes ayudar a que más personas se sumen.",
      shareLead2:
        "Compartir DonaOnchain puede llevar esta iniciativa a personas y comunidades a las que yo nunca llegaría.",
      shareOnX: "Compartir en X",
      shareOnWhatsApp: "Compartir por WhatsApp",
      shareOnTelegram: "Compartir en Telegram",
      copyLink: "Copiar enlace",
      copied: "Copiado",
      shareCopy:
        "Hoy me sumé a la comunidad onchain que está apoyando a Colombia después del terremoto. 🇨🇴\n\nSi tú también quieres ayudar:",
      certificateCta: "Ver mi certificado",
      certPending: "Tu certificado se está emitiendo y aparecerá aquí en un momento.",
      backHome: "Volver a la campaña",
    },
    footer: {
      built: "DonaOnchain — un esfuerzo de comunidad por Colombia.",
      disclaimer:
        "DonaOnchain no es una entidad sin ánimo de lucro registrada. Las contribuciones no son deducibles de impuestos. Cualquier cifra sobre la emergencia que aparezca en esta página es preliminar e incluye su fuente y la hora de su última actualización.",
    },
  },
};

/** Preset donation amounts, in USD. Deliberately carry no attached meaning. */
export const PRESET_AMOUNTS = [25, 100, 500] as const;

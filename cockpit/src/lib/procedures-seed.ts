// DÉMARCHES ADMINISTRATIVES de l'usine — le contenu de référence.
//
// Écrit ici plutôt que saisi à la main en base : ces procédures se
// corrigent au fil de l'expérience (une exigence Google qui change, un
// piège découvert), et une correction doit arriver par le code, revue,
// pas par une saisie qu'on ne retrouve plus.
//
// AVERTISSEMENT ASSUMÉ : les règles des boutiques changent sans
// préavis. Chaque étape dit ce qu'on sait au moment où on l'écrit ; ce
// qui compte, c'est l'ORDRE et les pièges, pas la copie exacte d'un
// formulaire. Vérifier l'écran réel prime toujours sur ce texte.
//
// RÈGLE SUR LES LIENS : n'en écrire aucun sans l'avoir OUVERT.
// Un lien deviné vers la documentation Google a été publié ici et
// répondait 404 (2026-08-18) — l'utilisateur l'a découvert à ma place.
// Une adresse plausible n'est pas une adresse vérifiée ; les trois
// liens présents ont été testés et répondent 200.


// ENTITÉ JURIDIQUE de l'usine — celle qui encaisse.
//
// Ces informations sont recopiées dans des formulaires (Dun &
// Bradstreet, Play Console, profil de paiement) où la moindre variation
// fait échouer une vérification. Elles vivent donc ici, à un seul
// endroit, telles qu'elles figurent sur les documents officiels.
//
// CE QUI N'Y FIGURE PAS, VOLONTAIREMENT : le numéro fiscal fédéral
// (EIN) une fois obtenu. C'est un identifiant fiscal ; sa place est un
// gestionnaire de mots de passe, pas une base de données applicative
// derrière une simple authentification. Le cockpit rappelle qu'il
// existe et où le chercher, il ne le stocke pas.
export const ENTITE = {
  nom: "MARNWELL LLC",
  forme: "Single-member LLC (société à responsabilité limitée à associé unique)",
  etat: "New Mexico, États-Unis",
  idEtat: "0008118714",
  numeroDepot: "3273477",
  dateConstitution: "23 juillet 2026",
  adresse: "15442 Ventura Blvd, Ste 201-2828, Sherman Oaks, CA 91403, USA",
  agentEnregistre:
    "Registered Agents Inc — 1209 Mountain Road Pl NE, Ste R, Albuquerque, NM 87110",
  associe: "Mehdi Faid — 100 %",
  activiteDeclaree: "Digital Services",
  exerciceComptable: "clôture en décembre · déclaration au 15 avril",
  rapportAnnuel: "aucun (le Nouveau-Mexique n'en exige pas pour une LLC)",
  einStatut: "EN COURS D'OBTENTION auprès de l'IRS (SS-4 et 8821 déposés, 18/08/2026)",
} as const;

export type EtapeProcedure = {
  code: string;
  titre: string;
  /** Ce qu'il faut faire concrètement, sans jargon. */
  detail: string;
  /** 'humain' = le propriétaire agit ; 'attente' = un tiers travaille. */
  qui: "humain" | "attente";
  /** Piège coûteux, écrit AVANT qu'on tombe dedans. */
  attention?: string;
  lien?: string;
  fait?: boolean;
};

export type ValeurCopiable = {
  label: string;
  valeur: string;
  /** Où cette valeur se colle, et pourquoi elle compte. */
  aide?: string;
  /** Pas encore disponible : affichée sans bouton de copie. */
  alerte?: boolean;
};

export type ProcedureSeed = {
  id: string;
  titre: string;
  pourquoi: string;
  rang: number;
  etapes: EtapeProcedure[];
  /** Ce qu'il faudra coller dans les formulaires de cette démarche. */
  valeurs?: ValeurCopiable[];
};

export const PROCEDURES: ProcedureSeed[] = [
  {
    id: "google-play-organisation",
    titre: "Compte Google Play — organisation",
    pourquoi:
      "Chemin critique vers le store : rien ne se publie sans lui. Le compte ORGANISATION est obligatoire ici (décision D2) — un compte personnel neuf subit un test fermé de 12 testeurs pendant 14 jours continus avant toute publication ; l'organisation en est exemptée. C'est plusieurs semaines gagnées, et la seule raison pour laquelle on accepte la lourdeur du D-U-N-S.",
    rang: 1,
    valeurs: [
      { label: "Legal business name", valeur: "MARNWELL LLC",
        aide: "Dun & Bradstreet ET Play Console. Sans article, sans point, en majuscules comme au registre." },
      { label: "Business street address", valeur: "15442 Ventura Blvd, Ste 201-2828",
        aide: "La suite « 201-2828 » fait partie de l'adresse : l'omettre fait échouer le recoupement." },
      { label: "City", valeur: "Sherman Oaks" },
      { label: "State", valeur: "California (CA)" },
      { label: "ZIP", valeur: "91403" },
      { label: "Country", valeur: "United States" },
      { label: "State of incorporation", valeur: "New Mexico",
        aide: "L'État de CONSTITUTION diffère de l'adresse : la LLC est du Nouveau-Mexique, son adresse est en Californie. Les deux sont exacts." },
      { label: "Entity type", valeur: "Limited Liability Company (LLC)" },
      { label: "Date of incorporation", valeur: "07/23/2026",
        aide: "Format américain mois/jour/année." },
      { label: "State file number", valeur: "3273477" },
      { label: "State ID number", valeur: "0008118714" },
      { label: "Authorized representative", valeur: "Mehdi Faid",
        aide: "Associé unique, 100 % — c'est vous qui avez autorité pour créer le compte." },
      { label: "Numéro fiscal fédéral (EIN)", valeur: "en cours d'obtention auprès de l'IRS", alerte: true,
        aide: "Nécessaire au PROFIL DE PAIEMENT, pas à la création du compte. Le conserver dans un gestionnaire de mots de passe." },
    ],
    etapes: [
      {
        code: "ss4",
        titre: "Déposer les formulaires SS-4 et 8821",
        detail:
          "Fait le 18/08/2026. Le SS-4 demande le numéro fiscal fédéral (EIN), le 8821 autorise le prestataire à le récupérer auprès de l'IRS. Sans EIN, le profil de PAIEMENT de Google Play ne peut pas être créé — donc aucun abonnement ne peut être encaissé, même app publiée.",
        qui: "humain",
        attention:
          "L'associé est déclaré « FOREIGN/NON-DOMESTIC » (sans numéro fiscal américain) : l'EIN ne pouvait donc pas être obtenu en ligne, il passe par l'IRS en fax ou par téléphone. C'est la démarche la plus longue de toutes — d'où l'intérêt de mener le D-U-N-S EN PARALLÈLE plutôt qu'à la suite.",
      },
      {
        code: "ein-attente",
        titre: "Attendre l'attribution de l'EIN",
        detail:
          "En cours. L'IRS renvoie le numéro au prestataire désigné (formulaire 8821), qui le transmet. Le conserver dans un gestionnaire de mots de passe — il ne sera jamais stocké dans le cockpit. Pendant cette attente, RIEN n'empêche d'avancer le D-U-N-S : les deux sont indépendants jusqu'au profil de paiement.",
        qui: "attente",
      },
      {
        code: "duns-demande",
        titre: "Demander le numéro D-U-N-S",
        detail:
          "Gratuit, auprès de Dun & Bradstreet. La Play Console affiche aussi un lien de demande DANS son formulaire d'inscription, à l'étape D-U-N-S : le prendre de préférence, il est rattaché à votre demande Google. Recopier la fiche d'identité ci-dessus à l'identique — les valeurs ci-dessous sont prêtes à coller.",
        qui: "humain",
        lien: "https://www.dnb.com/duns-number/get-a-duns.html",
        attention:
          "Marnwell LLC a été constituée en juillet 2026 : Dun & Bradstreet n'en a probablement aucune trace, la demande part donc de zéro. Vérifier quand même dans son outil de recherche — un doublon bloque la vérification. Attendez-vous aussi à ce que Google demande des justificatifs supplémentaires : une société récente, à une adresse de domiciliation, attire l'examen.",
      },
      {
        code: "duns-attente",
        titre: "Attendre l'attribution",
        detail:
          "Compter plusieurs jours ouvrés, parfois davantage. C'est du temps d'attente pur : rien à faire, mais rien ne peut avancer non plus. C'est LA raison de s'y prendre tôt.",
        qui: "attente",
      },
      {
        code: "profil-public",
        titre: "Choisir l'adresse e-mail et le téléphone PUBLICS",
        detail:
          "Le profil développeur est affiché sur Google Play, visible de tous : nom, e-mail et téléphone. Prévoir une adresse dédiée (contact@…) et un numéro qu'on accepte de rendre public.",
        qui: "humain",
        attention:
          "Ne PAS mettre un numéro personnel ni une adresse privée : ils resteront affichés publiquement sur la fiche de chaque app du portfolio. C'est le genre de choix qu'on ne peut pas défaire discrètement.",
      },
      {
        code: "contact-google",
        titre: "Préparer le contact PRIVÉ pour Google",
        detail:
          "Une seconde adresse e-mail et un second numéro, qui ne servent qu'à Google et ne sont jamais affichés. Ils peuvent être personnels, eux.",
        qui: "humain",
        attention:
          "C'est par cette adresse qu'arriveront les avertissements de conformité et les alertes de suspension. La relever régulièrement : un message manqué peut coûter le compte.",
      },
      {
        code: "paiement",
        titre: "Prévoir le moyen de paiement (25 $ une fois)",
        detail:
          "Frais d'inscription unique, en dollars, par carte. À enregistrer ensuite dans les coûts de l'usine.",
        qui: "humain",
      },
      {
        code: "creation",
        titre: "Créer le compte dans la Play Console",
        detail:
          "Choisir « organisation », renseigner le D-U-N-S, les deux jeux de contacts, payer. Vérifier l'adresse e-mail quand le message arrive.",
        qui: "humain",
        lien: "https://play.google.com/console/signup",
        attention:
          "Ne JAMAIS créer un second compte développeur, même « pour tester ». Google associe les comptes entre eux : la sanction d'un compte tombe sur tous les autres, et c'est irréversible.",
      },
      {
        code: "document",
        titre: "Fournir le document officiel demandé",
        detail:
          "Google recoupe ce que Dun & Bradstreet lui répond avec un document officiel de l'entreprise (avis d'immatriculation ou équivalent). Le fournir dès la demande pour ne pas rallonger le délai.",
        qui: "humain",
      },
      {
        code: "verif-tel",
        titre: "Vérifier le numéro de téléphone",
        detail:
          "Demandé APRÈS la création du compte, pas pendant. Tant que ce n'est pas fait, le compte reste incomplet.",
        qui: "humain",
      },
      {
        code: "verif-google",
        titre: "Attendre la vérification par Google",
        detail:
          "Google valide l'identité de l'organisation. Compter plusieurs jours. Rien à faire, sinon surveiller l'adresse de contact privée.",
        qui: "attente",
      },
    ],
  },
  {
    id: "premiere-publication",
    titre: "Première publication — PromptLandia",
    pourquoi:
      "Ce qui s'enchaîne dès que le compte existe. Tout le contenu de la fiche est déjà prêt dans le dépôt de l'app (docs/planning/DOSSIER_STORE.md) : textes français, réponses au formulaire de sécurité des données avec leur source de vérification, captures régénérables en une commande.",
    rang: 2,
    valeurs: [
      { label: "Nom de l'application", valeur: "PromptLandia" },
      { label: "Nom du package", valeur: "com.gloomingagency.promptlandia",
        aide: "DÉFINITIF : il ne peut plus changer après la première publication." },
      { label: "Politique de confidentialité (URL)", valeur: "https://promptlandia-bff.vercel.app/privacy",
        aide: "Doit rester accessible SANS compte : Google la vérifie." },
      { label: "Catégorie", valeur: "Éducation" },
      { label: "Public cible", valeur: "6-8 ans et 9-12 ans",
        aide: "Ces deux tranches, et aucune autre : cela fait basculer l'app sous la politique Familles." },
      { label: "E-mail de contact", valeur: "gloomingagency@gmail.com" },
      { label: "Abonnement mensuel — référence", valeur: "promptlandia_famille_mensuel",
        aide: "6,99 €. La référence doit correspondre au caractère près à celle attendue par l'app." },
      { label: "Abonnement annuel — référence", valeur: "promptlandia_famille_annuel",
        aide: "44,99 €. Même exigence." },
    ],
    etapes: [
      {
        code: "app-console",
        titre: "Créer l'application dans la console",
        detail:
          "Nom, langue par défaut, catégorie Éducation, application gratuite avec achats intégrés.",
        qui: "humain",
        attention:
          "Le choix « gratuite » est DÉFINITIF : une app gratuite ne peut jamais devenir payante. C'est bien ce qu'on veut ici — le modèle est gratuit avec un abonnement.",
      },
      {
        code: "public-cible",
        titre: "Déclarer le public cible : 6-8 et 9-12 ans",
        detail:
          "Ces deux tranches, et aucune autre. Cela fait basculer l'app sous la politique Familles, avec des contrôles renforcés et des délais d'examen plus longs.",
        qui: "humain",
      },
      {
        code: "securite-donnees",
        titre: "Remplir le formulaire « Sécurité des données »",
        detail:
          "Les réponses sont prêtes et chacune est adossée à un endroit précis du code. Déclarer les journaux de plantage et les diagnostics : ils ne sont PAS exemptés.",
        qui: "humain",
        attention:
          "Une déclaration inexacte est un motif de suspension, pas un simple avertissement. Ne cocher que ce qui est vérifiable.",
      },
      {
        code: "sentry-cgu",
        titre: "Vérifier les conditions d'utilisation de Sentry",
        detail:
          "La politique Familles interdit tout composant tiers dont les conditions excluent les services destinés aux enfants. Lire cette clause AVANT de soumettre : c'est le seul blocage qu'aucun réglage ne contourne. Si elle existe, il faut retirer l'outil de diagnostic.",
        qui: "humain",
      },
      {
        code: "visuels",
        titre: "Déposer les visuels",
        detail:
          "Bannière 1024 × 500 (le prompt est sur la fiche de l'app), icône 512 × 512, et les captures d'écran régénérées automatiquement à chaque livraison.",
        qui: "humain",
      },
      {
        code: "achats",
        titre: "Déclarer les deux abonnements",
        detail:
          "Références exactes : promptlandia_famille_mensuel (6,99 €) et promptlandia_famille_annuel (44,99 €). C'est ce qui débloque le branchement de l'achat dans l'app — tout le reste de la chaîne de paiement est déjà en place et testé.",
        qui: "humain",
      },
      {
        code: "test-interne",
        titre: "Publier d'abord en test interne",
        detail:
          "Sur un compte organisation, le test interne est immédiat et sans quota de testeurs. Y installer l'app, dérouler le parcours en vrai, et seulement ensuite demander l'examen pour la production.",
        qui: "humain",
        attention:
          "Chaque soumission engage la réputation du compte. Jamais d'envoi automatique : le passage en production reste une décision humaine.",
      },
    ],
  },
  {
    id: "apple-developer",
    titre: "Compte Apple Developer — organisation",
    pourquoi:
      "Différé volontairement (décision D2) : Google d'abord, Apple ensuite, pour ne pas payer deux abonnements avant d'avoir vendu quoi que ce soit. À lancer quand la première app est publiée sur Google Play — le châssis est déjà multiplateforme, la sortie iOS sera une build et une fiche, pas un chantier.",
    rang: 3,
    valeurs: [
      { label: "Legal entity name", valeur: "MARNWELL LLC",
        aide: "Identique à Google : Apple recoupe avec Dun & Bradstreet." },
      { label: "D-U-N-S Number", valeur: "à reporter une fois attribué", alerte: true,
        aide: "LE MÊME que celui obtenu pour Google — rien à redemander." },
      { label: "Headquarters address", valeur: "15442 Ventura Blvd, Ste 201-2828, Sherman Oaks, CA 91403, United States" },
      { label: "Website", valeur: "https://promptlandia-bff.vercel.app",
        aide: "Apple exige un site rattaché à l'entreprise. Prévoir un vrai domaine avant l'inscription." },
    ],
    etapes: [
      {
        code: "apple-cout",
        titre: "Accepter le coût : 99 $ PAR AN",
        detail:
          "Contrairement à Google (25 $ une fois), Apple facture un abonnement annuel reconductible. C'est un coût fixe de l'usine, à porter dans les coûts avant de s'engager.",
        qui: "humain",
        attention:
          "Ne pas le prendre « pour être prêt ». Tant qu'aucune app n'est en état de sortir sur iOS, l'abonnement court pour rien — et il se reconduit tout seul.",
      },
      {
        code: "apple-duns",
        titre: "Réutiliser le D-U-N-S de Marnwell LLC",
        detail:
          "Apple exige lui aussi un D-U-N-S pour un compte organisation. C'est le MÊME numéro que celui obtenu pour Google : rien à redemander. Voilà pourquoi la démarche Google doit être faite en premier.",
        qui: "humain",
      },
      {
        code: "apple-identifiant",
        titre: "Créer l'identifiant Apple de l'entreprise",
        detail:
          "Un identifiant Apple dédié à Marnwell LLC, avec l'adresse e-mail professionnelle, jamais un compte personnel existant. Authentification à deux facteurs obligatoire.",
        qui: "humain",
        attention:
          "Ce compte détiendra toutes les apps du portfolio sur iOS. Le rattacher à une adresse personnelle, c'est lier le patrimoine de l'usine à une boîte mail privée — et rendre toute cession impossible.",
      },
      {
        code: "apple-inscription",
        titre: "S'inscrire au Apple Developer Program",
        detail:
          "Choisir « Organization ». Apple demande la dénomination légale, le D-U-N-S, l'adresse et un site web de l'entreprise.",
        qui: "humain",
        lien: "https://developer.apple.com/programs/enroll/",
        attention:
          "Apple vérifie souvent par un APPEL TÉLÉPHONIQUE à un numéro qu'il trouve lui-même dans les registres publics, pas celui qu'on déclare. Vérifier que le numéro rattaché à Marnwell LLC chez Dun & Bradstreet est bien joignable, sinon la vérification échoue sans explication.",
      },
      {
        code: "apple-verif",
        titre: "Attendre la vérification d'Apple",
        detail:
          "Compter plusieurs jours, parfois davantage pour une société récente.",
        qui: "attente",
      },
      {
        code: "apple-43",
        titre: "Relire la règle 4.3 avant toute soumission",
        detail:
          "Apple refuse les apps qui se ressemblent trop entre elles, et sanctionne le COMPTE, pas seulement l'app. Une usine qui publie plusieurs apps y est exposée par construction : chaque app doit avoir une raison d'exister distincte, visible dès la fiche.",
        qui: "humain",
        attention:
          "C'est le risque fatal du portfolio (règle 5 du dépôt). Un flot d'apps similaires met le compte entier en danger, et un bannissement Apple est définitif.",
      },
    ],
  },
];

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

export type ProcedureSeed = {
  id: string;
  titre: string;
  pourquoi: string;
  rang: number;
  etapes: EtapeProcedure[];
};

export const PROCEDURES: ProcedureSeed[] = [
  {
    id: "google-play-organisation",
    titre: "Compte Google Play — organisation",
    pourquoi:
      "Chemin critique vers le store : rien ne se publie sans lui. Le compte ORGANISATION est obligatoire ici (décision D2) — un compte personnel neuf subit un test fermé de 12 testeurs pendant 14 jours continus avant toute publication ; l'organisation en est exemptée. C'est plusieurs semaines gagnées, et la seule raison pour laquelle on accepte la lourdeur du D-U-N-S.",
    rang: 1,
    etapes: [
      {
        code: "entite",
        titre: "Vérifier que l'entité juridique existe vraiment",
        detail:
          "Un numéro D-U-N-S s'attribue à une entreprise ENREGISTRÉE. Si Glooming Agency n'est pas déjà immatriculée (SASU, EURL, micro-entreprise…), c'est la toute première chose à faire : rien d'autre ne peut avancer. Noter la dénomination légale EXACTE et l'adresse du siège telles qu'elles figurent sur l'avis d'immatriculation.",
        qui: "humain",
        attention:
          "Tout le reste de la démarche compare des chaînes de caractères. « Glooming Agency » et « Glooming Agency SASU » sont deux entités différentes aux yeux de Google. Recopier au caractère près, accents et forme juridique compris.",
      },
      {
        code: "duns-demande",
        titre: "Demander le numéro D-U-N-S",
        detail:
          "Gratuit, auprès de Dun & Bradstreet. La console Play propose un lien de demande dédié — l'emprunter plutôt que le formulaire générique, il est rattaché à la demande Google. Renseigner la dénomination légale et l'adresse relevées à l'étape précédente, à l'identique.",
        qui: "humain",
        lien: "https://support.google.com/googleplay/android-developer/answer/9934824",
        attention:
          "Si l'entreprise possède DÉJÀ un D-U-N-S sans le savoir (c'est fréquent), en demander un second crée un doublon qui bloque la vérification. Chercher d'abord dans l'outil de recherche de D&B.",
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
];

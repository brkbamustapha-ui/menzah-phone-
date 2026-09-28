/*
 * ============================================================
 *  MENZAH STORE : informations de la boutique
 * ============================================================
 *  Modifiez ce fichier pour changer les numéros, les liens,
 *  les statistiques ou les vidéos affichées sur le site.
 *  Pas besoin de toucher au reste du code.
 * ============================================================
 */
window.MENZAH_CONFIG = {
  nom: "Menzah Store",
  slogan: "Qualité, fiabilité et service",
  bienvenue: "Soyez les bienvenus chez Menzah Store",

  // Numéros affichés sur le site (format lisible)
  telephones: ["07 77 31 93 32", "07 70 47 54 21"],

  // Numéro WhatsApp au format international, sans "+" ni espaces
  // (07 77 31 93 32 devient 213777319332)
  whatsapp: "213777319332",

  // Premier message pré-rempli quand un client clique sur "Écrire sur WhatsApp"
  messageWhatsapp: "Bonjour Menzah Store, j'ai vu votre site et j'aimerais avoir des informations.",

  adresse: {
    ligne: "Haï El Menzah (Canastel)",
    ville: "Oran",
    pays: "Algérie",
  },

  // Lien Google Maps de la boutique (bouton "Itinéraire")
  googleMaps: "https://maps.app.goo.gl/2sgKtEmkeRf4gAEJ7",

  // Recherche utilisée pour la carte intégrée.
  // Pour un repère exact, remplacez par les coordonnées GPS, ex : "35.7499,-0.5637"
  carteRecherche: "Menzah Store, Canastel, Oran, Algérie",

  // Horaires d'ouverture (laisser vide [] pour ne rien afficher)
  // Exemple : [{ jours: "Samedi à jeudi", heures: "10h - 21h" }]
  horaires: [],

  reseaux: {
    tiktok: { pseudo: "@menzah.store", lien: "https://www.tiktok.com/@menzah.store" },
    instagram: { pseudo: "@menzah_store", lien: "https://www.instagram.com/menzah_store/" },
  },

  // Chiffres affichés sous l'accueil (à mettre à jour de temps en temps)
  statistiques: {
    abonnesTiktok: "55,7 k",
    jaimeTiktok: "283,6 k",
  },

  /*
   * Vidéos TikTok affichées sur le site.
   * Pour ajouter une vidéo : copiez son lien depuis TikTok (Partager > Copier le lien).
   * L'identifiant est le long nombre à la fin du lien.
   */
  videosTiktok: [
    {
      id: "7500708952628317495",
      titre: "Déballage de l'iPhone 16 Pro Max",
      produit: "iphone-16-pro-max",
    },
    {
      id: "7576737465441062162",
      titre: "Découvrez Menzah Store à Oran",
    },
    {
      id: "7620420342497938709",
      titre: "Qualité, fiabilité et service",
    },
    {
      id: "7619066063585545492",
      titre: "Soyez les bienvenus chez Menzah Store",
    },
  ],

  /*
   * Publications Instagram affichées sur le site.
   * Collez simplement le lien de la publication ou du reel.
   */
  postsInstagram: [
    "https://www.instagram.com/p/DKmTNeICzX1/",
    "https://www.instagram.com/reel/DN1GyJexCM7/",
    "https://www.instagram.com/reel/DO7ECc_guGx/",
    "https://www.instagram.com/reel/DRp_0KwgrTC/",
    "https://www.instagram.com/reel/DNQMBnLCoQe/",
  ],
};

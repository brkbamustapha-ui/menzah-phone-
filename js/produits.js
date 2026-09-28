/*
 * ============================================================
 *  MENZAH STORE : catalogue des produits
 * ============================================================
 *  Chaque produit est un bloc { ... }. Pour ajouter un produit,
 *  copiez un bloc existant, collez-le et changez les valeurs.
 *
 *  nom         : nom affiché
 *  marque      : Apple, OPPO, Samsung...
 *  categorie   : "iphone", "android" ou "accessoires"
 *  visuel      : dessin utilisé si aucune photo n'est fournie
 *                ("plateau", "air", "pro", "double", "diagonale",
 *                 "oppo", "ultra", "airpods", "chargeur", "coque")
 *  image       : photo du produit (facultatif), ex : "images/produits/iphone-16-pro-max.jpg"
 *  couleurs    : liste des coloris { nom, hex }
 *  capacites   : liste des capacités de stockage
 *  prix        : prix en dinars (ex : 215000) ou null pour "Prix sur demande"
 *  prixBarre   : ancien prix barré pour une promo (facultatif)
 *  badge       : petit libellé (facultatif), ex : "Nouveau", "Promo", "Arrivage"
 *  video       : lien d'une vidéo TikTok où le produit apparaît (facultatif)
 * ============================================================
 */
window.MENZAH_PRODUITS = [
  {
    id: "iphone-18-pro-max",
    nom: "iPhone 18 Pro Max",
    marque: "Apple",
    categorie: "iphone",
    visuel: "plateau",
    badge: "Nouveau",
    description: "Le tout dernier iPhone Pro Max, sorti en septembre 2026.",
    couleurs: [
      { nom: "Bordeaux", hex: "#6B2334" },
      { nom: "Glacier", hex: "#D3E1E8" },
      { nom: "Argent", hex: "#E4E4E2" },
      { nom: "Noir", hex: "#2E2F33" },
    ],
    capacites: ["256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "iphone-17-pro-max",
    nom: "iPhone 17 Pro Max",
    marque: "Apple",
    categorie: "iphone",
    visuel: "plateau",
    description: "Écran 6,9 pouces, puce A19 Pro, trois caméras 48 Mpx, châssis en aluminium.",
    couleurs: [
      { nom: "Orange cosmique", hex: "#E8773D" },
      { nom: "Bleu intense", hex: "#2D3B59" },
      { nom: "Argent", hex: "#E2E3E4" },
    ],
    capacites: ["256 Go", "512 Go", "1 To", "2 To"],
    prix: null,
  },
  {
    id: "iphone-17-pro",
    nom: "iPhone 17 Pro",
    marque: "Apple",
    categorie: "iphone",
    visuel: "plateau",
    description: "Écran 6,3 pouces, puce A19 Pro, trois caméras 48 Mpx.",
    couleurs: [
      { nom: "Bleu intense", hex: "#2D3B59" },
      { nom: "Orange cosmique", hex: "#E8773D" },
      { nom: "Argent", hex: "#E2E3E4" },
    ],
    capacites: ["256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "iphone-air",
    nom: "iPhone Air",
    marque: "Apple",
    categorie: "iphone",
    visuel: "air",
    description: "L'iPhone le plus fin : 5,6 mm d'épaisseur, écran 6,5 pouces, puce A19 Pro.",
    couleurs: [
      { nom: "Bleu ciel", hex: "#C6DAEC" },
      { nom: "Or pâle", hex: "#EDE2C6" },
      { nom: "Blanc nuage", hex: "#F2F1EC" },
      { nom: "Noir sidéral", hex: "#2B2C30" },
    ],
    capacites: ["256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "iphone-17",
    nom: "iPhone 17",
    marque: "Apple",
    categorie: "iphone",
    visuel: "double",
    description: "Écran 6,3 pouces ProMotion 120 Hz, puce A19, 256 Go dès le premier modèle.",
    couleurs: [
      { nom: "Lavande", hex: "#CDC1E5" },
      { nom: "Sauge", hex: "#BAC8AB" },
      { nom: "Bleu brume", hex: "#ADC3D8" },
      { nom: "Blanc", hex: "#F1F1EF" },
      { nom: "Noir", hex: "#2C2D30" },
    ],
    capacites: ["256 Go", "512 Go"],
    prix: null,
  },
  {
    // Vu dans la vidéo TikTok de la boutique (déballage)
    id: "iphone-16-pro-max",
    nom: "iPhone 16 Pro Max",
    marque: "Apple",
    categorie: "iphone",
    visuel: "pro",
    video: "https://www.tiktok.com/@menzah.store/video/7500708952628317495",
    description: "Écran 6,9 pouces, puce A18 Pro, design en titane, bouton Commande de l'appareil photo.",
    couleurs: [
      { nom: "Titane désert", hex: "#C2A68E" },
      { nom: "Titane naturel", hex: "#C3BDB3" },
      { nom: "Titane blanc", hex: "#EDEBE6" },
      { nom: "Titane noir", hex: "#3C3C3E" },
    ],
    capacites: ["256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "iphone-16-pro",
    nom: "iPhone 16 Pro",
    marque: "Apple",
    categorie: "iphone",
    visuel: "pro",
    description: "Écran 6,3 pouces, puce A18 Pro, design en titane.",
    couleurs: [
      { nom: "Titane naturel", hex: "#C3BDB3" },
      { nom: "Titane désert", hex: "#C2A68E" },
      { nom: "Titane blanc", hex: "#EDEBE6" },
      { nom: "Titane noir", hex: "#3C3C3E" },
    ],
    capacites: ["128 Go", "256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "iphone-16",
    nom: "iPhone 16",
    marque: "Apple",
    categorie: "iphone",
    visuel: "double",
    description: "Écran 6,1 pouces, puce A18, bouton Action et Commande de l'appareil photo.",
    couleurs: [
      { nom: "Outremer", hex: "#7E90E6" },
      { nom: "Sarcelle", hex: "#9FCAC5" },
      { nom: "Rose", hex: "#EEA6CC" },
      { nom: "Blanc", hex: "#F2F2F0" },
      { nom: "Noir", hex: "#2D2E31" },
    ],
    capacites: ["128 Go", "256 Go", "512 Go"],
    prix: null,
  },
  {
    id: "iphone-15-pro-max",
    nom: "iPhone 15 Pro Max",
    marque: "Apple",
    categorie: "iphone",
    visuel: "pro",
    description: "Écran 6,7 pouces, puce A17 Pro, design en titane, zoom optique 5x.",
    couleurs: [
      { nom: "Titane naturel", hex: "#BCB6AB" },
      { nom: "Titane bleu", hex: "#404A5B" },
      { nom: "Titane blanc", hex: "#ECEAE5" },
      { nom: "Titane noir", hex: "#3B3B3D" },
    ],
    capacites: ["256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "iphone-15",
    nom: "iPhone 15",
    marque: "Apple",
    categorie: "iphone",
    visuel: "diagonale",
    description: "Écran 6,1 pouces, Dynamic Island, caméra 48 Mpx, port USB-C.",
    couleurs: [
      { nom: "Rose", hex: "#F0CCD3" },
      { nom: "Jaune", hex: "#EFE5B4" },
      { nom: "Vert", hex: "#CCDEC9" },
      { nom: "Bleu", hex: "#C6D5E2" },
      { nom: "Noir", hex: "#3B3D40" },
    ],
    capacites: ["128 Go", "256 Go", "512 Go"],
    prix: null,
  },
  {
    // Présenté par la boutique sur TikTok (version 12 Go / 512 Go)
    id: "oppo-find-x9-pro",
    nom: "OPPO Find X9 Pro",
    marque: "OPPO",
    categorie: "android",
    visuel: "oppo",
    video: "https://www.tiktok.com/@menzah.store",
    description: "Caméras Hasselblad avec téléobjectif 200 Mpx, batterie de 7 500 mAh.",
    couleurs: [
      { nom: "Titane anthracite", hex: "#4A4C51" },
      { nom: "Blanc soie", hex: "#EEEDE8" },
    ],
    capacites: ["12 Go / 512 Go"],
    prix: null,
  },
  {
    id: "galaxy-s26-ultra",
    nom: "Galaxy S26 Ultra",
    marque: "Samsung",
    categorie: "android",
    visuel: "ultra",
    description: "Écran 6,9 pouces, S Pen intégré, capteur photo 200 Mpx.",
    couleurs: [
      { nom: "Violet cobalt", hex: "#5B4F8E" },
      { nom: "Bleu ciel", hex: "#BCD2E6" },
      { nom: "Noir", hex: "#2B2C2F" },
      { nom: "Blanc", hex: "#EFEFED" },
    ],
    capacites: ["256 Go", "512 Go", "1 To"],
    prix: null,
  },
  {
    id: "airpods-pro-3",
    nom: "AirPods Pro 3",
    marque: "Apple",
    categorie: "accessoires",
    visuel: "airpods",
    description: "Réduction de bruit active, audio spatial, suivi de la fréquence cardiaque.",
    couleurs: [{ nom: "Blanc", hex: "#F3F3F1" }],
    capacites: [],
    prix: null,
  },
  {
    id: "chargeur-usb-c-20w",
    nom: "Chargeur USB-C 20 W",
    marque: "Apple",
    categorie: "accessoires",
    visuel: "chargeur",
    description: "Adaptateur secteur pour la charge rapide de votre iPhone.",
    couleurs: [{ nom: "Blanc", hex: "#F3F3F1" }],
    capacites: [],
    prix: null,
  },
  {
    id: "coques-protections",
    nom: "Coques et protections",
    marque: "iPhone et Android",
    categorie: "accessoires",
    visuel: "coque",
    description: "Coques, verres trempés et protections caméra pour les modèles récents.",
    couleurs: [
      { nom: "Transparente", hex: "#DCE5EC" },
      { nom: "Noire", hex: "#2B2C2F" },
    ],
    capacites: [],
    prix: null,
  },
];

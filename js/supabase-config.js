/*
 * Connexion à la base de données Supabase de Menzah Store.
 * La clé "publishable" est faite pour être publique : les règles de sécurité
 * (RLS) de la base empêchent les visiteurs de modifier quoi que ce soit.
 * Laisser "url" vide pour faire fonctionner le site sans base de données
 * (il utilise alors js/config.js et js/produits.js, et les commandes passent par WhatsApp).
 */
window.MENZAH_SUPABASE = {
  url: "https://jxthopvlrwmbpmqbhkmy.supabase.co",
  cle: "sb_publishable_1OL2KvcnaFn2ziCncP5Olg_23TghGds",
  bucket: "menzah",
};

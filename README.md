# Menzah Store : site vitrine

Site de la boutique **Menzah Store** (téléphones, Canastel, Oran).
Il reprend les informations des comptes [TikTok @menzah.store](https://www.tiktok.com/@menzah.store) et
[Instagram @menzah_store](https://www.instagram.com/menzah_store/).

![Aperçu du site](images/apercu.jpg)

## Ce que contient le site

- **Accueil** : slogan de la boutique, bouton WhatsApp, chiffres TikTok (55,7 k abonnés, 283,6 k j'aime).
- **Catalogue** : 15 produits avec filtres (iPhone, Android, accessoires) et recherche.
  Un clic sur un produit ouvre sa fiche : choix de la couleur et de la capacité, puis bouton
  **Commander** qui ouvre WhatsApp avec un message déjà rempli
  (ex. « iPhone 17 Pro Max, Couleur : Bleu intense, Capacité : 512 Go »).
  Chaque fiche a son propre lien à partager (bouton **Partager**).
- **Vidéos TikTok** et **publications Instagram** de la boutique, affichées directement sur le site.
- **Boutique** : adresse à Canastel, carte Google Maps, bouton Itinéraire, numéros cliquables.
- Fonctionne sur téléphone et ordinateur, en mode clair et sombre.

## Modifier le site (sans être développeur)

Tout se modifie dans **deux fichiers**, avec le Bloc-notes ou directement sur GitHub (icône crayon) :

| Fichier | Contenu |
|---|---|
| `js/config.js` | numéros, WhatsApp, adresse, lien Google Maps, horaires, chiffres TikTok, vidéos TikTok, publications Instagram |
| `js/produits.js` | le catalogue : produits, couleurs, capacités, prix, badges |

### Mettre un prix

Dans `js/produits.js`, remplacez `prix: null` par le prix en dinars, sans espace :

```js
prix: 215000,          // affiche « 215 000 DA »
prixBarre: 230000,     // facultatif : ancien prix barré pour une promo
```

Avec `prix: null`, le site affiche « Prix sur demande ».

### Ajouter un produit

Copiez un bloc `{ ... },` existant dans `js/produits.js`, collez-le et changez les valeurs
(`id` doit être unique, sans espace ni accent, ex. `"iphone-13-occasion"`).
Pour le retirer, supprimez simplement son bloc.

### Ajouter les vraies photos des produits

1. Mettez la photo dans le dossier `images/produits/` (ex. `iphone-16-pro-max.jpg`).
2. Dans le produit concerné, ajoutez : `image: "images/produits/iphone-16-pro-max.jpg",`

Sans photo, le site affiche un dessin du téléphone dans la couleur choisie.

### Ajouter une vidéo TikTok ou une publication Instagram

Dans `js/config.js` :

- **TikTok** : dans `videosTiktok`, ajoutez `{ id: "7500708952628317495", titre: "Mon titre" },`
  (l'identifiant est le long nombre à la fin du lien de la vidéo).
- **Instagram** : dans `postsInstagram`, collez le lien de la publication ou du reel.

## Mettre le site en ligne gratuitement (GitHub Pages)

1. Sur GitHub, ouvrez le dépôt, puis **Settings** > **Pages**.
2. Dans **Branch**, choisissez la branche du site et le dossier `/ (root)`, puis **Save**.
3. Après une ou deux minutes, le site est en ligne à l'adresse
   `https://brkbamustapha-ui.github.io/menzah-phone-/`.
4. Mettez ce lien dans la bio TikTok et Instagram.

Si vous utilisez une autre adresse (nom de domaine, Netlify...), remplacez
`https://brkbamustapha-ui.github.io/menzah-phone-/` dans `index.html` (balises `og:url` et `og:image`)
pour que l'aperçu du lien s'affiche bien sur WhatsApp et Facebook.

Pour tester sur votre ordinateur : ouvrez `index.html` dans le navigateur.

## À vérifier avant la mise en ligne

- **Numéro WhatsApp** : le site utilise le 07 77 31 93 32. Si c'est l'autre numéro, changez `whatsapp` dans `js/config.js`.
- **Catalogue** : seuls l'iPhone 16 Pro Max et l'OPPO Find X9 Pro (12/512 Go) ont été repérés dans vos vidéos TikTok.
  Les autres produits sont une base à adapter : retirez ceux que vous ne vendez pas et ajoutez vos prix.
- **Carte** : si le repère Google Maps n'est pas exactement sur la boutique, mettez les coordonnées GPS
  dans `carteRecherche` (ex. `"35.7499,-0.5637"`). Le bouton Itinéraire utilise déjà votre lien Google Maps.
- **Horaires** : à ajouter dans `horaires` (`js/config.js`).

## Fichiers

```
index.html            page du site
css/style.css         apparence
js/config.js          informations de la boutique (à modifier)
js/produits.js        catalogue (à modifier)
js/visuels.js         dessins des téléphones
js/app.js             fonctionnement (catalogue, fiche produit, WhatsApp, vidéos)
images/               logo, icône, image d'aperçu, photos des produits
fonts/                police Geist
```

Police [Geist](https://github.com/vercel/geist-font) (licence SIL OFL 1.1) et icônes
[Phosphor](https://phosphoricons.com) (licence MIT) : voir `LICENCES.md`.
Les marques citées (Apple, iPhone, OPPO, Samsung...) appartiennent à leurs propriétaires respectifs.

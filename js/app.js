/*
 * Menzah Store : fonctionnement du site.
 * Les données (produits, réglages) viennent de la base Supabase, gérée depuis /admin.
 * Si la base ne répond pas, le site utilise js/config.js et js/produits.js,
 * et les commandes passent par WhatsApp.
 */
(function () {
  "use strict";

  var CONFIG_LOCALE = window.MENZAH_CONFIG || {};
  var PRODUITS_LOCAUX = window.MENZAH_PRODUITS || [];
  var SB = window.MENZAH_SUPABASE || {};
  var V = window.MenzahVisuels;
  var M = window.MenzahMarque;

  var C = CONFIG_LOCALE;
  var PRODUITS = PRODUITS_LOCAUX;
  var enLigne = false;

  var reduit = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var pointeurFin = !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);

  // Téléphones mis en scène sur l'accueil : [identifiant du produit, numéro du coloris]
  var VITRINE = [
    ["iphone-16-pro-max", 0],
    ["iphone-17-pro-max", 0],
    ["oppo-find-x9-pro", 0],
  ];

  var CATEGORIES = [
    { id: "tout", nom: "Tout" },
    { id: "iphone", nom: "iPhone" },
    { id: "android", nom: "Android" },
    { id: "accessoires", nom: "Accessoires" },
  ];

  var ESPACE = " ";

  /* ---------- Outils ---------- */

  function $(sel, racine) { return (racine || document).querySelector(sel); }
  function $$(sel, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(sel)); }

  function echapper(texte) {
    return String(texte == null ? "" : texte).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function sansAccents(texte) {
    return String(texte || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  function icone(nom) {
    return '<svg class="icone" aria-hidden="true"><use href="#i-' + nom + '"/></svg>';
  }

  function memoire(cle, valeur) {
    try {
      if (arguments.length > 1) localStorage.setItem(cle, JSON.stringify(valeur));
      else return JSON.parse(localStorage.getItem(cle) || "null");
    } catch (e) { return null; }
  }

  function numeroWhatsapp() {
    if (C.whatsapp) return String(C.whatsapp).replace(/\D/g, "");
    var tel = (C.telephones || [])[0] || "";
    return tel.replace(/\D/g, "").replace(/^0/, "213");
  }

  function lienWhatsapp(message) {
    return "https://wa.me/" + numeroWhatsapp() + (message ? "?text=" + encodeURIComponent(message) : "");
  }

  function lienTel(numero) {
    var chiffres = String(numero).replace(/\D/g, "");
    if (chiffres.charAt(0) === "0") chiffres = "213" + chiffres.slice(1);
    return "tel:+" + chiffres;
  }

  var formatDinars = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  function formatPrix(montant) {
    return formatDinars.format(montant) + ESPACE + "DA";
  }

  function trouverProduit(id) {
    for (var i = 0; i < PRODUITS.length; i++) if (PRODUITS[i].id === id) return PRODUITS[i];
    return null;
  }

  function couleurPrincipale(p) {
    return (p.couleurs && p.couleurs[0] && p.couleurs[0].hex) || "#9AA0A8";
  }

  function estAccessoire(p) {
    return p.visuel === "airpods" || p.visuel === "chargeur";
  }

  function visuelProduit(p, hex, alt) {
    if (p.image) {
      return '<img class="photo" src="' + echapper(p.image) + '" alt="' + echapper(alt ? p.nom : "") + '" loading="lazy" decoding="async">';
    }
    return V.rendre(p.visuel, hex || couleurPrincipale(p), estAccessoire(p) ? "visuel carre" : "visuel");
  }

  function messageProduit(p, couleur, capacite) {
    var lignes = ["Bonjour Menzah Store, je suis intéressé(e) par" + ESPACE + ": " + p.nom];
    if (couleur) lignes.push("Couleur" + ESPACE + ": " + couleur);
    if (capacite) lignes.push("Capacité" + ESPACE + ": " + capacite);
    lignes.push("Est-il disponible et à quel prix" + ESPACE + "?");
    return lignes.join("\n");
  }

  function texteCapacites(p) {
    var c = p.capacites || [];
    if (c.length > 1) return c[0] + " à " + c[c.length - 1];
    if (c.length === 1) return c[0];
    return p.marque || "";
  }

  function aUnPrix(p) {
    return typeof p.prix === "number" && p.prix > 0;
  }

  function prixHtml(p, classe) {
    if (aUnPrix(p)) {
      var barre = typeof p.prixBarre === "number" && p.prixBarre > p.prix ? " <s>" + formatPrix(p.prixBarre) + "</s>" : "";
      return '<p class="' + classe + '">' + formatPrix(p.prix) + barre + "</p>";
    }
    return '<p class="' + classe + ' prix-demande">Prix sur demande</p>';
  }

  function reseauDuLien(lien) {
    if (/instagram\.com/.test(lien || "")) return { nom: "Instagram", icone: "instagram" };
    return { nom: "TikTok", icone: "tiktok" };
  }

  /* ---------- Données (Supabase) ---------- */

  function fusion(base, ajout) {
    if (!ajout || typeof ajout !== "object") return base;
    var res = {};
    Object.keys(base).forEach(function (k) { res[k] = base[k]; });
    Object.keys(ajout).forEach(function (k) {
      var v = ajout[k];
      if (v === null || v === undefined) return;
      if (typeof v === "object" && !Array.isArray(v) && typeof res[k] === "object" && res[k] && !Array.isArray(res[k])) {
        res[k] = fusion(res[k], v);
      } else {
        res[k] = v;
      }
    });
    return res;
  }

  function convertirProduit(l) {
    return {
      id: l.id,
      nom: l.nom,
      marque: l.marque || "",
      categorie: l.categorie,
      visuel: l.visuel,
      image: l.image_url || null,
      description: l.description || "",
      couleurs: Array.isArray(l.couleurs) ? l.couleurs : [],
      capacites: Array.isArray(l.capacites) ? l.capacites : [],
      prix: typeof l.prix === "number" ? l.prix : null,
      prixBarre: typeof l.prix_barre === "number" ? l.prix_barre : null,
      badge: l.badge || null,
      video: l.video || null,
      enStock: l.en_stock !== false,
    };
  }

  function requete(chemin, options) {
    var entetes = { apikey: SB.cle, Accept: "application/json" };
    if (options && options.body) entetes["Content-Type"] = "application/json";
    var ctrl = window.AbortController ? new AbortController() : null;
    var minuteur = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    return fetch(SB.url + chemin, {
      method: (options && options.method) || "GET",
      headers: entetes,
      body: options && options.body ? JSON.stringify(options.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (rep) {
      clearTimeout(minuteur);
      return rep.json().catch(function () { return null; }).then(function (corps) {
        if (!rep.ok) {
          var err = new Error((corps && corps.message) || "Erreur " + rep.status);
          err.code = corps && corps.code;
          throw err;
        }
        return corps;
      });
    });
  }

  function chargerDonnees() {
    if (!SB.url || !SB.cle || !window.fetch) return Promise.reject(new Error("hors ligne"));
    return Promise.all([
      requete("/rest/v1/menzah_produits?select=*&order=ordre.asc,created_at.asc"),
      requete("/rest/v1/menzah_reglages?select=donnees&id=eq.1"),
    ]).then(function (r) {
      return {
        produits: (r[0] || []).map(convertirProduit),
        reglages: r[1] && r[1][0] ? r[1][0].donnees : null,
      };
    });
  }

  /* ---------- Informations de la boutique ---------- */

  function appliquerConfig() {
    var reseaux = C.reseaux || {};
    var adresse = C.adresse || {};
    var telephones = C.telephones || [];

    $$("[data-wa]").forEach(function (a) { a.href = lienWhatsapp(C.messageWhatsapp); });

    Object.keys(reseaux).forEach(function (nom) {
      $$('[data-lien="' + nom + '"]').forEach(function (a) { if (reseaux[nom].lien) a.href = reseaux[nom].lien; });
      $$('[data-pseudo="' + nom + '"]').forEach(function (el) { if (reseaux[nom].pseudo) el.textContent = reseaux[nom].pseudo; });
    });

    var stats = C.statistiques || {};
    $$("[data-stat]").forEach(function (el) {
      var valeur = stats[el.getAttribute("data-stat")];
      if (valeur) el.textContent = valeur;
    });

    var texteAdresse = [adresse.ligne, adresse.ville].filter(Boolean).join(", ");
    if (texteAdresse) $$("[data-adresse]").forEach(function (el) { el.textContent = texteAdresse; });
    if (C.googleMaps) $$("[data-maps]").forEach(function (a) { a.href = C.googleMaps; });
    if (C.slogan) $$("[data-slogan]").forEach(function (el) { el.textContent = C.slogan; });
    if (C.bienvenue) $$("[data-bienvenue]").forEach(function (el) { el.textContent = C.bienvenue; });

    if (telephones.length) {
      var liens = telephones.map(function (t) {
        return '<a href="' + lienTel(t) + '">' + echapper(t) + "</a>";
      });
      $$("[data-telephones]").forEach(function (el) { el.innerHTML = liens.join(""); });
      $$("[data-pied-tel]").forEach(function (el) {
        el.innerHTML = liens.map(function (l) { return "<li>" + l + "</li>"; }).join("");
      });
      $$("[data-appel]").forEach(function (a) { a.href = lienTel(telephones[0]); });
    }

    var horaires = C.horaires || [];
    var blocHoraires = $("[data-horaires]");
    if (blocHoraires) {
      blocHoraires.hidden = !horaires.length;
      $("[data-horaires-texte]").innerHTML = horaires.map(function (h) {
        return echapper(h.jours) + ESPACE + ": " + echapper(h.heures);
      }).join("<br>");
    }

    var carte = $("[data-carte]");
    if (carte && C.carteRecherche) {
      var src = "https://www.google.com/maps?q=" + encodeURIComponent(C.carteRecherche) + "&z=16&hl=fr&output=embed";
      if (carte.getAttribute("src") !== src) carte.src = src;
    }

    var reception = $("[data-reception]");
    if (reception) reception.hidden = !C.livraison;

    $$("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Accueil ---------- */

  function rendreVitrine() {
    var scene = $("[data-scene]");
    if (!scene) return;
    var secours = [["pro", "#C2A68E"], ["plateau", "#E8773D"], ["oppo", "#4A4C51"]];
    scene.innerHTML = VITRINE.map(function (choix, i) {
      var p = trouverProduit(choix[0]);
      var visuel = p && !estAccessoire(p) ? p.visuel : secours[i][0];
      var hex = p && p.couleurs[choix[1]] ? p.couleurs[choix[1]].hex : secours[i][1];
      return '<div class="tel tel-' + (i + 1) + '"><div class="tel-anim">' + V.rendre(visuel, hex) + "</div></div>";
    }).join("");
  }

  function initParallaxe() {
    var zone = $(".hero-visuel");
    var scene = $("[data-scene]");
    if (!zone || !scene || reduit || !pointeurFin) return;
    var cible = { x: 0, y: 0 };
    var prevu = false;
    zone.addEventListener("pointermove", function (e) {
      var r = zone.getBoundingClientRect();
      cible.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      cible.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (prevu) return;
      prevu = true;
      requestAnimationFrame(function () {
        prevu = false;
        scene.style.setProperty("--px", cible.x.toFixed(3));
        scene.style.setProperty("--py", cible.y.toFixed(3));
      });
    });
    zone.addEventListener("pointerleave", function () {
      scene.style.setProperty("--px", "0");
      scene.style.setProperty("--py", "0");
    });
  }

  /* ---------- Catalogue ---------- */

  var etat = { categorie: "tout", terme: "" };

  function rendreSquelette() {
    var grille = $("[data-grille]");
    if (!grille) return;
    var carte = '<div class="produit squelette" aria-hidden="true"><div class="produit-visuel"></div>' +
      '<div class="produit-corps"><span class="ligne l1"></span><span class="ligne l2"></span><span class="ligne l3"></span></div></div>';
    grille.innerHTML = new Array(8).join(carte) + carte;
    grille.setAttribute("aria-busy", "true");
  }

  function carteProduit(p) {
    var etiquettes = "";
    if (p.badge) etiquettes += '<span class="etiquette etiquette-nouveau">' + icone("sparkle") + echapper(p.badge) + "</span>";
    if (p.enStock === false) etiquettes += '<span class="etiquette">' + icone("clock") + "Sur commande</span>";
    if (p.video) {
      var r = reseauDuLien(p.video);
      etiquettes += '<span class="etiquette">' + icone(r.icone) + "Vu sur " + r.nom + "</span>";
    }

    var couleurs = p.couleurs || [];
    var pastilles = couleurs.slice(0, 5).map(function (c) {
      return '<span class="pastille" style="--c:' + echapper(c.hex) + '"></span>';
    }).join("");
    if (couleurs.length > 5) pastilles += "<small>+" + (couleurs.length - 5) + "</small>";
    var nomsCouleurs = couleurs.map(function (c) { return c.nom; }).join(", ");

    return '<article class="produit" style="--teinte:' + echapper(couleurPrincipale(p)) + '" data-id="' + echapper(p.id) + '">' +
      '<div class="produit-visuel"><div class="produit-anim">' + visuelProduit(p, null, true) + "</div></div>" +
      '<div class="produit-corps">' +
      '<div class="etiquettes">' + etiquettes + "</div>" +
      '<h3 class="produit-nom"><button class="produit-ouvrir" type="button" aria-haspopup="dialog">' + echapper(p.nom) + "</button></h3>" +
      '<p class="produit-spec">' + echapper(texteCapacites(p)) + "</p>" +
      (couleurs.length > 1
        ? '<div class="pastilles" role="img" aria-label="' + couleurs.length + " coloris" + ESPACE + ": " + echapper(nomsCouleurs) + '">' + pastilles + "</div>"
        : "") +
      '<div class="produit-bas">' + prixHtml(p, "prix") +
      '<button class="btn btn-wa btn-commander" type="button" data-commander aria-label="Commander : ' + echapper(p.nom) + '">' +
      icone("bag") + "Commander</button>" +
      "</div></div></article>";
  }

  function texteRecherche(p) {
    return sansAccents([
      p.nom, p.marque, p.categorie, p.description,
      (p.couleurs || []).map(function (c) { return c.nom; }).join(" "),
      (p.capacites || []).join(" "),
    ].join(" "));
  }

  var observateurCartes = null;

  function animerEntree(grille) {
    if (reduit || !window.IntersectionObserver) return;
    grille.classList.add("anime");
    observateurCartes = new IntersectionObserver(function (entrees) {
      var lot = entrees.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      lot.forEach(function (carte, i) {
        carte.style.setProperty("--delai", Math.min(i, 6) * 70 + "ms");
        carte.classList.add("visible");
        observateurCartes.unobserve(carte);
      });
    }, { rootMargin: "0px 0px -5% 0px", threshold: 0.1 });
    $$(".produit", grille).forEach(function (c) { observateurCartes.observe(c); });
  }

  function initInclinaison(grille) {
    if (reduit || !pointeurFin) return;
    var actif = null;
    var dernier = null;
    var prevu = false;
    function remettre(zone) {
      zone.style.removeProperty("--rx");
      zone.style.removeProperty("--ry");
    }
    grille.addEventListener("pointermove", function (e) {
      var zone = e.target.closest ? e.target.closest(".produit-visuel") : null;
      if (actif && actif !== zone) remettre(actif);
      actif = zone;
      if (!zone) return;
      dernier = e;
      if (prevu) return;
      prevu = true;
      requestAnimationFrame(function () {
        prevu = false;
        if (!actif) return;
        var r = actif.getBoundingClientRect();
        var x = (dernier.clientX - r.left) / r.width - 0.5;
        var y = (dernier.clientY - r.top) / r.height - 0.5;
        actif.style.setProperty("--ry", (x * 18).toFixed(2) + "deg");
        actif.style.setProperty("--rx", (-y * 14).toFixed(2) + "deg");
      });
    });
    grille.addEventListener("pointerleave", function () {
      if (actif) remettre(actif);
      actif = null;
    });
  }

  function rendreCatalogue() {
    var grille = $("[data-grille]");
    var filtres = $("[data-filtres]");
    if (!grille || !filtres) return;

    grille.innerHTML = PRODUITS.map(carteProduit).join("");
    grille.removeAttribute("aria-busy");

    var index = {};
    PRODUITS.forEach(function (p) { index[p.id] = texteRecherche(p); });

    var presentes = CATEGORIES.filter(function (cat) {
      return cat.id === "tout" || PRODUITS.some(function (p) { return p.categorie === cat.id; });
    });
    filtres.innerHTML = presentes.map(function (cat) {
      var total = cat.id === "tout" ? PRODUITS.length : PRODUITS.filter(function (p) { return p.categorie === cat.id; }).length;
      return '<button class="filtre" type="button" data-categorie="' + cat.id + '" aria-pressed="' + (cat.id === etat.categorie) + '">' +
        cat.nom + "<small>" + total + "</small></button>";
    }).join("");

    function appliquer(animer) {
      var terme = sansAccents(etat.terme);
      var visibles = 0;
      $$(".produit", grille).forEach(function (carte) {
        var p = trouverProduit(carte.getAttribute("data-id"));
        var ok = (etat.categorie === "tout" || p.categorie === etat.categorie) &&
          (!terme || terme.split(/\s+/).every(function (mot) { return index[p.id].indexOf(mot) !== -1; }));
        carte.hidden = !ok;
        if (ok) {
          if (animer && grille.classList.contains("anime")) {
            carte.classList.remove("visible");
            void carte.offsetWidth;
            carte.style.setProperty("--delai", Math.min(visibles, 8) * 55 + "ms");
            carte.classList.add("visible");
            if (observateurCartes) observateurCartes.unobserve(carte);
          }
          visibles++;
        }
      });

      var cat = CATEGORIES.filter(function (c) { return c.id === etat.categorie; })[0];
      var texte = visibles + " produit" + (visibles > 1 ? "s" : "");
      if (etat.categorie !== "tout") texte += " dans " + cat.nom;
      if (etat.terme.trim()) texte += " pour «" + ESPACE + etat.terme.trim() + ESPACE + "»";
      $("[data-compteur]").textContent = texte;

      var vide = $("[data-vide]");
      vide.hidden = visibles > 0;
      if (!visibles) {
        var demande = etat.terme.trim() || cat.nom;
        $("[data-vide-terme]").textContent = demande;
        $("[data-vide-wa]").href = lienWhatsapp("Bonjour Menzah Store, avez-vous ce modèle" + ESPACE + ": " + demande + ESPACE + "?");
      }
    }

    filtres.addEventListener("click", function (e) {
      var bouton = e.target.closest("[data-categorie]");
      if (!bouton) return;
      etat.categorie = bouton.getAttribute("data-categorie");
      $$(".filtre", filtres).forEach(function (b) { b.setAttribute("aria-pressed", String(b === bouton)); });
      appliquer(true);
    });

    var champ = $("[data-recherche]");
    champ.addEventListener("input", function () {
      etat.terme = champ.value;
      appliquer(false);
    });

    grille.addEventListener("click", function (e) {
      var carte = e.target.closest(".produit");
      if (!carte || carte.classList.contains("squelette")) return;
      ouvrirFiche(trouverProduit(carte.getAttribute("data-id")), $(".produit-ouvrir", carte));
    });

    animerEntree(grille);
    initInclinaison(grille);
    appliquer(false);
  }

  /* ---------- Fiche produit et commande ---------- */

  var fiche = $("[data-fiche]");
  var contenu = fiche ? $(".fiche-contenu", fiche) : null;
  var ficheCourante = null;
  var declencheur = null;

  function selection() {
    var couleur = $('input[name="fiche-couleur"]:checked', fiche);
    var capacite = $('input[name="fiche-capacite"]:checked', fiche);
    return {
      couleur: couleur ? ficheCourante.couleurs[+couleur.value] : null,
      capacite: capacite ? capacite.value : null,
    };
  }

  function nomCouleur(choix) {
    return choix.couleur && ficheCourante.couleurs.length > 1 ? choix.couleur.nom : null;
  }

  function majVisuel(hex) {
    var zone = $("[data-fiche-visuel-zone]", fiche);
    zone.style.setProperty("--teinte", hex);
    var tel = $("[data-fiche-visuel]", fiche);
    tel.innerHTML = visuelProduit(ficheCourante, hex, true);
    if (!reduit) {
      tel.classList.remove("change");
      void tel.offsetWidth;
      tel.classList.add("change");
    }
  }

  function majFiche(visuelAussi) {
    var p = ficheCourante;
    var choix = selection();
    var hex = choix.couleur ? choix.couleur.hex : couleurPrincipale(p);
    if (visuelAussi !== false) majVisuel(hex);
    $("[data-fiche-couleur-nom]", fiche).textContent = choix.couleur ? choix.couleur.nom : "";
    var message = lienWhatsapp(messageProduit(p, nomCouleur(choix), choix.capacite));
    $("[data-fiche-commander]", fiche).href = message;
    $("[data-fiche-wa]", fiche).href = message;
    $("[data-form-wa]", fiche).href = message;
  }

  function allerEtape(nom, sens) {
    contenu.setAttribute("data-etape-active", nom);
    $$(".etape", fiche).forEach(function (etape) {
      var active = etape.getAttribute("data-etape") === nom;
      etape.hidden = !active;
      etape.classList.remove("entre", "entre-retour", "active");
      if (active) {
        void etape.offsetWidth;
        etape.classList.add(sens === "retour" ? "entre-retour" : "entre", "active");
      }
    });
    contenu.scrollTop = 0;
    $(".fiche-infos", fiche).scrollTop = 0;
  }

  function ouvrirFiche(p, depuis) {
    if (!p) return;
    if (!fiche || typeof fiche.showModal !== "function") {
      window.open(lienWhatsapp(messageProduit(p)), "_blank", "noopener");
      return;
    }
    ficheCourante = p;
    declencheur = depuis || document.activeElement;

    $("[data-fiche-marque]", fiche).textContent = p.marque || "";
    $("[data-fiche-nom]", fiche).textContent = p.nom;
    $("[data-fiche-desc]", fiche).textContent = p.description || "";
    $("[data-fiche-stock]", fiche).hidden = p.enStock !== false;

    var couleurs = p.couleurs || [];
    $("[data-fiche-couleurs]", fiche).hidden = couleurs.length < 2;
    $("[data-fiche-couleurs-liste]", fiche).innerHTML = couleurs.map(function (c, i) {
      var id = "fc-" + i;
      return '<input type="radio" name="fiche-couleur" id="' + id + '" value="' + i + '"' + (i === 0 ? " checked" : "") + ">" +
        '<label class="pastille-choix" for="' + id + '" style="--c:' + echapper(c.hex) + '" title="' + echapper(c.nom) + '">' +
        '<span class="sr-only">' + echapper(c.nom) + "</span></label>";
    }).join("");

    var capacites = p.capacites || [];
    $("[data-fiche-capacites]", fiche).hidden = capacites.length < 2;
    $("[data-fiche-capacites-liste]", fiche).innerHTML = capacites.map(function (c, i) {
      var id = "fs-" + i;
      return '<input type="radio" name="fiche-capacite" id="' + id + '" value="' + echapper(c) + '"' + (i === 0 ? " checked" : "") + ">" +
        '<label class="capacite-choix" for="' + id + '">' + echapper(c) + "</label>";
    }).join("");

    var zonePrix = $("[data-fiche-prix]", fiche);
    zonePrix.outerHTML = prixHtml(p, "fiche-prix").replace("<p ", "<p data-fiche-prix ");

    var video = $("[data-fiche-video]", fiche);
    if (p.video) {
      var r = reseauDuLien(p.video);
      video.href = p.video;
      video.innerHTML = icone(r.icone) + (/\/video\/|\/reel\/|\/p\//.test(p.video) ? "Voir la vidéo" : "Voir sur " + r.nom);
      video.hidden = false;
    } else {
      video.hidden = true;
    }
    $("[data-fiche-wa]", fiche).hidden = !enLigne;
    $("[data-fiche-commander-texte]", fiche).textContent = enLigne ? "Commander" : "Commander sur WhatsApp";
    $("[data-fiche-partager-texte]", fiche).textContent = "Partager";
    reinitialiserFormulaire();
    allerEtape("choix");

    majFiche();
    fiche.showModal();
    document.documentElement.style.overflow = "hidden";
    try { history.replaceState(null, "", "#produit=" + encodeURIComponent(p.id)); } catch (e) { /* hors ligne */ }
  }

  function reinitialiserFormulaire() {
    var form = $("[data-form-commande]", fiche);
    if (!form) return;
    $$(".champ-erreur", form).forEach(function (el) { el.textContent = ""; });
    $$("[aria-invalid]", form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
    var erreur = $("[data-form-erreur]", form);
    erreur.hidden = true;
    erreur.textContent = "";
    var client = memoire("menzah-client") || {};
    if (client.nom && !form.nom.value) form.nom.value = client.nom;
    if (client.telephone && !form.telephone.value) form.telephone.value = client.telephone;
    $("[data-champ-wilaya]", form).hidden = !(C.livraison && form.mode && form.mode.value === "livraison");
  }

  function normaliserTel(valeur) {
    var t = String(valeur || "").replace(/[^0-9+]/g, "").replace(/^00213/, "+213").replace(/^0/, "+213");
    return /^\+213([5-7][0-9]{8}|[1-4][0-9]{7})$/.test(t) ? t : null;
  }

  function afficherErreurChamp(form, nom, message) {
    var zone = $('[data-erreur="' + nom + '"]', form);
    if (zone) zone.textContent = message || "";
    var champ = form.elements[nom];
    if (champ) {
      if (message) champ.setAttribute("aria-invalid", "true");
      else champ.removeAttribute("aria-invalid");
    }
  }

  function envoyerCommande(form) {
    var choix = selection();
    var livraison = C.livraison && form.mode && form.mode.value === "livraison";
    var nom = form.nom.value.trim();
    var tel = normaliserTel(form.telephone.value);
    var ok = true;

    afficherErreurChamp(form, "nom", nom.length < 2 ? "Indiquez votre nom." : "");
    if (nom.length < 2) ok = false;
    afficherErreurChamp(form, "telephone", tel ? "" : "Numéro invalide. Exemple : 05 55 12 34 56");
    if (!tel) ok = false;
    if (livraison) {
      var w = form.wilaya.value.trim();
      afficherErreurChamp(form, "wilaya", w.length < 2 ? "Indiquez la wilaya et la commune." : "");
      if (w.length < 2) ok = false;
    }
    if (!ok) {
      var premier = $('[aria-invalid="true"]', form);
      if (premier) premier.focus();
      return;
    }

    var bouton = $("[data-envoyer]", form);
    var texte = $("[data-envoyer-texte]", form);
    var erreur = $("[data-form-erreur]", form);
    erreur.hidden = true;
    bouton.setAttribute("aria-busy", "true");
    bouton.disabled = true;
    texte.textContent = "Envoi en cours";

    var infos = {
      p_produit_id: ficheCourante.id,
      p_couleur: nomCouleur(choix),
      p_capacite: choix.capacite,
      p_nom: nom,
      p_telephone: form.telephone.value,
      p_mode: livraison ? "livraison" : "boutique",
      p_wilaya: livraison ? form.wilaya.value.trim() : null,
      p_note: form.note.value.trim() || null,
    };

    var envoi = form.site_web.value
      ? new Promise(function (r) { setTimeout(function () { r(0); }, 600); })
      : requete("/rest/v1/rpc/menzah_passer_commande", { method: "POST", body: infos });

    envoi.then(function (numero) {
      memoire("menzah-client", { nom: nom, telephone: form.telephone.value.trim() });
      commandeReussie(numero, infos, form.telephone.value.trim());
    }).catch(function (e) {
      var connus = /invalide|introuvable|Trop de commandes/i;
      erreur.innerHTML = echapper(connus.test(e.message) ? e.message + "." : "La commande n'a pas pu être envoyée. Vérifiez votre connexion ou commandez sur WhatsApp.");
      erreur.hidden = false;
    }).then(function () {
      bouton.removeAttribute("aria-busy");
      bouton.disabled = false;
      texte.textContent = "Confirmer la commande";
    });
  }

  function commandeReussie(numero, infos, telAffiche) {
    var p = ficheCourante;
    $("[data-ok-numero]", fiche).textContent = numero || "enregistrée";
    $("[data-ok-texte]", fiche).textContent =
      "La boutique vous contactera au " + telAffiche + " pour confirmer la disponibilité et le prix.";
    var lignes = [
      "Bonjour Menzah Store, je viens de passer la commande n° " + numero + " sur votre site.",
      "Produit" + ESPACE + ": " + p.nom,
    ];
    if (infos.p_couleur) lignes.push("Couleur" + ESPACE + ": " + infos.p_couleur);
    if (infos.p_capacite) lignes.push("Capacité" + ESPACE + ": " + infos.p_capacite);
    lignes.push("Nom" + ESPACE + ": " + infos.p_nom);
    $("[data-ok-wa]", fiche).href = lienWhatsapp(lignes.join("\n"));
    allerEtape("ok");
    celebrer();
    var titre = $("[data-ok-titre]", fiche);
    if (titre) titre.focus({ preventScroll: true });
  }

  function couleurAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22C35E";
  }

  function celebrer() {
    var zone = $("[data-fiche-visuel-zone]", fiche);
    zone.classList.remove("celebre");
    void zone.offsetWidth;
    zone.classList.add("celebre");
    if (reduit) return;
    var boite = $("[data-confettis]", fiche);
    var choix = selection();
    var teintes = [couleurAccent(), choix.couleur ? choix.couleur.hex : couleurPrincipale(ficheCourante), "#FFD166", "#F4F4F2"];
    boite.innerHTML = "";
    for (var i = 0; i < 40; i++) {
      var morceau = document.createElement("i");
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      var force = 110 + Math.random() * 170;
      morceau.style.setProperty("--x", Math.round(Math.cos(angle) * force) + "px");
      morceau.style.setProperty("--y", Math.round(Math.sin(angle) * force) + "px");
      morceau.style.setProperty("--r", Math.round((Math.random() - 0.5) * 1080) + "deg");
      morceau.style.setProperty("--c", teintes[i % teintes.length]);
      morceau.style.setProperty("--d", Math.round(Math.random() * 160) + "ms");
      morceau.className = ["", "rond", "bande"][i % 3];
      boite.appendChild(morceau);
    }
    setTimeout(function () { boite.innerHTML = ""; }, 2600);
  }

  function initFiche() {
    if (!fiche) return;

    fiche.addEventListener("change", function (e) {
      if (e.target.name === "fiche-couleur") majFiche(true);
      else if (e.target.name === "fiche-capacite") majFiche(false);
      else if (e.target.name === "mode") {
        var wilaya = $("[data-champ-wilaya]", fiche);
        wilaya.hidden = e.target.value !== "livraison";
        if (!wilaya.hidden) $("#cmd-wilaya").focus();
      }
    });

    $("[data-fiche-commander]", fiche).addEventListener("click", function (e) {
      if (!enLigne) return;
      e.preventDefault();
      var p = ficheCourante;
      var choix = selection();
      var morceaux = [p.nom, nomCouleur(choix), choix.capacite].filter(Boolean);
      $("[data-recap]", fiche).innerHTML = "<strong>" + echapper(morceaux.join(" · ")) + "</strong>" +
        "<span>" + (aUnPrix(p) ? formatPrix(p.prix) : "Prix confirmé par la boutique") + "</span>";
      allerEtape("form");
      setTimeout(function () {
        var form = $("[data-form-commande]", fiche);
        (form.nom.value ? form.telephone : form.nom).focus({ preventScroll: true });
      }, 80);
    });

    $("[data-retour]", fiche).addEventListener("click", function () { allerEtape("choix", "retour"); });
    $("[data-continuer]", fiche).addEventListener("click", function () { fiche.close(); });

    var formCommande = $("[data-form-commande]", fiche);
    formCommande.addEventListener("submit", function (e) {
      e.preventDefault();
      envoyerCommande(e.currentTarget);
    });
    // L'erreur d'un champ disparaît dès que le client le corrige.
    formCommande.addEventListener("input", function (e) {
      if (e.target.name && e.target.getAttribute("aria-invalid")) afficherErreurChamp(formCommande, e.target.name, "");
    });

    $("[data-fermer]", fiche).addEventListener("click", function () { fiche.close(); });

    fiche.addEventListener("click", function (e) {
      if (e.target === fiche) fiche.close();
    });

    fiche.addEventListener("close", function () {
      document.documentElement.style.overflow = "";
      $("[data-fiche-visuel-zone]", fiche).classList.remove("celebre");
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* hors ligne */ }
      if (declencheur && typeof declencheur.focus === "function") declencheur.focus({ preventScroll: true });
    });

    $("[data-fiche-partager]", fiche).addEventListener("click", function () {
      var p = ficheCourante;
      var url = location.href.split("#")[0] + "#produit=" + encodeURIComponent(p.id);
      var texte = $("[data-fiche-partager-texte]", fiche);
      if (navigator.share) {
        navigator.share({ title: p.nom + " | " + (C.nom || "Menzah Store"), url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          texte.textContent = "Lien copié";
          setTimeout(function () { texte.textContent = "Partager"; }, 2200);
        }, function () { window.prompt("Copiez ce lien", url); });
      } else {
        window.prompt("Copiez ce lien", url);
      }
    });
  }

  function ouvrirDepuisLien() {
    var lien = /^#produit=(.+)$/.exec(location.hash);
    if (!lien) return;
    var p = trouverProduit(decodeURIComponent(lien[1]));
    if (p) ouvrirFiche(p);
  }

  /* ---------- Vidéos TikTok et publications Instagram ---------- */

  var scripts = {};
  function chargerScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise(function (ok, erreur) {
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = ok;
        s.onerror = erreur;
        document.body.appendChild(s);
      });
    }
    return scripts[src];
  }

  function compteMedia(pseudo) {
    return '<span class="media-compte"><img class="logo-marque" src="images/favicon.svg" alt="" width="28" height="28">' + echapper(pseudo) + "</span>";
  }

  function idTiktok(v) {
    var m = /(\d{15,})/.exec(String(v.id || v.lien || ""));
    return m ? m[1] : null;
  }

  function carteTiktok(v) {
    var id = idTiktok(v);
    if (!id) return "";
    var pseudo = ((C.reseaux || {}).tiktok || {}).pseudo || "@menzah.store";
    var compte = pseudo.replace(/^@/, "");
    var url = "https://www.tiktok.com/@" + compte + "/video/" + id;
    var p = v.produit ? trouverProduit(v.produit) : null;
    var dessin = p && !p.image ? V.rendre(p.visuel, couleurPrincipale(p)) : "";
    return '<div class="media media-tiktok"' + (p ? ' style="--teinte:' + echapper(couleurPrincipale(p)) + '"' : "") + ">" +
      '<blockquote class="tiktok-embed" cite="' + url + '" data-video-id="' + id + '" style="max-width:605px;min-width:0;">' +
      '<section><a class="media-apercu" href="' + url + '" target="_blank" rel="noopener">' +
      '<span class="media-ecran">' + compteMedia(pseudo) + dessin + '<span class="media-lecture">' + icone("play") + "</span></span>" +
      '<span class="media-legende"><strong>' + echapper(v.titre || "Vidéo Menzah Store") + "</strong>" +
      "<span>" + icone("tiktok") + "Regarder sur TikTok</span></span>" +
      "</a></section></blockquote></div>";
  }

  function carteInstagram(url) {
    if (!/^https:\/\/(www\.)?instagram\.com\//.test(String(url))) return "";
    var propre = String(url).split("?")[0].replace(/\/?$/, "/");
    var estReel = /\/reel\//.test(propre);
    var pseudo = ((C.reseaux || {}).instagram || {}).pseudo || "@menzah_store";
    return '<div class="media media-instagram">' +
      '<blockquote class="instagram-media" data-instgrm-permalink="' + echapper(propre) + '?utm_source=ig_embed" data-instgrm-version="14" ' +
      'style="background:transparent;border:0;margin:0;padding:0;max-width:540px;min-width:0;width:100%;">' +
      '<a class="media-apercu" href="' + echapper(propre) + '" target="_blank" rel="noopener">' +
      '<span class="media-ecran">' + compteMedia(pseudo) + '<span class="media-lecture">' + icone(estReel ? "play" : "instagram") + "</span></span>" +
      '<span class="media-legende"><strong>' + (estReel ? "Reel de la boutique" : "Publication de la boutique") + "</strong>" +
      "<span>" + icone("instagram") + "Voir sur Instagram</span></span>" +
      "</a></blockquote></div>";
  }

  function surveiller(conteneur, delai) {
    var medias = $$(".media", conteneur);
    medias.forEach(function (m) {
      if (!window.MutationObserver) return;
      var obs = new MutationObserver(function () {
        if (m.querySelector("iframe")) {
          m.classList.add("charge");
          obs.disconnect();
        }
      });
      obs.observe(m, { childList: true, subtree: true });
    });
    setTimeout(function () {
      medias.forEach(function (m) { if (!m.classList.contains("charge")) m.classList.add("inactif"); });
    }, delai);
  }

  function activerIntegration(conteneur) {
    var type = conteneur.getAttribute("data-embed");
    var promesse;
    if (type === "tiktok") {
      promesse = chargerScript("https://www.tiktok.com/embed.js");
    } else if (type === "instagram") {
      promesse = chargerScript("https://www.instagram.com/embed.js").then(function () {
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
      });
    }
    if (!promesse) return;
    surveiller(conteneur, 12000);
    promesse.catch(function () {
      $$(".media", conteneur).forEach(function (m) { m.classList.add("inactif"); });
    });
  }

  function initFleches(rail) {
    var nom = rail.getAttribute("data-rail");
    var fleches = $('[data-fleches="' + nom + '"]');
    if (!fleches) return;
    var boutons = $$(".fleche", fleches);
    var cartes = $$(".media", rail);
    if (cartes.length < 2) { fleches.hidden = true; return; }

    boutons.forEach(function (b) {
      b.addEventListener("click", function () {
        var pas = cartes[0].getBoundingClientRect().width + 14;
        rail.scrollBy({ left: pas * +b.getAttribute("data-sens"), behavior: reduit ? "auto" : "smooth" });
      });
    });

    if (!window.IntersectionObserver) return;
    var bords = [cartes[0], cartes[cartes.length - 1]];
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        var i = bords.indexOf(e.target);
        boutons[i].disabled = e.intersectionRatio > 0.9;
      });
    }, { root: rail, threshold: [0, 0.9, 1] });
    bords.forEach(function (b) { obs.observe(b); });
  }

  function rendreMedias() {
    var railTiktok = $('[data-rail="tiktok"]');
    var grilleInsta = $('[data-rail="instagram"]');
    var videos = (C.videosTiktok || []).map(carteTiktok).filter(Boolean);
    var posts = (C.postsInstagram || []).map(carteInstagram).filter(Boolean);

    if (railTiktok) {
      if (videos.length) {
        railTiktok.innerHTML = videos.join("");
        railTiktok.classList.add("rail");
        initFleches(railTiktok);
      } else {
        $("#videos").hidden = true;
      }
    }
    if (grilleInsta) {
      if (posts.length) {
        grilleInsta.innerHTML = posts.join("");
        grilleInsta.classList.add("rail");
      } else {
        $("#instagram").hidden = true;
      }
    }
    M.appliquerLogo(C.logo, C.logoRond);

    var conteneurs = $$("[data-embed]").filter(function (c) { return c.children.length; });
    if (!window.IntersectionObserver) {
      conteneurs.forEach(activerIntegration);
      return;
    }
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        activerIntegration(e.target);
      });
    }, { rootMargin: "600px 0px" });
    conteneurs.forEach(function (c) { obs.observe(c); });
  }

  /* ---------- Défilement ---------- */

  function initDefilement() {
    var entete = $("[data-entete]");
    var hero = $("[data-hero]");
    var flottant = $("[data-flottant]");
    if (!window.IntersectionObserver) {
      $$(".reveal").forEach(function (el) { el.classList.add("visible"); });
      if (flottant) flottant.classList.add("visible");
      return;
    }

    var sentinelle = document.createElement("div");
    sentinelle.setAttribute("aria-hidden", "true");
    sentinelle.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;";
    document.body.prepend(sentinelle);
    new IntersectionObserver(function (e) {
      entete.classList.toggle("defile", !e[0].isIntersecting);
    }).observe(sentinelle);

    // Le bouton flottant reste caché sur l'accueil et sur la grille du catalogue,
    // qui ont déjà leurs propres boutons.
    if (flottant) {
      var zones = [hero, $("[data-grille]")].filter(Boolean);
      var masques = new Map();
      var obsFlottant = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (e) { masques.set(e.target, e.isIntersecting); });
        var cache = false;
        masques.forEach(function (visible) { cache = cache || visible; });
        flottant.classList.toggle("visible", !cache);
      }, { threshold: 0 });
      zones.forEach(function (z) { obsFlottant.observe(z); });
    }

    var revel = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("visible");
        revel.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { revel.observe(el); });
  }

  /* ---------- Données structurées (référencement Google) ---------- */

  function donneesStructurees() {
    var adresse = C.adresse || {};
    var reseaux = C.reseaux || {};
    var donnees = {
      "@context": "https://schema.org",
      "@type": "MobilePhoneStore",
      name: C.nom || "Menzah Store",
      slogan: C.slogan,
      url: location.href.split("#")[0],
      image: C.logo || undefined,
      telephone: (C.telephones || [])[0] ? lienTel(C.telephones[0]).replace("tel:", "") : undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: adresse.ligne,
        addressLocality: adresse.ville,
        addressCountry: "DZ",
      },
      hasMap: C.googleMaps,
      sameAs: Object.keys(reseaux).map(function (k) { return reseaux[k].lien; }).filter(Boolean),
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(donnees);
    document.head.appendChild(s);
  }

  /* ---------- Démarrage ---------- */

  var cache = memoire("menzah-reglages");
  if (cache) C = fusion(CONFIG_LOCALE, cache);
  M.appliquer(C);
  appliquerConfig();
  rendreVitrine();
  rendreSquelette();
  initFiche();
  initDefilement();
  initParallaxe();

  chargerDonnees().then(function (d) {
    if (d.reglages) {
      C = fusion(CONFIG_LOCALE, d.reglages);
      memoire("menzah-reglages", d.reglages);
    }
    if (d.produits.length) PRODUITS = d.produits;
    enLigne = true;
  }).catch(function () {
    enLigne = false;
  }).then(function () {
    M.appliquer(C);
    appliquerConfig();
    rendreCatalogue();
    rendreMedias();
    donneesStructurees();
    ouvrirDepuisLien();
  });
})();

/*
 * Menzah Store : fonctionnement du site.
 * Les contenus (infos, produits, vidéos) se modifient dans config.js et produits.js.
 */
(function () {
  "use strict";

  var C = window.MENZAH_CONFIG || {};
  var PRODUITS = window.MENZAH_PRODUITS || [];
  var V = window.MenzahVisuels;

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
      return '<img src="' + echapper(p.image) + '" alt="' + echapper(alt ? p.nom : "") + '" loading="lazy" decoding="async">';
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

  function prixHtml(p, classe) {
    if (typeof p.prix === "number" && p.prix > 0) {
      var barre = typeof p.prixBarre === "number" ? " <s>" + formatPrix(p.prixBarre) + "</s>" : "";
      return '<p class="' + classe + '">' + formatPrix(p.prix) + barre + "</p>";
    }
    return '<p class="' + classe + ' prix-demande">Prix sur demande</p>';
  }

  function reseauDuLien(lien) {
    if (/instagram\.com/.test(lien || "")) return { nom: "Instagram", icone: "instagram" };
    return { nom: "TikTok", icone: "tiktok" };
  }

  /* ---------- Informations de la boutique ---------- */

  function appliquerConfig() {
    var reseaux = C.reseaux || {};
    var adresse = C.adresse || {};
    var telephones = C.telephones || [];

    $$("[data-wa]").forEach(function (a) { a.href = lienWhatsapp(C.messageWhatsapp); });

    Object.keys(reseaux).forEach(function (nom) {
      $$('[data-lien="' + nom + '"]').forEach(function (a) { a.href = reseaux[nom].lien; });
      $$('[data-pseudo="' + nom + '"]').forEach(function (el) { el.textContent = reseaux[nom].pseudo; });
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
    if (blocHoraires && horaires.length) {
      $("[data-horaires-texte]").innerHTML = horaires.map(function (h) {
        return echapper(h.jours) + ESPACE + ": " + echapper(h.heures);
      }).join("<br>");
      blocHoraires.hidden = false;
    }

    var carte = $("[data-carte]");
    if (carte && C.carteRecherche) {
      carte.src = "https://www.google.com/maps?q=" + encodeURIComponent(C.carteRecherche) + "&z=16&hl=fr&output=embed";
    }

    $$("[data-annee]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Accueil ---------- */

  function rendreVitrine() {
    var scene = $("[data-scene]");
    if (!scene) return;
    var secours = [["pro", "#C2A68E"], ["plateau", "#E8773D"], ["oppo", "#4A4C51"]];
    scene.innerHTML = VITRINE.map(function (choix, i) {
      var p = trouverProduit(choix[0]);
      var visuel = p ? p.visuel : secours[i][0];
      var hex = p && p.couleurs[choix[1]] ? p.couleurs[choix[1]].hex : secours[i][1];
      return '<div class="tel tel-' + (i + 1) + '">' + V.rendre(visuel, hex) + "</div>";
    }).join("");
  }

  /* ---------- Catalogue ---------- */

  var etat = { categorie: "tout", terme: "" };

  function carteProduit(p) {
    var etiquettes = "";
    if (p.badge) etiquettes += '<span class="etiquette etiquette-nouveau">' + icone("sparkle") + echapper(p.badge) + "</span>";
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
      '<div class="produit-visuel">' + visuelProduit(p, null, true) + "</div>" +
      '<div class="produit-corps">' +
      '<div class="etiquettes">' + etiquettes + "</div>" +
      '<h3 class="produit-nom"><button class="produit-ouvrir" type="button" aria-haspopup="dialog">' + echapper(p.nom) + "</button></h3>" +
      '<p class="produit-spec">' + echapper(texteCapacites(p)) + "</p>" +
      (couleurs.length > 1
        ? '<div class="pastilles" role="img" aria-label="' + couleurs.length + " coloris" + ESPACE + ": " + echapper(nomsCouleurs) + '">' + pastilles + "</div>"
        : "") +
      '<div class="produit-bas">' + prixHtml(p, "prix") +
      '<a class="btn btn-wa" href="' + echapper(lienWhatsapp(messageProduit(p))) + '" target="_blank" rel="noopener" aria-label="Commander : ' + echapper(p.nom) + ' (WhatsApp)">' +
      icone("whatsapp") + "Commander</a>" +
      "</div></div></article>";
  }

  function texteRecherche(p) {
    return sansAccents([
      p.nom, p.marque, p.categorie, p.description,
      (p.couleurs || []).map(function (c) { return c.nom; }).join(" "),
      (p.capacites || []).join(" "),
    ].join(" "));
  }

  function rendreCatalogue() {
    var grille = $("[data-grille]");
    var filtres = $("[data-filtres]");
    if (!grille || !filtres) return;

    grille.innerHTML = PRODUITS.map(carteProduit).join("");

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
          if (animer) {
            carte.classList.remove("apparait");
            void carte.offsetWidth;
            carte.style.setProperty("--i", Math.min(visibles, 8));
            carte.classList.add("apparait");
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
      if (e.target.closest("a")) return;
      var carte = e.target.closest(".produit");
      if (!carte) return;
      ouvrirFiche(trouverProduit(carte.getAttribute("data-id")), $(".produit-ouvrir", carte));
    });

    appliquer(false);
  }

  /* ---------- Fiche produit ---------- */

  var fiche = $("[data-fiche]");
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

  function majFiche() {
    var p = ficheCourante;
    var choix = selection();
    var hex = choix.couleur ? choix.couleur.hex : couleurPrincipale(p);
    var zone = $("[data-fiche-visuel]", fiche);
    zone.style.setProperty("--teinte", hex);
    zone.innerHTML = visuelProduit(p, hex, true);
    $("[data-fiche-couleur-nom]", fiche).textContent = choix.couleur ? choix.couleur.nom : "";
    $("[data-fiche-commander]", fiche).href = lienWhatsapp(messageProduit(
      p, choix.couleur && p.couleurs.length > 1 ? choix.couleur.nom : null, choix.capacite));
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
    $("[data-fiche-partager-texte]", fiche).textContent = "Partager";

    majFiche();
    fiche.showModal();
    document.documentElement.style.overflow = "hidden";
    $(".fiche-contenu", fiche).scrollTop = 0;
    try { history.replaceState(null, "", "#produit=" + encodeURIComponent(p.id)); } catch (e) { /* hors ligne */ }
  }

  function initFiche() {
    if (!fiche) return;

    fiche.addEventListener("change", function (e) {
      if (e.target.name === "fiche-couleur" || e.target.name === "fiche-capacite") majFiche();
    });

    $("[data-fermer]", fiche).addEventListener("click", function () { fiche.close(); });

    fiche.addEventListener("click", function (e) {
      if (e.target === fiche) fiche.close();
    });

    fiche.addEventListener("close", function () {
      document.documentElement.style.overflow = "";
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

    var lien = /^#produit=(.+)$/.exec(location.hash);
    if (lien) {
      var p = trouverProduit(decodeURIComponent(lien[1]));
      if (p) ouvrirFiche(p);
    }
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
    return '<span class="media-compte"><img src="images/favicon.svg" alt="" width="28" height="28">' + echapper(pseudo) + "</span>";
  }

  function carteTiktok(v) {
    var pseudo = ((C.reseaux || {}).tiktok || {}).pseudo || "@menzah.store";
    var compte = pseudo.replace(/^@/, "");
    var url = "https://www.tiktok.com/@" + compte + "/video/" + v.id;
    var p = v.produit ? trouverProduit(v.produit) : null;
    var dessin = p && !p.image ? V.rendre(p.visuel, couleurPrincipale(p)) : "";
    return '<div class="media media-tiktok"' + (p ? ' style="--teinte:' + echapper(couleurPrincipale(p)) + '"' : "") + ">" +
      '<blockquote class="tiktok-embed" cite="' + url + '" data-video-id="' + echapper(v.id) + '" style="max-width:605px;min-width:0;">' +
      '<section><a class="media-apercu" href="' + url + '" target="_blank" rel="noopener">' +
      '<span class="media-ecran">' + compteMedia(pseudo) + dessin + '<span class="media-lecture">' + icone("play") + "</span></span>" +
      '<span class="media-legende"><strong>' + echapper(v.titre || "Vidéo Menzah Store") + "</strong>" +
      "<span>" + icone("tiktok") + "Regarder sur TikTok</span></span>" +
      "</a></section></blockquote></div>";
  }

  function carteInstagram(url) {
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
        rail.scrollBy({ left: pas * +b.getAttribute("data-sens"), behavior: "smooth" });
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
    var videos = C.videosTiktok || [];
    var posts = C.postsInstagram || [];

    if (railTiktok) {
      if (videos.length) {
        railTiktok.innerHTML = videos.map(carteTiktok).join("");
        railTiktok.classList.add("rail");
        initFleches(railTiktok);
      } else {
        $("#videos").hidden = true;
      }
    }
    if (grilleInsta) {
      if (posts.length) {
        grilleInsta.innerHTML = posts.map(carteInstagram).join("");
        grilleInsta.classList.add("rail");
      } else {
        $("#instagram").hidden = true;
      }
    }

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

  /* ---------- Animations et en-tête ---------- */

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
    // qui ont déjà leurs propres boutons WhatsApp.
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
      telephone: (C.telephones || [])[0] ? lienTel(C.telephones[0]).replace("tel:", "") : undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: adresse.ligne,
        addressLocality: adresse.ville,
        addressCountry: "DZ",
      },
      hasMap: C.googleMaps,
      sameAs: Object.keys(reseaux).map(function (k) { return reseaux[k].lien; }),
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(donnees);
    document.head.appendChild(s);
  }

  /* ---------- Démarrage ---------- */

  appliquerConfig();
  rendreVitrine();
  rendreCatalogue();
  rendreMedias();
  initFiche();
  initDefilement();
  donneesStructurees();
})();

/*
 * Tableau de bord Menzah Store (Supabase).
 * Connexion par nom d'utilisateur et mot de passe. Seuls les comptes présents dans la table
 * menzah_admins peuvent lire les commandes et modifier le site (règles RLS).
 */
(function () {
  "use strict";

  var SB = window.MENZAH_SUPABASE || {};
  var V = window.MenzahVisuels;
  var M = window.MenzahMarque;
  var BUCKET = SB.bucket || "menzah";

  var sb = window.supabase.createClient(SB.url, SB.cle, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "menzah-admin" },
  });

  var STATUTS = [
    { id: "nouvelle", nom: "Nouvelle", pluriel: "Nouvelles" },
    { id: "confirmee", nom: "Confirmée", pluriel: "Confirmées" },
    { id: "livree", nom: "Livrée", pluriel: "Livrées" },
    { id: "annulee", nom: "Annulée", pluriel: "Annulées" },
  ];
  var CAPACITES_COURANTES = ["64 Go", "128 Go", "256 Go", "512 Go", "1 To", "2 To"];
  var CATEGORIES = { iphone: "iPhone", android: "Android", accessoires: "Accessoires" };
  var ACCENT_DEFAUT = "#22C35E";
  var ESPACE = " ";

  var etat = {
    session: null,
    commandes: [],
    produits: [],
    reglages: {},
    filtre: "tous",
    recherche: "",
    rechercheProduits: "",
    canal: null,
    titre: document.title,
    nonVues: 0,
  };

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

  var formatDinars = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  function formatPrix(n) { return formatDinars.format(n) + ESPACE + "DA"; }

  var formatHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  var formatJour = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  function formatDate(iso) {
    var d = new Date(iso);
    var secondes = (Date.now() - d.getTime()) / 1000;
    if (secondes < 60) return "à l'instant";
    if (secondes < 3600) return "il y a " + Math.floor(secondes / 60) + " min";
    var aujourdhui = new Date();
    var hier = new Date(Date.now() - 86400000);
    if (d.toDateString() === aujourdhui.toDateString()) return "aujourd'hui à " + formatHeure.format(d);
    if (d.toDateString() === hier.toDateString()) return "hier à " + formatHeure.format(d);
    return formatJour.format(d) + " à " + formatHeure.format(d);
  }

  // +213555123456 -> 05 55 12 34 56
  function telLocal(tel) {
    var t = String(tel || "");
    if (t.indexOf("+213") === 0) t = "0" + t.slice(4);
    if (t.length === 10) return t.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
    if (t.length === 9) return t.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
    return t;
  }

  function slugifier(texte) {
    return sansAccents(texte).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "produit";
  }

  // Supabase Auth demande un e-mail : le nom d'utilisateur « Menzah Store » devient l'adresse
  // technique menzahstore@menzah-store.vercel.app (aucun e-mail n'y est envoyé).
  // Ne pas changer ce domaine : il identifie les comptes existants.
  var DOMAINE_IDENTIFIANT = "menzah-store.vercel.app";

  function emailDepuisIdentifiant(identifiant) {
    var v = sansAccents(identifiant);
    if (v.indexOf("@") !== -1) return v;
    v = v.replace(/[^a-z0-9]/g, "");
    return v ? v + "@" + DOMAINE_IDENTIFIANT : "";
  }

  function identifiantDepuisEmail(email) {
    var suffixe = "@" + DOMAINE_IDENTIFIANT;
    email = email || "";
    return email.slice(-suffixe.length) === suffixe ? email.slice(0, -suffixe.length) : email;
  }

  function toast(message, type) {
    var zone = $("[data-toasts]");
    var el = document.createElement("div");
    el.className = "toast" + (type === "erreur" ? " erreur" : "");
    el.setAttribute("role", type === "erreur" ? "alert" : "status");
    el.innerHTML = icone(type === "erreur" ? "warning" : "check") + "<span>" + echapper(message) + "</span>";
    zone.appendChild(el);
    setTimeout(function () {
      el.classList.add("sortie");
      setTimeout(function () { el.remove(); }, 320);
    }, type === "erreur" ? 6000 : 3200);
  }

  function messageErreur(err) {
    var m = (err && (err.message || err.error_description)) || "";
    if (/Invalid login credentials/i.test(m)) return "Nom d'utilisateur ou mot de passe incorrect.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Pas de connexion internet. Réessayez.";
    if (/JWT|session/i.test(m)) return "Session expirée, reconnectez-vous.";
    if (/duplicate key/i.test(m)) return "Cet identifiant existe déjà.";
    if (/row-level security|permission denied/i.test(m)) return "Action refusée : ce compte n'a pas les droits.";
    return m || "Une erreur est survenue.";
  }

  function vue(nom) {
    $$("[data-vue]").forEach(function (el) { el.hidden = el.getAttribute("data-vue") !== nom; });
  }

  // Réduit une image avant l'envoi (photos de téléphone souvent très lourdes).
  function preparerImage(fichier, max, garderPng) {
    return new Promise(function (ok, echec) {
      if (!/^image\/(png|jpeg|webp)$/.test(fichier.type)) {
        echec(new Error("Format non pris en charge. Utilisez une image JPG, PNG ou WebP."));
        return;
      }
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () {
        var ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        var voulu = garderPng && fichier.type === "image/png" ? "image/png" : "image/webp";
        canvas.toBlob(function (blob) {
          function fin(b, type) {
            ok({ blob: b, type: type, ext: type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg", image: img, url: url });
          }
          if (blob && blob.type === voulu) fin(blob, voulu);
          else canvas.toBlob(function (jpg) { fin(jpg, "image/jpeg"); }, "image/jpeg", 0.86);
        }, voulu, 0.86);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        echec(new Error("Impossible de lire cette image."));
      };
      img.src = url;
    });
  }

  function envoyerFichier(dossier, nom, prepa) {
    var chemin = dossier + "/" + nom + "-" + Date.now() + "." + prepa.ext;
    return sb.storage.from(BUCKET).upload(chemin, prepa.blob, {
      contentType: prepa.type,
      cacheControl: "31536000",
      upsert: false,
    }).then(function (r) {
      if (r.error) throw r.error;
      return sb.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
    });
  }

  function son() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      [660, 880].forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.frequency.value = f;
        o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.16);
        o.stop(ctx.currentTime + i * 0.16 + 0.4);
      });
      setTimeout(function () { ctx.close(); }, 1200);
    } catch (e) { /* son indisponible */ }
  }

  /* ---------- Connexion ---------- */

  function initConnexion() {
    var form = $("[data-form-connexion]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var erreur = $("[data-connexion-erreur]");
      var bouton = $("[data-connexion-bouton]");
      erreur.hidden = true;
      var email = emailDepuisIdentifiant(form.identifiant.value);
      var mdp = form.mdp.value;
      if (!email || !mdp) {
        erreur.textContent = "Indiquez votre nom d'utilisateur et votre mot de passe.";
        erreur.hidden = false;
        return;
      }
      bouton.disabled = true;
      bouton.setAttribute("aria-busy", "true");
      sb.auth.signInWithPassword({ email: email, password: mdp }).then(function (r) {
        if (r.error) throw r.error;
        form.mdp.value = "";
        return entrer(r.data.session);
      }).catch(function (err) {
        erreur.textContent = messageErreur(err);
        erreur.hidden = false;
      }).then(function () {
        bouton.disabled = false;
        bouton.removeAttribute("aria-busy");
      });
    });

    $("[data-deconnexion]").addEventListener("click", function () {
      if (etat.canal) sb.removeChannel(etat.canal);
      etat.canal = null;
      sb.auth.signOut().then(function () {
        vue("connexion");
        document.title = etat.titre;
      });
    });
  }

  function entrer(session) {
    etat.session = session;
    return sb.rpc("menzah_is_admin").then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) {
        return sb.auth.signOut().then(function () {
          var erreur = $("[data-connexion-erreur]");
          erreur.textContent = "Ce compte n'a pas accès au tableau de bord.";
          erreur.hidden = false;
          vue("connexion");
        });
      }
      $("[data-identifiant]").textContent = identifiantDepuisEmail(session.user.email);
      vue("app");
      ouvrirOnglet();
      return Promise.all([chargerCommandes(), chargerProduits().then(chargerReglages)]).then(function () { abonnerDirect(); });
    });
  }

  /* ---------- Onglets ---------- */

  function ouvrirOnglet() {
    var nom = (location.hash || "#commandes").slice(1);
    if (["commandes", "produits", "reglages"].indexOf(nom) === -1) nom = "commandes";
    $$("[data-panneau]").forEach(function (p) { p.hidden = p.getAttribute("data-panneau") !== nom; });
    $$("[data-onglet]").forEach(function (a) {
      if (a.getAttribute("data-onglet") === nom) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (nom === "commandes") {
      etat.nonVues = 0;
      document.title = etat.titre;
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Commandes ---------- */

  function chargerCommandes() {
    return sb.from("menzah_commandes").select("*").order("created_at", { ascending: false }).limit(500)
      .then(function (r) {
        if (r.error) throw r.error;
        etat.commandes = r.data || [];
        rendreCommandes();
      }).catch(function (err) { toast(messageErreur(err), "erreur"); });
  }

  function compterStatuts() {
    var c = { nouvelle: 0, confirmee: 0, livree: 0, annulee: 0, mois: 0 };
    var debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    etat.commandes.forEach(function (cmd) {
      c[cmd.statut] = (c[cmd.statut] || 0) + 1;
      if (new Date(cmd.created_at) >= debutMois && cmd.statut !== "annulee") c.mois++;
    });
    return c;
  }

  function carteCommande(cmd) {
    var options = [cmd.couleur, cmd.capacite].filter(Boolean).join(" · ");
    var chiffres = String(cmd.client_telephone || "").replace(/\D/g, "");
    var messageClient = "Bonjour " + cmd.client_nom + ", c'est Menzah Store. Nous avons bien reçu votre commande n° " +
      cmd.numero + " (" + cmd.produit_nom + (options ? ", " + options : "") + ").";
    var selectStatut = '<select class="statut" data-statut="' + cmd.statut + '" data-changer-statut aria-label="Statut de la commande ' + cmd.numero + '">' +
      STATUTS.map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === cmd.statut ? " selected" : "") + ">" + s.nom + "</option>";
      }).join("") + "</select>";
    return '<article class="cmd" data-id="' + cmd.id + '">' +
      '<div class="cmd-tete"><span class="cmd-numero">n° ' + cmd.numero + '</span>' +
      '<span class="cmd-date" title="' + echapper(new Date(cmd.created_at).toLocaleString("fr-FR")) + '">' + formatDate(cmd.created_at) + "</span>" +
      selectStatut + "</div>" +
      '<div class="cmd-client"><strong>' + echapper(cmd.client_nom) + "</strong>" +
      '<a class="cmd-tel" href="tel:' + echapper(cmd.client_telephone) + '">' + echapper(telLocal(cmd.client_telephone)) + "</a>" +
      '<span class="cmd-contact">' +
      '<a class="btn btn-contour btn-icone" href="tel:' + echapper(cmd.client_telephone) + '" aria-label="Appeler ' + echapper(cmd.client_nom) + '">' + icone("phone") + "</a>" +
      '<a class="btn btn-wa btn-icone" href="https://wa.me/' + chiffres + "?text=" + encodeURIComponent(messageClient) + '" target="_blank" rel="noopener" aria-label="Écrire à ' + echapper(cmd.client_nom) + ' sur WhatsApp">' + icone("whatsapp") + "</a>" +
      "</span></div>" +
      '<div class="cmd-produit"><b>' + echapper(cmd.produit_nom) + "</b>" +
      (options || cmd.prix ? "<span>" + echapper([options, cmd.prix ? formatPrix(cmd.prix) : ""].filter(Boolean).join(" · ")) + "</span>" : "") +
      "</div>" +
      '<div class="cmd-infos">' +
      (cmd.mode_reception === "livraison"
        ? "<span>" + icone("truck") + "Livraison" + (cmd.wilaya ? ESPACE + ": " + echapper(cmd.wilaya) : "") + "</span>"
        : "<span>" + icone("store") + "Retrait en boutique</span>") +
      "</div>" +
      (cmd.note ? '<p class="cmd-note">' + echapper(cmd.note) + "</p>" : "") +
      '<div class="cmd-pied"><button class="btn btn-contour btn-petit btn-danger" type="button" data-supprimer-commande>' + icone("trash") + "Supprimer</button></div>" +
      "</article>";
  }

  function rendreCommandes(idNouvelle) {
    var c = compterStatuts();
    $("[data-stats]").innerHTML =
      '<div class="stat mise-en-avant"><strong>' + c.nouvelle + "</strong><span>Nouvelles à traiter</span></div>" +
      '<div class="stat"><strong>' + c.confirmee + "</strong><span>Confirmées</span></div>" +
      '<div class="stat"><strong>' + c.livree + "</strong><span>Livrées</span></div>" +
      '<div class="stat"><strong>' + c.mois + "</strong><span>Ce mois-ci</span></div>";

    var badge = $("[data-compte-nouvelles]");
    badge.textContent = c.nouvelle;
    badge.hidden = !c.nouvelle;

    var filtres = [{ id: "tous", nom: "Toutes", n: etat.commandes.length }].concat(STATUTS.map(function (s) {
      return { id: s.id, nom: s.pluriel, n: c[s.id] || 0 };
    }));
    $("[data-filtres-statut]").innerHTML = filtres.map(function (f) {
      return '<button class="filtre" type="button" data-filtre="' + f.id + '" aria-pressed="' + (f.id === etat.filtre) + '">' +
        f.nom + "<small>" + f.n + "</small></button>";
    }).join("");

    var terme = sansAccents(etat.recherche);
    var liste = etat.commandes.filter(function (cmd) {
      if (etat.filtre !== "tous" && cmd.statut !== etat.filtre) return false;
      if (!terme) return true;
      var texte = sansAccents([cmd.numero, cmd.client_nom, cmd.client_telephone, telLocal(cmd.client_telephone), cmd.produit_nom, cmd.wilaya].join(" "));
      return terme.split(/\s+/).every(function (m) { return texte.indexOf(m) !== -1; });
    });

    var zone = $("[data-liste-commandes]");
    if (!liste.length) {
      zone.innerHTML = '<p class="vide-admin">' + (etat.commandes.length
        ? "Aucune commande ne correspond à ce filtre."
        : "Aucune commande pour l'instant. Les commandes passées sur le site apparaîtront ici en direct.") + "</p>";
      return;
    }
    zone.innerHTML = liste.map(carteCommande).join("");
    if (idNouvelle) {
      var carte = zone.querySelector('[data-id="' + idNouvelle + '"]');
      if (carte) carte.classList.add("arrivee");
    }
  }

  function initCommandes() {
    $("[data-filtres-statut]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-filtre]");
      if (!b) return;
      etat.filtre = b.getAttribute("data-filtre");
      rendreCommandes();
    });

    $("[data-recherche-commandes]").addEventListener("input", function (e) {
      etat.recherche = e.target.value;
      rendreCommandes();
    });

    var zone = $("[data-liste-commandes]");
    zone.addEventListener("change", function (e) {
      if (!e.target.matches("[data-changer-statut]")) return;
      var carte = e.target.closest(".cmd");
      var cmd = etat.commandes.filter(function (c) { return c.id === carte.getAttribute("data-id"); })[0];
      var ancien = cmd.statut;
      cmd.statut = e.target.value;
      e.target.setAttribute("data-statut", cmd.statut);
      sb.from("menzah_commandes").update({ statut: cmd.statut }).eq("id", cmd.id).then(function (r) {
        if (r.error) throw r.error;
        toast("Commande n° " + cmd.numero + " : " + STATUTS.filter(function (s) { return s.id === cmd.statut; })[0].nom.toLowerCase() + ".");
        rendreCommandes();
      }).catch(function (err) {
        cmd.statut = ancien;
        rendreCommandes();
        toast(messageErreur(err), "erreur");
      });
    });

    zone.addEventListener("click", function (e) {
      var b = e.target.closest("[data-supprimer-commande]");
      if (!b) return;
      var carte = b.closest(".cmd");
      var id = carte.getAttribute("data-id");
      var cmd = etat.commandes.filter(function (c) { return c.id === id; })[0];
      if (!window.confirm("Supprimer définitivement la commande n° " + cmd.numero + " de " + cmd.client_nom + " ?")) return;
      sb.from("menzah_commandes").delete().eq("id", id).then(function (r) {
        if (r.error) throw r.error;
        etat.commandes = etat.commandes.filter(function (c) { return c.id !== id; });
        rendreCommandes();
        toast("Commande supprimée.");
      }).catch(function (err) { toast(messageErreur(err), "erreur"); });
    });
  }

  function abonnerDirect() {
    if (etat.canal) return;
    var indicateur = $("[data-direct]");
    var texte = $("[data-direct-texte]");
    etat.canal = sb.channel("menzah-commandes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menzah_commandes" }, function (p) {
        if (p.eventType === "INSERT") {
          if (etat.commandes.some(function (c) { return c.id === p.new.id; })) return;
          etat.commandes.unshift(p.new);
          rendreCommandes(p.new.id);
          toast("Nouvelle commande n° " + p.new.numero + " : " + p.new.produit_nom);
          son();
          if ((location.hash || "#commandes") !== "#commandes" || document.hidden) {
            etat.nonVues++;
            document.title = "(" + etat.nonVues + ") " + etat.titre;
          }
        } else if (p.eventType === "UPDATE") {
          etat.commandes = etat.commandes.map(function (c) { return c.id === p.new.id ? p.new : c; });
          rendreCommandes();
        } else if (p.eventType === "DELETE") {
          etat.commandes = etat.commandes.filter(function (c) { return c.id !== p.old.id; });
          rendreCommandes();
        }
      })
      .subscribe(function (statut) {
        var actif = statut === "SUBSCRIBED";
        indicateur.classList.toggle("actif", actif);
        texte.textContent = actif ? "En direct" : "Direct interrompu, actualisez la page";
      });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && (location.hash || "#commandes") === "#commandes") {
        etat.nonVues = 0;
        document.title = etat.titre;
      }
    });
  }

  /* ---------- Produits ---------- */

  function chargerProduits() {
    return sb.from("menzah_produits").select("*").order("ordre", { ascending: true }).order("created_at", { ascending: true })
      .then(function (r) {
        if (r.error) throw r.error;
        etat.produits = r.data || [];
        rendreProduits();
      }).catch(function (err) { toast(messageErreur(err), "erreur"); });
  }

  function couleurDe(p) {
    return (p.couleurs && p.couleurs[0] && p.couleurs[0].hex) || "#9AA0A8";
  }

  function miniature(p, hex, image) {
    var photo = image !== undefined ? image : p.image_url;
    if (photo) return '<img src="' + echapper(photo) + '" alt="" loading="lazy">';
    var carre = p.visuel === "airpods" || p.visuel === "chargeur";
    return V.rendre(p.visuel, hex || couleurDe(p), carre ? "visuel carre" : "visuel");
  }

  function rendreProduits() {
    var terme = sansAccents(etat.rechercheProduits);
    var liste = etat.produits.filter(function (p) {
      return !terme || sansAccents(p.nom + " " + p.marque + " " + (CATEGORIES[p.categorie] || "")).indexOf(terme) !== -1;
    });
    var zone = $("[data-liste-produits]");
    if (!liste.length) {
      zone.innerHTML = '<p class="vide-admin">' + (etat.produits.length ? "Aucun produit ne correspond." : "Aucun produit. Ajoutez le premier avec le bouton ci-dessus.") + "</p>";
      return;
    }
    zone.innerHTML = liste.map(function (p) {
      var i = etat.produits.indexOf(p);
      var meta = [CATEGORIES[p.categorie] || p.categorie, typeof p.prix === "number" ? formatPrix(p.prix) : "Prix sur demande"];
      if ((p.couleurs || []).length > 1) meta.push(p.couleurs.length + " couleurs");
      return '<article class="a-produit' + (p.actif ? "" : " masque") + '" data-id="' + echapper(p.id) + '">' +
        '<div class="a-miniature" style="--teinte:' + echapper(couleurDe(p)) + '">' + miniature(p) + "</div>" +
        '<div class="a-produit-infos"><strong>' + echapper(p.nom) + "</strong>" +
        '<span class="a-produit-meta">' +
        (p.actif ? "" : '<span class="etiquette">Masqué</span>') +
        (p.en_stock ? "" : '<span class="etiquette">Sur commande</span>') +
        (p.badge ? '<span class="etiquette etiquette-nouveau">' + echapper(p.badge) + "</span>" : "") +
        echapper(meta.join(" · ")) + "</span></div>" +
        '<div class="a-produit-actions">' +
        '<button class="btn btn-contour btn-icone" type="button" data-action="monter" aria-label="Monter ' + echapper(p.nom) + '"' + (i === 0 ? " disabled" : "") + ">" + icone("arrow-up") + "</button>" +
        '<button class="btn btn-contour btn-icone" type="button" data-action="descendre" aria-label="Descendre ' + echapper(p.nom) + '"' + (i === etat.produits.length - 1 ? " disabled" : "") + ">" + icone("arrow-down") + "</button>" +
        '<button class="btn btn-contour btn-icone" type="button" data-action="visible" aria-pressed="' + p.actif + '" aria-label="' + (p.actif ? "Masquer " : "Afficher ") + echapper(p.nom) + '">' + icone(p.actif ? "eye" : "eye-off") + "</button>" +
        '<button class="btn btn-encre btn-petit" type="button" data-action="modifier">' + icone("pencil") + "Modifier</button>" +
        "</div></article>";
    }).join("");
  }

  function deplacer(id, sens) {
    var liste = etat.produits.slice();
    var i = liste.findIndex(function (p) { return p.id === id; });
    var j = i + sens;
    if (i < 0 || j < 0 || j >= liste.length) return;
    var tmp = liste[i];
    liste[i] = liste[j];
    liste[j] = tmp;
    var modifs = [];
    liste.forEach(function (p, k) {
      var ordre = (k + 1) * 10;
      if (p.ordre !== ordre) {
        p.ordre = ordre;
        modifs.push(p);
      }
    });
    etat.produits = liste;
    rendreProduits();
    Promise.all(modifs.map(function (p) {
      return sb.from("menzah_produits").update({ ordre: p.ordre }).eq("id", p.id).then(function (r) { if (r.error) throw r.error; });
    })).catch(function (err) {
      toast(messageErreur(err), "erreur");
      chargerProduits();
    });
  }

  function basculerVisible(id) {
    var p = etat.produits.filter(function (x) { return x.id === id; })[0];
    p.actif = !p.actif;
    rendreProduits();
    sb.from("menzah_produits").update({ actif: p.actif }).eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      toast(p.nom + (p.actif ? " est visible sur le site." : " est masqué du site."));
    }).catch(function (err) {
      p.actif = !p.actif;
      rendreProduits();
      toast(messageErreur(err), "erreur");
    });
  }

  function initProduits() {
    $("[data-recherche-produits]").addEventListener("input", function (e) {
      etat.rechercheProduits = e.target.value;
      rendreProduits();
    });
    $("[data-nouveau-produit]").addEventListener("click", function () { ouvrirEditeur(null); });
    $("[data-liste-produits]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-action]");
      if (!b) return;
      var id = b.closest(".a-produit").getAttribute("data-id");
      var action = b.getAttribute("data-action");
      if (action === "monter") deplacer(id, -1);
      else if (action === "descendre") deplacer(id, 1);
      else if (action === "visible") basculerVisible(id);
      else if (action === "modifier") ouvrirEditeur(etat.produits.filter(function (p) { return p.id === id; })[0]);
    });
    initEditeur();
  }

  /* ---------- Éditeur de produit ---------- */

  var editeur = $("[data-editeur]");
  var ed = null;

  function ouvrirEditeur(p) {
    var form = $("[data-form-produit]", editeur);
    form.reset();
    ed = {
      produit: p,
      couleurs: p ? JSON.parse(JSON.stringify(p.couleurs || [])) : [{ nom: "Noir", hex: "#2B2C30" }],
      capacites: p ? (p.capacites || []).slice() : [],
      image: p ? p.image_url : null,
      fichier: null,
    };
    $("[data-editeur-titre]", editeur).textContent = p ? "Modifier : " + p.nom : "Nouveau produit";
    form.nom.value = p ? p.nom : "";
    form.marque.value = p ? p.marque : "Apple";
    form.categorie.value = p ? p.categorie : "iphone";
    form.visuel.value = p ? p.visuel : "plateau";
    form.prix.value = p && typeof p.prix === "number" ? p.prix : "";
    form.prixBarre.value = p && typeof p.prix_barre === "number" ? p.prix_barre : "";
    form.badge.value = p && p.badge ? p.badge : "";
    form.video.value = p && p.video ? p.video : "";
    form.description.value = p ? p.description : "";
    form.actif.checked = p ? p.actif : true;
    form.enStock.checked = p ? p.en_stock : true;
    $("[data-supprimer-produit]", editeur).hidden = !p;
    $("[data-editeur-erreur]", editeur).hidden = true;
    $('[data-erreur="nom"]', editeur).textContent = "";
    rendreCouleursEditeur();
    rendreCapacites();
    majApercuProduit();
    editeur.showModal();
    $(".editeur-corps", editeur).scrollTop = 0;
  }

  function rendreCouleursEditeur() {
    $("[data-liste-couleurs]", editeur).innerHTML = ed.couleurs.map(function (c, i) {
      return '<div class="ligne-couleur" data-i="' + i + '">' +
        '<input type="color" value="' + echapper(c.hex) + '" data-couleur-hex aria-label="Couleur ' + (i + 1) + '">' +
        '<input type="text" value="' + echapper(c.nom) + '" maxlength="30" placeholder="Nom de la couleur" data-couleur-nom aria-label="Nom de la couleur ' + (i + 1) + '">' +
        '<button class="btn btn-contour btn-icone" type="button" data-retirer-couleur aria-label="Retirer cette couleur">' + icone("trash") + "</button>" +
        "</div>";
    }).join("");
  }

  function rendreCapacites() {
    $("[data-puces-capacites]", editeur).innerHTML = ed.capacites.map(function (c, i) {
      return '<span class="puce">' + echapper(c) +
        '<button type="button" data-retirer-capacite="' + i + '" aria-label="Retirer ' + echapper(c) + '">' + icone("close") + "</button></span>";
    }).join("") || '<span class="aide">Aucune capacité (accessoires).</span>';
    $("[data-raccourcis-capacites]", editeur).innerHTML = CAPACITES_COURANTES.filter(function (c) {
      return ed.capacites.indexOf(c) === -1;
    }).map(function (c) {
      return '<button class="raccourci" type="button" data-raccourci="' + echapper(c) + '">+ ' + echapper(c) + "</button>";
    }).join("");
  }

  function majApercuProduit() {
    var form = $("[data-form-produit]", editeur);
    var hex = ed.couleurs[0] ? ed.couleurs[0].hex : "#9AA0A8";
    var zone = $("[data-apercu-produit]", editeur);
    zone.style.setProperty("--teinte", hex);
    var image = ed.fichier ? ed.fichier.url : ed.image;
    zone.innerHTML = miniature({ visuel: form.visuel.value, couleurs: ed.couleurs }, hex, image || null);
    $("[data-photo-texte]", editeur).textContent = image ? "Changer la photo" : "Ajouter une photo";
    $("[data-photo-retirer]", editeur).hidden = !image;
  }

  function ajouterCapacite(valeur) {
    var v = String(valeur || "").trim();
    if (!v || ed.capacites.indexOf(v) !== -1) return;
    ed.capacites.push(v);
    rendreCapacites();
  }

  function idLibre(base) {
    var id = base;
    var n = 2;
    var pris = etat.produits.map(function (p) { return p.id; });
    while (pris.indexOf(id) !== -1) id = base + "-" + n++;
    return id;
  }

  function initEditeur() {
    var form = $("[data-form-produit]", editeur);

    $("[data-fermer-editeur]", editeur).addEventListener("click", function () { editeur.close(); });
    editeur.addEventListener("click", function (e) { if (e.target === editeur) editeur.close(); });

    form.visuel.addEventListener("change", majApercuProduit);

    $("[data-ajouter-couleur]", editeur).addEventListener("click", function () {
      ed.couleurs.push({ nom: "", hex: "#C3BDB3" });
      rendreCouleursEditeur();
      var champs = $$("[data-couleur-nom]", editeur);
      champs[champs.length - 1].focus();
    });

    $("[data-liste-couleurs]", editeur).addEventListener("input", function (e) {
      var ligne = e.target.closest(".ligne-couleur");
      if (!ligne) return;
      var c = ed.couleurs[+ligne.getAttribute("data-i")];
      if (e.target.matches("[data-couleur-hex]")) c.hex = e.target.value.toUpperCase();
      if (e.target.matches("[data-couleur-nom]")) c.nom = e.target.value;
      majApercuProduit();
    });

    $("[data-liste-couleurs]", editeur).addEventListener("click", function (e) {
      if (!e.target.closest("[data-retirer-couleur]")) return;
      ed.couleurs.splice(+e.target.closest(".ligne-couleur").getAttribute("data-i"), 1);
      rendreCouleursEditeur();
      majApercuProduit();
    });

    $("[data-puces-capacites]", editeur).addEventListener("click", function (e) {
      var b = e.target.closest("[data-retirer-capacite]");
      if (!b) return;
      ed.capacites.splice(+b.getAttribute("data-retirer-capacite"), 1);
      rendreCapacites();
    });

    $("[data-raccourcis-capacites]", editeur).addEventListener("click", function (e) {
      var b = e.target.closest("[data-raccourci]");
      if (b) ajouterCapacite(b.getAttribute("data-raccourci"));
    });

    var champCap = $("[data-nouvelle-capacite]", editeur);
    champCap.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        ajouterCapacite(champCap.value);
        champCap.value = "";
      }
    });
    $("[data-ajouter-capacite]", editeur).addEventListener("click", function () {
      ajouterCapacite(champCap.value);
      champCap.value = "";
      champCap.focus();
    });

    $("[data-photo-fichier]", editeur).addEventListener("change", function (e) {
      var fichier = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!fichier) return;
      preparerImage(fichier, 1200, false).then(function (prepa) {
        ed.fichier = prepa;
        majApercuProduit();
      }).catch(function (err) { toast(err.message, "erreur"); });
    });

    $("[data-photo-retirer]", editeur).addEventListener("click", function () {
      ed.fichier = null;
      ed.image = null;
      majApercuProduit();
    });

    $("[data-supprimer-produit]", editeur).addEventListener("click", function () {
      var p = ed.produit;
      if (!p || !window.confirm("Supprimer « " + p.nom + " » du catalogue ? Les commandes déjà reçues sont conservées.")) return;
      sb.from("menzah_produits").delete().eq("id", p.id).then(function (r) {
        if (r.error) throw r.error;
        etat.produits = etat.produits.filter(function (x) { return x.id !== p.id; });
        rendreProduits();
        editeur.close();
        toast(p.nom + " a été supprimé.");
      }).catch(function (err) { toast(messageErreur(err), "erreur"); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      enregistrerProduit(form);
    });
  }

  function enregistrerProduit(form) {
    var erreur = $("[data-editeur-erreur]", editeur);
    erreur.hidden = true;
    var nom = form.nom.value.trim();
    $('[data-erreur="nom"]', editeur).textContent = nom ? "" : "Le nom est obligatoire.";
    if (!nom) {
      form.nom.focus();
      return;
    }
    var video = form.video.value.trim();
    if (video && !/^https:\/\//.test(video)) {
      erreur.textContent = "Le lien de la vidéo doit commencer par https://";
      erreur.hidden = false;
      return;
    }
    var bouton = $("[data-enregistrer-produit]", editeur);
    bouton.disabled = true;
    bouton.setAttribute("aria-busy", "true");

    var nouveau = !ed.produit;
    var id = nouveau ? idLibre(slugifier(nom)) : ed.produit.id;
    var prix = form.prix.value === "" ? null : Math.round(+form.prix.value);
    var prixBarre = form.prixBarre.value === "" ? null : Math.round(+form.prixBarre.value);

    var etapeImage = ed.fichier
      ? envoyerFichier("produits", id, ed.fichier)
      : Promise.resolve(ed.image || null);

    etapeImage.then(function (imageUrl) {
      var ligne = {
        nom: nom,
        marque: form.marque.value.trim(),
        categorie: form.categorie.value,
        visuel: form.visuel.value,
        image_url: imageUrl,
        description: form.description.value.trim(),
        couleurs: ed.couleurs.filter(function (c) { return c.hex; }).map(function (c) {
          return { nom: c.nom.trim() || "Couleur", hex: c.hex.toUpperCase() };
        }),
        capacites: ed.capacites,
        prix: prix,
        prix_barre: prixBarre,
        badge: form.badge.value.trim() || null,
        video: video || null,
        actif: form.actif.checked,
        en_stock: form.enStock.checked,
      };
      if (nouveau) {
        ligne.id = id;
        ligne.ordre = etat.produits.length ? Math.max.apply(null, etat.produits.map(function (p) { return p.ordre; })) + 10 : 10;
        return sb.from("menzah_produits").insert(ligne).select().single();
      }
      return sb.from("menzah_produits").update(ligne).eq("id", id).select().single();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (nouveau) etat.produits.push(r.data);
      else etat.produits = etat.produits.map(function (p) { return p.id === r.data.id ? r.data : p; });
      rendreProduits();
      editeur.close();
      toast(nouveau ? r.data.nom + " a été ajouté au site." : "Modifications enregistrées.");
    }).catch(function (err) {
      erreur.textContent = messageErreur(err);
      erreur.hidden = false;
    }).then(function () {
      bouton.disabled = false;
      bouton.removeAttribute("aria-busy");
    });
  }

  /* ---------- Réglages ---------- */

  var brouillonLogo;

  function chargerReglages() {
    return sb.from("menzah_reglages").select("donnees").eq("id", 1).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      etat.reglages = (r.data && r.data.donnees) || {};
      M.appliquer(etat.reglages);
      $("[data-nom-boutique]").textContent = etat.reglages.nom || "Menzah Store";
      remplirReglages();
    }).catch(function (err) { toast(messageErreur(err), "erreur"); });
  }

  function ligneListe(type, valeur) {
    var v = valeur || {};
    var suppr = '<button class="btn btn-contour btn-icone" type="button" data-retirer-ligne aria-label="Retirer">' + icone("trash") + "</button>";
    if (type === "horaires") {
      return '<div class="ligne-edit deux" data-type="horaires">' +
        '<input type="text" maxlength="40" placeholder="Jours (ex. Samedi à jeudi)" value="' + echapper(v.jours) + '" data-champ="jours" aria-label="Jours">' +
        '<input type="text" maxlength="30" placeholder="Heures (ex. 10h - 21h)" value="' + echapper(v.heures) + '" data-champ="heures" aria-label="Heures">' + suppr + "</div>";
    }
    if (type === "telephones") {
      return '<div class="ligne-edit" data-type="telephones">' +
        '<input type="tel" maxlength="20" placeholder="07 77 31 93 32" value="' + echapper(valeur) + '" data-champ="valeur" aria-label="Numéro">' + suppr + "</div>";
    }
    if (type === "videos") {
      var options = '<option value="">Aucun produit lié</option>' + etat.produits.map(function (p) {
        return '<option value="' + echapper(p.id) + '"' + (p.id === v.produit ? " selected" : "") + ">" + echapper(p.nom) + "</option>";
      }).join("");
      var lien = v.lien || (v.id ? "https://www.tiktok.com/@menzah.store/video/" + v.id : "");
      return '<div class="ligne-edit video" data-type="videos">' +
        '<input type="url" maxlength="300" placeholder="Lien de la vidéo TikTok" value="' + echapper(lien) + '" data-champ="lien" aria-label="Lien de la vidéo">' +
        '<input type="text" maxlength="80" placeholder="Titre affiché" value="' + echapper(v.titre) + '" data-champ="titre" aria-label="Titre de la vidéo">' +
        '<div class="champ"><select data-champ="produit" aria-label="Produit lié">' + options + "</select></div>" + suppr + "</div>";
    }
    return '<div class="ligne-edit" data-type="posts">' +
      '<input type="url" maxlength="300" placeholder="https://www.instagram.com/p/..." value="' + echapper(valeur) + '" data-champ="valeur" aria-label="Lien Instagram">' + suppr + "</div>";
  }

  function remplirListe(type, valeurs) {
    $('[data-liste="' + type + '"]').innerHTML = (valeurs || []).map(function (v) { return ligneListe(type, v); }).join("");
  }

  function remplirReglages() {
    var r = etat.reglages;
    var form = $("[data-form-reglages]");
    var adresse = r.adresse || {};
    var reseaux = r.reseaux || {};
    var stats = r.statistiques || {};
    form.nom.value = r.nom || "";
    form.slogan.value = r.slogan || "";
    form.bienvenue.value = r.bienvenue || "";
    form.adresseLigne.value = adresse.ligne || "";
    form.adresseVille.value = adresse.ville || "";
    form.googleMaps.value = r.googleMaps || "";
    form.carteRecherche.value = r.carteRecherche || "";
    form.whatsapp.value = r.whatsapp || "";
    form.messageWhatsapp.value = r.messageWhatsapp || "";
    form.livraison.checked = !!r.livraison;
    form.tiktokPseudo.value = (reseaux.tiktok || {}).pseudo || "";
    form.tiktokLien.value = (reseaux.tiktok || {}).lien || "";
    form.instagramPseudo.value = (reseaux.instagram || {}).pseudo || "";
    form.instagramLien.value = (reseaux.instagram || {}).lien || "";
    form.abonnesTiktok.value = stats.abonnesTiktok || "";
    form.jaimeTiktok.value = stats.jaimeTiktok || "";
    form.logoRond.checked = r.logoRond !== false;
    remplirListe("horaires", r.horaires);
    remplirListe("telephones", r.telephones);
    remplirListe("videos", r.videosTiktok);
    remplirListe("posts", r.postsInstagram);
    brouillonLogo = r.logo || null;
    majLogo();
    definirCouleur((r.couleurs && r.couleurs.accent) || ACCENT_DEFAUT, false);
  }

  function majLogo() {
    var form = $("[data-form-reglages]");
    var apercu = $("[data-logo-apercu]");
    $("[data-logo-image]").src = brouillonLogo || "/images/favicon.svg";
    apercu.classList.toggle("rond", !!brouillonLogo && form.logoRond.checked);
    $("[data-logo-retirer]").hidden = !brouillonLogo;
  }

  function definirCouleur(hex, previsualiser) {
    var form = $("[data-form-reglages]");
    hex = String(hex || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(hex)) return;
    form.accent.value = hex.toLowerCase();
    form.accentHex.value = hex;
    $$(".suggestion").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-hex") === hex)); });
    if (previsualiser !== false) M.appliquerCouleur(hex);
  }

  function proposerCouleurs(couleurs) {
    var zone = $("[data-suggestions]");
    zone.hidden = !couleurs.length;
    $("[data-suggestions-liste]").innerHTML = couleurs.map(function (c) {
      return '<button class="suggestion" type="button" data-hex="' + c + '" style="--c:' + c + '" aria-pressed="false" aria-label="Utiliser la couleur ' + c + '"></button>';
    }).join("");
  }

  function lireListe(type) {
    return $$('[data-liste="' + type + '"] .ligne-edit').map(function (ligne) {
      function champ(nom) {
        var el = $('[data-champ="' + nom + '"]', ligne);
        return el ? el.value.trim() : "";
      }
      if (type === "horaires") return { jours: champ("jours"), heures: champ("heures") };
      if (type === "videos") {
        var lien = champ("lien");
        var id = (/(\d{15,})/.exec(lien) || [])[1] || "";
        var v = { id: id, titre: champ("titre") };
        if (champ("produit")) v.produit = champ("produit");
        return v;
      }
      return champ("valeur");
    }).filter(function (v) {
      if (type === "horaires") return v.jours || v.heures;
      if (type === "videos") return v.id;
      return v;
    });
  }

  function initReglages() {
    var form = $("[data-form-reglages]");

    form.addEventListener("click", function (e) {
      var ajout = e.target.closest("[data-ajouter]");
      if (ajout) {
        var type = ajout.getAttribute("data-ajouter");
        var liste = $('[data-liste="' + type + '"]');
        liste.insertAdjacentHTML("beforeend", ligneListe(type, type === "telephones" || type === "posts" ? "" : {}));
        var champs = $$("input", liste.lastElementChild);
        if (champs[0]) champs[0].focus();
        return;
      }
      var retrait = e.target.closest("[data-retirer-ligne]");
      if (retrait) {
        retrait.closest(".ligne-edit").remove();
        return;
      }
      var sugg = e.target.closest(".suggestion");
      if (sugg) definirCouleur(sugg.getAttribute("data-hex"));
    });

    form.accent.addEventListener("input", function () { definirCouleur(form.accent.value); });
    form.accentHex.addEventListener("input", function () {
      var v = form.accentHex.value.trim();
      if (v.charAt(0) !== "#") v = "#" + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) definirCouleur(v);
    });
    $("[data-couleur-defaut]").addEventListener("click", function () { definirCouleur(ACCENT_DEFAUT); });
    form.logoRond.addEventListener("change", majLogo);

    $("[data-logo-fichier]").addEventListener("change", function (e) {
      var fichier = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!fichier) return;
      var etatTexte = $("[data-etat-reglages]");
      etatTexte.textContent = "Envoi du logo en cours";
      preparerImage(fichier, 512, true).then(function (prepa) {
        var couleurs = [];
        try { couleurs = M.couleursDominantes(prepa.image); } catch (err) { couleurs = []; }
        proposerCouleurs(couleurs);
        if (couleurs[0]) definirCouleur(couleurs[0]);
        return envoyerFichier("logo", "logo", prepa);
      }).then(function (url) {
        brouillonLogo = url;
        majLogo();
        etatTexte.textContent = "Logo prêt. Cliquez sur Enregistrer pour le publier sur le site.";
        toast("Logo importé. Pensez à enregistrer.");
      }).catch(function (err) {
        etatTexte.textContent = "Les modifications s'appliquent au site dès l'enregistrement.";
        toast(messageErreur(err), "erreur");
      });
    });

    $("[data-logo-retirer]").addEventListener("click", function () {
      brouillonLogo = null;
      majLogo();
      proposerCouleurs([]);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bouton = $("[data-enregistrer-reglages]");
      var r = etat.reglages;
      var whatsapp = form.whatsapp.value.replace(/\D/g, "");
      if (whatsapp && !/^213[1-9]\d{7,8}$/.test(whatsapp)) {
        toast("Numéro WhatsApp invalide. Exemple : 213777319332", "erreur");
        form.whatsapp.focus();
        return;
      }
      var donnees = Object.assign({}, r, {
        nom: form.nom.value.trim() || "Menzah Store",
        slogan: form.slogan.value.trim(),
        bienvenue: form.bienvenue.value.trim(),
        adresse: Object.assign({}, r.adresse, { ligne: form.adresseLigne.value.trim(), ville: form.adresseVille.value.trim() }),
        googleMaps: form.googleMaps.value.trim(),
        carteRecherche: form.carteRecherche.value.trim(),
        horaires: lireListe("horaires"),
        telephones: lireListe("telephones"),
        whatsapp: whatsapp,
        messageWhatsapp: form.messageWhatsapp.value.trim(),
        livraison: form.livraison.checked,
        reseaux: {
          tiktok: { pseudo: form.tiktokPseudo.value.trim(), lien: form.tiktokLien.value.trim() },
          instagram: { pseudo: form.instagramPseudo.value.trim(), lien: form.instagramLien.value.trim() },
        },
        statistiques: { abonnesTiktok: form.abonnesTiktok.value.trim(), jaimeTiktok: form.jaimeTiktok.value.trim() },
        videosTiktok: lireListe("videos"),
        postsInstagram: lireListe("posts"),
        logo: brouillonLogo,
        logoRond: form.logoRond.checked,
        couleurs: Object.assign({}, r.couleurs, { accent: form.accentHex.value.toUpperCase() }),
      });
      bouton.disabled = true;
      bouton.setAttribute("aria-busy", "true");
      sb.from("menzah_reglages").upsert({ id: 1, donnees: donnees }).then(function (res) {
        if (res.error) throw res.error;
        etat.reglages = donnees;
        M.appliquer(donnees);
        $("[data-nom-boutique]").textContent = donnees.nom;
        $("[data-etat-reglages]").textContent = "Enregistré. Le site affiche déjà ces réglages.";
        toast("Réglages enregistrés.");
      }).catch(function (err) {
        toast(messageErreur(err), "erreur");
      }).then(function () {
        bouton.disabled = false;
        bouton.removeAttribute("aria-busy");
      });
    });

    var compte = $("[data-form-compte]");
    compte.addEventListener("submit", function (e) {
      e.preventDefault();
      var erreur = $("[data-compte-erreur]");
      erreur.hidden = true;
      var mdp = compte.mdp.value;
      if (mdp.length < 8) {
        erreur.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
        erreur.hidden = false;
        return;
      }
      if (mdp !== compte.mdp2.value) {
        erreur.textContent = "Les deux mots de passe ne sont pas identiques.";
        erreur.hidden = false;
        return;
      }
      sb.auth.updateUser({ password: mdp }).then(function (r) {
        if (r.error) throw r.error;
        compte.reset();
        toast("Mot de passe modifié.");
      }).catch(function (err) {
        erreur.textContent = messageErreur(err);
        erreur.hidden = false;
      });
    });
  }

  /* ---------- Démarrage ---------- */

  initConnexion();
  initCommandes();
  initProduits();
  initReglages();
  window.addEventListener("hashchange", ouvrirOnglet);
  setInterval(function () { if (etat.commandes.length) rendreCommandesDates(); }, 60000);

  function rendreCommandesDates() {
    $$(".cmd").forEach(function (carte) {
      var cmd = etat.commandes.filter(function (c) { return c.id === carte.getAttribute("data-id"); })[0];
      if (cmd) $(".cmd-date", carte).textContent = formatDate(cmd.created_at);
    });
  }

  sb.auth.onAuthStateChange(function (evenement) {
    if (evenement === "SIGNED_OUT") vue("connexion");
  });

  sb.auth.getSession().then(function (r) {
    var session = r.data && r.data.session;
    if (!session) {
      vue("connexion");
      return;
    }
    return entrer(session);
  }).catch(function (err) {
    vue("connexion");
    toast(messageErreur(err), "erreur");
  });
})();

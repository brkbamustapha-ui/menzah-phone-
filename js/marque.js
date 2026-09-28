/*
 * Identité visuelle : logo et couleur principale de la boutique.
 * La couleur est choisie dans le tableau de bord (Réglages) ; ce fichier en
 * déduit des variantes lisibles pour le thème clair et le thème sombre.
 */
(function () {
  "use strict";

  var FOND_CLAIR = "#F3F4F6";
  var FOND_SOMBRE = "#0C0E11";
  var ENCRE_CLAIRE = "#FFFFFF";
  var ENCRE_SOMBRE = "#0A0C0F";

  function versRvb(hex) {
    var h = String(hex || "").replace("#", "").trim();
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function versHex(rvb) {
    return "#" + rvb.map(function (c) {
      return Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0");
    }).join("").toUpperCase();
  }

  function versTsl(rvb) {
    var r = rvb[0] / 255, v = rvb[1] / 255, b = rvb[2] / 255;
    var max = Math.max(r, v, b), min = Math.min(r, v, b);
    var t = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) t = (v - b) / d + (v < b ? 6 : 0);
      else if (max === v) t = (b - r) / d + 2;
      else t = (r - v) / d + 4;
      t /= 6;
    }
    return [t, s, l];
  }

  function depuisTsl(t, s, l) {
    function canal(p, q, x) {
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    }
    if (s === 0) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [canal(p, q, t + 1 / 3) * 255, canal(p, q, t) * 255, canal(p, q, t - 1 / 3) * 255];
  }

  function luminance(hex) {
    var c = versRvb(hex).map(function (x) {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contraste(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // Décale la luminosité jusqu'à atteindre le contraste voulu avec le fond.
  function ajusterContraste(hex, fond, cible) {
    var tsl = versTsl(versRvb(hex));
    var sens = luminance(fond) > 0.5 ? -1 : 1;
    var l = tsl[2];
    var couleur = hex;
    for (var i = 0; i < 60 && contraste(couleur, fond) < cible; i++) {
      l = Math.max(0, Math.min(1, l + sens * 0.02));
      couleur = versHex(depuisTsl(tsl[0], tsl[1], l));
    }
    return couleur;
  }

  function melanger(a, b, part) {
    var x = versRvb(a), y = versRvb(b);
    return versHex([0, 1, 2].map(function (i) { return x[i] * part + y[i] * (1 - part); }));
  }

  function encrePour(fond) {
    return contraste(ENCRE_CLAIRE, fond) >= contraste(ENCRE_SOMBRE, fond) ? ENCRE_CLAIRE : ENCRE_SOMBRE;
  }

  function variantes(accent, fond, sombre) {
    var base = accent;
    if (sombre) {
      base = ajusterContraste(base, fond, 3);
    } else if (versTsl(versRvb(base))[1] < 0.25) {
      // couleur presque blanche ou grise : on la fonce un peu pour que le bouton se voie
      base = ajusterContraste(base, fond, 1.4);
    }
    var encre = encrePour(base);
    var tsl = versTsl(versRvb(base));
    // texte des boutons toujours lisible (4,5:1 minimum)
    for (var i = 0; i < 40 && contraste(encre, base) < 4.5; i++) {
      tsl[2] = Math.max(0, Math.min(1, tsl[2] + (encre === ENCRE_CLAIRE ? -0.01 : 0.01)));
      base = versHex(depuisTsl(tsl[0], tsl[1], tsl[2]));
    }
    var appui = versHex(depuisTsl(tsl[0], tsl[1], Math.max(0, Math.min(1, tsl[2] + (sombre ? 0.05 : -0.06)))));
    var doux = melanger(base, fond, sombre ? 0.2 : 0.16);
    var texte = ajusterContraste(base, fond, 4.6);
    texte = ajusterContraste(texte, doux, 4.5);
    return {
      "--accent": base,
      "--accent-press": appui,
      "--accent-ink": encre,
      "--accent-text": texte,
      "--accent-soft": doux,
    };
  }

  function palette(accent) {
    if (!versRvb(accent)) return null;
    return { clair: variantes(accent, FOND_CLAIR, false), sombre: variantes(accent, FOND_SOMBRE, true) };
  }

  function declarations(vars) {
    return Object.keys(vars).map(function (k) { return k + ":" + vars[k]; }).join(";");
  }

  function appliquerCouleur(accent) {
    var p = palette(accent);
    var style = document.getElementById("menzah-marque");
    if (!p) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = "menzah-marque";
      document.head.appendChild(style);
    }
    style.textContent =
      ":root{" + declarations(p.clair) + "}" +
      "@media (prefers-color-scheme: dark){:root{" + declarations(p.sombre) + "}}";
  }

  function appliquerLogo(url, rond) {
    var sur = typeof url === "string" && /^https:\/\//.test(url);
    document.querySelectorAll("img.logo-marque").forEach(function (img) {
      if (!img.dataset.defaut) img.dataset.defaut = img.getAttribute("src");
      img.src = sur ? url : img.dataset.defaut;
      img.classList.toggle("logo-photo", sur);
      img.classList.toggle("logo-rond", sur && rond !== false);
    });
    if (sur) {
      document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (l) {
        l.href = url;
        l.removeAttribute("type");
      });
    }
  }

  function appliquer(reglages) {
    reglages = reglages || {};
    var couleurs = reglages.couleurs || {};
    appliquerCouleur(couleurs.accent);
    appliquerLogo(reglages.logo, reglages.logoRond);
  }

  /*
   * Couleurs dominantes d'une image (pour proposer la couleur du logo).
   * Renvoie jusqu'à 4 couleurs, de la plus présente à la moins présente.
   */
  function couleursDominantes(image) {
    var taille = 72;
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = taille;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, taille, taille);
    var px = ctx.getImageData(0, 0, taille, taille).data;
    var groupes = {};
    var neutres = { clair: [0, 0, 0, 0], sombre: [0, 0, 0, 0] };
    for (var i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 128) continue;
      var rvb = [px[i], px[i + 1], px[i + 2]];
      var tsl = versTsl(rvb);
      if (tsl[1] < 0.2 || tsl[2] < 0.1 || tsl[2] > 0.93) {
        var n = tsl[2] < 0.5 ? neutres.sombre : neutres.clair;
        n[0] += rvb[0]; n[1] += rvb[1]; n[2] += rvb[2]; n[3]++;
        continue;
      }
      var cle = Math.round(tsl[0] * 18) % 18 + "-" + Math.round(tsl[2] * 4);
      var g = groupes[cle] || (groupes[cle] = [0, 0, 0, 0, 0]);
      var poids = 0.4 + tsl[1];
      g[0] += rvb[0] * poids; g[1] += rvb[1] * poids; g[2] += rvb[2] * poids; g[3] += poids; g[4]++;
    }
    var liste = Object.keys(groupes).map(function (k) {
      var g = groupes[k];
      return { hex: versHex([g[0] / g[3], g[1] / g[3], g[2] / g[3]]), poids: g[3] };
    }).sort(function (a, b) { return b.poids - a.poids; });

    var resultat = [];
    liste.forEach(function (c) {
      var proche = resultat.some(function (r) {
        var a = versRvb(r), b = versRvb(c.hex);
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60;
      });
      if (!proche && resultat.length < 4) resultat.push(c.hex);
    });
    if (neutres.sombre[3] > 30 && resultat.length < 4) {
      var s = neutres.sombre;
      resultat.push(versHex([s[0] / s[3], s[1] / s[3], s[2] / s[3]]));
    }
    return resultat;
  }

  window.MenzahMarque = {
    appliquer: appliquer,
    appliquerCouleur: appliquerCouleur,
    appliquerLogo: appliquerLogo,
    palette: palette,
    contraste: contraste,
    couleursDominantes: couleursDominantes,
  };
})();

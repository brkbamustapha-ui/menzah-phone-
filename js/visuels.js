/*
 * Visuels des produits.
 * Dessine chaque appareil en SVG, dans la couleur choisie, tant qu'aucune
 * photo n'est fournie dans produits.js (champ "image").
 */
(function () {
  "use strict";

  var compteur = 0;

  /* ---------- Couleurs ---------- */

  function hexVersRvb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rvbVersTsl(r, v, b) {
    r /= 255; v /= 255; b /= 255;
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

  function tslVersHex(t, s, l) {
    function canal(p, q, x) {
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    }
    var r, v, b;
    if (s === 0) {
      r = v = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = canal(p, q, t + 1 / 3);
      v = canal(p, q, t);
      b = canal(p, q, t - 1 / 3);
    }
    return "#" + [r, v, b].map(function (c) {
      return Math.round(c * 255).toString(16).padStart(2, "0");
    }).join("");
  }

  function borner(x) { return Math.max(0, Math.min(1, x)); }

  // Éclaircit (dl > 0) ou assombrit (dl < 0) une couleur, en points de luminosité.
  function nuance(hex, dl, ds) {
    var c = hexVersRvb(hex);
    var tsl = rvbVersTsl(c[0], c[1], c[2]);
    return tslVersHex(tsl[0], borner(tsl[1] + (ds || 0) / 100), borner(tsl[2] + dl / 100));
  }

  function estClair(hex) {
    var c = hexVersRvb(hex);
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 > 0.62;
  }

  /* ---------- Formes ---------- */

  function n(x) { return Math.round(x * 100) / 100; }

  // Rectangle arrondi sous forme de chemin
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return "M" + n(x + r) + "," + n(y) +
      "H" + n(x + w - r) + "A" + n(r) + "," + n(r) + " 0 0 1 " + n(x + w) + "," + n(y + r) +
      "V" + n(y + h - r) + "A" + n(r) + "," + n(r) + " 0 0 1 " + n(x + w - r) + "," + n(y + h) +
      "H" + n(x + r) + "A" + n(r) + "," + n(r) + " 0 0 1 " + n(x) + "," + n(y + h - r) +
      "V" + n(y + r) + "A" + n(r) + "," + n(r) + " 0 0 1 " + n(x + r) + "," + n(y) + "Z";
  }

  function cercle(cx, cy, r, attrs) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" ' + attrs + "/>";
  }

  function chemin(d, attrs) {
    return '<path d="' + d + '" ' + attrs + "/>";
  }

  /* ---------- Éléments d'appareil photo ---------- */

  function objectif(cx, cy, r, id) {
    return cercle(cx, cy, r, 'fill="url(#' + id + '-b)"') +
      cercle(cx, cy, r * 0.8, 'fill="#0b0c10"') +
      cercle(cx, cy, r * 0.58, 'fill="url(#' + id + '-v)"') +
      cercle(cx - r * 0.2, cy - r * 0.22, r * 0.13, 'fill="#fff" fill-opacity=".6"');
  }

  function flash(cx, cy, r) {
    r = r || 5.5;
    return cercle(cx, cy, r, 'fill="#f6f2e6"') + cercle(cx, cy, r * 0.62, 'fill="#e6d8a8"');
  }

  function capteur(cx, cy, r) {
    r = r || 5.5;
    return cercle(cx, cy, r, 'fill="#131418"') + cercle(cx, cy, r * 0.45, 'fill="#2c2f36"');
  }

  function micro(cx, cy) {
    return cercle(cx, cy, 1.6, 'fill="#000" fill-opacity=".35"');
  }

  // Bloc photo en verre surélevé
  function bloc(x, y, w, h, r, hex) {
    var clair = estClair(hex);
    return chemin(rr(x + 1.5, y + 2.5, w, h, r), 'fill="#000" fill-opacity=".12"') +
      chemin(rr(x, y, w, h, r), 'fill="' + nuance(hex, clair ? -5 : 7) + '"') +
      chemin(rr(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r - 0.75),
        'fill="none" stroke="#fff" stroke-opacity="' + (clair ? 0.6 : 0.25) + '" stroke-width="1.5"');
  }

  /* ---------- Dégradés communs ---------- */

  function defs(id, hex) {
    var clair = estClair(hex);
    return "<defs>" +
      '<linearGradient id="' + id + '-c" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + nuance(hex, 6) + '"/>' +
      '<stop offset=".55" stop-color="' + hex + '"/>' +
      '<stop offset="1" stop-color="' + nuance(hex, -7) + '"/>' +
      "</linearGradient>" +
      '<linearGradient id="' + id + '-r" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".30"/>' +
      '<stop offset=".4" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".10"/>' +
      "</linearGradient>" +
      '<linearGradient id="' + id + '-b" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + nuance(hex, clair ? -8 : 20) + '"/>' +
      '<stop offset="1" stop-color="' + nuance(hex, clair ? -42 : -14) + '"/>' +
      "</linearGradient>" +
      '<radialGradient id="' + id + '-v" cx=".38" cy=".35" r=".75">' +
      '<stop offset="0" stop-color="#4b5f8a"/>' +
      '<stop offset=".45" stop-color="#1a2034"/>' +
      '<stop offset="1" stop-color="#07080c"/>' +
      "</radialGradient>" +
      '<filter id="' + id + '-f" x="-50%" y="-50%" width="200%" height="200%">' +
      '<feGaussianBlur stdDeviation="7"/></filter>' +
      "</defs>";
  }

  /* ---------- Téléphones (vue de dos) ---------- */

  var T = { x: 40, y: 16, w: 180, h: 384 };

  function corps(hex, id, r, epaisseur) {
    var x = T.x, y = T.y, w = T.w, h = T.h;
    return '<ellipse cx="' + n(x + w / 2 + 6) + '" cy="' + n(y + h + 8) + '" rx="' + n(w * 0.46) +
      '" ry="9" fill="#000" opacity=".22" filter="url(#' + id + '-f)"/>' +
      chemin(rr(x + epaisseur, y + epaisseur * 0.8, w, h, r), 'fill="' + nuance(hex, -18) + '"') +
      chemin(rr(x, y, w, h, r), 'fill="url(#' + id + '-c)"');
  }

  function finition(hex, id, r) {
    var x = T.x, y = T.y, w = T.w, h = T.h;
    return chemin(rr(x, y, w, h, r), 'fill="url(#' + id + '-r)"') +
      chemin(rr(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r - 0.75),
        'fill="none" stroke="#fff" stroke-opacity="' + (estClair(hex) ? 0.55 : 0.22) + '" stroke-width="1.5"');
  }

  var modeles = {
    // iPhone 17 Pro, 17 Pro Max, 18 Pro Max : plateau photo sur toute la largeur
    plateau: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 30;
      var hp = h * 0.285;
      var s = corps(hex, id, r, 5);
      // panneau de verre sous le plateau
      s += chemin(rr(x + 11, y + hp + 9, w - 22, h - hp - 20, 20),
        'fill="' + nuance(hex, estClair(hex) ? 3 : 4, -10) + '" stroke="' + nuance(hex, -10) + '" stroke-opacity=".45"');
      // plateau surélevé
      s += chemin(rr(x + 3, y + 5, w - 6, hp + 2, 27), 'fill="#000" fill-opacity=".10"');
      s += chemin(rr(x + 3, y + 3, w - 6, hp, 27), 'fill="' + nuance(hex, estClair(hex) ? -3 : 6) + '"');
      s += chemin(rr(x + 3.75, y + 3.75, w - 7.5, hp - 1.5, 26),
        'fill="none" stroke="#fff" stroke-opacity="' + (estClair(hex) ? 0.6 : 0.28) + '" stroke-width="1.5"');
      var ro = w * 0.105;
      s += objectif(x + w * 0.2, y + h * 0.078, ro, id);
      s += objectif(x + w * 0.2, y + h * 0.205, ro, id);
      s += objectif(x + w * 0.42, y + h * 0.141, ro, id);
      s += flash(x + w * 0.8, y + h * 0.088);
      s += capteur(x + w * 0.8, y + h * 0.194);
      s += micro(x + w * 0.64, y + h * 0.141);
      return s + finition(hex, id, r);
    },

    // iPhone Air : barre photo horizontale, appareil très fin
    air: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 30;
      var s = corps(hex, id, r, 2.5);
      var hb = h * 0.115;
      s += chemin(rr(x + 9, y + 15, w - 18, hb, hb / 2), 'fill="#000" fill-opacity=".10"');
      s += chemin(rr(x + 9, y + 13, w - 18, hb, hb / 2), 'fill="' + nuance(hex, estClair(hex) ? -4 : 7) + '"');
      s += chemin(rr(x + 9.75, y + 13.75, w - 19.5, hb - 1.5, hb / 2 - 0.75),
        'fill="none" stroke="#fff" stroke-opacity="' + (estClair(hex) ? 0.6 : 0.28) + '" stroke-width="1.5"');
      var cy = y + 13 + hb / 2;
      s += objectif(x + w * 0.2, cy, hb * 0.36, id);
      s += flash(x + w * 0.39, cy, 5);
      s += micro(x + w * 0.5, cy);
      return s + finition(hex, id, r);
    },

    // iPhone 15 Pro, 16 Pro : trois objectifs en triangle
    pro: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 30;
      var s = corps(hex, id, r, 5);
      var m = w * 0.53, mx = x + 11, my = y + 11;
      s += bloc(mx, my, m, m, 26, hex);
      var ro = m * 0.215;
      s += objectif(mx + m * 0.285, my + m * 0.285, ro, id);
      s += objectif(mx + m * 0.285, my + m * 0.715, ro, id);
      s += objectif(mx + m * 0.72, my + m * 0.5, ro, id);
      s += flash(mx + m * 0.74, my + m * 0.19);
      s += capteur(mx + m * 0.74, my + m * 0.81);
      return s + finition(hex, id, r);
    },

    // iPhone 16, 17 : deux objectifs verticaux dans une gélule
    double: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 30;
      var s = corps(hex, id, r, 4);
      var m = w * 0.5, mx = x + 12, my = y + 12;
      s += bloc(mx, my, m, m, 24, hex);
      var gw = m * 0.5, gh = m * 0.88, gx = mx + m * 0.08, gy = my + m * 0.06;
      s += chemin(rr(gx, gy, gw, gh, gw / 2), 'fill="' + nuance(hex, estClair(hex) ? -14 : 12) + '"');
      s += chemin(rr(gx + 0.75, gy + 0.75, gw - 1.5, gh - 1.5, gw / 2 - 0.75),
        'fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"');
      var ro = gw * 0.4;
      s += objectif(gx + gw / 2, gy + gh * 0.27, ro, id);
      s += objectif(gx + gw / 2, gy + gh * 0.73, ro, id);
      s += flash(mx + m * 0.79, my + m * 0.3);
      s += micro(mx + m * 0.79, my + m * 0.52);
      return s + finition(hex, id, r);
    },

    // iPhone 13, 14, 15 : deux objectifs en diagonale
    diagonale: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 30;
      var s = corps(hex, id, r, 4);
      var m = w * 0.49, mx = x + 12, my = y + 12;
      s += bloc(mx, my, m, m, 24, hex);
      var ro = m * 0.21;
      s += objectif(mx + m * 0.29, my + m * 0.29, ro, id);
      s += objectif(mx + m * 0.71, my + m * 0.71, ro, id);
      s += flash(mx + m * 0.74, my + m * 0.26);
      s += micro(mx + m * 0.26, my + m * 0.74);
      return s + finition(hex, id, r);
    },

    // OPPO Find X9 Pro : îlot photo carré aux angles doux
    oppo: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 30;
      var s = corps(hex, id, r, 5);
      var m = w * 0.55, mx = x + 13, my = y + 13;
      var clair = estClair(hex);
      s += chemin(rr(mx + 1.5, my + 2.5, m, m, m * 0.3), 'fill="#000" fill-opacity=".14"');
      s += chemin(rr(mx, my, m, m, m * 0.3), 'fill="' + nuance(hex, clair ? -30 : -8) + '"');
      s += chemin(rr(mx + 3, my + 3, m - 6, m - 6, m * 0.27), 'fill="' + nuance(hex, clair ? -4 : 5) + '"');
      s += chemin(rr(mx + 3.75, my + 3.75, m - 7.5, m - 7.5, m * 0.27 - 0.75),
        'fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"');
      var ro = m * 0.19;
      s += objectif(mx + m * 0.3, my + m * 0.3, ro, id);
      s += objectif(mx + m * 0.3, my + m * 0.7, ro, id);
      s += objectif(mx + m * 0.7, my + m * 0.3, ro, id);
      s += flash(mx + m * 0.66, my + m * 0.72, 6);
      s += capteur(mx + m * 0.8, my + m * 0.62, 3.5);
      return s + finition(hex, id, r);
    },

    // Samsung Galaxy Ultra : objectifs alignés, angles plus carrés
    ultra: function (hex, id) {
      var x = T.x, y = T.y, w = T.w, h = T.h, r = 16;
      var s = corps(hex, id, r, 4);
      var ro = w * 0.088;
      [0.075, 0.168, 0.261].forEach(function (k) {
        s += cercle(x + w * 0.19, y + h * k, ro + 2.5, 'fill="' + nuance(hex, estClair(hex) ? -20 : 14) + '"');
        s += objectif(x + w * 0.19, y + h * k, ro, id);
      });
      s += cercle(x + w * 0.38, y + h * 0.1, ro * 0.62 + 2, 'fill="' + nuance(hex, estClair(hex) ? -20 : 14) + '"');
      s += objectif(x + w * 0.38, y + h * 0.1, ro * 0.62, id);
      s += flash(x + w * 0.38, y + h * 0.165, 4.5);
      s += capteur(x + w * 0.38, y + h * 0.212, 3);
      return s + finition(hex, id, r);
    },

    // Coque : téléphone vu de dos avec une coque par-dessus
    coque: function (hex, id) {
      var s = modeles.pro("#C3BDB3", id);
      var x = T.x - 6, y = T.y - 6, w = T.w + 12, h = T.h + 12;
      var m = T.w * 0.53 + 12, mx = T.x + 5, my = T.y + 5;
      var transparente = estClair(hex);
      var trou = rr(mx, my, m, m, 28);
      s += chemin(rr(x, y, w, h, 36) + trou,
        'fill-rule="evenodd" fill="' + hex + '" fill-opacity="' + (transparente ? 0.45 : 0.97) + '"');
      s += chemin(trou, 'fill="none" stroke="' + nuance(hex, -25) + '" stroke-opacity=".6" stroke-width="3"');
      s += chemin(rr(x + 1, y + 1, w - 2, h - 2, 35),
        'fill="none" stroke="#fff" stroke-opacity="' + (transparente ? 0.8 : 0.2) + '" stroke-width="2"');
      return s;
    },
  };

  /* ---------- Accessoires (cadre carré) ---------- */

  var accessoires = {
    airpods: function (hex, id) {
      var x = 42, y = 66, w = 176, h = 142;
      var s = '<ellipse cx="130" cy="' + (y + h + 10) + '" rx="80" ry="9" fill="#000" opacity=".2" filter="url(#' + id + '-f)"/>';
      s += chemin(rr(x + 3, y + 4, w, h, 50), 'fill="' + nuance(hex, -14) + '"');
      s += chemin(rr(x, y, w, h, 50), 'fill="url(#' + id + '-c)"');
      s += chemin("M" + (x + 3) + "," + (y + 50) + "H" + (x + w - 3), 'stroke="' + nuance(hex, -22) + '" stroke-width="2"');
      s += chemin("M" + (x + 3) + "," + (y + 52.5) + "H" + (x + w - 3), 'stroke="#fff" stroke-opacity=".8" stroke-width="1.5"');
      s += cercle(130, y + 82, 3.2, 'fill="#2f3a33"');
      s += chemin(rr(x + w - 3, y + 88, 9, 22, 4), 'fill="' + nuance(hex, -30) + '"');
      s += chemin(rr(x, y, w, h, 50), 'fill="url(#' + id + '-r)"');
      return s;
    },

    chargeur: function (hex, id) {
      var s = '<ellipse cx="130" cy="228" rx="64" ry="8" fill="#000" opacity=".2" filter="url(#' + id + '-f)"/>';
      s += chemin(rr(104, 170, 14, 50, 7), 'fill="#b9bcc1"');
      s += chemin(rr(142, 170, 14, 50, 7), 'fill="#b9bcc1"');
      s += chemin(rr(108, 172, 5, 44, 2.5), 'fill="#fff" fill-opacity=".6"');
      s += chemin(rr(146, 172, 5, 44, 2.5), 'fill="#fff" fill-opacity=".6"');
      s += chemin(rr(72, 50, 120, 128, 30), 'fill="' + nuance(hex, -14) + '"');
      s += chemin(rr(68, 44, 120, 128, 30), 'fill="url(#' + id + '-c)"');
      s += chemin(rr(110, 101, 36, 13, 6.5), 'fill="#1b1d21"');
      s += chemin(rr(114, 105, 28, 5, 2.5), 'fill="#3a3e46"');
      s += chemin(rr(68, 44, 120, 128, 30), 'fill="url(#' + id + '-r)"');
      return s;
    },
  };

  /* ---------- API ---------- */

  function rendre(visuel, hex, classe) {
    var id = "mz" + (++compteur);
    hex = hex || "#C3BDB3";
    var carre = accessoires.hasOwnProperty(visuel);
    var dessin = carre ? accessoires[visuel] : (modeles[visuel] || modeles.pro);
    var vue = carre ? "0 0 260 260" : "0 0 260 440";
    return '<svg class="' + (classe || "visuel") + '" viewBox="' + vue + '" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      defs(id, hex) + dessin(hex, id) + "</svg>";
  }

  window.MenzahVisuels = { rendre: rendre, nuance: nuance, estClair: estClair };
})();

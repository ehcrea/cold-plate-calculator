// Settings for tools/build-pages.js (language pages, SEO tags, sitemap).
'use strict';
const I18N = require('../js/i18n.js');

module.exports = {
  base: 'https://ehcrea.github.io/cold-plate-calculator/',
  repo: 'https://github.com/ehcrea/cold-plate-calculator',
  name: 'Cold Plate Calculator',
  ogImage: 'icons/og-image.png',
  langs: Object.keys(I18N.LANGS), // English first
  meta: I18N.meta(),
  featureList: ["Liquid- and gas-cooled cold plates", "2D temperature map with placed heat sources", "Coolant temperature rise and pressure drop", "Pump operating point and flow per channel", "PDF design report", "Metric and US units", "English, German, Dutch, Turkish and Spanish"],
  dict: (l) => I18N.dict()[l],
  blocks: () => I18N.html(),
  assets: /\b(href|src)="(icons\/|css\/|js\/|manifest\.webmanifest)/g,
};

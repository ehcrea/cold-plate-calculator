/*
 * Translations (English, German, Dutch, Turkish).
 *
 * Keys are the English texts, so untranslated strings fall back to English.
 * t(text, params) fills {name} placeholders; string parameters that are
 * themselves dictionary keys (material or fluid names, …) are translated too.
 * Static page text is translated by walking the DOM once and remembering the
 * English originals; dynamic text is produced through t().
 */
(function (root) {
  'use strict';

  const LANGS = {
    en: { name: 'English', locale: 'en-US' },
    de: { name: 'Deutsch', locale: 'de-DE' },
    nl: { name: 'Nederlands', locale: 'nl-NL' },
    tr: { name: 'Türkçe', locale: 'tr-TR' },
  };
  const STORE_KEY = 'coldplate.lang';

  // [English, German, Dutch, Turkish]
  const ROWS = [
    // ----- Page, toolbar -----
    ['Cold Plate Calculator', 'Kühlplatten-Rechner', 'Koelplaatcalculator', 'Soğutma Plakası Hesaplayıcı'],
    ['Liquid & gas cooled plates · v2 · 2D plate model', 'Flüssigkeits- & gasgekühlte Platten · v2 · 2D-Plattenmodell', 'Vloeistof- & gasgekoelde platen · v2 · 2D-plaatmodel', 'Sıvı ve gaz soğutmalı plakalar · v2 · 2B plaka modeli'],
    ['Application preset', 'Anwendungsvorlage', 'Toepassingsvoorbeeld', 'Uygulama şablonu'],
    ['Load application preset…', 'Anwendungsvorlage laden…', 'Toepassingsvoorbeeld laden…', 'Uygulama şablonu yükle…'],
    ['Unit system', 'Einheitensystem', 'Eenhedenstelsel', 'Birim sistemi'],
    ['Imperial', 'Imperial', 'Imperiaal', 'İngiliz'],
    ['Language', 'Sprache', 'Taal', 'Dil'],
    ['Copy a link containing this design', 'Link zu diesem Entwurf kopieren', 'Link naar dit ontwerp kopiëren', 'Bu tasarımın bağlantısını kopyala'],
    ['Copy link', 'Link kopieren', 'Link kopiëren', 'Bağlantıyı kopyala'],
    ['Download a PDF design report', 'PDF-Auslegungsbericht herunterladen', 'PDF-ontwerprapport downloaden', 'PDF tasarım raporunu indir'],
    ['Export PDF', 'PDF exportieren', 'PDF exporteren', 'PDF dışa aktar'],
    ['Print this page', 'Diese Seite drucken', 'Deze pagina afdrukken', 'Bu sayfayı yazdır'],
    ['Print', 'Drucken', 'Afdrukken', 'Yazdır'],
    ['Toggle light/dark theme', 'Hell/Dunkel umschalten', 'Licht/donker wisselen', 'Açık/koyu temayı değiştir'],
    ['Toggle theme', 'Design umschalten', 'Thema wisselen', 'Temayı değiştir'],

    // ----- Form -----
    ['Plate', 'Platte', 'Plaat', 'Plaka'],
    ['Length', 'Länge', 'Lengte', 'Uzunluk'],
    ['Width', 'Breite', 'Breedte', 'Genişlik'],
    ['Thickness', 'Dicke', 'Dikte', 'Kalınlık'],
    ['Material', 'Werkstoff', 'Materiaal', 'Malzeme'],
    ['Conductivity', 'Wärmeleitfähigkeit', 'Warmtegeleiding', 'Isıl iletkenlik'],
    ['Density', 'Dichte', 'Dichtheid', 'Yoğunluk'],
    ['Flow layout', 'Strömungsführung', 'Stromingsindeling', 'Akış düzeni'],
    ['Channel layout', 'Kanalanordnung', 'Kanaalindeling', 'Kanal düzeni'],
    ['Serpentine', 'Mäander', 'Meander', 'Serpantin'],
    ['Parallel · Z', 'Parallel · Z', 'Parallel · Z', 'Paralel · Z'],
    ['Parallel · U', 'Parallel · U', 'Parallel · U', 'Paralel · U'],
    ['Channels run', 'Kanalrichtung', 'Kanaalrichting', 'Kanal yönü'],
    ['Along length', 'Entlang der Länge', 'Langs de lengte', 'Boyuna'],
    ['Along width', 'Entlang der Breite', 'Langs de breedte', 'Enine'],
    ['Passes', 'Durchgänge', 'Doorgangen', 'Geçiş sayısı'],
    ['Channels', 'Kanäle', 'Kanalen', 'Kanal sayısı'],
    ['Parallel circuits', 'Parallele Kreise', 'Parallelle circuits', 'Paralel devre'],
    ['Edge margin', 'Randabstand', 'Randafstand', 'Kenar payı'],
    ['Header width', 'Verteilerbreite', 'Verdelerbreedte', 'Kollektör genişliği'],
    ['Header depth', 'Verteilertiefe', 'Verdelerdiepte', 'Kollektör derinliği'],
    ['= channel', '= Kanal', '= kanaal', '= kanal'],
    ['Port inner Ø', 'Anschluss innen Ø', 'Aansluiting binnen-Ø', 'Bağlantı iç Ø'],
    ['Mirror ports', 'Anschlüsse spiegeln', 'Aansluitingen spiegelen', 'Bağlantıları aynala'],
    ['Channel section', 'Kanalquerschnitt', 'Kanaaldoorsnede', 'Kanal kesiti'],
    ['Channel shape', 'Kanalform', 'Kanaalvorm', 'Kanal şekli'],
    ['Round', 'Rund', 'Rond', 'Yuvarlak'],
    ['Square', 'Quadratisch', 'Vierkant', 'Kare'],
    ['Rectangular', 'Rechteckig', 'Rechthoekig', 'Dikdörtgen'],
    ['Diameter', 'Durchmesser', 'Diameter', 'Çap'],
    ['Depth', 'Tiefe', 'Diepte', 'Derinlik'],
    ['Side', 'Seite', 'Zijde', 'Kenar'],
    ['Wall to heated face', 'Wand zur beheizten Fläche', 'Wand tot verwarmd vlak', 'Isıtılan yüzeye et kalınlığı'],
    ['Wall roughness', 'Wandrauheit', 'Wandruwheid', 'Yüzey pürüzlülüğü'],
    ['Coolant', 'Kühlmittel', 'Koelmiddel', 'Soğutucu akışkan'],
    ['Fluid', 'Medium', 'Medium', 'Akışkan'],
    ['Specific heat', 'Spez. Wärmekapazität', 'Soortelijke warmte', 'Özgül ısı'],
    ['Viscosity', 'Viskosität', 'Viscositeit', 'Viskozite'],
    ['Freezing point', 'Gefrierpunkt', 'Vriespunt', 'Donma noktası'],
    ['Boiling point', 'Siedepunkt', 'Kookpunt', 'Kaynama noktası'],
    ['Inlet temperature', 'Eintrittstemperatur', 'Inlaattemperatuur', 'Giriş sıcaklığı'],
    ['Inlet pressure', 'Eintrittsdruck', 'Inlaatdruk', 'Giriş basıncı'],
    ['Flow source', 'Durchflussquelle', 'Debietbron', 'Debi kaynağı'],
    ['Fixed flow rate', 'Fester Durchfluss', 'Vast debiet', 'Sabit debi'],
    ['Pump curve', 'Pumpenkennlinie', 'Pompcurve', 'Pompa eğrisi'],
    ['Flow given as', 'Durchfluss als', 'Debiet als', 'Debi türü'],
    ['Volume flow', 'Volumenstrom', 'Volumedebiet', 'Hacimsel debi'],
    ['Mass flow', 'Massenstrom', 'Massadebiet', 'Kütlesel debi'],
    ['Standard flow', 'Normvolumenstrom', 'Normaal debiet', 'Standart debi'],
    ['Flow rate', 'Durchfluss', 'Debiet', 'Debi'],
    ['Pump / blower curve', 'Pumpen-/Gebläsekennlinie', 'Pomp-/ventilatorcurve', 'Pompa / fan eğrisi'],
    ['Flow', 'Durchfluss', 'Debiet', 'Debi'],
    ['Pressure rise', 'Druckerhöhung', 'Drukverhoging', 'Basınç artışı'],
    ['+ Add curve point', '+ Kurvenpunkt hinzufügen', '+ Curvepunt toevoegen', '+ Eğri noktası ekle'],
    ['Rest of loop ΔP', 'ΔP restlicher Kreislauf', 'ΔP rest van circuit', 'Devrenin geri kalanı ΔP'],
    ['… at flow', '… bei Durchfluss', '… bij debiet', '… debide'],
    ['Rest of loop = pipes, fittings, radiator and anything else in series with the plate. Its pressure drop scales with flow².',
      'Restlicher Kreislauf = Rohre, Fittings, Kühler und alles andere in Reihe mit der Platte. Sein Druckverlust steigt mit dem Durchfluss².',
      'Rest van circuit = leidingen, fittingen, radiator en alles wat in serie met de plaat staat. De drukval schaalt met debiet².',
      'Devrenin geri kalanı = borular, bağlantı parçaları, radyatör ve plakayla seri bağlı diğer her şey. Basınç düşümü debinin karesiyle değişir.'],
    ['Heat input', 'Wärmeeintrag', 'Warmte-inbreng', 'Isı girişi'],
    ['Heat applied as', 'Wärme aufgebracht als', 'Warmte aangebracht als', 'Isı uygulama şekli'],
    ['Discrete heat sources (components)', 'Einzelne Wärmequellen (Bauteile)', 'Afzonderlijke warmtebronnen (componenten)', 'Ayrık ısı kaynakları (bileşenler)'],
    ['Uniform over whole plate face', 'Gleichmäßig über die ganze Plattenfläche', 'Gelijkmatig over het hele plaatvlak', 'Tüm plaka yüzeyine eşit'],
    ['Uniform over channel area', 'Gleichmäßig über den Kanalbereich', 'Gelijkmatig over het kanaalgebied', 'Kanal bölgesine eşit'],
    ['Calculation mode', 'Berechnungsmodus', 'Rekenmodus', 'Hesap modu'],
    ['Find max. heat', 'Max. Wärme ermitteln', 'Max. warmte bepalen', 'Maks. ısıyı bul'],
    ['Find surface temp.', 'Oberflächentemp. ermitteln', 'Oppervlaktetemp. bepalen', 'Yüzey sıcaklığını bul'],
    ['Max. surface temp.', 'Max. Oberflächentemp.', 'Max. oppervlaktetemp.', 'Maks. yüzey sıcaklığı'],
    ['Heat load', 'Wärmelast', 'Warmtelast', 'Isı yükü'],
    ['Heat sources', 'Wärmequellen', 'Warmtebronnen', 'Isı kaynakları'],
    ["x, y = centre of each component, measured from the plate's top-left corner (or drag it on the plate layout). The TIM is the layer between component and plate: thickness, conductivity k, and contact resistance for both faces.",
      'x, y = Mittelpunkt jedes Bauteils, gemessen von der linken oberen Plattenecke (oder auf dem Plattenlayout ziehen). Das TIM ist die Schicht zwischen Bauteil und Platte: Dicke, Wärmeleitfähigkeit k und Kontaktwiderstand beider Grenzflächen.',
      'x, y = middelpunt van elke component, gemeten vanaf de linkerbovenhoek van de plaat (of sleep hem op de plaatindeling). Het TIM is de laag tussen component en plaat: dikte, warmtegeleiding k en contactweerstand van beide vlakken.',
      'x, y = her bileşenin merkezi, plakanın sol üst köşesinden ölçülür (veya plaka düzeninde sürükleyin). TIM, bileşen ile plaka arasındaki katmandır: kalınlık, ısıl iletkenlik k ve her iki yüzeyin temas direnci.'],
    ['+ Add heat source', '+ Wärmequelle hinzufügen', '+ Warmtebron toevoegen', '+ Isı kaynağı ekle'],

    // ----- Result cards -----
    ['Max. heat dissipation', 'Max. Wärmeabfuhr', 'Max. warmteafvoer', 'Maks. ısı atımı'],
    ['Plate layout', 'Plattenlayout', 'Plaatindeling', 'Plaka düzeni'],
    ['Cross-section (detail)', 'Querschnitt (Detail)', 'Doorsnede (detail)', 'Kesit (detay)'],
    ['Plate surface temperature (2D)', 'Plattenoberflächentemperatur (2D)', 'Plaatoppervlaktetemperatuur (2D)', 'Plaka yüzey sıcaklığı (2B)'],
    ['Hover over the map to read the local temperature. Channel paths are shown in white.',
      'Mit der Maus über die Karte fahren, um die lokale Temperatur abzulesen. Kanalverläufe sind weiß dargestellt.',
      'Beweeg over de kaart om de lokale temperatuur af te lezen. Kanaalbanen zijn wit weergegeven.',
      'Yerel sıcaklığı okumak için imleci haritanın üzerine getirin. Kanal yolları beyaz gösterilir.'],
    ['Component temperatures', 'Bauteiltemperaturen', 'Componenttemperaturen', 'Bileşen sıcaklıkları'],
    ['Flow distribution between channels', 'Durchflussverteilung auf die Kanäle', 'Debietverdeling over de kanalen', 'Kanallar arası debi dağılımı'],
    ["Channel 1 is nearest the inlet port. Manifold model: header friction and momentum (pressure regain in the inlet header, extra loss in the outlet header) against each channel's own pressure drop.",
      'Kanal 1 liegt dem Eintrittsanschluss am nächsten. Verteilermodell: Reibung und Impuls in den Verteilern (Druckrückgewinn im Eintrittsverteiler, Zusatzverlust im Austrittssammler) gegen den Druckverlust jedes Kanals.',
      'Kanaal 1 ligt het dichtst bij de inlaat. Verdelermodel: wrijving en impuls in de verdelers (drukterugwinning in de inlaatverdeler, extra verlies in de uitlaatcollector) tegenover de drukval van elk kanaal.',
      'Kanal 1 giriş bağlantısına en yakın olandır. Kollektör modeli: kollektörlerdeki sürtünme ve momentum (giriş kollektöründe basınç geri kazanımı, çıkış kollektöründe ek kayıp) her kanalın kendi basınç düşümüyle dengelenir.'],
    ['Results', 'Ergebnisse', 'Resultaten', 'Sonuçlar'],
    ['Thermal resistance breakdown', 'Aufteilung des Wärmewiderstands', 'Opbouw thermische weerstand', 'Isıl direnç dağılımı'],
    ['1D model, uniform heat: peak surface → coolant inlet. The largest share is where to improve.',
      '1D-Modell, gleichmäßige Wärme: max. Oberfläche → Kühlmitteleintritt. Der größte Anteil zeigt, wo sich Verbesserungen lohnen.',
      '1D-model, gelijkmatige warmte: piekoppervlak → koelmiddelinlaat. Het grootste aandeel is waar verbetering loont.',
      '1B model, eşit ısı: en sıcak yüzey → soğutucu girişi. En büyük pay, iyileştirme yapılacak yeri gösterir.'],
    ['Pressure drop breakdown', 'Aufteilung des Druckverlusts', 'Opbouw drukval', 'Basınç düşümü dağılımı'],
    ['Ports, headers and bends are estimates (fixed loss coefficients).', 'Anschlüsse, Verteiler und Umlenkungen sind Schätzwerte (feste Verlustbeiwerte).', 'Aansluitingen, verdelers en bochten zijn schattingen (vaste verliescoëfficiënten).', 'Bağlantılar, kollektörler ve dirsekler tahminidir (sabit kayıp katsayıları).'],
    ['Heat dissipation vs. flow', 'Wärmeabfuhr über Durchfluss', 'Warmteafvoer t.o.v. debiet', 'Debiye göre ısı atımı'],
    ['Pressure drop vs. flow', 'Druckverlust über Durchfluss', 'Drukval t.o.v. debiet', 'Debiye göre basınç düşümü'],
    ['Method, assumptions & limits', 'Methode, Annahmen & Grenzen', 'Methode, aannames & beperkingen', 'Yöntem, varsayımlar ve sınırlar'],

    // ----- App: selects, editors -----
    ['Custom curve', 'Eigene Kennlinie', 'Eigen curve', 'Özel eğri'],
    ['Water & glycols', 'Wasser & Glykole', 'Water & glycolen', 'Su ve glikoller'],
    ['Dielectric fluids & oils', 'Dielektrische Fluide & Öle', 'Diëlektrische vloeistoffen & oliën', 'Dielektrik akışkanlar ve yağlar'],
    ['Gases', 'Gase', 'Gassen', 'Gazlar'],
    ['Other', 'Sonstige', 'Overig', 'Diğer'],
    ['Remove point', 'Punkt entfernen', 'Punt verwijderen', 'Noktayı sil'],
    ['Power', 'Leistung', 'Vermogen', 'Güç'],
    ['Temp. limit', 'Temp.-Grenze', 'Temp.-limiet', 'Sıcaklık sınırı'],
    ['Source {n}', 'Quelle {n}', 'Bron {n}', 'Kaynak {n}'],
    ['Source name', 'Name der Quelle', 'Naam van bron', 'Kaynak adı'],
    ['Duplicate', 'Duplizieren', 'Dupliceren', 'Çoğalt'],
    ['Remove', 'Entfernen', 'Verwijderen', 'Sil'],
    ['Thermal interface (TIM)', 'Wärmeleitmaterial (TIM)', 'Thermisch interfacemateriaal (TIM)', 'Isıl arayüz malzemesi (TIM)'],
    ['TIM total {z} → {R} → ΔT ≈ {dT} at {P}', 'TIM gesamt {z} → {R} → ΔT ≈ {dT} bei {P}', 'TIM totaal {z} → {R} → ΔT ≈ {dT} bij {P}', 'TIM toplam {z} → {R} → {P} için ΔT ≈ {dT}'],
    ['{n} sources, total {P}', '{n} Quellen, gesamt {P}', '{n} bronnen, totaal {P}', '{n} kaynak, toplam {P}'],
    ['1 source, total {P}', '1 Quelle, gesamt {P}', '1 bron, totaal {P}', '1 kaynak, toplam {P}'],
    ['No heat sources yet.', 'Noch keine Wärmequellen.', 'Nog geen warmtebronnen.', 'Henüz ısı kaynağı yok.'],
    ['At inlet: ρ {rho}, cp {cp}, μ {mu}', 'Am Eintritt: ρ {rho}, cp {cp}, μ {mu}', 'Bij inlaat: ρ {rho}, cp {cp}, μ {mu}', 'Girişte: ρ {rho}, cp {cp}, μ {mu}'],
    [' · freezes at {T}', ' · gefriert bei {T}', ' · bevriest bij {T}', ' · donma noktası {T}'],
    ['Even number of passes: inlet and outlet on the same edge.', 'Gerade Anzahl Durchgänge: Ein- und Austritt an derselben Kante.', 'Even aantal doorgangen: inlaat en uitlaat aan dezelfde rand.', 'Çift geçiş sayısı: giriş ve çıkış aynı kenarda.'],
    ['Odd number of passes: inlet and outlet on opposite edges.', 'Ungerade Anzahl Durchgänge: Ein- und Austritt an gegenüberliegenden Kanten.', 'Oneven aantal doorgangen: inlaat en uitlaat aan tegenoverliggende randen.', 'Tek geçiş sayısı: giriş ve çıkış karşı kenarlarda.'],
    ['Z-type: inlet and outlet at opposite corners (reverse return).', 'Z-Typ: Ein- und Austritt an gegenüberliegenden Ecken (Tichelmann).', 'Z-type: inlaat en uitlaat in tegenoverliggende hoeken (reverse return).', 'Z tipi: giriş ve çıkış karşı köşelerde (ters dönüş).'],
    ['U-type: inlet and outlet on the same side.', 'U-Typ: Ein- und Austritt auf derselben Seite.', 'U-type: inlaat en uitlaat aan dezelfde zijde.', 'U tipi: giriş ve çıkış aynı tarafta.'],
    ['Loaded preset: {name}', 'Vorlage geladen: {name}', 'Voorbeeld geladen: {name}', 'Şablon yüklendi: {name}'],
    ['Link copied to clipboard', 'Link in die Zwischenablage kopiert', 'Link naar klembord gekopieerd', 'Bağlantı panoya kopyalandı'],
    ['Link updated in the address bar', 'Link in der Adressleiste aktualisiert', 'Link bijgewerkt in de adresbalk', 'Bağlantı adres çubuğunda güncellendi'],
    ['Preparing…', 'Wird erstellt…', 'Bezig…', 'Hazırlanıyor…'],
    ['PDF report downloaded', 'PDF-Bericht heruntergeladen', 'PDF-rapport gedownload', 'PDF raporu indirildi'],
    ['PDF export failed — use Print → Save as PDF instead', 'PDF-Export fehlgeschlagen – stattdessen Drucken → Als PDF speichern verwenden', 'PDF-export mislukt — gebruik Afdrukken → Opslaan als PDF', 'PDF dışa aktarılamadı — bunun yerine Yazdır → PDF olarak kaydet seçeneğini kullanın'],
    ['Calculation failed: {msg}', 'Berechnung fehlgeschlagen: {msg}', 'Berekening mislukt: {msg}', 'Hesaplama başarısız: {msg}'],
    ['Fix the geometry errors above to see the layout.', 'Beheben Sie die Geometriefehler oben, um das Layout zu sehen.', 'Los de geometriefouten hierboven op om de indeling te zien.', 'Düzeni görmek için yukarıdaki geometri hatalarını düzeltin.'],

    // ----- App: pump and design checks -----
    ['Pump curve: {msg} Results below use the fixed flow rate instead.', 'Pumpenkennlinie: {msg} Die Ergebnisse unten verwenden stattdessen den festen Durchfluss.', 'Pompcurve: {msg} De resultaten hieronder gebruiken in plaats daarvan het vaste debiet.', 'Pompa eğrisi: {msg} Aşağıdaki sonuçlar bunun yerine sabit debiyi kullanır.'],
    ['Enter at least two pump curve points.', 'Mindestens zwei Kennlinienpunkte eingeben.', 'Voer minstens twee punten van de pompcurve in.', 'En az iki pompa eğrisi noktası girin.'],
    ['The pump curve needs a positive shut-off pressure and flow.', 'Die Pumpenkennlinie braucht einen positiven Nullförderdruck und Durchfluss.', 'De pompcurve heeft een positieve afsluitdruk en een positief debiet nodig.', 'Pompa eğrisi pozitif kapama basıncı ve debi gerektirir.'],
    ['Plate geometry is invalid.', 'Die Plattengeometrie ist ungültig.', 'De plaatgeometrie is ongeldig.', 'Plaka geometrisi geçersiz.'],
    ['The pump cannot overcome the plate and loop pressure drop.', 'Die Pumpe kann den Druckverlust von Platte und Kreislauf nicht überwinden.', 'De pomp kan de drukval van plaat en circuit niet overwinnen.', 'Pompa, plaka ve devre basınç düşümünü yenemiyor.'],
    ['The operating point is at the end of the pump curve — extend the curve to higher flow for an accurate result.', 'Der Betriebspunkt liegt am Ende der Pumpenkennlinie – für ein genaues Ergebnis die Kennlinie zu höherem Durchfluss verlängern.', 'Het werkpunt ligt aan het einde van de pompcurve — verleng de curve naar een hoger debiet voor een nauwkeurig resultaat.', 'Çalışma noktası pompa eğrisinin sonunda — doğru sonuç için eğriyi daha yüksek debiye uzatın.'],
    ['The pump runs at only {pct} % of its maximum flow (near shut-off) — the system is very restrictive or the pump is oversized.', 'Die Pumpe läuft nur bei {pct} % ihres maximalen Durchflusses (nahe Nullförderung) – das System ist sehr restriktiv oder die Pumpe überdimensioniert.', 'De pomp draait op slechts {pct} % van het maximale debiet (bijna afgesloten) — het systeem is erg beperkend of de pomp is overgedimensioneerd.', 'Pompa maksimum debisinin yalnızca %{pct} kadarında çalışıyor (kapamaya yakın) — sistem çok kısıtlayıcı veya pompa gereğinden büyük.'],
    ['The pump runs at {pct} % of its maximum flow, where curves are least accurate and efficiency is usually low.', 'Die Pumpe läuft bei {pct} % ihres maximalen Durchflusses, wo Kennlinien am ungenauesten sind und der Wirkungsgrad meist niedrig ist.', 'De pomp draait op {pct} % van het maximale debiet, waar curves het minst nauwkeurig zijn en het rendement meestal laag is.', 'Pompa maksimum debisinin %{pct} kadarında çalışıyor; bu bölgede eğriler en az doğrudur ve verim genellikle düşüktür.'],
    ['Operating point: {q} at {dp} (plate {plate}, rest of loop {loop}) · {pct} % of max pump flow', 'Betriebspunkt: {q} bei {dp} (Platte {plate}, restlicher Kreislauf {loop}) · {pct} % des max. Pumpendurchflusses', 'Werkpunt: {q} bij {dp} (plaat {plate}, rest van circuit {loop}) · {pct} % van max. pompdebiet', 'Çalışma noktası: {q}, {dp} (plaka {plate}, devrenin geri kalanı {loop}) · maks. pompa debisinin %{pct} kadarı'],
    ['Add at least one heat source, or switch "Heat applied as" to a uniform option.', 'Mindestens eine Wärmequelle hinzufügen oder „Wärme aufgebracht als“ auf eine gleichmäßige Option stellen.', 'Voeg minstens één warmtebron toe, of zet "Warmte aangebracht als" op een gelijkmatige optie.', 'En az bir ısı kaynağı ekleyin veya "Isı uygulama şekli" seçeneğini eşit dağılıma çevirin.'],
    ['{name} extends beyond the plate edge — only {pct} % of its footprint is on the plate.', '{name} ragt über den Plattenrand hinaus – nur {pct} % der Grundfläche liegen auf der Platte.', '{name} steekt buiten de plaatrand uit — slechts {pct} % van het oppervlak ligt op de plaat.', '{name} plaka kenarından taşıyor — taban alanının yalnızca %{pct} kadarı plaka üzerinde.'],
    ['{name} exceeds its temperature limit: {T} vs. {limit}.', '{name} überschreitet seine Temperaturgrenze: {T} gegenüber {limit}.', '{name} overschrijdt de temperatuurlimiet: {T} t.o.v. {limit}.', '{name} sıcaklık sınırını aşıyor: {T} (sınır {limit}).'],
    ['The 2D map differs from the quick 1D estimate by {pct} % — it resolves hot spots at plate edges and between channels that the 1D model averages out.', 'Die 2D-Karte weicht um {pct} % von der schnellen 1D-Abschätzung ab – sie löst Hotspots an Plattenrändern und zwischen Kanälen auf, die das 1D-Modell mittelt.', 'De 2D-kaart wijkt {pct} % af van de snelle 1D-schatting — ze toont hotspots aan plaatranden en tussen kanalen die het 1D-model uitmiddelt.', '2B harita hızlı 1B tahminden %{pct} farklı — 1B modelin ortaladığı plaka kenarlarındaki ve kanallar arasındaki sıcak noktaları çözümler.'],
    ['Plate surface temperature varies by {dT} (battery modules typically target < {lim}).', 'Die Plattenoberflächentemperatur schwankt um {dT} (Batteriemodule zielen typischerweise auf < {lim}).', 'De plaatoppervlaktetemperatuur varieert met {dT} (batterijmodules streven doorgaans naar < {lim}).', 'Plaka yüzey sıcaklığı {dT} değişiyor (batarya modüllerinde hedef genellikle < {lim}).'],

    // ----- App: headline and results -----
    ['Hottest component · {name}', 'Heißestes Bauteil · {name}', 'Heetste component · {name}', 'En sıcak bileşen · {name}'],
    ['{T} {fluid} inlet', '{T} {fluid} am Eintritt', '{T} {fluid} bij inlaat', 'girişte {T} {fluid}'],
    ['{Q} total with {inlet} · power can rise ×{f} (to {Qmax}) before the first limit', '{Q} gesamt bei {inlet} · Leistung kann um ×{f} (auf {Qmax}) steigen, bevor die erste Grenze erreicht ist', '{Q} totaal met {inlet} · vermogen kan ×{f} stijgen (tot {Qmax}) vóór de eerste limiet', 'Toplam {Q}, {inlet} · güç ilk sınıra ulaşmadan ×{f} artabilir ({Qmax} değerine kadar)'],
    ['{Q} total with {inlet} · over limit: reduce power to ×{f} ({Qmax})', '{Q} gesamt bei {inlet} · Grenze überschritten: Leistung auf ×{f} ({Qmax}) senken', '{Q} totaal met {inlet} · boven limiet: verlaag het vermogen tot ×{f} ({Qmax})', 'Toplam {Q}, {inlet} · sınır aşıldı: gücü ×{f} değerine düşürün ({Qmax})'],
    ['peak surface ≤ {T} with {inlet}', 'max. Oberfläche ≤ {T} bei {inlet}', 'piekoppervlak ≤ {T} met {inlet}', 'en yüksek yüzey ≤ {T}, {inlet}'],
    ['at {Q}{alt} with {inlet}', 'bei {Q}{alt} mit {inlet}', 'bij {Q}{alt} met {inlet}', '{Q}{alt}, {inlet}'],
    ['Check the inputs', 'Eingaben prüfen', 'Controleer de invoer', 'Girdileri kontrol edin'],
    ['Peak surface temperature', 'Max. Oberflächentemperatur', 'Max. oppervlaktetemperatuur', 'En yüksek yüzey sıcaklığı'],
    ['Peak plate surface', 'Max. Plattenoberfläche', 'Max. plaatoppervlak', 'En yüksek plaka yüzeyi'],
    ['Coolant outlet', 'Kühlmittelaustritt', 'Koelmiddeluitlaat', 'Soğutucu çıkışı'],
    ['Pressure drop', 'Druckverlust', 'Drukval', 'Basınç düşümü'],
    ['Thermal resistance', 'Wärmewiderstand', 'Thermische weerstand', 'Isıl direnç'],
    ['Add a heat source to see the temperature map.', 'Wärmequelle hinzufügen, um die Temperaturkarte zu sehen.', 'Voeg een warmtebron toe om de temperatuurkaart te zien.', 'Sıcaklık haritasını görmek için bir ısı kaynağı ekleyin.'],
    ['No map — resolve the errors above.', 'Keine Karte – beheben Sie die Fehler oben.', 'Geen kaart — los de fouten hierboven op.', 'Harita yok — yukarıdaki hataları giderin.'],
    ['Lowest: channel {a} at {pa} % of average · highest: channel {b} at {pb} % · spread (std. dev.) ±{cv} %', 'Niedrigster: Kanal {a} mit {pa} % des Mittelwerts · höchster: Kanal {b} mit {pb} % · Streuung (Std.-Abw.) ±{cv} %', 'Laagste: kanaal {a} op {pa} % van gemiddeld · hoogste: kanaal {b} op {pb} % · spreiding (std.afw.) ±{cv} %', 'En düşük: kanal {a}, ortalamanın %{pa} kadarı · en yüksek: kanal {b}, %{pb} · dağılım (std. sapma) ±%{cv}'],
    ['Channel', 'Kanal', 'Kanaal', 'Kanal'],
    ['Flow (% of average)', 'Durchfluss (% vom Mittel)', 'Debiet (% van gemiddeld)', 'Debi (ortalamanın %)'],
    ['Channel {i}: {pct} %', 'Kanal {i}: {pct} %', 'Kanaal {i}: {pct} %', 'Kanal {i}: %{pct}'],
    [' · outlet {T}', ' · Austritt {T}', ' · uitlaat {T}', ' · çıkış {T}'],
    ['average', 'Mittelwert', 'gemiddeld', 'ortalama'],
    ['Coolant {T}', 'Kühlmittel {T}', 'Koelmiddel {T}', 'Soğutucu {T}'],
    ['{T} (hottest channel)', '{T} (heißester Kanal)', '{T} (heetste kanaal)', '{T} (en sıcak kanal)'],
    ['TIM ΔT', 'TIM ΔT', 'TIM ΔT', 'TIM ΔT'],
    ['Rjc', 'Rjc', 'Rjc', 'Rjc'],
    ['Component', 'Bauteil', 'Component', 'Bileşen'],
    ['Plate avg / max', 'Platte Mittel / max', 'Plaat gem. / max', 'Plaka ort. / maks'],
    ['Case', 'Gehäuse', 'Behuizing', 'Kasa'],
    ['Junction', 'Sperrschicht', 'Junctie', 'Jonksiyon'],
    ['Limit', 'Grenze', 'Limiet', 'Sınır'],
    ['Margin', 'Reserve', 'Marge', 'Pay'],
    ['Status', 'Status', 'Status', 'Durum'],
    ['✓ OK', '✓ OK', '✓ OK', '✓ Uygun'],
    ['⚠ Over limit', '⚠ Über Grenze', '⚠ Boven limiet', '⚠ Sınır aşıldı'],
    ['Error', 'Fehler', 'Fout', 'Hata'],
    ['Warning', 'Warnung', 'Waarschuwing', 'Uyarı'],
    ['Note', 'Hinweis', 'Opmerking', 'Not'],
    ['Coolant temperature rise', 'Kühlmittelerwärmung', 'Temperatuurstijging koelmiddel', 'Soğutucu sıcaklık artışı'],
    ['Volume flow (mean)', 'Volumenstrom (mittel)', 'Volumedebiet (gem.)', 'Hacimsel debi (ort.)'],
    ['Channel velocity', 'Kanalgeschwindigkeit', 'Kanaalsnelheid', 'Kanal hızı'],
    ['port {v}', 'Anschluss {v}', 'aansluiting {v}', 'bağlantı {v}'],
    ['Reynolds number', 'Reynolds-Zahl', 'Reynoldsgetal', 'Reynolds sayısı'],
    ['Laminar', 'Laminar', 'Laminair', 'Laminer'],
    ['Turbulent', 'Turbulent', 'Turbulent', 'Türbülanslı'],
    ['Transitional', 'Übergangsbereich', 'Overgangsgebied', 'Geçiş bölgesi'],
    ['Prandtl number', 'Prandtl-Zahl', 'Prandtlgetal', 'Prandtl sayısı'],
    ['Heat transfer coeff.', 'Wärmeübergangskoeff.', 'Warmteoverdrachtscoëff.', 'Isı taşınım katsayısı'],
    ['Hydraulic diameter', 'Hydraulischer Durchmesser', 'Hydraulische diameter', 'Hidrolik çap'],
    ['Channel length', 'Kanallänge', 'Kanaallengte', 'Kanal uzunluğu'],
    ['{n} × in parallel', '{n} × parallel', '{n} × parallel', '{n} × paralel'],
    ['Effective wetted area', 'Effektive benetzte Fläche', 'Effectief bevochtigd oppervlak', 'Efektif ıslak alan'],
    ['fin efficiency {pct} %', 'Rippenwirkungsgrad {pct} %', 'vinrendement {pct} %', 'kanatçık verimi %{pct}'],
    ['NTU / effectiveness', 'NTU / Wirksamkeit', 'NTU / effectiviteit', 'NTU / etkinlik'],
    ['Max. component heat flux', 'Max. Wärmestromdichte Bauteil', 'Max. warmteflux component', 'Maks. bileşen ısı akısı'],
    ['Average heat flux', 'Mittlere Wärmestromdichte', 'Gemiddelde warmteflux', 'Ortalama ısı akısı'],
    ['Plate temperature spread', 'Temperaturspreizung der Platte', 'Temperatuurspreiding plaat', 'Plaka sıcaklık farkı'],
    ['2D map, max − min', '2D-Karte, max − min', '2D-kaart, max − min', '2B harita, maks − min'],
    ['Hydraulic pump power', 'Hydraulische Pumpenleistung', 'Hydraulisch pompvermogen', 'Hidrolik pompa gücü'],
    ['Plate mass (dry)', 'Plattenmasse (trocken)', 'Plaatmassa (droog)', 'Plaka kütlesi (kuru)'],
    ['Coolant volume', 'Kühlmittelvolumen', 'Koelmiddelvolume', 'Soğutucu hacmi'],
    ['Mach number', 'Mach-Zahl', 'Machgetal', 'Mach sayısı'],
    ['Boiling point (1 atm)', 'Siedepunkt (1 atm)', 'Kookpunt (1 atm)', 'Kaynama noktası (1 atm)'],
    ['Boiling point at inlet p', 'Siedepunkt bei Eintrittsdruck', 'Kookpunt bij inlaatdruk', 'Giriş basıncında kaynama noktası'],
    ['1D check (same power, uniform)', '1D-Kontrolle (gleiche Leistung, gleichmäßig)', '1D-controle (zelfde vermogen, gelijkmatig)', '1B kontrol (aynı güç, eşit)'],
    ['peak {T}', 'max. {T}', 'piek {T}', 'en yüksek {T}'],
    ['1D quick estimate', '1D-Schnellabschätzung', 'Snelle 1D-schatting', '1B hızlı tahmin'],
    ['uniform-heat model', 'Modell mit gleichmäßiger Wärme', 'model met gelijkmatige warmte', 'eşit ısı modeli'],
    ['2D grid', '2D-Gitter', '2D-raster', '2B ızgara'],
    ['{nx} × {ny} cells', '{nx} × {ny} Zellen', '{nx} × {ny} cellen', '{nx} × {ny} hücre'],
    ['{d} cell size', 'Zellgröße {d}', 'celgrootte {d}', 'hücre boyutu {d}'],
    ['No results — resolve the errors above.', 'Keine Ergebnisse – beheben Sie die Fehler oben.', 'Geen resultaten — los de fouten hierboven op.', 'Sonuç yok — yukarıdaki hataları giderin.'],
    ['Coolant heating (flow capacity)', 'Kühlmittelerwärmung (Wärmekapazitätsstrom)', 'Opwarming koelmiddel (warmtecapaciteitsstroom)', 'Soğutucu ısınması (ısıl kapasite debisi)'],
    ['Convection to coolant', 'Konvektion ins Kühlmittel', 'Convectie naar koelmiddel', 'Soğutucuya taşınım'],
    ['Conduction through wall', 'Wärmeleitung durch die Wand', 'Geleiding door de wand', 'Duvar boyunca iletim'],
    ['Lateral spreading', 'Seitliche Spreizung', 'Laterale spreiding', 'Yanal yayılma'],
    ['Channel friction', 'Kanalreibung', 'Kanaalwrijving', 'Kanal sürtünmesi'],
    ['180° bends', '180°-Umlenkungen', '180°-bochten', '180° dirsekler'],
    ['Channel entry/exit', 'Kanalein-/-austritt', 'Kanaalin-/uitlaat', 'Kanal giriş/çıkışı'],
    ['Headers', 'Verteiler', 'Verdelers', 'Kollektörler'],
    ['Ports', 'Anschlüsse', 'Aansluitingen', 'Bağlantılar'],

    // ----- Charts -----
    ['Flow ({u})', 'Durchfluss ({u})', 'Debiet ({u})', 'Debi ({u})'],
    ['Hottest component vs. flow', 'Heißestes Bauteil über Durchfluss', 'Heetste component t.o.v. debiet', 'Debiye göre en sıcak bileşen'],
    ['Peak surface temperature vs. flow', 'Max. Oberflächentemperatur über Durchfluss', 'Max. oppervlaktetemperatuur t.o.v. debiet', 'Debiye göre en yüksek yüzey sıcaklığı'],
    ['Calculating…', 'Wird berechnet…', 'Berekenen…', 'Hesaplanıyor…'],
    ['Hottest junction ({u})', 'Heißeste Sperrschicht ({u})', 'Heetste junctie ({u})', 'En sıcak jonksiyon ({u})'],
    ['Peak surface ({u})', 'Max. Oberfläche ({u})', 'Max. oppervlak ({u})', 'En yüksek yüzey ({u})'],
    ['Heat (W)', 'Wärme (W)', 'Warmte (W)', 'Isı (W)'],
    ['Pump vs. system curve', 'Pumpen- vs. Anlagenkennlinie', 'Pomp- vs. systeemcurve', 'Pompa ve sistem eğrisi'],
    ['Pump', 'Pumpe', 'Pomp', 'Pompa'],
    ['System (plate + loop)', 'Anlage (Platte + Kreislauf)', 'Systeem (plaat + circuit)', 'Sistem (plaka + devre)'],
    ['System', 'Anlage', 'Systeem', 'Sistem'],
    ['Plate only', 'Nur Platte', 'Alleen plaat', 'Yalnız plaka'],
    ['Pressure ({u})', 'Druck ({u})', 'Druk ({u})', 'Basınç ({u})'],
    ['Pressure drop ({u})', 'Druckverlust ({u})', 'Drukval ({u})', 'Basınç düşümü ({u})'],
    ['at {x}', 'bei {x}', 'bij {x}', '{x} değerinde'],
    ['Not enough valid points to plot.', 'Nicht genug gültige Punkte zum Darstellen.', 'Niet genoeg geldige punten om te tekenen.', 'Çizmek için yeterli geçerli nokta yok.'],

    // ----- Drawings -----
    ['IN', 'EIN', 'IN', 'GİRİŞ'],
    ['OUT', 'AUS', 'UIT', 'ÇIKIŞ'],
    ['Heat', 'Wärme', 'Warmte', 'Isı'],
    ['wall {v}', 'Wand {v}', 'wand {v}', 'et {v}'],
    ['depth {v}', 'Tiefe {v}', 'diepte {v}', 'derinlik {v}'],
    ['back {v}', 'Rückwand {v}', 'achterwand {v}', 'arka et {v}'],
    ['pitch {v}', 'Teilung {v}', 'steek {v}', 'adım {v}'],
    ['◯ hottest point', '◯ heißester Punkt', '◯ heetste punt', '◯ en sıcak nokta'],

    // ----- Design checks from the solver -----
    ['Header depth plus heated-face wall exceeds plate thickness.', 'Verteilertiefe plus Wand zur beheizten Fläche überschreitet die Plattendicke.', 'Verdelerdiepte plus wand tot verwarmd vlak is groter dan de plaatdikte.', 'Kollektör derinliği ile ısıtılan yüzey et kalınlığının toplamı plaka kalınlığını aşıyor.'],
    ['Plate dimensions must be positive.', 'Plattenabmessungen müssen positiv sein.', 'Plaatafmetingen moeten positief zijn.', 'Plaka boyutları pozitif olmalıdır.'],
    ['Channel dimensions must be positive.', 'Kanalabmessungen müssen positiv sein.', 'Kanaalafmetingen moeten positief zijn.', 'Kanal boyutları pozitif olmalıdır.'],
    ['Channels do not fit: {n} runs need a pitch larger than the channel width. Reduce the count or the channel width, or widen the plate.', 'Kanäle passen nicht: {n} Bahnen brauchen eine Teilung größer als die Kanalbreite. Anzahl oder Kanalbreite verringern oder die Platte verbreitern.', 'Kanalen passen niet: {n} banen hebben een steek groter dan de kanaalbreedte nodig. Verlaag het aantal of de kanaalbreedte, of verbreed de plaat.', 'Kanallar sığmıyor: {n} kanal için adım, kanal genişliğinden büyük olmalı. Kanal sayısını veya genişliğini azaltın ya da plakayı genişletin.'],
    ['Wall between channels is under 1 mm (0.04 in) — check manufacturability.', 'Wand zwischen den Kanälen unter 1 mm (0,04 in) – Fertigbarkeit prüfen.', 'Wand tussen kanalen is kleiner dan 1 mm (0,04 in) — controleer de maakbaarheid.', 'Kanallar arası et 1 mm (0,04 in) altında — üretilebilirliği kontrol edin.'],
    ['No straight channel length left after margins, bends and headers. Reduce margins/header width.', 'Nach Rändern, Umlenkungen und Verteilern bleibt keine gerade Kanallänge. Ränder/Verteilerbreite verringern.', 'Na randen, bochten en verdelers blijft geen rechte kanaallengte over. Verklein randen/verdelerbreedte.', 'Kenar payları, dirsekler ve kollektörlerden sonra düz kanal uzunluğu kalmıyor. Kenar paylarını/kollektör genişliğini azaltın.'],
    ['Channel depth plus heated-face wall exceeds plate thickness.', 'Kanaltiefe plus Wand zur beheizten Fläche überschreitet die Plattendicke.', 'Kanaaldiepte plus wand tot verwarmd vlak is groter dan de plaatdikte.', 'Kanal derinliği ile ısıtılan yüzey et kalınlığının toplamı plaka kalınlığını aşıyor.'],
    ['Back wall (opposite the heated face) is under 1 mm — check pressure rating and sealing/brazing.', 'Rückwand (gegenüber der beheizten Fläche) unter 1 mm – Druckfestigkeit und Abdichtung/Lötung prüfen.', 'Achterwand (tegenover het verwarmde vlak) is kleiner dan 1 mm — controleer drukklasse en afdichting/solderen.', 'Arka et (ısıtılan yüzeyin karşısı) 1 mm altında — basınç dayanımını ve sızdırmazlık/lehimlemeyi kontrol edin.'],
    ['Heated-face wall thickness must be positive.', 'Wanddicke zur beheizten Fläche muss positiv sein.', 'Wanddikte tot verwarmd vlak moet positief zijn.', 'Isıtılan yüzey et kalınlığı pozitif olmalıdır.'],
    ['Heated-face wall is under 1 mm — check flatness and machining limits.', 'Wand zur beheizten Fläche unter 1 mm – Ebenheit und Bearbeitungsgrenzen prüfen.', 'Wand tot verwarmd vlak is kleiner dan 1 mm — controleer vlakheid en bewerkingsgrenzen.', 'Isıtılan yüzey et kalınlığı 1 mm altında — düzlemselliği ve işleme sınırlarını kontrol edin.'],
    ['Flow rate must be positive.', 'Der Durchfluss muss positiv sein.', 'Het debiet moet positief zijn.', 'Debi pozitif olmalıdır.'],
    ['Channel velocity {v} exceeds the ~{vmax} erosion-corrosion guideline for {mat}.', 'Kanalgeschwindigkeit {v} überschreitet den Richtwert von ~{vmax} gegen Erosionskorrosion für {mat}.', 'Kanaalsnelheid {v} overschrijdt de richtlijn van ~{vmax} tegen erosiecorrosie voor {mat}.', 'Kanal hızı {v}, {mat} için ~{vmax} erozyon-korozyon sınırını aşıyor.'],
    ['Port velocity {v} is high — consider a larger port/fitting.', 'Anschlussgeschwindigkeit {v} ist hoch – größeren Anschluss/Fitting erwägen.', 'Snelheid in aansluiting {v} is hoog — overweeg een grotere aansluiting/fitting.', 'Bağlantı hızı {v} yüksek — daha büyük bağlantı/fitting düşünün.'],
    ['Channel velocity is below {v} — risk of air entrapment and fouling; flow may not purge bubbles.', 'Kanalgeschwindigkeit unter {v} – Gefahr von Lufteinschlüssen und Ablagerungen; Blasen werden evtl. nicht ausgespült.', 'Kanaalsnelheid is lager dan {v} — risico op luchtinsluiting en vervuiling; bellen worden mogelijk niet afgevoerd.', 'Kanal hızı {v} altında — hava sıkışması ve kirlenme riski; akış kabarcıkları atamayabilir.'],
    ['Inlet temperature is at or near the freezing point of {fluid} ({T}).', 'Die Eintrittstemperatur liegt am oder nahe dem Gefrierpunkt von {fluid} ({T}).', 'De inlaattemperatuur ligt op of nabij het vriespunt van {fluid} ({T}).', 'Giriş sıcaklığı {fluid} donma noktasında veya ona yakın ({T}).'],
    ['Peak surface temperature is within {dT} of the coolant boiling point (~{T} at 1 atm) — local boiling possible.', 'Die max. Oberflächentemperatur liegt innerhalb von {dT} am Siedepunkt des Kühlmittels (~{T} bei 1 atm) – lokales Sieden möglich.', 'De max. oppervlaktetemperatuur ligt binnen {dT} van het kookpunt van het koelmiddel (~{T} bij 1 atm) — lokaal koken mogelijk.', 'En yüksek yüzey sıcaklığı soğutucunun kaynama noktasına {dT} yakın (~{T}, 1 atm) — yerel kaynama olabilir.'],
    ['Peak surface temperature is within {dT} of the coolant boiling point (~{T} at inlet pressure) — local boiling possible.', 'Die max. Oberflächentemperatur liegt innerhalb von {dT} am Siedepunkt des Kühlmittels (~{T} bei Eintrittsdruck) – lokales Sieden möglich.', 'De max. oppervlaktetemperatuur ligt binnen {dT} van het kookpunt van het koelmiddel (~{T} bij inlaatdruk) — lokaal koken mogelijk.', 'En yüksek yüzey sıcaklığı soğutucunun kaynama noktasına {dT} yakın (~{T}, giriş basıncında) — yerel kaynama olabilir.'],
    ['{fluid} is a dielectric coolant (safe on live electronics), but its heat capacity and conductivity are far below water/glycol — expect lower performance and check seal/material compatibility.', '{fluid} ist ein dielektrisches Kühlmittel (sicher an spannungsführender Elektronik), aber Wärmekapazität und Wärmeleitfähigkeit liegen weit unter Wasser/Glykol – geringere Leistung erwarten und Verträglichkeit von Dichtungen/Werkstoffen prüfen.', '{fluid} is een diëlektrisch koelmiddel (veilig op spanningvoerende elektronica), maar de warmtecapaciteit en warmtegeleiding liggen ver onder water/glycol — reken op lagere prestaties en controleer de compatibiliteit van afdichtingen/materialen.', '{fluid} dielektrik bir soğutucudur (gerilim altındaki elektronikte güvenli), ancak ısı kapasitesi ve iletkenliği su/glikolün çok altındadır — daha düşük performans bekleyin ve conta/malzeme uyumluluğunu kontrol edin.'],
    ['Aluminium with plain water: use inhibited coolant or controlled DI water to avoid corrosion.', 'Aluminium mit reinem Wasser: inhibiertes Kühlmittel oder kontrolliertes VE-Wasser verwenden, um Korrosion zu vermeiden.', 'Aluminium met gewoon water: gebruik geïnhibeerd koelmiddel of gecontroleerd gedemineraliseerd water om corrosie te voorkomen.', 'Alüminyum ve saf su: korozyonu önlemek için inhibitörlü soğutucu veya kontrollü deiyonize su kullanın.'],
    ['Copper ions can poison fuel-cell membranes — keep copper out of the stack coolant loop.', 'Kupferionen können Brennstoffzellenmembranen vergiften – Kupfer aus dem Stack-Kühlkreis fernhalten.', 'Koperionen kunnen brandstofcelmembranen vergiftigen — houd koper uit het koelcircuit van de stack.', 'Bakır iyonları yakıt hücresi membranlarını zehirleyebilir — bakırı yığın soğutma devresinden uzak tutun.'],
    ['Mach {M} in channels — compressibility is significant; results unreliable above Mach 0.3.', 'Mach {M} in den Kanälen – Kompressibilität ist erheblich; Ergebnisse oberhalb Mach 0,3 unzuverlässig.', 'Mach {M} in de kanalen — samendrukbaarheid is aanzienlijk; resultaten boven Mach 0,3 zijn onbetrouwbaar.', 'Kanallarda Mach {M} — sıkıştırılabilirlik önemli; Mach 0,3 üzerinde sonuçlar güvenilir değil.'],
    ['Pressure drop is {pct} % of inlet pressure — density changes along the plate are not modelled; treat results as rough.', 'Der Druckverlust beträgt {pct} % des Eintrittsdrucks – Dichteänderungen entlang der Platte werden nicht modelliert; Ergebnisse als grob betrachten.', 'De drukval is {pct} % van de inlaatdruk — dichtheidsveranderingen langs de plaat worden niet gemodelleerd; beschouw de resultaten als ruw.', 'Basınç düşümü giriş basıncının %{pct} kadarı — plaka boyunca yoğunluk değişimi modellenmiyor; sonuçları kaba kabul edin.'],
    ['Above ~50 bar the ideal-gas assumption becomes inaccurate (especially for H₂).', 'Oberhalb von ~50 bar wird die Annahme des idealen Gases ungenau (besonders für H₂).', 'Boven ~50 bar wordt de ideale-gasaanname onnauwkeurig (vooral voor H₂).', '~50 bar üzerinde ideal gaz varsayımı hassasiyetini kaybeder (özellikle H₂ için).'],
    ['Hydrogen: use H₂-compatible materials and seals; follow ISO 19880 / leak-tightness requirements.', 'Wasserstoff: H₂-verträgliche Werkstoffe und Dichtungen verwenden; ISO 19880 / Dichtheitsanforderungen beachten.', 'Waterstof: gebruik H₂-compatibele materialen en afdichtingen; volg ISO 19880 / eisen voor lekdichtheid.', 'Hidrojen: H₂ uyumlu malzeme ve contalar kullanın; ISO 19880 / sızdırmazlık gereksinimlerine uyun.'],
    ['Titanium absorbs hydrogen and can embrittle — not recommended in H₂ service.', 'Titan nimmt Wasserstoff auf und kann verspröden – für H₂ nicht empfohlen.', 'Titaan neemt waterstof op en kan verbrossen — niet aanbevolen voor H₂.', 'Titanyum hidrojen emer ve gevrekleşebilir — H₂ uygulamalarında önerilmez.'],
    ['Uneven flow split: channel {ch} gets only {min} % of the average flow (max {max} %). Widen or deepen the headers, try a U-type layout, or make the channels more restrictive.', 'Ungleichmäßige Durchflussverteilung: Kanal {ch} erhält nur {min} % des mittleren Durchflusses (max. {max} %). Verteiler breiter oder tiefer machen, eine U-Anordnung probieren oder die Kanäle restriktiver gestalten.', 'Ongelijke debietverdeling: kanaal {ch} krijgt slechts {min} % van het gemiddelde debiet (max {max} %). Maak de verdelers breder of dieper, probeer een U-indeling of maak de kanalen restrictiever.', 'Dengesiz debi dağılımı: kanal {ch} ortalama debinin yalnızca %{min} kadarını alıyor (maks %{max}). Kollektörleri genişletin veya derinleştirin, U tipi düzen deneyin ya da kanalları daha kısıtlayıcı yapın.'],
    ['Uneven flow split: channel {ch} gets only {min} % of the average flow (max {max} %). Widen or deepen the headers, or make the channels more restrictive.', 'Ungleichmäßige Durchflussverteilung: Kanal {ch} erhält nur {min} % des mittleren Durchflusses (max. {max} %). Verteiler breiter oder tiefer machen oder die Kanäle restriktiver gestalten.', 'Ongelijke debietverdeling: kanaal {ch} krijgt slechts {min} % van het gemiddelde debiet (max {max} %). Maak de verdelers breder of dieper, of maak de kanalen restrictiever.', 'Dengesiz debi dağılımı: kanal {ch} ortalama debinin yalnızca %{min} kadarını alıyor (maks %{max}). Kollektörleri genişletin veya derinleştirin ya da kanalları daha kısıtlayıcı yapın.'],
    ['Channel flows range from {min} % to {max} % of the average.', 'Die Kanaldurchflüsse liegen zwischen {min} % und {max} % des Mittelwerts.', 'De kanaaldebieten variëren van {min} % tot {max} % van het gemiddelde.', 'Kanal debileri ortalamanın %{min} ile %{max} arasında.'],
    ['Fluid temperature outside property data range ({a} … {b}) — properties extrapolated as constant.', 'Fluidtemperatur außerhalb des Stoffdatenbereichs ({a} … {b}) – Stoffwerte konstant extrapoliert.', 'Vloeistoftemperatuur buiten het bereik van de stofgegevens ({a} … {b}) — eigenschappen constant geëxtrapoleerd.', 'Akışkan sıcaklığı özellik verisi aralığının dışında ({a} … {b}) — özellikler sabit kabul edildi.'],
    ['Pressure drop is {dp} (above 1 bar) — check pump capability and plate pressure rating.', 'Der Druckverlust beträgt {dp} (über 1 bar) – Pumpenleistung und Druckfestigkeit der Platte prüfen.', 'De drukval is {dp} (boven 1 bar) — controleer de pomp en de drukklasse van de plaat.', 'Basınç düşümü {dp} (1 bar üzeri) — pompa kapasitesini ve plakanın basınç dayanımını kontrol edin.'],
    ['Coolant temperature rise is {dT} — consider more flow for better uniformity.', 'Die Kühlmittelerwärmung beträgt {dT} – für bessere Gleichmäßigkeit mehr Durchfluss erwägen.', 'De temperatuurstijging van het koelmiddel is {dT} — overweeg meer debiet voor een betere gelijkmatigheid.', 'Soğutucu sıcaklık artışı {dT} — daha iyi homojenlik için debiyi artırmayı düşünün.'],
    ['Max. surface temperature must be above the coolant inlet temperature.', 'Die max. Oberflächentemperatur muss über der Kühlmitteleintrittstemperatur liegen.', 'De max. oppervlaktetemperatuur moet boven de inlaattemperatuur van het koelmiddel liggen.', 'Maks. yüzey sıcaklığı soğutucu giriş sıcaklığının üzerinde olmalıdır.'],
    ['Channel wall fin efficiency is low ({pct} %) — plate material conducts poorly for this channel depth.', 'Der Rippenwirkungsgrad der Kanalwände ist niedrig ({pct} %) – der Plattenwerkstoff leitet für diese Kanaltiefe schlecht.', 'Het vinrendement van de kanaalwanden is laag ({pct} %) — het plaatmateriaal geleidt slecht voor deze kanaaldiepte.', 'Kanal duvarı kanatçık verimi düşük (%{pct}) — plaka malzemesi bu kanal derinliği için zayıf iletiyor.'],

    // ----- Data: presets, materials, fluids, pumps, TIMs -----
    ['Power electronics – inverter / IGBT cold plate', 'Leistungselektronik – Wechselrichter-/IGBT-Kühlplatte', 'Vermogenselektronica – omvormer-/IGBT-koelplaat', 'Güç elektroniği – invertör / IGBT soğutma plakası'],
    ['EV battery module – brazed cold plate', 'EV-Batteriemodul – gelötete Kühlplatte', 'EV-batterijmodule – hardgesoldeerde koelplaat', 'EV batarya modülü – sert lehimli soğutma plakası'],
    ['Fuel-cell stack / DC-DC cooling plate', 'Brennstoffzellenstack / DC-DC-Kühlplatte', 'Brandstofcelstack / DC-DC-koelplaat', 'Yakıt hücresi yığını / DC-DC soğutma plakası'],
    ['Hydrogen gas-cooled plate', 'Wasserstoffgekühlte Platte', 'Waterstofgekoelde plaat', 'Hidrojen gazı soğutmalı plaka'],
    ['EV on-board charger – SiC MOSFETs, transformer and inductor', 'EV-Bordladegerät – SiC-MOSFETs, Transformator und Drossel', 'EV-boordlader – SiC-MOSFETs, transformator en smoorspoel', 'EV araç içi şarj cihazı – SiC MOSFET, transformatör ve bobin'],
    ['Industrial drive – three IGBT modules, sized with a pump curve', 'Industrieantrieb – drei IGBT-Module, ausgelegt mit Pumpenkennlinie', 'Industriële aandrijving – drie IGBT-modules, gedimensioneerd met pompcurve', 'Endüstriyel sürücü – üç IGBT modülü, pompa eğrisiyle boyutlandırılmış'],
    ['Data centre – GPU / AI accelerator microchannel cold plate', 'Rechenzentrum – Mikrokanal-Kühlplatte für GPU / KI-Beschleuniger', 'Datacenter – microkanaal-koelplaat voor GPU / AI-versneller', 'Veri merkezi – GPU / yapay zekâ hızlandırıcı mikrokanal soğutma plakası'],
    ['Stationary storage (BESS) module – bottom cold plate', 'Stationärer Speicher (BESS) – Bodenkühlplatte', 'Stationaire opslag (BESS) – bodemkoelplaat', 'Sabit enerji depolama (BESS) modülü – alt soğutma plakası'],
    ['GaN RF power amplifier – soldered transistors on copper', 'GaN-HF-Leistungsverstärker – gelötete Transistoren auf Kupfer', 'GaN RF-eindversterker – gesoldeerde transistors op koper', 'GaN RF güç yükselteci – bakıra lehimli transistörler'],
    ['Avionics chassis cold wall – PAO coolant', 'Avionik-Gehäusekühlwand – PAO-Kühlmittel', 'Avionica-chassiskoelwand – PAO-koelmiddel', 'Aviyonik şasi soğutma duvarı – PAO soğutucu'],
    ['Fuel-cell DC/DC – air-cooled plate with blower', 'Brennstoffzellen-DC/DC – luftgekühlte Platte mit Gebläse', 'Brandstofcel-DC/DC – luchtgekoelde plaat met ventilator', 'Yakıt hücresi DC/DC – fanlı hava soğutmalı plaka'],
    ['Power electronics', 'Leistungselektronik', 'Vermogenselektronica', 'Güç elektroniği'],
    ['Data centre & computing', 'Rechenzentrum & Computing', 'Datacenter & computing', 'Veri merkezi ve bilişim'],
    ['Battery & energy storage', 'Batterie & Energiespeicher', 'Batterij & energieopslag', 'Batarya ve enerji depolama'],
    ['Fuel cell & hydrogen', 'Brennstoffzelle & Wasserstoff', 'Brandstofcel & waterstof', 'Yakıt hücresi ve hidrojen'],
    ['RF, lasers & high flux', 'HF, Laser & hohe Wärmestromdichte', 'RF, lasers & hoge warmteflux', 'RF, lazer ve yüksek ısı akısı'],
    ['Aerospace & defence', 'Luftfahrt & Verteidigung', 'Lucht- en ruimtevaart & defensie', 'Havacılık ve savunma'],
    ['High-flux copper plate (SiC module / laser)', 'Kupferplatte für hohe Wärmestromdichte (SiC-Modul / Laser)', 'Koperen plaat voor hoge warmteflux (SiC-module / laser)', 'Yüksek ısı akılı bakır plaka (SiC modül / lazer)'],
    ['Aluminium 6061-T6', 'Aluminium 6061-T6', 'Aluminium 6061-T6', 'Alüminyum 6061-T6'],
    ['Aluminium 6063-T5 (extrusion)', 'Aluminium 6063-T5 (Strangpressprofil)', 'Aluminium 6063-T5 (extrusie)', 'Alüminyum 6063-T5 (ekstrüzyon)'],
    ['Aluminium 3003 (brazed)', 'Aluminium 3003 (hartgelötet)', 'Aluminium 3003 (hardgesoldeerd)', 'Alüminyum 3003 (sert lehimli)'],
    ['Aluminium 1100', 'Aluminium 1100', 'Aluminium 1100', 'Alüminyum 1100'],
    ['Copper C110 (ETP)', 'Kupfer C110 (ETP)', 'Koper C110 (ETP)', 'Bakır C110 (ETP)'],
    ['Copper C101 (OFE)', 'Kupfer C101 (OFE)', 'Koper C101 (OFE)', 'Bakır C101 (OFE)'],
    ['Stainless steel 304', 'Edelstahl 304', 'Roestvast staal 304', 'Paslanmaz çelik 304'],
    ['Stainless steel 316L', 'Edelstahl 316L', 'Roestvast staal 316L', 'Paslanmaz çelik 316L'],
    ['Titanium Grade 2', 'Titan Grade 2', 'Titaan Grade 2', 'Titanyum Grade 2'],
    ['Custom…', 'Benutzerdefiniert…', 'Aangepast…', 'Özel…'],
    ['Water (DI)', 'Wasser (VE)', 'Water (gedemineraliseerd)', 'Su (deiyonize)'],
    ['Ethylene glycol 30 % (vol)', 'Ethylenglykol 30 % (Vol.)', 'Ethyleenglycol 30 % (vol)', 'Etilen glikol %30 (hacim)'],
    ['Ethylene glycol 50 % (vol)', 'Ethylenglykol 50 % (Vol.)', 'Ethyleenglycol 50 % (vol)', 'Etilen glikol %50 (hacim)'],
    ['Propylene glycol 30 % (vol)', 'Propylenglykol 30 % (Vol.)', 'Propyleenglycol 30 % (vol)', 'Propilen glikol %30 (hacim)'],
    ['Propylene glycol 50 % (vol)', 'Propylenglykol 50 % (Vol.)', 'Propyleenglycol 50 % (vol)', 'Propilen glikol %50 (hacim)'],
    ['PAO (polyalphaolefin, avionics coolant)', 'PAO (Polyalphaolefin, Avionik-Kühlmittel)', 'PAO (polyalfaolefine, avionica-koelmiddel)', 'PAO (polialfaolefin, aviyonik soğutucu)'],
    ['Mineral oil (transformer oil)', 'Mineralöl (Transformatorenöl)', 'Minerale olie (transformatorolie)', 'Mineral yağ (transformatör yağı)'],
    ['Silicone oil (PDMS, 5 cSt)', 'Silikonöl (PDMS, 5 cSt)', 'Siliconeolie (PDMS, 5 cSt)', 'Silikon yağı (PDMS, 5 cSt)'],
    ['PFPE dielectric fluid (bp ≈135 °C)', 'PFPE-Dielektrikum (Sdp. ≈135 °C)', 'PFPE diëlektrische vloeistof (kp ≈135 °C)', 'PFPE dielektrik akışkan (kn ≈135 °C)'],
    ['HFE dielectric fluid (bp ≈128 °C)', 'HFE-Dielektrikum (Sdp. ≈128 °C)', 'HFE diëlektrische vloeistof (kp ≈128 °C)', 'HFE dielektrik akışkan (kn ≈128 °C)'],
    ['Custom liquid…', 'Eigene Flüssigkeit…', 'Eigen vloeistof…', 'Özel sıvı…'],
    ['Custom liquid', 'Eigene Flüssigkeit', 'Eigen vloeistof', 'Özel sıvı'],
    ['Clean dry air', 'Saubere trockene Luft', 'Schone droge lucht', 'Temiz kuru hava'],
    ['Nitrogen (N₂)', 'Stickstoff (N₂)', 'Stikstof (N₂)', 'Azot (N₂)'],
    ['Hydrogen (H₂)', 'Wasserstoff (H₂)', 'Waterstof (H₂)', 'Hidrojen (H₂)'],
    ['Helium (He)', 'Helium (He)', 'Helium (He)', 'Helyum (He)'],
    ['Carbon dioxide (CO₂)', 'Kohlendioxid (CO₂)', 'Kooldioxide (CO₂)', 'Karbondioksit (CO₂)'],
    ['Water', 'Wasser', 'Water', 'Su'],
    ['Air', 'Luft', 'Lucht', 'Hava'],
    ['Mineral oil', 'Mineralöl', 'Minerale olie', 'Mineral yağ'],
    ['Silicone oil', 'Silikonöl', 'Siliconeolie', 'Silikon yağı'],
    ['Small 12 V DC pump (≈8 L/min, 0.4 bar)', 'Kleine 12-V-DC-Pumpe (≈8 L/min, 0,4 bar)', 'Kleine 12 V DC-pomp (≈8 L/min, 0,4 bar)', 'Küçük 12 V DC pompa (≈8 L/min, 0,4 bar)'],
    ['Automotive electric coolant pump (≈45 L/min, 1.5 bar)', 'Elektrische Kfz-Kühlmittelpumpe (≈45 L/min, 1,5 bar)', 'Elektrische koelmiddelpomp voor voertuigen (≈45 L/min, 1,5 bar)', 'Otomotiv elektrikli soğutma pompası (≈45 L/min, 1,5 bar)'],
    ['Industrial centrifugal pump (≈120 L/min, 3 bar)', 'Industrielle Kreiselpumpe (≈120 L/min, 3 bar)', 'Industriële centrifugaalpomp (≈120 L/min, 3 bar)', 'Endüstriyel santrifüj pompa (≈120 L/min, 3 bar)'],
    ['Air / gas blower (≈1,500 L/min, 3 kPa)', 'Luft-/Gasgebläse (≈1.500 L/min, 3 kPa)', 'Lucht-/gasventilator (≈1.500 L/min, 3 kPa)', 'Hava / gaz fanı (≈1.500 L/min, 3 kPa)'],
    ['H₂ recirculation blower (≈600 L/min, 30 kPa)', 'H₂-Rezirkulationsgebläse (≈600 L/min, 30 kPa)', 'H₂-recirculatieventilator (≈600 L/min, 30 kPa)', 'H₂ geri devir fanı (≈600 L/min, 30 kPa)'],
    ['Thermal grease (standard)', 'Wärmeleitpaste (Standard)', 'Warmtegeleidende pasta (standaard)', 'Termal macun (standart)'],
    ['Thermal grease (high performance)', 'Wärmeleitpaste (Hochleistung)', 'Warmtegeleidende pasta (hoogwaardig)', 'Termal macun (yüksek performans)'],
    ['Phase-change material', 'Phasenwechselmaterial', 'Faseovergangsmateriaal', 'Faz değiştiren malzeme'],
    ['Graphite sheet', 'Graphitfolie', 'Grafietfolie', 'Grafit tabaka'],
    ['Thermal adhesive / epoxy', 'Wärmeleitkleber / Epoxid', 'Warmtegeleidende lijm / epoxy', 'Termal yapıştırıcı / epoksi'],
    ['Electrically insulating pad', 'Elektrisch isolierendes Pad', 'Elektrisch isolerende pad', 'Elektriksel yalıtkan ped'],
    ['Gap pad (soft, 1 mm)', 'Wärmeleitpad (weich, 1 mm)', 'Gap pad (zacht, 1 mm)', 'Boşluk dolgu pedi (yumuşak, 1 mm)'],
    ['Gap filler (dispensed, 1.5 mm)', 'Gap Filler (dosiert, 1,5 mm)', 'Gap filler (gedoseerd, 1,5 mm)', 'Boşluk dolgu macunu (dozajlı, 1,5 mm)'],
    ['Solder (e.g. SAC / indium)', 'Lot (z. B. SAC / Indium)', 'Soldeer (bijv. SAC / indium)', 'Lehim (ör. SAC / indiyum)'],

    // ----- PDF report -----
    ['Cold plate design report', 'Auslegungsbericht Kühlplatte', 'Ontwerprapport koelplaat', 'Soğutma plakası tasarım raporu'],
    ['SI units', 'SI-Einheiten', 'SI-eenheden', 'SI birimleri'],
    ['Imperial units', 'Imperiale Einheiten', 'Imperiale eenheden', 'İngiliz birimleri'],
    ['Hottest component: {name}', 'Heißestes Bauteil: {name}', 'Heetste component: {name}', 'En sıcak bileşen: {name}'],
    ['{Q} total, {inlet}; power headroom x{f}', '{Q} gesamt, {inlet}; Leistungsreserve x{f}', '{Q} totaal, {inlet}; vermogensreserve x{f}', 'Toplam {Q}, {inlet}; güç payı x{f}'],
    ['peak surface <= {T}, {inlet}', 'max. Oberfläche <= {T}, {inlet}', 'piekoppervlak <= {T}, {inlet}', 'en yüksek yüzey <= {T}, {inlet}'],
    ['at {Q}, {inlet}', 'bei {Q}, {inlet}', 'bij {Q}, {inlet}', '{Q}, {inlet}'],
    ['Channels coloured by coolant temperature: {a} (inlet) to {b} (hottest channel outlet).', 'Kanäle nach Kühlmitteltemperatur eingefärbt: {a} (Eintritt) bis {b} (Austritt des heißesten Kanals).', 'Kanalen gekleurd naar koelmiddeltemperatuur: {a} (inlaat) tot {b} (uitlaat heetste kanaal).', 'Kanallar soğutucu sıcaklığına göre renklendirildi: {a} (giriş) – {b} (en sıcak kanal çıkışı).'],
    ['Channels coloured by coolant temperature: {a} (inlet) to {b} (outlet).', 'Kanäle nach Kühlmitteltemperatur eingefärbt: {a} (Eintritt) bis {b} (Austritt).', 'Kanalen gekleurd naar koelmiddeltemperatuur: {a} (inlaat) tot {b} (uitlaat).', 'Kanallar soğutucu sıcaklığına göre renklendirildi: {a} (giriş) – {b} (çıkış).'],
    ['Colour scale {a} (light) to {b} (dark red); ring marks the hottest point. Grid {nx} x {ny} cells.', 'Farbskala {a} (hell) bis {b} (dunkelrot); der Ring markiert den heißesten Punkt. Gitter {nx} x {ny} Zellen.', 'Kleurschaal {a} (licht) tot {b} (donkerrood); de ring markeert het heetste punt. Raster {nx} x {ny} cellen.', 'Renk skalası {a} (açık) – {b} (koyu kırmızı); halka en sıcak noktayı gösterir. Izgara {nx} x {ny} hücre.'],
    ['Heat source definitions', 'Definition der Wärmequellen', 'Definitie warmtebronnen', 'Isı kaynağı tanımları'],
    ['Footprint (L x W)', 'Grundfläche (L x B)', 'Oppervlak (L x B)', 'Taban alanı (U x G)'],
    ['Centre (x, y)', 'Mitte (x, y)', 'Midden (x, y)', 'Merkez (x, y)'],
    ['Impedance', 'Impedanz', 'Impedantie', 'Empedans'],
    ['Impedance = TIM thickness / conductivity + contact resistance (both faces).', 'Impedanz = TIM-Dicke / Wärmeleitfähigkeit + Kontaktwiderstand (beide Seiten).', 'Impedantie = TIM-dikte / warmtegeleiding + contactweerstand (beide zijden).', 'Empedans = TIM kalınlığı / ısıl iletkenlik + temas direnci (her iki yüz).'],
    ['OK', 'OK', 'OK', 'UYGUN'],
    ['OVER', 'ÜBER', 'TE HOOG', 'AŞILDI'],
    ['Design checks', 'Auslegungsprüfungen', 'Ontwerpcontroles', 'Tasarım kontrolleri'],
    ['ERROR', 'FEHLER', 'FOUT', 'HATA'],
    ['WARNING', 'WARNUNG', 'WAARSCHUWING', 'UYARI'],
    ['NOTE', 'HINWEIS', 'OPMERKING', 'NOT'],
    ['Design inputs', 'Eingabedaten', 'Ontwerpinvoer', 'Tasarım girdileri'],
    ['Length × width × thickness', 'Länge × Breite × Dicke', 'Lengte × breedte × dikte', 'Uzunluk × genişlik × kalınlık'],
    ['Layout', 'Anordnung', 'Indeling', 'Düzen'],
    ['Parallel, Z-type', 'Parallel, Z-Typ', 'Parallel, Z-type', 'Paralel, Z tipi'],
    ['Parallel, U-type', 'Parallel, U-Typ', 'Parallel, U-type', 'Paralel, U tipi'],
    [', {n} parallel circuits', ', {n} parallele Kreise', ', {n} parallelle circuits', ', {n} paralel devre'],
    ['Header width × depth', 'Verteilerbreite × -tiefe', 'Verdelerbreedte × -diepte', 'Kollektör genişliği × derinliği'],
    ['channel depth', 'Kanaltiefe', 'kanaaldiepte', 'kanal derinliği'],
    ['Port inner diameter', 'Anschluss-Innendurchmesser', 'Binnendiameter aansluiting', 'Bağlantı iç çapı'],
    ['Shape', 'Form', 'Vorm', 'Şekil'],
    ['Round, Ø {d}', 'Rund, Ø {d}', 'Rond, Ø {d}', 'Yuvarlak, Ø {d}'],
    ['Square, {a}', 'Quadratisch, {a}', 'Vierkant, {a}', 'Kare, {a}'],
    ['Rectangular, {w} wide × {d} deep', 'Rechteckig, {w} breit × {d} tief', 'Rechthoekig, {w} breed × {d} diep', 'Dikdörtgen, {w} genişlik × {d} derinlik'],
    ['Custom properties', 'Eigene Stoffwerte', 'Eigen eigenschappen', 'Özel özellikler'],
    ['{n} discrete heat sources', '{n} einzelne Wärmequellen', '{n} afzonderlijke warmtebronnen', '{n} ayrık ısı kaynağı'],
    ['1 discrete heat source', '1 einzelne Wärmequelle', '1 afzonderlijke warmtebron', '1 ayrık ısı kaynağı'],
    ['Total power', 'Gesamtleistung', 'Totaal vermogen', 'Toplam güç'],
    ['Mode', 'Modus', 'Modus', 'Mod'],
    ['Find max. heat at surface limit', 'Max. Wärme bei Oberflächengrenze ermitteln', 'Max. warmte bij oppervlaktelimiet bepalen', 'Yüzey sınırında maks. ısıyı bul'],
    ['Find surface temperature at heat load', 'Oberflächentemperatur bei Wärmelast ermitteln', 'Oppervlaktetemperatuur bij warmtelast bepalen', 'Isı yükünde yüzey sıcaklığını bul'],
    ['Max. surface temperature', 'Max. Oberflächentemperatur', 'Max. oppervlaktetemperatuur', 'Maks. yüzey sıcaklığı'],
    ['Custom curve ({n} points)', 'Eigene Kennlinie ({n} Punkte)', 'Eigen curve ({n} punten)', 'Özel eğri ({n} nokta)'],
    ['Rest of loop', 'Restlicher Kreislauf', 'Rest van circuit', 'Devrenin geri kalanı'],
    ['{dp} at {q}', '{dp} bei {q}', '{dp} bij {q}', '{q} debide {dp}'],
    ['none', 'keiner', 'geen', 'yok'],
    ['Operating point', 'Betriebspunkt', 'Werkpunt', 'Çalışma noktası'],
    ['Resolve the input errors before exporting.', 'Beheben Sie die Eingabefehler vor dem Export.', 'Los de invoerfouten op voordat u exporteert.', 'Dışa aktarmadan önce girdi hatalarını giderin.'],
    ['Channel 1 is nearest the inlet port. Dashed line = average flow.', 'Kanal 1 liegt dem Eintritt am nächsten. Gestrichelte Linie = mittlerer Durchfluss.', 'Kanaal 1 ligt het dichtst bij de inlaat. Stippellijn = gemiddeld debiet.', 'Kanal 1 girişe en yakındır. Kesikli çizgi = ortalama debi.'],
    ['Performance vs. flow rate', 'Leistung über Durchfluss', 'Prestaties t.o.v. debiet', 'Debiye göre performans'],
    ['Thermal curve from the 2D model. Right: pump curve vs. system curve (plate + rest of loop); the intersection is the operating point.', 'Thermische Kurve aus dem 2D-Modell. Rechts: Pumpen- vs. Anlagenkennlinie (Platte + restlicher Kreislauf); der Schnittpunkt ist der Betriebspunkt.', 'Thermische curve uit het 2D-model. Rechts: pompcurve vs. systeemcurve (plaat + rest van circuit); het snijpunt is het werkpunt.', 'Isıl eğri 2B modelden. Sağda: pompa eğrisi ve sistem eğrisi (plaka + devrenin geri kalanı); kesişim çalışma noktasıdır.'],
    ['Thermal curve from the 2D model; pressure drop from the 1D hydraulic model.', 'Thermische Kurve aus dem 2D-Modell; Druckverlust aus dem 1D-Hydraulikmodell.', 'Thermische curve uit het 2D-model; drukval uit het 1D-hydraulische model.', 'Isıl eğri 2B modelden; basınç düşümü 1B hidrolik modelden.'],
    ['Method and limits', 'Methode und Grenzen', 'Methode en beperkingen', 'Yöntem ve sınırlar'],
    ['This is an engineering estimate for concept sizing: a 2D plate conduction model coupled to 1D channel hydraulics. Expect roughly ±15-30 % compared with CFD or test data.', 'Dies ist eine ingenieurmäßige Abschätzung für die Konzeptauslegung: ein 2D-Wärmeleitmodell der Platte, gekoppelt mit 1D-Kanalhydraulik. Abweichungen von etwa ±15–30 % gegenüber CFD- oder Versuchsdaten sind zu erwarten.', 'Dit is een technische schatting voor conceptontwerp: een 2D-warmtegeleidingsmodel van de plaat gekoppeld aan 1D-kanaalhydraulica. Reken op ongeveer ±15–30 % t.o.v. CFD- of testgegevens.', 'Bu, kavramsal boyutlandırma için bir mühendislik tahminidir: 1B kanal hidroliğine bağlı 2B plaka iletim modeli. CFD veya test verilerine göre yaklaşık ±%15–30 sapma beklenir.'],
    ['Laminar flow: Shah & London Nu(H1) and f·Re for the channel aspect ratio with entry corrections. Turbulent flow: Gnielinski with Haaland friction. Re 2300-4000 is blended.', 'Laminare Strömung: Shah & London Nu(H1) und f·Re für das Seitenverhältnis des Kanals mit Einlaufkorrekturen. Turbulente Strömung: Gnielinski mit Haaland-Reibung. Re 2300–4000 wird interpoliert.', 'Laminaire stroming: Shah & London Nu(H1) en f·Re voor de kanaalverhouding met inloopcorrecties. Turbulente stroming: Gnielinski met Haaland-wrijving. Re 2300–4000 wordt geïnterpoleerd.', 'Laminer akış: kanal en-boy oranı için giriş düzeltmeli Shah & London Nu(H1) ve f·Re. Türbülanslı akış: Haaland sürtünmeli Gnielinski. Re 2300–4000 arası enterpole edilir.'],
    ['2D plate model: finite-difference grid over the plate face with in-plane conduction through the local solid thickness. Cells above channels and headers are coupled to the coolant through the heated-face wall and convective film (fin-corrected), and the coolant is marched along each channel path. Components add a TIM layer ((t/k + contact resistance)/A) and junction-to-case resistance.', '2D-Plattenmodell: Finite-Differenzen-Gitter über die Plattenfläche mit Wärmeleitung in der Ebene durch die lokale Materialdicke. Zellen über Kanälen und Verteilern sind über die Wand zur beheizten Fläche und den (rippenkorrigierten) Konvektionsfilm an das Kühlmittel gekoppelt; das Kühlmittel wird entlang jedes Kanalpfads verfolgt. Bauteile fügen eine TIM-Schicht ((t/k + Kontaktwiderstand)/A) und den Sperrschicht-Gehäuse-Widerstand hinzu.', '2D-plaatmodel: eindige-differentieraster over het plaatvlak met geleiding in het vlak door de lokale materiaaldikte. Cellen boven kanalen en verdelers zijn via de wand tot het verwarmde vlak en de (vin-gecorrigeerde) convectiefilm aan het koelmiddel gekoppeld; het koelmiddel wordt langs elk kanaalpad gevolgd. Componenten voegen een TIM-laag ((t/k + contactweerstand)/A) en de junctie-behuizingweerstand toe.', '2B plaka modeli: plaka yüzeyi üzerinde, yerel katı kalınlığından düzlem içi iletimli sonlu farklar ızgarası. Kanalların ve kollektörlerin üzerindeki hücreler, ısıtılan yüzey eti ve (kanatçık düzeltmeli) taşınım filmi ile soğutucuya bağlanır; soğutucu her kanal yolu boyunca izlenir. Bileşenler bir TIM katmanı ((t/k + temas direnci)/A) ve jonksiyon-kasa direnci ekler.'],
    ['Parallel layouts: the flow split between channels comes from a manifold network model (header friction and momentum against the pressure drop of each channel), and the flow in each channel sets its own heat transfer in the 2D model.', 'Parallele Anordnungen: Die Durchflussaufteilung auf die Kanäle stammt aus einem Verteilernetzmodell (Reibung und Impuls in den Verteilern gegen den Druckverlust jedes Kanals); der Durchfluss jedes Kanals bestimmt seinen Wärmeübergang im 2D-Modell.', 'Parallelle indelingen: de debietverdeling over de kanalen volgt uit een verdelernetwerkmodel (wrijving en impuls in de verdelers tegenover de drukval van elk kanaal); het debiet in elk kanaal bepaalt de eigen warmteoverdracht in het 2D-model.', 'Paralel düzenler: kanallar arası debi dağılımı bir kollektör ağı modelinden gelir (kollektör sürtünmesi ve momentumu her kanalın basınç düşümüne karşı); her kanaldaki debi, 2B modeldeki kendi ısı transferini belirler.'],
    ['Not modelled: through-thickness spreading under small sources, contact resistance beyond the TIM layer, two-phase flow, gas compressibility within the plate.', 'Nicht modelliert: Spreizung durch die Plattendicke unter kleinen Quellen, Kontaktwiderstand über die TIM-Schicht hinaus, Zweiphasenströmung, Gaskompressibilität in der Platte.', 'Niet gemodelleerd: spreiding door de plaatdikte onder kleine bronnen, contactweerstand buiten de TIM-laag, tweefasestroming, samendrukbaarheid van gas in de plaat.', 'Modellenmeyenler: küçük kaynakların altında kalınlık boyunca yayılma, TIM katmanı dışındaki temas direnci, iki fazlı akış, plaka içinde gaz sıkıştırılabilirliği.'],
    ['Open this design in the calculator:', 'Diesen Entwurf im Rechner öffnen:', 'Dit ontwerp openen in de calculator:', 'Bu tasarımı hesaplayıcıda aç:'],
    ['Cold Plate Calculator (link with all inputs)', 'Kühlplatten-Rechner (Link mit allen Eingaben)', 'Koelplaatcalculator (link met alle invoer)', 'Soğutma Plakası Hesaplayıcı (tüm girdileri içeren bağlantı)'],
    ['Cold Plate Calculator v2 · engineering estimate, validate final designs by CFD or test', 'Kühlplatten-Rechner v2 · ingenieurmäßige Abschätzung, endgültige Auslegung per CFD oder Versuch validieren', 'Koelplaatcalculator v2 · technische schatting, valideer definitieve ontwerpen met CFD of test', 'Soğutma Plakası Hesaplayıcı v2 · mühendislik tahmini, nihai tasarımları CFD veya testle doğrulayın'],
    ['Page {i} of {n}', 'Seite {i} von {n}', 'Pagina {i} van {n}', 'Sayfa {i} / {n}'],
    ['About', 'Über', 'Over', 'Hakkında'],
    ['About this calculator', 'Über diesen Rechner', 'Over deze calculator', 'Bu hesaplayıcı hakkında'],
    ['Close', 'Schließen', 'Sluiten', 'Kapat'],
    ['MIT License', 'MIT-Lizenz', 'MIT-licentie', 'MIT Lisansı'],
    ['Help', 'Hilfe', 'Help', 'Yardım'],
    ['How to use the calculator', 'So benutzen Sie den Rechner', 'Zo gebruikt u de calculator', 'Hesaplayıcı nasıl kullanılır'],
    ['Step-by-step calculation', 'Schritt-für-Schritt-Berechnung', 'Stapsgewijze berekening', 'Adım adım hesaplama'],
    ['The 1D model written out: each formula with this design\'s numbers substituted, in SI units. Use it to check results by hand or for teaching.', 'Das 1D-Modell ausgeschrieben: jede Formel mit den Zahlen dieses Entwurfs eingesetzt, in SI-Einheiten. Zum Nachrechnen von Hand oder für die Lehre.', 'Het 1D-model uitgeschreven: elke formule met de getallen van dit ontwerp ingevuld, in SI-eenheden. Gebruik het om resultaten met de hand te controleren of voor onderwijs.', '1B modelin açık hali: her formül bu tasarımın değerleri yerine konmuş olarak, SI birimlerinde. Sonuçları elle kontrol etmek veya eğitim için kullanın.'],
    ['Appendix: step-by-step calculation', 'Anhang: Schritt-für-Schritt-Berechnung', 'Bijlage: stapsgewijze berekening', 'Ek: adım adım hesaplama'],
    ['References', 'Literatur', 'Referenties', 'Kaynaklar'],
    ['Custom', 'Benutzerdefiniert', 'Aangepast', 'Özel'],
    ['Channel geometry', 'Kanalgeometrie', 'Kanaalgeometrie', 'Kanal geometrisi'],
    ['Flow area and wetted perimeter', 'Strömungsquerschnitt und benetzter Umfang', 'Doorstroomoppervlak en natte omtrek', 'Akış kesiti ve ıslak çevre'],
    ['a = channel width, b = channel depth.', 'a = Kanalbreite, b = Kanaltiefe.', 'a = kanaalbreedte, b = kanaaldiepte.', 'a = kanal genişliği, b = kanal derinliği.'],
    ['Aspect ratio', 'Seitenverhältnis', 'Aspectverhouding', 'En-boy oranı'],
    ['Channel pitch and wall', 'Kanalteilung und Steg', 'Kanaalsteek en wand', 'Kanal aralığı ve et kalınlığı'],
    ['S = plate size across the channels, e = edge margin.', 'S = Plattenmaß quer zu den Kanälen, e = Randabstand.', 'S = plaatmaat dwars op de kanalen, e = randmarge.', 'S = kanallara dik plaka ölçüsü, e = kenar payı.'],
    ['n = passes per circuit, L_{s} = straight pass length, r_{b} = bend radius.', 'n = Durchgänge je Kreis, L_{s} = gerade Durchgangslänge, r_{b} = Bogenradius.', 'n = passages per circuit, L_{s} = lengte van een rechte passage, r_{b} = bochtstraal.', 'n = devre başına geçiş, L_{s} = düz geçiş uzunluğu, r_{b} = dönüş yarıçapı.'],
    ['w_{h} = header width.', 'w_{h} = Verteilerbreite.', 'w_{h} = verdelerbreedte.', 'w_{h} = kollektör genişliği.'],
    ['Coolant properties and flow', 'Kühlmitteleigenschaften und Durchfluss', 'Eigenschappen en debiet van het koelmiddel', 'Soğutucu özellikleri ve akış'],
    ['Mean coolant temperature', 'Mittlere Kühlmitteltemperatur', 'Gemiddelde koelmiddeltemperatuur', 'Ortalama soğutucu sıcaklığı'],
    ['Properties are evaluated at T_{m}; T_{out} comes from the energy balance below, so the solver iterates.', 'Die Stoffwerte gelten bei T_{m}; T_{out} folgt aus der Energiebilanz unten, daher rechnet der Löser iterativ.', 'De eigenschappen gelden bij T_{m}; T_{out} volgt uit de energiebalans hieronder, dus de solver itereert.', 'Özellikler T_{m} sıcaklığında alınır; T_{out} aşağıdaki enerji dengesinden gelir, bu yüzden çözücü iterasyon yapar.'],
    ['Properties of {fluid} at T_{m}', 'Stoffwerte von {fluid} bei T_{m}', 'Eigenschappen van {fluid} bij T_{m}', 'T_{m} sıcaklığında {fluid} özellikleri'],
    ['Density at the inlet temperature.', 'Dichte bei Eintrittstemperatur.', 'Dichtheid bij de inlaattemperatuur.', 'Giriş sıcaklığındaki yoğunluk.'],
    ['Standard flow converted to molar flow ṅ; M = molar mass.', 'Normvolumenstrom in Molenstrom ṅ umgerechnet; M = molare Masse.', 'Normdebiet omgerekend naar molair debiet ṅ; M = molaire massa.', 'Standart debi mol debisine ṅ çevrilir; M = mol kütlesi.'],
    ['Pump operating point', 'Pumpenbetriebspunkt', 'Werkpunt van de pomp', 'Pompa çalışma noktası'],
    ['Solved numerically (bisection) where the pump curve meets the system curve.', 'Numerisch gelöst (Bisektion) im Schnittpunkt von Pumpen- und Anlagenkennlinie.', 'Numeriek opgelost (bisectie) waar de pompcurve de systeemcurve snijdt.', 'Pompa eğrisinin sistem eğrisini kestiği noktada sayısal olarak (ikiye bölme) çözülür.'],
    ['Flow per channel', 'Durchfluss je Kanal', 'Debiet per kanaal', 'Kanal başına debi'],
    ['Serpentine: each circuit carries an equal share.', 'Mäander: jeder Kreis führt den gleichen Anteil.', 'Meander: elk circuit voert een gelijk deel.', 'Serpantin: her devre eşit pay taşır.'],
    ['Average channel; the manifold model below gives the real split.', 'Mittlerer Kanal; das Verteilermodell unten liefert die tatsächliche Aufteilung.', 'Gemiddeld kanaal; het verdelermodel hieronder geeft de werkelijke verdeling.', 'Ortalama kanal; gerçek dağılımı aşağıdaki kollektör modeli verir.'],
    ['Laminar below 2300, turbulent above 4000, blended in between.', 'Laminar unter 2300, turbulent über 4000, dazwischen interpoliert.', 'Laminair onder 2300, turbulent boven 4000, daartussen geïnterpoleerd.', '2300 altında laminer, 4000 üstünde türbülanslı, arada geçişli.'],
    ['Compressibility is negligible below Ma ≈ 0.3.', 'Unterhalb Ma ≈ 0,3 ist die Kompressibilität vernachlässigbar.', 'Onder Ma ≈ 0,3 is samendrukbaarheid verwaarloosbaar.', 'Ma ≈ 0,3 altında sıkıştırılabilirlik ihmal edilebilir.'],
    ['Heat transfer coefficient', 'Wärmeübergangskoeffizient', 'Warmteoverdrachtscoëfficiënt', 'Isı taşınım katsayısı'],
    ['Fully developed laminar Nu', 'Voll ausgebildete laminare Nu', 'Volledig ontwikkelde laminaire Nu', 'Tam gelişmiş laminer Nu'],
    ['Circular tube, constant heat flux (H1).', 'Kreisrohr, konstante Wärmestromdichte (H1).', 'Ronde buis, constante warmtestroomdichtheid (H1).', 'Dairesel boru, sabit ısı akısı (H1).'],
    ['Shah & London, rectangular duct, constant heat flux (H1).', 'Shah & London, Rechteckkanal, konstante Wärmestromdichte (H1).', 'Shah & London, rechthoekig kanaal, constante warmtestroomdichtheid (H1).', 'Shah & London, dikdörtgen kanal, sabit ısı akısı (H1).'],
    ['Thermal entry length correction', 'Korrektur für den thermischen Einlauf', 'Correctie voor de thermische inloop', 'Isıl giriş bölgesi düzeltmesi'],
    ['Hausen form, averaged over one straight pass L_{s}.', 'Hausen-Form, gemittelt über einen geraden Durchgang L_{s}.', 'Hausen-vorm, gemiddeld over één rechte passage L_{s}.', 'Hausen biçimi, bir düz geçiş L_{s} boyunca ortalanmış.'],
    ['Turbulent friction factor (Haaland)', 'Turbulente Rohrreibungszahl (Haaland)', 'Turbulente wrijvingsfactor (Haaland)', 'Türbülanslı sürtünme faktörü (Haaland)'],
    ['ε_{r} = surface roughness.', 'ε_{r} = Oberflächenrauheit.', 'ε_{r} = oppervlakteruwheid.', 'ε_{r} = yüzey pürüzlülüğü.'],
    ['Gnielinski correlation', 'Gnielinski-Korrelation', 'Gnielinski-correlatie', 'Gnielinski korelasyonu'],
    ['Last factor: short-duct entry correction.', 'Letzter Faktor: Einlaufkorrektur für kurze Kanäle.', 'Laatste factor: inloopcorrectie voor korte kanalen.', 'Son çarpan: kısa kanal giriş düzeltmesi.'],
    ['Transitional blend', 'Interpolation im Übergangsbereich', 'Interpolatie in het overgangsgebied', 'Geçiş bölgesi ara değeri'],
    ['Fin efficiency of the channel walls', 'Rippenwirkungsgrad der Kanalwände', 'Vinrendement van de kanaalwanden', 'Kanal duvarlarının kanatçık verimi'],
    ['The walls between channels act as fins of height H, cooled on both faces; k_{s} = plate conductivity ({mat}).', 'Die Stege zwischen den Kanälen wirken als beidseitig gekühlte Rippen der Höhe H; k_{s} = Wärmeleitfähigkeit der Platte ({mat}).', 'De wanden tussen de kanalen werken als aan beide zijden gekoelde vinnen met hoogte H; k_{s} = geleidbaarheid van de plaat ({mat}).', 'Kanallar arasındaki duvarlar, iki yüzü soğutulan H yüksekliğinde kanatçıklar gibi davranır; k_{s} = plaka iletkenliği ({mat}).'],
    ['Effective wetted perimeter', 'Wirksamer benetzter Umfang', 'Effectieve natte omtrek', 'Etkin ıslak çevre'],
    ['Heated floor, two fin-effective side walls and the far wall (reached through two fins).', 'Beheizter Boden, zwei Seitenwände mit Rippenwirkung und die gegenüberliegende Wand (über zwei Rippen erreicht).', 'Verwarmde bodem, twee zijwanden met vinwerking en de tegenoverliggende wand (bereikt via twee vinnen).', 'Isıtılan taban, kanatçık etkili iki yan duvar ve karşı duvar (iki kanatçık üzerinden ulaşılır).'],
    ['Effective heat transfer area', 'Wirksame Wärmeübertragungsfläche', 'Effectief warmteoverdragend oppervlak', 'Etkin ısı transfer alanı'],
    ['Thermal resistance network', 'Netzwerk der Wärmewiderstände', 'Netwerk van thermische weerstanden', 'Isıl direnç ağı'],
    ['Convection resistance', 'Konvektionswiderstand', 'Convectieweerstand', 'Taşınım direnci'],
    ['Coolant heat capacity resistance', 'Wärmekapazitätswiderstand des Kühlmittels', 'Warmtecapaciteitsweerstand van het koelmiddel', 'Soğutucu ısı kapasitesi direnci'],
    ['Coolant temperature rise per watt.', 'Kühlmittelerwärmung je Watt.', 'Temperatuurstijging van het koelmiddel per watt.', 'Watt başına soğutucu sıcaklık artışı.'],
    ['NTU and effectiveness', 'NTU und Wirkungsgrad', 'NTU en effectiviteit', 'NTU ve etkinlik'],
    ['Heated-face wall conduction', 'Wärmeleitung durch die Wand der beheizten Seite', 'Geleiding door de wand aan de verwarmde zijde', 'Isıtılan yüzey etinden iletim'],
    ['Spreading to the channels', 'Wärmespreizung zu den Kanälen', 'Spreiding naar de kanalen', 'Kanallara yayılma'],
    ['Heat that lands above a wall or an uncooled edge must travel sideways a distance s.', 'Wärme, die über einem Steg oder einem ungekühlten Rand eintritt, muss seitlich die Strecke s zurücklegen.', 'Warmte die boven een wand of een ongekoelde rand binnenkomt, moet zijwaarts een afstand s afleggen.', 'Bir duvarın veya soğutulmayan kenarın üzerine gelen ısı yanlamasına s mesafesi kat etmelidir.'],
    ['Lateral conduction weight', 'Gewichtung der Querleitung', 'Weging van de zijdelingse geleiding', 'Yanal iletim ağırlığı'],
    ['w = 1: plate cannot even out the coolant temperature rise (uniform heat flux); w = 0: isothermal plate.', 'w = 1: Die Platte gleicht die Kühlmittelerwärmung nicht aus (gleichmäßige Wärmestromdichte); w = 0: isotherme Platte.', 'w = 1: de plaat kan de temperatuurstijging van het koelmiddel niet vereffenen (uniforme warmtestroom); w = 0: isotherme plaat.', 'w = 1: plaka soğutucu sıcaklık artışını dengeleyemez (düzgün ısı akısı); w = 0: izotermal plaka.'],
    ['Total thermal resistance', 'Gesamter Wärmewiderstand', 'Totale thermische weerstand', 'Toplam ısıl direnç'],
    ['Peak heated surface to coolant inlet.', 'Heißeste Stelle der beheizten Fläche bis Kühlmitteleintritt.', 'Heetste punt van het verwarmde vlak tot koelmiddelinlaat.', 'Isıtılan yüzeyin en sıcak noktasından soğutucu girişine.'],
    ['Peak surface temperature (1D)', 'Maximale Oberflächentemperatur (1D)', 'Maximale oppervlaktetemperatuur (1D)', 'En yüksek yüzey sıcaklığı (1B)'],
    ['Heat dissipation capacity (1D)', 'Wärmeabfuhrleistung (1D)', 'Warmteafvoercapaciteit (1D)', 'Isı atma kapasitesi (1B)'],
    ['Coolant outlet temperature', 'Kühlmittelaustrittstemperatur', 'Uitlaattemperatuur van het koelmiddel', 'Soğutucu çıkış sıcaklığı'],
    ['Energy balance: all heat leaves with the coolant.', 'Energiebilanz: die gesamte Wärme geht ins Kühlmittel.', 'Energiebalans: alle warmte verlaat de plaat met het koelmiddel.', 'Enerji dengesi: ısının tamamı soğutucuyla çıkar.'],
    ['2D plate model', '2D-Plattenmodell', '2D-plaatmodel', '2B plaka modeli'],
    ['Solved numerically on a {nx} × {ny} grid; the headline result uses this model because it resolves edges and hot spots that the 1D network averages out.', 'Numerisch auf einem {nx} × {ny}-Gitter gelöst; das Hauptergebnis stammt aus diesem Modell, weil es Ränder und Hotspots auflöst, die das 1D-Netzwerk mittelt.', 'Numeriek opgelost op een {nx} × {ny}-raster; het hoofdresultaat gebruikt dit model omdat het randen en hotspots oplost die het 1D-netwerk uitmiddelt.', '{nx} × {ny} ızgarada sayısal olarak çözülür; ana sonuç bu modelden gelir çünkü 1B ağın ortaladığı kenarları ve sıcak noktaları çözer.'],
    ['Hottest component', 'Heißestes Bauteil', 'Heetste component', 'En sıcak bileşen'],
    ['TIM resistance', 'TIM-Widerstand', 'TIM-weerstand', 'TIM direnci'],
    ['R_{c} = contact resistance of both interfaces (m²K/W).', 'R_{c} = Kontaktwiderstand beider Grenzflächen (m²K/W).', 'R_{c} = contactweerstand van beide grensvlakken (m²K/W).', 'R_{c} = her iki arayüzün temas direnci (m²K/W).'],
    ['Case temperature', 'Gehäusetemperatur', 'Behuizingtemperatuur', 'Kasa sıcaklığı'],
    ['T̄_{plate} = mean plate temperature under the footprint, from the 2D model.', 'T̄_{plate} = mittlere Plattentemperatur unter der Grundfläche, aus dem 2D-Modell.', 'T̄_{plate} = gemiddelde plaattemperatuur onder de footprint, uit het 2D-model.', 'T̄_{plate} = bileşen tabanı altındaki ortalama plaka sıcaklığı, 2B modelden.'],
    ['Junction temperature', 'Sperrschichttemperatur', 'Junctietemperatuur', 'Jonksiyon sıcaklığı'],
    ['Margin to limit', 'Abstand zum Grenzwert', 'Marge tot de limiet', 'Sınıra kalan pay'],
    ['Fully developed laminar f·Re', 'Voll ausgebildetes laminares f·Re', 'Volledig ontwikkelde laminaire f·Re', 'Tam gelişmiş laminer f·Re'],
    ['Shah & London, Darcy friction factor.', 'Shah & London, Darcy-Reibungszahl.', 'Shah & London, Darcy-wrijvingsfactor.', 'Shah & London, Darcy sürtünme faktörü.'],
    ['Apparent friction factor (developing flow)', 'Scheinbare Reibungszahl (Einlaufströmung)', 'Schijnbare wrijvingsfactor (zich ontwikkelende stroming)', 'Görünür sürtünme faktörü (gelişmekte olan akış)'],
    ['Shah (1978): includes the extra loss of the developing velocity profile.', 'Shah (1978): enthält den Zusatzverlust des sich entwickelnden Geschwindigkeitsprofils.', 'Shah (1978): bevat het extra verlies van het zich ontwikkelende snelheidsprofiel.', 'Shah (1978): gelişmekte olan hız profilinin ek kaybını içerir.'],
    ['Friction factor', 'Reibungszahl', 'Wrijvingsfactor', 'Sürtünme faktörü'],
    ['Haaland, as above.', 'Haaland, wie oben.', 'Haaland, zoals hierboven.', 'Haaland, yukarıdaki gibi.'],
    ['Dynamic pressure', 'Staudruck', 'Dynamische druk', 'Dinamik basınç'],
    ['Average channel with a uniform split.', 'Mittlerer Kanal bei gleichmäßiger Aufteilung.', 'Gemiddeld kanaal bij gelijkmatige verdeling.', 'Eşit dağılımda ortalama kanal.'],
    ['Channel entry and exit', 'Kanalein- und -austritt', 'Kanaalinlaat en -uitlaat', 'Kanal girişi ve çıkışı'],
    ['180° bends (Darby 3-K)', '180°-Bögen (Darby 3-K)', 'Bochten van 180° (Darby 3-K)', '180° dönüşler (Darby 3-K)'],
    ['D_{n} = nominal diameter in inches; K_{i} = 0.35 for tight bends (r/D_{h} < 1), else 0.10.', 'D_{n} = Nenndurchmesser in Zoll; K_{i} = 0,35 für enge Bögen (r/D_{h} < 1), sonst 0,10.', 'D_{n} = nominale diameter in inch; K_{i} = 0,35 voor krappe bochten (r/D_{h} < 1), anders 0,10.', 'D_{n} = inç cinsinden anma çapı; K_{i} = dar dönüşlerde (r/D_{h} < 1) 0,35, aksi halde 0,10.'],
    ['Inlet and outlet ports', 'Ein- und Austrittsanschlüsse', 'Inlaat- en uitlaatpoorten', 'Giriş ve çıkış portları'],
    ['K = 1.5 per port (90° turn plus expansion or contraction).', 'K = 1,5 je Anschluss (90°-Umlenkung plus Erweiterung bzw. Verengung).', 'K = 1,5 per poort (bocht van 90° plus expansie of contractie).', 'Port başına K = 1,5 (90° dönüş artı genişleme veya daralma).'],
    ['Total pressure drop', 'Gesamter Druckverlust', 'Totale drukval', 'Toplam basınç düşümü'],
    ['Manifold network and total', 'Verteilernetz und Summe', 'Verdelernetwerk en totaal', 'Kollektör ağı ve toplam'],
    ['Solved numerically: header friction and momentum against each channel\'s own Δp(q) curve, iterated until the channel flows add up to the total.', 'Numerisch gelöst: Reibung und Impuls in den Verteilern gegen die eigene Δp(q)-Kennlinie jedes Kanals, iteriert bis die Kanaldurchflüsse den Gesamtdurchfluss ergeben.', 'Numeriek opgelost: wrijving en impuls in de verdelers tegen de eigen Δp(q)-curve van elk kanaal, geïtereerd tot de kanaaldebieten optellen tot het totaal.', 'Sayısal olarak çözülür: kollektör sürtünmesi ve momentumu her kanalın kendi Δp(q) eğrisine karşı, kanal debilerinin toplamı toplam debiye eşit olana dek iterasyonla.'],
    ['Shaft power = P_{hyd} / pump efficiency.', 'Wellenleistung = P_{hyd} / Pumpenwirkungsgrad.', 'Asvermogen = P_{hyd} / pomprendement.', 'Mil gücü = P_{hyd} / pompa verimi.'],
    ['Design comparison', 'Entwurfsvergleich', 'Ontwerpvergelijking', 'Tasarım karşılaştırması'],
    ['Parameter sweep', 'Parameterstudie', 'Parameterstudie', 'Parametre taraması'],
    ['Best value in each row in green; shaded cells mark inputs that differ from the current design.', 'Bester Wert jeder Zeile in Grün; hinterlegte Zellen markieren Eingaben, die vom aktuellen Entwurf abweichen.', 'Beste waarde per rij in groen; gearceerde cellen markeren invoer die afwijkt van het huidige ontwerp.', 'Her satırdaki en iyi değer yeşil; gölgeli hücreler mevcut tasarımdan farklı girdileri işaretler.'],
    ['Up to {n} designs can be compared — remove one first.', 'Es lassen sich bis zu {n} Entwürfe vergleichen — entfernen Sie zuerst einen.', 'Er kunnen maximaal {n} ontwerpen worden vergeleken — verwijder er eerst een.', 'En fazla {n} tasarım karşılaştırılabilir — önce birini kaldırın.'],
    ['Design {x}', 'Entwurf {x}', 'Ontwerp {x}', 'Tasarım {x}'],
    ['Added to the comparison', 'Zum Vergleich hinzugefügt', 'Toegevoegd aan de vergelijking', 'Karşılaştırmaya eklendi'],
    ['{n} passes × {c} circuits', '{n} Durchgänge × {c} Kreise', '{n} passages × {c} circuits', '{n} geçiş × {c} devre'],
    ['{n} channels', '{n} Kanäle', '{n} kanalen', '{n} kanal'],
    ['Heat sources: {n} · {P}', 'Wärmequellen: {n} · {P}', 'Warmtebronnen: {n} · {P}', 'Isı kaynakları: {n} · {P}'],
    ['Uniform, max. surface {T}', 'Gleichmäßig, max. Oberfläche {T}', 'Uniform, max. oppervlak {T}', 'Düzgün, en yüksek yüzey {T}'],
    ['Uniform, {P}', 'Gleichmäßig, {P}', 'Uniform, {P}', 'Düzgün, {P}'],
    ['Current design', 'Aktueller Entwurf', 'Huidig ontwerp', 'Mevcut tasarım'],
    ['Invalid', 'Ungültig', 'Ongeldig', 'Geçersiz'],
    ['No saved designs yet. Click “Add current design”, change the inputs, and the saved variants appear here next to the current design.', 'Noch keine gespeicherten Entwürfe. Klicken Sie auf „Aktuellen Entwurf hinzufügen“, ändern Sie die Eingaben, und die gespeicherten Varianten erscheinen hier neben dem aktuellen Entwurf.', 'Nog geen opgeslagen ontwerpen. Klik op „Huidig ontwerp toevoegen”, wijzig de invoer, en de opgeslagen varianten verschijnen hier naast het huidige ontwerp.', 'Henüz kayıtlı tasarım yok. “Mevcut tasarımı ekle”ye tıklayın, girdileri değiştirin; kaydedilen varyantlar burada mevcut tasarımın yanında görünür.'],
    ['Design name', 'Name des Entwurfs', 'Naam van het ontwerp', 'Tasarım adı'],
    ['Load', 'Laden', 'Laden', 'Yükle'],
    ['Make this the current design', 'Diesen Entwurf zum aktuellen machen', 'Dit het huidige ontwerp maken', 'Bunu mevcut tasarım yap'],
    ['Loaded {name}', '{name} geladen', '{name} geladen', '{name} yüklendi'],
    ['Remove from comparison', 'Aus dem Vergleich entfernen', 'Uit de vergelijking verwijderen', 'Karşılaştırmadan kaldır'],
    ['Inputs', 'Eingaben', 'Invoer', 'Girdiler'],
    ['Parameter', 'Parameter', 'Parameter', 'Parametre'],
    ['Calculating… {i} of {n}', 'Berechnung… {i} von {n}', 'Berekenen… {i} van {n}', 'Hesaplanıyor… {i} / {n}'],
    ['Lowest channel flow', 'Kleinster Kanaldurchfluss', 'Laagste kanaaldebiet', 'En düşük kanal debisi'],
    ['No valid points in this range — check the inputs.', 'Keine gültigen Punkte in diesem Bereich — prüfen Sie die Eingaben.', 'Geen geldige punten in dit bereik — controleer de invoer.', 'Bu aralıkta geçerli nokta yok — girdileri kontrol edin.'],
    ['Inputs have changed since this sweep — run it again to update.', 'Die Eingaben haben sich seit dieser Studie geändert — starten Sie sie erneut.', 'De invoer is gewijzigd sinds deze studie — voer hem opnieuw uit.', 'Bu taramadan sonra girdiler değişti — güncellemek için yeniden çalıştırın.'],
    ['{n} of {m} points are invalid in this range (for example, channels that do not fit) and are left out.', '{n} von {m} Punkten sind in diesem Bereich ungültig (z. B. Kanäle, die nicht passen) und werden ausgelassen.', '{n} van {m} punten zijn ongeldig in dit bereik (bijvoorbeeld kanalen die niet passen) en worden weggelaten.', 'Bu aralıkta {m} noktanın {n} tanesi geçersiz (örneğin sığmayan kanallar) ve dışarıda bırakıldı.'],
    ['Current', 'Aktuell', 'Huidig', 'Mevcut'],
    ['Use', 'Übernehmen', 'Gebruiken', 'Kullan'],
    ['Set this value in the design', 'Diesen Wert in den Entwurf übernehmen', 'Deze waarde in het ontwerp zetten', 'Bu değeri tasarıma uygula'],
    ['{y} vs. {x}', '{y} über {x}', '{y} versus {x}', '{x} değerine göre {y}'],
    ['Channel diameter', 'Kanaldurchmesser', 'Kanaaldiameter', 'Kanal çapı'],
    ['Channel width', 'Kanalbreite', 'Kanaalbreedte', 'Kanal genişliği'],
    ['Channel depth', 'Kanaltiefe', 'Kanaaldiepte', 'Kanal derinliği'],
    ['Plate thickness', 'Plattendicke', 'Plaatdikte', 'Plaka kalınlığı'],
    ['Power of all sources', 'Leistung aller Quellen', 'Vermogen van alle bronnen', 'Tüm kaynakların gücü'],
    ['Hottest junction', 'Heißeste Sperrschicht', 'Heetste junctie', 'En sıcak jonksiyon'],
    ['Total heat', 'Gesamtwärme', 'Totale warmte', 'Toplam ısı'],
    ['Power headroom', 'Leistungsreserve', 'Vermogensreserve', 'Güç rezervi'],
    ['Application', 'Anwendung', 'Toepassing', 'Uygulama'],
    ['From', 'Von', 'Van', 'Başlangıç'],
    ['To', 'Bis', 'Tot', 'Bitiş'],
    ['Points', 'Punkte', 'Punten', 'Nokta sayısı'],
    ['Run sweep', 'Studie starten', 'Studie uitvoeren', 'Taramayı çalıştır'],
    ['Export CSV', 'CSV exportieren', 'CSV exporteren', 'CSV dışa aktar'],
    ['Add current design', 'Aktuellen Entwurf hinzufügen', 'Huidig ontwerp toevoegen', 'Mevcut tasarımı ekle'],
    ['Vary one input over a range and see how the result and the pressure drop respond. Uses a coarser 2D grid for speed.', 'Variieren Sie eine Eingabe über einen Bereich und sehen Sie, wie Ergebnis und Druckverlust reagieren. Für die Geschwindigkeit wird ein gröberes 2D-Gitter verwendet.', 'Varieer één invoer over een bereik en zie hoe het resultaat en de drukval reageren. Gebruikt een grover 2D-raster voor snelheid.', 'Bir girdiyi bir aralıkta değiştirin ve sonucun ve basınç düşümünün nasıl tepki verdiğini görün. Hız için daha kaba bir 2B ızgara kullanır.'],
    ['Save up to four variants and compare them side by side with the current design. The best value in each row is highlighted, and inputs that differ from the current design are marked.', 'Speichern Sie bis zu vier Varianten und vergleichen Sie sie mit dem aktuellen Entwurf. Der beste Wert jeder Zeile ist hervorgehoben, vom aktuellen Entwurf abweichende Eingaben sind markiert.', 'Sla maximaal vier varianten op en vergelijk ze naast het huidige ontwerp. De beste waarde per rij is gemarkeerd, en invoer die afwijkt van het huidige ontwerp is aangeduid.', 'En fazla dört varyant kaydedin ve mevcut tasarımla yan yana karşılaştırın. Her satırdaki en iyi değer vurgulanır, mevcut tasarımdan farklı girdiler işaretlenir.'],
    ['Size for a target', 'Auslegung auf ein Ziel', 'Dimensioneren op een doel', 'Hedefe göre boyutlandırma'],
    ['Find the lowest flow, fewest channels, thinnest plate or warmest coolant that still meets your thermal target, optionally within a pressure-drop limit. Uses the full 2D model.', 'Findet den kleinsten Durchfluss, die wenigsten Kanäle, die dünnste Platte oder das wärmste Kühlmittel, das Ihr thermisches Ziel noch erfüllt, optional mit Druckverlustgrenze. Verwendet das vollständige 2D-Modell.', 'Vindt het laagste debiet, het minste aantal kanalen, de dunste plaat of het warmste koelmiddel dat uw thermische doel nog haalt, eventueel binnen een drukvalgrens. Gebruikt het volledige 2D-model.', 'Isıl hedefinizi hâlâ karşılayan en düşük debiyi, en az kanalı, en ince plakayı veya en sıcak soğutucuyu bulur; isteğe bağlı olarak bir basınç düşümü sınırı içinde. Tam 2B modeli kullanır.'],
    ['Target', 'Ziel', 'Doel', 'Hedef'],
    ['Max. pressure drop', 'Max. Druckverlust', 'Max. drukval', 'En fazla basınç düşümü'],
    ['no limit', 'keine Grenze', 'geen limiet', 'sınır yok'],
    ['Solve for', 'Gesucht', 'Oplossen voor', 'Çözülecek'],
    ['Find', 'Suchen', 'Zoeken', 'Bul'],
    ['Margin below each component limit', 'Abstand unter jedem Bauteilgrenzwert', 'Marge onder elke componentlimiet', 'Her bileşen sınırının altındaki pay'],
    ['Max. peak surface temperature', 'Max. Oberflächen-Spitzentemperatur', 'Max. piekoppervlaktetemperatuur', 'En yüksek tepe yüzey sıcaklığı'],
    ['Heat to dissipate', 'Abzuführende Wärme', 'Af te voeren warmte', 'Atılacak ısı'],
    ['Minimum flow rate', 'Minimaler Durchfluss', 'Minimaal debiet', 'En düşük debi'],
    ['Fewest passes', 'Wenigste Durchgänge', 'Minste passages', 'En az geçiş'],
    ['Fewest channels', 'Wenigste Kanäle', 'Minste kanalen', 'En az kanal'],
    ['Thinnest plate', 'Dünnste Platte', 'Dunste plaat', 'En ince plaka'],
    ['Highest inlet temperature', 'Höchste Eintrittstemperatur', 'Hoogste inlaattemperatuur', 'En yüksek giriş sıcaklığı'],
    ['At a peak surface temperature of {T}.', 'Bei einer maximalen Oberflächentemperatur von {T}.', 'Bij een piekoppervlaktetemperatuur van {T}.', '{T} tepe yüzey sıcaklığında.'],
    ['The flow is set by the pump curve; switch to a fixed flow rate to size the flow.', 'Der Durchfluss ergibt sich aus der Pumpenkennlinie; für die Auslegung des Durchflusses auf festen Durchfluss umschalten.', 'Het debiet volgt uit de pompcurve; schakel naar een vast debiet om het debiet te dimensioneren.', 'Debi pompa eğrisiyle belirlenir; debiyi boyutlandırmak için sabit debiye geçin.'],
    ['Searching… {n} calculations', 'Suche… {n} Berechnungen', 'Zoeken… {n} berekeningen', 'Aranıyor… {n} hesaplama'],
    ['Searching…', 'Suche…', 'Zoeken…', 'Aranıyor…'],
    ['The thermal target and the pressure-drop limit cannot both be met in the range {range}. Relax one of them or change the design.', 'Thermisches Ziel und Druckverlustgrenze lassen sich im Bereich {range} nicht gleichzeitig erfüllen. Lockern Sie eines davon oder ändern Sie den Entwurf.', 'Het thermische doel en de drukvalgrens zijn in het bereik {range} niet tegelijk haalbaar. Versoepel een van beide of wijzig het ontwerp.', 'Isıl hedef ve basınç düşümü sınırı {range} aralığında birlikte karşılanamıyor. Birini gevşetin veya tasarımı değiştirin.'],
    ['The target cannot be reached in the range {range}. Closest: {value} at {x}.', 'Das Ziel ist im Bereich {range} nicht erreichbar. Am nächsten: {value} bei {x}.', 'Het doel is in het bereik {range} niet haalbaar. Dichtstbij: {value} bij {x}.', 'Hedefe {range} aralığında ulaşılamıyor. En yakın: {x} değerinde {value}.'],
    ['The target cannot be reached in the range {range}.', 'Das Ziel ist im Bereich {range} nicht erreichbar.', 'Het doel is in het bereik {range} niet haalbaar.', 'Hedefe {range} aralığında ulaşılamıyor.'],
    ['The target is already met at the low end of the search range ({x}).', 'Das Ziel ist bereits am unteren Ende des Suchbereichs erfüllt ({x}).', 'Het doel wordt al gehaald aan de onderkant van het zoekbereik ({x}).', 'Hedef, arama aralığının alt ucunda zaten karşılanıyor ({x}).'],
    ['The target is still met at the high end of the search range ({x}).', 'Das Ziel ist auch am oberen Ende des Suchbereichs noch erfüllt ({x}).', 'Het doel wordt ook aan de bovenkant van het zoekbereik nog gehaald ({x}).', 'Hedef, arama aralığının üst ucunda bile karşılanıyor ({x}).'],
    ['Limited by geometry: going further gives an invalid design.', 'Durch die Geometrie begrenzt: weiter ergibt einen ungültigen Entwurf.', 'Begrensd door de geometrie: verder gaan geeft een ongeldig ontwerp.', 'Geometriyle sınırlı: daha ileri gitmek geçersiz bir tasarım verir.'],
    ['Limited by the thermal target.', 'Durch das thermische Ziel begrenzt.', 'Begrensd door het thermische doel.', 'Isıl hedefle sınırlı.'],
    ['Limited by the pressure-drop limit.', 'Durch die Druckverlustgrenze begrenzt.', 'Begrensd door de drukvalgrens.', 'Basınç düşümü sınırıyla sınırlı.'],
    ['Inputs have changed since this search — run it again to update.', 'Die Eingaben haben sich seit dieser Suche geändert — starten Sie sie erneut.', 'De invoer is gewijzigd sinds deze zoekopdracht — voer hem opnieuw uit.', 'Bu aramadan sonra girdiler değişti — güncellemek için yeniden çalıştırın.'],
    ['current design: {x}', 'aktueller Entwurf: {x}', 'huidig ontwerp: {x}', 'mevcut tasarım: {x}'],
    ['Apply to design', 'In den Entwurf übernehmen', 'Toepassen op ontwerp', 'Tasarıma uygula'],
    ['Applied: {label} = {x}', 'Übernommen: {label} = {x}', 'Toegepast: {label} = {x}', 'Uygulandı: {label} = {x}'],
    ['margin {v}', 'Abstand {v}', 'marge {v}', 'pay {v}'],
  ];

  // Blocks with inline markup, translated as a whole (static, trusted content).
  const HTML = {
    help: {
      en: `<h2 id="help-title">How to use</h2>
<p>Work through the inputs on the left from top to bottom; the results on the right update as you type.</p>
<ol><li><b>Start from an example.</b> Pick an application preset in the toolbar and adapt it. You can switch SI/Imperial units and the language at any time.</li><li><b>Plate.</b> Length, width, thickness and material. Higher conductivity spreads heat better between the channels.</li><li><b>Flow layout.</b> Serpentine: one long channel (or a few circuits), even cooling but higher pressure drop. Parallel Z/U: many short channels fed by headers, low pressure drop; check the flow distribution card.</li><li><b>Channel section.</b> Round, square or rectangular. Channel depth plus the heated-face wall must fit within the plate thickness.</li><li><b>Coolant.</b> Fluid, inlet temperature and pressure, and either a fixed flow rate or a pump curve; with a pump curve the operating point is found automatically.</li><li><b>Heat input.</b> Uniform heat: enter a power to get the peak temperature, or a maximum surface temperature to get the capacity. Heat sources: add components with power, footprint, TIM and R<sub>jc</sub>, and drag them on the plate layout.</li></ol>
<h3>Reading the results</h3>
<ul><li>The headline shows the capacity, peak temperature or hottest junction. Warnings and notes point out design problems.</li><li>Hover over the 2D map to read local temperatures. The component table lists plate, case and junction temperatures with the margin to each limit.</li><li>The breakdown bars show which thermal resistance or pressure loss dominates: improve the largest one first.</li><li><b>Size for a target</b> finds the lowest flow, fewest channels, thinnest plate or warmest coolant that meets your limit. <b>Parameter sweep</b> shows how one input affects the result; <b>Design comparison</b> puts saved variants side by side.</li>
<li>The <a href="#steps" data-open-steps>step-by-step calculation</a> shows every formula with your numbers.</li></ul>
<h3>Typical values</h3>
<ul><li>Channel velocity for water/glycol: 0.5–2 m/s (aluminium ≲ 2 m/s against erosion).</li><li>Coolant temperature rise: 3–10 K for good temperature uniformity.</li><li>TIM: thermal grease ≈ 0.05–0.2 K·cm²/W, gap pads ≈ 1–5 K·cm²/W.</li></ul>
<h3>Saving and sharing</h3>
<p>Your design is saved in this browser automatically. <b>Copy link</b> creates a URL with all inputs, <b>Export PDF</b> writes a design report including the calculation steps, and <b>Print</b> prints the page.</p>
<p class="about-meta">Results are engineering estimates for concept sizing (about ±15–30 %). Validate final designs by CFD or test.</p>`,
      de: `<h2 id="help-title">So geht’s</h2>
<p>Arbeiten Sie die Eingaben links von oben nach unten durch; die Ergebnisse rechts werden sofort aktualisiert.</p>
<ol><li><b>Mit einem Beispiel beginnen.</b> Wählen Sie in der Werkzeugleiste eine Anwendungsvorlage und passen Sie sie an. SI/Imperial und Sprache lassen sich jederzeit umschalten.</li><li><b>Platte.</b> Länge, Breite, Dicke und Werkstoff. Eine höhere Wärmeleitfähigkeit verteilt die Wärme besser zwischen den Kanälen.</li><li><b>Strömungsführung.</b> Mäander: ein langer Kanal (oder wenige Kreise), gleichmäßige Kühlung, aber höherer Druckverlust. Parallel Z/U: viele kurze Kanäle über Verteiler, geringer Druckverlust; prüfen Sie die Karte zur Strömungsverteilung.</li><li><b>Kanalquerschnitt.</b> Rund, quadratisch oder rechteckig. Kanaltiefe plus Wand der beheizten Seite müssen in die Plattendicke passen.</li><li><b>Kühlmittel.</b> Medium, Eintrittstemperatur und -druck sowie ein fester Durchfluss oder eine Pumpenkennlinie; mit Kennlinie wird der Betriebspunkt automatisch bestimmt.</li><li><b>Wärmeeintrag.</b> Gleichmäßig: Leistung eingeben für die Maximaltemperatur oder eine maximale Oberflächentemperatur für die Leistungsgrenze. Wärmequellen: Bauteile mit Leistung, Grundfläche, TIM und R<sub>jc</sub> anlegen und im Plattenlayout verschieben.</li></ol>
<h3>Ergebnisse lesen</h3>
<ul><li>Die Kopfzeile zeigt Leistungsgrenze, Maximaltemperatur oder heißeste Sperrschicht. Warnungen und Hinweise zeigen Auslegungsprobleme.</li><li>Fahren Sie über die 2D-Karte, um lokale Temperaturen abzulesen. Die Bauteiltabelle zeigt Platten-, Gehäuse- und Sperrschichttemperaturen mit Abstand zum Grenzwert.</li><li>Die Balken zeigen, welcher Wärmewiderstand oder Druckverlust dominiert: zuerst den größten verbessern.</li><li><b>Auslegung auf ein Ziel</b> findet den kleinsten Durchfluss, die wenigsten Kanäle, die dünnste Platte oder das wärmste Kühlmittel, das Ihren Grenzwert einhält. Die <b>Parameterstudie</b> zeigt den Einfluss einer Eingabe; der <b>Entwurfsvergleich</b> stellt gespeicherte Varianten nebeneinander.</li>
<li>Die <a href="#steps" data-open-steps>Schritt-für-Schritt-Berechnung</a> zeigt jede Formel mit Ihren Zahlen.</li></ul>
<h3>Typische Werte</h3>
<ul><li>Kanalgeschwindigkeit bei Wasser/Glykol: 0,5–2 m/s (Aluminium ≲ 2 m/s wegen Erosion).</li><li>Kühlmittelerwärmung: 3–10 K für eine gleichmäßige Temperatur.</li><li>TIM: Wärmeleitpaste ≈ 0,05–0,2 K·cm²/W, Gap-Pads ≈ 1–5 K·cm²/W.</li></ul>
<h3>Speichern und teilen</h3>
<p>Ihr Entwurf wird automatisch in diesem Browser gespeichert. <b>Link kopieren</b> erzeugt eine URL mit allen Eingaben, <b>PDF exportieren</b> einen Auslegungsbericht mit den Rechenschritten, <b>Drucken</b> druckt die Seite.</p>
<p class="about-meta">Die Ergebnisse sind ingenieurmäßige Abschätzungen für die Vorauslegung (etwa ±15–30 %). Endgültige Auslegungen per CFD oder Versuch validieren.</p>`,
      nl: `<h2 id="help-title">Zo werkt het</h2>
<p>Werk de invoer links van boven naar beneden af; de resultaten rechts worden direct bijgewerkt.</p>
<ol><li><b>Begin met een voorbeeld.</b> Kies een toepassingsvoorbeeld in de werkbalk en pas het aan. SI/Imperial en de taal kunt u altijd omschakelen.</li><li><b>Plaat.</b> Lengte, breedte, dikte en materiaal. Een hogere geleidbaarheid spreidt de warmte beter tussen de kanalen.</li><li><b>Stromingsindeling.</b> Meander: één lang kanaal (of enkele circuits), gelijkmatige koeling maar hogere drukval. Parallel Z/U: veel korte kanalen gevoed door verdelers, lage drukval; controleer de kaart met de stromingsverdeling.</li><li><b>Kanaaldoorsnede.</b> Rond, vierkant of rechthoekig. Kanaaldiepte plus de wand aan de verwarmde zijde moet binnen de plaatdikte passen.</li><li><b>Koelmiddel.</b> Medium, inlaattemperatuur en -druk, en een vast debiet of een pompcurve; met een pompcurve wordt het werkpunt automatisch bepaald.</li><li><b>Warmte-invoer.</b> Uniform: voer een vermogen in voor de piektemperatuur, of een maximale oppervlaktetemperatuur voor de capaciteit. Warmtebronnen: voeg componenten toe met vermogen, footprint, TIM en R<sub>jc</sub> en sleep ze op de plaatindeling.</li></ol>
<h3>De resultaten lezen</h3>
<ul><li>De kop toont de capaciteit, piektemperatuur of heetste junctie. Waarschuwingen en opmerkingen wijzen op ontwerpproblemen.</li><li>Beweeg over de 2D-kaart om lokale temperaturen af te lezen. De componententabel toont plaat-, behuizing- en junctietemperaturen met de marge tot elke limiet.</li><li>De balken tonen welke thermische weerstand of drukval domineert: verbeter eerst de grootste.</li><li><b>Dimensioneren op een doel</b> vindt het laagste debiet, het minste aantal kanalen, de dunste plaat of het warmste koelmiddel dat uw limiet haalt. De <b>parameterstudie</b> toont de invloed van één invoer; de <b>ontwerpvergelijking</b> zet opgeslagen varianten naast elkaar.</li>
<li>De <a href="#steps" data-open-steps>stapsgewijze berekening</a> toont elke formule met uw getallen.</li></ul>
<h3>Typische waarden</h3>
<ul><li>Kanaalsnelheid voor water/glycol: 0,5–2 m/s (aluminium ≲ 2 m/s vanwege erosie).</li><li>Temperatuurstijging van het koelmiddel: 3–10 K voor een gelijkmatige temperatuur.</li><li>TIM: koelpasta ≈ 0,05–0,2 K·cm²/W, gap pads ≈ 1–5 K·cm²/W.</li></ul>
<h3>Opslaan en delen</h3>
<p>Uw ontwerp wordt automatisch in deze browser opgeslagen. <b>Link kopiëren</b> maakt een URL met alle invoer, <b>PDF exporteren</b> een ontwerprapport met de rekenstappen, en <b>Afdrukken</b> drukt de pagina af.</p>
<p class="about-meta">De resultaten zijn technische schattingen voor conceptontwerp (ongeveer ±15–30 %). Valideer definitieve ontwerpen met CFD of test.</p>`,
      tr: `<h2 id="help-title">Nasıl kullanılır</h2>
<p>Soldaki girdileri yukarıdan aşağıya doldurun; sağdaki sonuçlar siz yazdıkça güncellenir.</p>
<ol><li><b>Bir örnekle başlayın.</b> Araç çubuğundan bir uygulama örneği seçin ve uyarlayın. SI/Imperial birimleri ve dili istediğiniz an değiştirebilirsiniz.</li><li><b>Plaka.</b> Uzunluk, genişlik, kalınlık ve malzeme. Daha yüksek iletkenlik ısıyı kanallar arasında daha iyi yayar.</li><li><b>Akış düzeni.</b> Serpantin: tek uzun kanal (veya birkaç devre), düzgün soğutma ama daha yüksek basınç düşümü. Paralel Z/U: kollektörlerle beslenen çok sayıda kısa kanal, düşük basınç düşümü; akış dağılımı kartını kontrol edin.</li><li><b>Kanal kesiti.</b> Dairesel, kare veya dikdörtgen. Kanal derinliği ile ısıtılan yüzey eti plaka kalınlığına sığmalıdır.</li><li><b>Soğutucu.</b> Akışkan, giriş sıcaklığı ve basıncı ile sabit debi veya pompa eğrisi; pompa eğrisiyle çalışma noktası otomatik bulunur.</li><li><b>Isı girişi.</b> Düzgün ısı: en yüksek sıcaklık için güç, kapasite için en yüksek yüzey sıcaklığı girin. Isı kaynakları: güç, taban alanı, TIM ve R<sub>jc</sub> ile bileşen ekleyin ve plaka yerleşiminde sürükleyin.</li></ol>
<h3>Sonuçları okuma</h3>
<ul><li>Başlık kapasiteyi, en yüksek sıcaklığı veya en sıcak jonksiyonu gösterir. Uyarılar ve notlar tasarım sorunlarına işaret eder.</li><li>Yerel sıcaklıkları okumak için 2B haritanın üzerine gelin. Bileşen tablosu plaka, kasa ve jonksiyon sıcaklıklarını sınıra kalan payla birlikte listeler.</li><li>Çubuklar hangi ısıl direncin veya basınç kaybının baskın olduğunu gösterir: önce en büyüğünü iyileştirin.</li><li><b>Hedefe göre boyutlandırma</b> sınırınızı karşılayan en düşük debiyi, en az kanalı, en ince plakayı veya en sıcak soğutucuyu bulur. <b>Parametre taraması</b> bir girdinin etkisini gösterir; <b>tasarım karşılaştırması</b> kayıtlı varyantları yan yana koyar.</li>
<li><a href="#steps" data-open-steps>Adım adım hesaplama</a> her formülü sizin değerlerinizle gösterir.</li></ul>
<h3>Tipik değerler</h3>
<ul><li>Su/glikol için kanal hızı: 0,5–2 m/s (alüminyumda erozyona karşı ≲ 2 m/s).</li><li>Soğutucu sıcaklık artışı: iyi sıcaklık düzgünlüğü için 3–10 K.</li><li>TIM: termal macun ≈ 0,05–0,2 K·cm²/W, gap pad ≈ 1–5 K·cm²/W.</li></ul>
<h3>Kaydetme ve paylaşma</h3>
<p>Tasarımınız bu tarayıcıda otomatik kaydedilir. <b>Bağlantıyı kopyala</b> tüm girdileri içeren bir URL oluşturur, <b>PDF dışa aktar</b> hesaplama adımlarını içeren bir tasarım raporu yazar, <b>Yazdır</b> sayfayı yazdırır.</p>
<p class="about-meta">Sonuçlar ön boyutlandırma için mühendislik tahminidir (yaklaşık ±%15–30). Nihai tasarımları CFD veya testle doğrulayın.</p>`,
    },
    about: {
      en: `<div class="about-head"><img src="icons/favicon.svg" alt=""><div><h2 id="about-title">Cold Plate Calculator</h2><p>Version 2 · by Eren Tozlu</p></div></div>
<p>A free, browser-based tool for first-pass sizing of liquid- and gas-cooled cold plates for power electronics, batteries and fuel-cell systems. It couples a 2D conduction model of the plate with 1D channel hydraulics, pump matching and manifold flow distribution. All calculations run in your browser.</p>
<p>Made by Eren Tozlu. More engineering tools and projects at <a href="https://ehcrea.com" target="_blank" rel="noopener">ehcrea.com</a>.</p>
<p>Open source under the <a href="https://github.com/ehcrea/cold-plate-calculator/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>; the source code is on <a href="https://github.com/ehcrea/cold-plate-calculator" target="_blank" rel="noopener">GitHub</a>.</p>
<p class="about-meta">Results are engineering estimates. Validate final designs by CFD or test.</p>`,
      de: `<div class="about-head"><img src="icons/favicon.svg" alt=""><div><h2 id="about-title">Kühlplatten-Rechner</h2><p>Version 2 · von Eren Tozlu</p></div></div>
<p>Ein kostenloses Browser-Werkzeug zur Vorauslegung flüssigkeits- und gasgekühlter Kühlplatten für Leistungselektronik, Batterien und Brennstoffzellensysteme. Es koppelt ein 2D-Wärmeleitungsmodell der Platte mit 1D-Kanalhydraulik, Pumpenabgleich und Strömungsverteilung in Verteilern. Alle Berechnungen laufen in Ihrem Browser.</p>
<p>Entwickelt von Eren Tozlu. Weitere technische Werkzeuge und Projekte auf <a href="https://ehcrea.com" target="_blank" rel="noopener">ehcrea.com</a>.</p>
<p>Open Source unter der <a href="https://github.com/ehcrea/cold-plate-calculator/blob/main/LICENSE" target="_blank" rel="noopener">MIT-Lizenz</a>; der Quellcode liegt auf <a href="https://github.com/ehcrea/cold-plate-calculator" target="_blank" rel="noopener">GitHub</a>.</p>
<p class="about-meta">Die Ergebnisse sind ingenieurmäßige Abschätzungen. Endgültige Auslegungen per CFD oder Versuch validieren.</p>`,
      nl: `<div class="about-head"><img src="icons/favicon.svg" alt=""><div><h2 id="about-title">Koelplaatcalculator</h2><p>Versie 2 · door Eren Tozlu</p></div></div>
<p>Een gratis browsertool voor het voorontwerp van vloeistof- en gasgekoelde koelplaten voor vermogenselektronica, batterijen en brandstofcelsystemen. Het koppelt een 2D-warmtegeleidingsmodel van de plaat aan 1D-kanaalhydraulica, pompafstemming en stromingsverdeling in verdelers. Alle berekeningen draaien in uw browser.</p>
<p>Gemaakt door Eren Tozlu. Meer technische tools en projecten op <a href="https://ehcrea.com" target="_blank" rel="noopener">ehcrea.com</a>.</p>
<p>Open source onder de <a href="https://github.com/ehcrea/cold-plate-calculator/blob/main/LICENSE" target="_blank" rel="noopener">MIT-licentie</a>; de broncode staat op <a href="https://github.com/ehcrea/cold-plate-calculator" target="_blank" rel="noopener">GitHub</a>.</p>
<p class="about-meta">De resultaten zijn technische schattingen. Valideer definitieve ontwerpen met CFD of test.</p>`,
      tr: `<div class="about-head"><img src="icons/favicon.svg" alt=""><div><h2 id="about-title">Soğutma Plakası Hesaplayıcı</h2><p>Sürüm 2 · Eren Tozlu</p></div></div>
<p>Güç elektroniği, bataryalar ve yakıt hücresi sistemleri için sıvı ve gaz soğutmalı soğutma plakalarının ön boyutlandırması için ücretsiz, tarayıcı tabanlı bir araç. Plakanın 2B iletim modelini 1B kanal hidroliği, pompa eşleştirme ve kollektör akış dağılımıyla birleştirir. Tüm hesaplamalar tarayıcınızda çalışır.</p>
<p>Eren Tozlu tarafından geliştirildi. Daha fazla mühendislik aracı ve proje: <a href="https://ehcrea.com" target="_blank" rel="noopener">ehcrea.com</a>.</p>
<p><a href="https://github.com/ehcrea/cold-plate-calculator/blob/main/LICENSE" target="_blank" rel="noopener">MIT Lisansı</a> altında açık kaynaklıdır; kaynak kodu <a href="https://github.com/ehcrea/cold-plate-calculator" target="_blank" rel="noopener">GitHub</a> üzerindedir.</p>
<p class="about-meta">Sonuçlar mühendislik tahminidir. Nihai tasarımları CFD veya testle doğrulayın.</p>`,
    },
    srcnote: {
      en: 'Plate = average plate surface under the footprint. TIM ΔT = P × (t/k + contact resistance) / area. Case = plate + TIM ΔT. Junction = case + P·R<sub>jc</sub>.',
      de: 'Platte = mittlere Plattenoberfläche unter der Grundfläche. TIM ΔT = P × (t/k + Kontaktwiderstand) / Fläche. Gehäuse = Platte + TIM ΔT. Sperrschicht = Gehäuse + P·R<sub>jc</sub>.',
      nl: 'Plaat = gemiddeld plaatoppervlak onder de component. TIM ΔT = P × (t/k + contactweerstand) / oppervlak. Behuizing = plaat + TIM ΔT. Junctie = behuizing + P·R<sub>jc</sub>.',
      tr: 'Plaka = bileşen tabanı altındaki ortalama plaka yüzeyi. TIM ΔT = P × (t/k + temas direnci) / alan. Kasa = plaka + TIM ΔT. Jonksiyon = kasa + P·R<sub>jc</sub>.',
    },
    notes: {
      en: `<p>Concept-sizing estimate: a 2D plate conduction model coupled to 1D channel hydraulics. Expect roughly ±15–30 % compared with CFD or test data, and validate final designs by simulation or measurement.</p>
<ul>
<li><b>Heat transfer.</b> Laminar: Shah &amp; London Nu<sub>H1</sub> and f·Re for the channel aspect ratio, with a Hausen-type entry correction per straight pass. Turbulent: Gnielinski with a short-duct correction. Re 2300–4000 is blended. Bends restart the boundary layer; Dean-vortex enhancement is ignored (conservative).</li>
<li><b>2D plate model.</b> The plate face is a grid of up to about 6,000 cells conducting in-plane through the local solid thickness. Cells above channels, port leads and headers are coupled to the coolant through the heated-face wall and the fin-corrected convective film. The coolant is marched along each channel path until plate and coolant agree. This gives the map, the peak temperature and the component temperatures.</li>
<li><b>Components.</b> Case = plate under the footprint + P·(t/k + contact resistance)/A of the TIM. Junction = case + P·R<sub>jc</sub>. Spreading through the plate thickness under small sources is not modelled, so very small, intense sources read slightly optimistic.</li>
<li><b>Pressure drop.</b> Shah apparent friction (laminar, developing) and Haaland (turbulent); Darby 3-K for 180° bends; fixed loss coefficients for channel entry/exit (0.5 + 1.0) and ports (1.5 each).</li>
<li><b>Flow distribution.</b> Parallel layouts: the headers are split into segments with friction and momentum (the inlet header regains 1.0×, the outlet header loses 2.0× the velocity-head change), balanced against each channel's own Δp(q). The per-channel flows set the header losses and each channel's heat transfer in the 2D model.</li>
<li><b>Pump curve.</b> The operating flow is found by bisection where the pump pressure rise equals the plate plus rest-of-loop pressure drop (which scales with flow²).</li>
<li><b>Fluids.</b> Properties at the mean bulk temperature. Glycol data by volume, approximate (±5–10 %). Gases are ideal and incompressible within the plate, at inlet pressure.</li>
<li><b>Not modelled.</b> Radiation and natural convection, two-phase flow, turbulators and pin fins, gas compressibility within the plate.</li>
</ul>`,
      de: `<p>Abschätzung für die Konzeptauslegung: ein 2D-Wärmeleitmodell der Platte, gekoppelt mit 1D-Kanalhydraulik. Abweichungen von etwa ±15–30 % gegenüber CFD- oder Versuchsdaten sind zu erwarten; endgültige Auslegungen per Simulation oder Messung validieren.</p>
<ul>
<li><b>Wärmeübergang.</b> Laminar: Shah &amp; London Nu<sub>H1</sub> und f·Re für das Seitenverhältnis des Kanals, mit einer Einlaufkorrektur nach Hausen je gerader Bahn. Turbulent: Gnielinski mit Kurzrohrkorrektur. Re 2300–4000 wird interpoliert. Umlenkungen starten die Grenzschicht neu; die Verstärkung durch Dean-Wirbel wird vernachlässigt (konservativ).</li>
<li><b>2D-Plattenmodell.</b> Die Plattenfläche ist ein Gitter aus bis zu etwa 6.000 Zellen mit Wärmeleitung in der Ebene durch die lokale Materialdicke. Zellen über Kanälen, Anschlussleitungen und Verteilern sind über die Wand zur beheizten Fläche und den rippenkorrigierten Konvektionsfilm an das Kühlmittel gekoppelt. Das Kühlmittel wird entlang jedes Kanalpfads verfolgt, bis Platte und Kühlmittel übereinstimmen. Daraus ergeben sich die Karte, die Spitzentemperatur und die Bauteiltemperaturen.</li>
<li><b>Bauteile.</b> Gehäuse = Platte unter der Grundfläche + P·(t/k + Kontaktwiderstand)/A des TIM. Sperrschicht = Gehäuse + P·R<sub>jc</sub>. Die Spreizung durch die Plattendicke unter kleinen Quellen wird nicht modelliert; sehr kleine, intensive Quellen werden daher leicht optimistisch berechnet.</li>
<li><b>Druckverlust.</b> Scheinbare Reibung nach Shah (laminar, Einlauf) und Haaland (turbulent); Darby 3-K für 180°-Umlenkungen; feste Verlustbeiwerte für Kanalein-/-austritt (0,5 + 1,0) und Anschlüsse (je 1,5).</li>
<li><b>Durchflussverteilung.</b> Parallele Anordnungen: Die Verteiler werden in Segmente mit Reibung und Impuls zerlegt (der Eintrittsverteiler gewinnt das 1,0-fache, der Austrittssammler verliert das 2,0-fache der Änderung des Geschwindigkeitsdrucks) und gegen das Δp(q) jedes Kanals abgeglichen. Die Kanaldurchflüsse bestimmen die Verteilerverluste und den Wärmeübergang jedes Kanals im 2D-Modell.</li>
<li><b>Pumpenkennlinie.</b> Der Betriebsdurchfluss wird per Bisektion dort bestimmt, wo die Druckerhöhung der Pumpe gleich dem Druckverlust von Platte und restlichem Kreislauf ist (dieser steigt mit dem Durchfluss²).</li>
<li><b>Fluide.</b> Stoffwerte bei mittlerer Fluidtemperatur. Glykoldaten nach Volumenanteil, näherungsweise (±5–10 %). Gase ideal und innerhalb der Platte inkompressibel, beim Eintrittsdruck.</li>
<li><b>Nicht modelliert.</b> Strahlung und freie Konvektion, Zweiphasenströmung, Turbulatoren und Pin-Fins, Gaskompressibilität in der Platte.</li>
</ul>`,
      nl: `<p>Schatting voor conceptontwerp: een 2D-warmtegeleidingsmodel van de plaat gekoppeld aan 1D-kanaalhydraulica. Reken op ongeveer ±15–30 % t.o.v. CFD- of testgegevens en valideer definitieve ontwerpen met simulatie of meting.</p>
<ul>
<li><b>Warmteoverdracht.</b> Laminair: Shah &amp; London Nu<sub>H1</sub> en f·Re voor de kanaalverhouding, met een inloopcorrectie volgens Hausen per rechte doorgang. Turbulent: Gnielinski met correctie voor korte kanalen. Re 2300–4000 wordt geïnterpoleerd. Bochten starten de grenslaag opnieuw; versterking door Dean-wervels wordt genegeerd (conservatief).</li>
<li><b>2D-plaatmodel.</b> Het plaatvlak is een raster van maximaal ongeveer 6.000 cellen met geleiding in het vlak door de lokale materiaaldikte. Cellen boven kanalen, aansluitleidingen en verdelers zijn via de wand tot het verwarmde vlak en de vin-gecorrigeerde convectiefilm aan het koelmiddel gekoppeld. Het koelmiddel wordt langs elk kanaalpad gevolgd tot plaat en koelmiddel overeenstemmen. Dit levert de kaart, de piektemperatuur en de componenttemperaturen.</li>
<li><b>Componenten.</b> Behuizing = plaat onder de component + P·(t/k + contactweerstand)/A van het TIM. Junctie = behuizing + P·R<sub>jc</sub>. Spreiding door de plaatdikte onder kleine bronnen wordt niet gemodelleerd, dus zeer kleine, intense bronnen worden iets te optimistisch berekend.</li>
<li><b>Drukval.</b> Schijnbare wrijving volgens Shah (laminair, inloop) en Haaland (turbulent); Darby 3-K voor 180°-bochten; vaste verliescoëfficiënten voor kanaalin-/uitlaat (0,5 + 1,0) en aansluitingen (elk 1,5).</li>
<li><b>Debietverdeling.</b> Parallelle indelingen: de verdelers worden opgedeeld in segmenten met wrijving en impuls (de inlaatverdeler wint 1,0×, de uitlaatcollector verliest 2,0× de verandering in snelheidsdruk), in evenwicht met de eigen Δp(q) van elk kanaal. De kanaaldebieten bepalen de verdelerverliezen en de warmteoverdracht van elk kanaal in het 2D-model.</li>
<li><b>Pompcurve.</b> Het werkdebiet wordt met bisectie bepaald waar de drukverhoging van de pomp gelijk is aan de drukval van plaat plus rest van het circuit (die schaalt met debiet²).</li>
<li><b>Vloeistoffen.</b> Eigenschappen bij de gemiddelde temperatuur. Glycolgegevens naar volume, bij benadering (±5–10 %). Gassen zijn ideaal en in de plaat onsamendrukbaar, bij inlaatdruk.</li>
<li><b>Niet gemodelleerd.</b> Straling en vrije convectie, tweefasestroming, turbulatoren en pinvinnen, samendrukbaarheid van gas in de plaat.</li>
</ul>`,
      tr: `<p>Kavramsal boyutlandırma tahmini: 1B kanal hidroliğine bağlı 2B plaka iletim modeli. CFD veya test verilerine göre yaklaşık ±%15–30 sapma beklenir; nihai tasarımları simülasyon veya ölçümle doğrulayın.</p>
<ul>
<li><b>Isı transferi.</b> Laminer: kanal en-boy oranı için Shah &amp; London Nu<sub>H1</sub> ve f·Re, her düz geçişte Hausen tipi giriş düzeltmesiyle. Türbülanslı: kısa kanal düzeltmeli Gnielinski. Re 2300–4000 arası enterpole edilir. Dirsekler sınır tabakayı yeniden başlatır; Dean girdabı artışı ihmal edilir (muhafazakâr).</li>
<li><b>2B plaka modeli.</b> Plaka yüzeyi, yerel katı kalınlığı boyunca düzlem içi iletim yapan yaklaşık 6.000 hücreye kadar bir ızgaradır. Kanalların, bağlantı hatlarının ve kollektörlerin üzerindeki hücreler, ısıtılan yüzey eti ve kanatçık düzeltmeli taşınım filmi ile soğutucuya bağlanır. Soğutucu, plaka ve soğutucu uyuşana kadar her kanal yolu boyunca izlenir. Harita, en yüksek sıcaklık ve bileşen sıcaklıkları buradan elde edilir.</li>
<li><b>Bileşenler.</b> Kasa = taban alanı altındaki plaka + TIM'in P·(t/k + temas direnci)/A değeri. Jonksiyon = kasa + P·R<sub>jc</sub>. Küçük kaynakların altında plaka kalınlığı boyunca yayılma modellenmez; bu nedenle çok küçük, yoğun kaynaklar biraz iyimser hesaplanır.</li>
<li><b>Basınç düşümü.</b> Shah görünür sürtünmesi (laminer, gelişen akış) ve Haaland (türbülanslı); 180° dirsekler için Darby 3-K; kanal giriş/çıkışı (0,5 + 1,0) ve bağlantılar (her biri 1,5) için sabit kayıp katsayıları.</li>
<li><b>Debi dağılımı.</b> Paralel düzenler: kollektörler sürtünme ve momentum içeren segmentlere ayrılır (giriş kollektörü hız basıncı değişiminin 1,0 katını geri kazanır, çıkış kollektörü 2,0 katını kaybeder) ve her kanalın kendi Δp(q) eğrisiyle dengelenir. Kanal debileri, kollektör kayıplarını ve 2B modelde her kanalın ısı transferini belirler.</li>
<li><b>Pompa eğrisi.</b> Çalışma debisi, pompa basınç artışının plaka ve devrenin geri kalanının basınç düşümüne (debinin karesiyle değişir) eşit olduğu nokta ikiye bölme yöntemiyle bulunur.</li>
<li><b>Akışkanlar.</b> Özellikler ortalama akışkan sıcaklığında. Glikol verileri hacimce, yaklaşık (±%5–10). Gazlar plaka içinde ideal ve sıkıştırılamaz kabul edilir, giriş basıncında.</li>
<li><b>Modellenmeyenler.</b> Işınım ve doğal taşınım, iki fazlı akış, türbülatörler ve pim kanatçıklar, plaka içinde gaz sıkıştırılabilirliği.</li>
</ul>`,
    },
  };

  const DICT = { de: {}, nl: {}, tr: {} };
  for (const [en, de, nl, tr] of ROWS) { DICT.de[en] = de; DICT.nl[en] = nl; DICT.tr[en] = tr; }

  let lang = 'en';
  const fill = (tpl, p) => (p ? tpl.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : tpl);

  /** Translate a text (English key) and fill {placeholders}; string parameters are translated too. */
  function t(text, params) {
    if (text === undefined || text === null) return '';
    const tr = lang === 'en' ? text : (DICT[lang][text] !== undefined ? DICT[lang][text] : text);
    if (!params) return tr;
    const p = {};
    for (const k in params) p[k] = typeof params[k] === 'string' && lang !== 'en' && DICT[lang][params[k]] !== undefined ? DICT[lang][params[k]] : params[k];
    return fill(tr, p);
  }

  // ----- Static page translation -----
  let staticNodes = null; // [{ node, en, lead, trail }] and [{ el, attr, en }]
  function collectStatic() {
    const texts = [], attrs = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('script,style,[data-i18n-html],[data-i18n-skip]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const raw = n.nodeValue, en = raw.trim();
      if (en && DICT.de[en] !== undefined) texts.push({ node: n, en, lead: raw.match(/^\s*/)[0], trail: raw.match(/\s*$/)[0] });
    }
    for (const el of document.querySelectorAll('[title],[aria-label],[placeholder]')) {
      for (const attr of ['title', 'aria-label', 'placeholder']) {
        const en = el.getAttribute(attr);
        if (en && DICT.de[en] !== undefined) attrs.push({ el, attr, en });
      }
    }
    staticNodes = { texts, attrs };
  }

  function applyStatic() {
    if (!staticNodes) collectStatic();
    for (const s of staticNodes.texts) s.node.nodeValue = s.lead + t(s.en) + s.trail;
    for (const a of staticNodes.attrs) a.el.setAttribute(a.attr, t(a.en));
    for (const el of document.querySelectorAll('[data-i18n-html]')) {
      const block = HTML[el.dataset.i18nHtml];
      if (block) el.innerHTML = block[lang] || block.en; // trusted static content defined above
    }
    document.documentElement.lang = lang;
    document.title = t('Cold Plate Calculator');
  }

  const I18N = {
    LANGS, t, fill,
    /** Percentage in the local style ("18 %", Turkish "%18"). */
    pct: (v) => (lang === 'tr' ? `%${v}` : `${v} %`),
    get lang() { return lang; },
    get locale() { return LANGS[lang].locale; },
    /** Initial language: saved choice, else the browser language if supported, else English. */
    init() {
      let saved = null;
      try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* storage unavailable */ }
      const nav = (typeof navigator !== 'undefined' && navigator.language || 'en').slice(0, 2).toLowerCase();
      lang = LANGS[saved] ? saved : LANGS[nav] ? nav : 'en';
      applyStatic();
    },
    setLang(l) {
      if (!LANGS[l]) return;
      lang = l;
      try { localStorage.setItem(STORE_KEY, l); } catch (e) { /* storage unavailable */ }
      applyStatic();
    },
    /** All English keys (used by the test that checks every t('…') call has translations). */
    keys: () => ROWS.map((r) => r[0]),
    rows: () => ROWS,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
  else root.I18N = I18N;
})(typeof window !== 'undefined' ? window : globalThis);

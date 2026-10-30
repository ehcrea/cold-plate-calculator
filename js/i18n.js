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
  ];

  // Blocks with inline markup, translated as a whole (static, trusted content).
  const HTML = {
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

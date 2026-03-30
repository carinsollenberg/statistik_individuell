// ── Välj databas ───────────────────────────────────────────────────────────
dbQuery.use('student_depression');

// ════════════════════════════════════════════════════════════════════════════
// DATATRANSFORMERING
// Sleep Duration omvandlas till numeriska medelvärden
// Ja/Nej-kolumner kodas om till 0/1
// Numeriska kolumner castas till REAL
// ════════════════════════════════════════════════════════════════════════════

// Hjälpfunktion: omvandla Sleep Duration-text till numeriskt medelvärde
function sleepToNumber(sleepStr) {
  if (!sleepStr) return null;
  const s = sleepStr.replace(/'/g, '').trim().toLowerCase();
  if (s.includes('less than 5')) return 4;
  if (s.includes('5-6')) return 5.5;
  if (s.includes('7-8')) return 7.5;
  if (s.includes('more than 8')) return 9;
  return null;
}

// Hjälpfunktion: omvandla Ja/Nej till 0/1
function yesNoToNumber(val) {
  if (!val) return null;
  return val.trim().toLowerCase() === 'yes' ? 1 : 0;
}

// ════════════════════════════════════════════════════════════════════════════
// SIDA 1: ÖVERSIKT
// ════════════════════════════════════════════════════════════════════════════

addMdToPage(`
## Studenters psykiska hälsa – en dataanalys

Det här datasetet innehåller information om **27 901 studenter** och mäter faktorer
som akademisk press, sömnvanor, kost och ekonomisk stress – och om studenterna
lider av depression.

Vi börjar med en övergripande bild av datasetet.
`);

// ── Övergripande statistik via SQL ─────────────────────────────────────────

let stats = await dbQuery(`
  SELECT
    COUNT(*)                                                        AS antal_studenter,
    ROUND(AVG(CAST(Age AS REAL)), 1)                                AS medelalder,
    ROUND(AVG(CAST(CGPA AS REAL)), 2)                               AS medel_cgpa,
    ROUND(AVG(CAST([Academic Pressure] AS REAL)), 2)                AS medel_akademisk_press,
    ROUND(AVG(CAST([Financial Stress] AS REAL)), 2)                 AS medel_ekonomisk_stress,
    ROUND(AVG(CAST([Work/Study Hours] AS REAL)), 2)                 AS medel_studietimmar,
    SUM(CAST(Depression AS INTEGER))                                AS antal_deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1)   AS depression_procent
  FROM students
`);

addMdToPage(`### Nyckeltal`);
tableFromData({ data: stats });

// ── Depressionsfördelning – pajdiagram ─────────────────────────────────────

let depressionSplit = await dbQuery(`
  SELECT
    CASE WHEN Depression = '1' THEN 'Deprimerad' ELSE 'Ej deprimerad' END AS status,
    COUNT(*) AS antal
  FROM students
  GROUP BY Depression
`);

drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(depressionSplit),
  options: {
    height: 400,
    title: 'Andel deprimerade studenter',
    chartArea: { left: 20, right: 20, top: 40, bottom: 20 },
    colors: ['#E8593C', '#3B8BD4']
  }
});

// ── Könsfördelning ─────────────────────────────────────────────────────────

let genderSplit = await dbQuery(`
  SELECT Gender AS kön, COUNT(*) AS antal
  FROM students
  GROUP BY Gender
  ORDER BY antal DESC
`);

addMdToPage(`### Könsfördelning i datasetet`);

drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(genderSplit),
  options: {
    height: 350,
    title: 'Könsfördelning',
    chartArea: { left: 20, right: 20 },
    colors: ['#534AB7', '#F0997B']
  }
});


// ════════════════════════════════════════════════════════════════════════════
// SIDA 2: SAMBAND & KORRELATION
// ════════════════════════════════════════════════════════════════════════════

addMdToPage(`
---
## Samband mellan faktorer och depression

Nedan undersöker vi om det finns mätbara samband mellan depression och olika
livsfaktorer. Vi jämför medelvärden för deprimerade vs ej deprimerade studenter.
`);

// ── Akademisk press och stress – deprimerade vs ej deprimerade ─────────────

let pressureComparison = await dbQuery(`
  SELECT
    CASE WHEN Depression = '1' THEN 'Deprimerad' ELSE 'Ej deprimerad' END AS status,
    ROUND(AVG(CAST([Academic Pressure] AS REAL)), 2)  AS medel_akademisk_press,
    ROUND(AVG(CAST([Work Pressure] AS REAL)), 2)       AS medel_arbetsstress,
    ROUND(AVG(CAST([Financial Stress] AS REAL)), 2)    AS medel_ekonomisk_stress,
    ROUND(AVG(CAST([Work/Study Hours] AS REAL)), 2)    AS medel_studietimmar,
    ROUND(AVG(CAST(CGPA AS REAL)), 2)                  AS medel_betyg,
    COUNT(*) AS antal
  FROM students
  GROUP BY Depression
`);

addMdToPage(`### Jämförelse: deprimerade vs ej deprimerade`);
tableFromData({ data: pressureComparison });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(pressureComparison),
  options: {
    height: 400,
    title: 'Medelvärden: deprimerade vs ej deprimerade',
    chartArea: { left: 140, right: 20 },
    colors: ['#E8593C', '#3B8BD4', '#EF9F27', '#534AB7', '#1D9E75']
  }
});

// ── Sömn och depression ────────────────────────────────────────────────────

addMdToPage(`
### Sömnlängd och depression

*Sleep Duration* är ursprungligen en textkolumn. Vi omvandlar den till numeriska
medelvärden (t.ex. "5-6 hours" → 5.5 h) för att kunna räkna på den.
`);

let sleepData = await dbQuery(`
  SELECT
    [Sleep Duration]  AS sömn_kategori,
    COUNT(*)          AS antal,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS depression_procent
  FROM students
  GROUP BY [Sleep Duration]
  ORDER BY depression_procent DESC
`);

// Lägg till numeriska sömnvärden via JS-transformation
sleepData = sleepData.map(row => ({
  ...row,
  sömn_timmar: sleepToNumber(row.sömn_kategori)
}));

tableFromData({ data: sleepData });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(sleepData.map(r => ({
    sömn_kategori: r.sömn_kategori,
    depression_procent: r.depression_procent
  }))),
  options: {
    height: 400,
    title: 'Andel deprimerade per sömnkategori (%)',
    chartArea: { left: 180, right: 30 },
    colors: ['#E8593C']
  }
});

// ── CGPA och depression – spridningsdiagram ────────────────────────────────

let cgpaByDepression = await dbQuery(`
  SELECT
    ROUND(CAST(CGPA AS REAL), 1) AS cgpa,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS depression_procent,
    COUNT(*) AS antal
  FROM students
  GROUP BY ROUND(CAST(CGPA AS REAL), 1)
  HAVING COUNT(*) > 10
  ORDER BY cgpa
`);

addMdToPage(`### CGPA och depression`);

drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(cgpaByDepression.map(r => ({
    cgpa: r.cgpa,
    depression_procent: r.depression_procent
  }))),
  options: {
    height: 400,
    title: 'Andel deprimerade (%) per CGPA-värde',
    chartArea: { left: 60, right: 20 },
    colors: ['#E8593C'],
    hAxis: { title: 'CGPA' },
    vAxis: { title: 'Depression (%)' }
  }
});


// ════════════════════════════════════════════════════════════════════════════
// SIDA 3: RISKFAKTORER
// ════════════════════════════════════════════════════════════════════════════

addMdToPage(`
---
## Riskfaktorer för depression

Vilka faktorer verkar ha störst påverkan? Vi tittar på familjehistorik,
kostvanor och självmordstankar.
`);

// ── Familjehistorik ────────────────────────────────────────────────────────

let familyHistory = await dbQuery(`
  SELECT
    [Family History of Mental Illness] AS familjehistorik,
    COUNT(*) AS antal,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS depression_procent
  FROM students
  GROUP BY familjehistorik
`);

addMdToPage(`### Familjehistorik av psykisk ohälsa`);
tableFromData({ data: familyHistory });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(familyHistory.map(r => ({
    familjehistorik: r.familjehistorik,
    depression_procent: r.depression_procent
  }))),
  options: {
    height: 350,
    title: 'Depression (%) utifrån familjehistorik',
    chartArea: { left: 80, right: 20 },
    colors: ['#534AB7']
  }
});

// ── Kostvanor ──────────────────────────────────────────────────────────────

let dietData = await dbQuery(`
  SELECT
    [Dietary Habits] AS kostvanor,
    COUNT(*) AS antal,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS depression_procent
  FROM students
  GROUP BY kostvanor
  ORDER BY depression_procent DESC
`);

addMdToPage(`### Kostvanor och depression`);
tableFromData({ data: dietData });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(dietData.map(r => ({
    kostvanor: r.kostvanor,
    depression_procent: r.depression_procent
  }))),
  options: {
    height: 350,
    title: 'Depression (%) per kostvanor',
    chartArea: { left: 100, right: 20 },
    colors: ['#D85A30']
  }
});

// ── Självmordstankar ───────────────────────────────────────────────────────

let suicidalData = await dbQuery(`
  SELECT
    [Have you ever had suicidal thoughts ?] AS självmordstankar,
    COUNT(*) AS antal,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS depression_procent
  FROM students
  GROUP BY självmordstankar
`);

// Lägg till numerisk kodning (Ja=1, Nej=0) som ett exempel på transformation
suicidalData = suicidalData.map(row => ({
  ...row,
  numerisk_kodning: yesNoToNumber(row.självmordstankar)
}));

addMdToPage(`### Självmordstankar och depression`);
tableFromData({ data: suicidalData });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(suicidalData.map(r => ({
    självmordstankar: r.självmordstankar,
    depression_procent: r.depression_procent
  }))),
  options: {
    height: 350,
    title: 'Depression (%) utifrån självmordstankar',
    chartArea: { left: 80, right: 20 },
    colors: ['#A32D2D']
  }
});


// ════════════════════════════════════════════════════════════════════════════
// SIDA 4 (VG): STATISTISKA TESTER – NORMALFÖRDELNING & NOLLHYPOTESPRÖVNING
// ════════════════════════════════════════════════════════════════════════════

addMdToPage(`
---
## Statistiska tester (VG-nivå)

### Är datan normalfördelad?

Vi undersöker om CGPA och akademisk press är normalfördelade med hjälp av
medelvärde, median och standardavvikelse via Simple Statistics.
`);

// ── Hämta rådata för statistiska beräkningar ───────────────────────────────

let rawData = await dbQuery(`
  SELECT
    CAST(CGPA AS REAL)                AS cgpa,
    CAST([Academic Pressure] AS REAL) AS press,
    CAST([Financial Stress] AS REAL)  AS stress,
    CAST(Age AS REAL)                 AS age,
    CAST(Depression AS INTEGER)       AS deprimerad
  FROM students
  WHERE CGPA != '' AND [Academic Pressure] != ''
`);

// Extrahera listor per kolumn
let cgpaList = rawData.map(r => r.cgpa).filter(v => v !== null);
let pressList = rawData.map(r => r.press).filter(v => v !== null);

// ── CGPA-statistik ─────────────────────────────────────────────────────────

let cgpaMean = ss.mean(cgpaList);
let cgpaMedian = ss.median(cgpaList);
let cgpaStdDev = ss.standardDeviation(cgpaList);

addMdToPage(`
### CGPA – deskriptiv statistik

| Mått | Värde |
|---|---|
| Medelvärde | ${cgpaMean.toFixed(2)} |
| Median | ${cgpaMedian.toFixed(2)} |
| Standardavvikelse | ${cgpaStdDev.toFixed(2)} |

Medelvärde och median ligger nära varandra (${cgpaMean.toFixed(2)} vs ${cgpaMedian.toFixed(2)}),
vilket tyder på en relativt symmetrisk fördelning av CGPA.
`);

// ── CGPA-histogram ─────────────────────────────────────────────────────────

let cgpaHistogram = await dbQuery(`
  SELECT
    ROUND(CAST(CGPA AS REAL) * 2) / 2.0 AS cgpa_bucket,
    COUNT(*) AS antal
  FROM students
  WHERE CGPA != ''
  GROUP BY cgpa_bucket
  ORDER BY cgpa_bucket
`);

addMdToPage(`### CGPA-fördelning (histogram)`);

drawGoogleChart({
  type: 'ColumnChart',
  data: makeChartFriendly(cgpaHistogram),
  options: {
    height: 400,
    title: 'Fördelning av CGPA (alla studenter)',
    chartArea: { left: 60, right: 20 },
    colors: ['#534AB7'],
    legend: { position: 'none' },
    hAxis: { title: 'CGPA' },
    vAxis: { title: 'Antal studenter' }
  }
});

// ── Akademisk press – statistik ────────────────────────────────────────────

let pressMean = ss.mean(pressList);
let pressMedian = ss.median(pressList);
let pressStdDev = ss.standardDeviation(pressList);

addMdToPage(`
### Akademisk press – deskriptiv statistik

| Mått | Värde |
|---|---|
| Medelvärde | ${pressMean.toFixed(2)} |
| Median | ${pressMedian.toFixed(2)} |
| Standardavvikelse | ${pressStdDev.toFixed(2)} |
`);

// ── Nollhypotesprövning: Skiljer sig akademisk press åt mellan grupperna? ──

addMdToPage(`
### Nollhypotesprövning: akademisk press och depression

**H₀ (nollhypotesen):** Det finns ingen skillnad i akademisk press mellan
deprimerade och ej deprimerade studenter.

**H₁ (mothypotesen):** Deprimerade studenter upplever högre akademisk press.

Vi testar detta med ett t-test för oberoende stickprov.
`);

let depressedPress = rawData.filter(r => r.deprimerad === 1).map(r => r.press).filter(v => v !== null);
let notDepressedPress = rawData.filter(r => r.deprimerad === 0).map(r => r.press).filter(v => v !== null);

let tTestResult = ss.tTestTwoSample(depressedPress, notDepressedPress, 0);

addMdToPage(`
| Grupp | Medelvärde akademisk press | N |
|---|---|---|
| Deprimerade | ${ss.mean(depressedPress).toFixed(2)} | ${depressedPress.length} |
| Ej deprimerade | ${ss.mean(notDepressedPress).toFixed(2)} | ${notDepressedPress.length} |

**t-värde:** ${tTestResult !== null ? tTestResult.toFixed(4) : 'Kunde ej beräknas'}

*Ett högt t-värde (>2) tyder på en statistiskt signifikant skillnad mellan grupperna.*
`);

// ── Korrelation: sömnlängd (numerisk) och depression ──────────────────────

addMdToPage(`
### Korrelation: sömntimmar och depression

Vi omvandlar Sleep Duration till numeriska värden och beräknar
Pearsons korrelationskoefficient mot Depression.
`);

// Omvandla sömn till numeriska värden i JS
let sleepRaw = await dbQuery(`
  SELECT [Sleep Duration] AS sömn, CAST(Depression AS INTEGER) AS deprimerad
  FROM students
  WHERE [Sleep Duration] != ''
`);

let sleepNumbers = sleepRaw.map(r => sleepToNumber(r.sömn)).filter(v => v !== null);
let depressionNums = sleepRaw
  .filter(r => sleepToNumber(r.sömn) !== null)
  .map(r => r.deprimerad);

let sleepCorrelation = ss.sampleCorrelation(sleepNumbers, depressionNums);

addMdToPage(`
**Pearsons r (sömn ↔ depression):** ${sleepCorrelation.toFixed(4)}

Korrelationsvärdet visar ${Math.abs(sleepCorrelation) < 0.1 ? 'ett mycket svagt' :
    Math.abs(sleepCorrelation) < 0.3 ? 'ett svagt' :
      Math.abs(sleepCorrelation) < 0.5 ? 'ett måttligt' : 'ett starkt'
  } samband. ${sleepCorrelation < 0 ? 'Negativt tecken innebär att mer sömn är kopplat till lägre depressionsfrekvens.' : ''}
`);
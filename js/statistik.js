dbQuery.use('student_depression');

// Hjälpfunktion: omvandla Sleep Duration-text till numeriskt medelvärde
// OBS: använder 'str' istället för 's' för att inte krocka med Simple Statistics-objektet 's'
function sleepToNumber(sleepStr) {
  if (!sleepStr) return null;
  const str = sleepStr.replace(/'/g, '').trim().toLowerCase();
  if (str.includes('less than 5'))  return 4;
  if (str.includes('5-6'))          return 5.5;
  if (str.includes('7-8'))          return 7.5;
  if (str.includes('more than 8'))  return 9;
  return null;
}

addMdToPage(`
## Statistiska tester (VG-nivå)

### Är datan normalfördelad?

Vi undersöker om CGPA och akademisk press är normalfördelade med hjälp av
medelvärde, median och standardavvikelse via Simple Statistics.
`);

// ── Hämta rådata ───────────────────────────────────────────────────────────

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

let cgpaList  = rawData.map(r => r.cgpa).filter(v => v !== null);
let pressList = rawData.map(r => r.press).filter(v => v !== null);

// ── CGPA-statistik ─────────────────────────────────────────────────────────

let cgpaMean   = s.mean(cgpaList);
let cgpaMedian = s.median(cgpaList);
let cgpaStdDev = s.standardDeviation(cgpaList);

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

// ── Shapiro-Wilk normalfördelningstest för CGPA ────────────────────────────

// Shapiro-Wilk kräver max ~5000 värden, ta ett slumpmässigt urval om 500
let cgpaSample = cgpaList.sort(() => Math.random() - 0.5).slice(0, 500);
let swCgpa = stdLib.stats.shapiroWilkTest(cgpaSample);

addMdToPage(`
### Shapiro-Wilk-test: är CGPA normalfördelad?

| | Värde |
|---|---|
| p-värde | ${swCgpa.p.toFixed(4)} |

${swCgpa.p > 0.05
  ? 'p > 0.05 → vi kan *inte* förkasta nollhypotesen om normalfördelning. CGPA verkar vara normalfördelad.'
  : 'p ≤ 0.05 → vi förkastar nollhypotesen. CGPA är *inte* normalfördelad.'}
`);

// ── Akademisk press – statistik ────────────────────────────────────────────

let pressMean   = s.mean(pressList);
let pressMedian = s.median(pressList);
let pressStdDev = s.standardDeviation(pressList);

addMdToPage(`
### Akademisk press – deskriptiv statistik

| Mått | Värde |
|---|---|
| Medelvärde | ${pressMean.toFixed(2)} |
| Median | ${pressMedian.toFixed(2)} |
| Standardavvikelse | ${pressStdDev.toFixed(2)} |
`);

// ── Nollhypotesprövning: akademisk press ───────────────────────────────────

addMdToPage(`
### Nollhypotesprövning: akademisk press och depression

**H₀ (nollhypotesen):** Det finns ingen skillnad i akademisk press mellan
deprimerade och ej deprimerade studenter.

**H₁ (mothypotesen):** Deprimerade studenter upplever högre akademisk press.

Vi testar detta med ett tvåsidigt t-test för oberoende stickprov via stdLib.
`);

let depressedPress    = rawData.filter(r => r.deprimerad === 1).map(r => r.press).filter(v => v !== null);
let notDepressedPress = rawData.filter(r => r.deprimerad === 0).map(r => r.press).filter(v => v !== null);

let tTest  = stdLib.stats.ttest2(depressedPress, notDepressedPress);
let pValue = tTest.pValue;

addMdToPage(`
| Grupp | Medelvärde akademisk press | N |
|---|---|---|
| Deprimerade | ${s.mean(depressedPress).toFixed(2)} | ${depressedPress.length} |
| Ej deprimerade | ${s.mean(notDepressedPress).toFixed(2)} | ${notDepressedPress.length} |

**p-värde:** ${pValue.toFixed(6)}

${pValue < 0.05
  ? 'p < 0.05 → vi förkastar nollhypotesen. Skillnaden i akademisk press mellan grupperna är statistiskt signifikant.'
  : 'p ≥ 0.05 → vi kan inte förkasta nollhypotesen. Ingen statistiskt signifikant skillnad hittades.'}
`);

// ── Korrelation: sömn och depression ──────────────────────────────────────

addMdToPage(`
### Korrelation: sömntimmar och depression

Vi omvandlar Sleep Duration till numeriska värden och beräknar
Pearsons korrelationskoefficient mot Depression.
`);

let sleepRaw = await dbQuery(`
  SELECT [Sleep Duration] AS sömn, CAST(Depression AS INTEGER) AS deprimerad
  FROM students
  WHERE [Sleep Duration] != ''
`);

let sleepNumbers   = sleepRaw.map(r => sleepToNumber(r.sömn)).filter(v => v !== null);
let depressionNums = sleepRaw
  .filter(r => sleepToNumber(r.sömn) !== null)
  .map(r => r.deprimerad);

let sleepCorrelation = s.sampleCorrelation(sleepNumbers, depressionNums);

addMdToPage(`
**Pearsons r (sömn ↔ depression):** ${sleepCorrelation.toFixed(4)}

Korrelationsvärdet visar ${
  Math.abs(sleepCorrelation) < 0.1 ? 'ett mycket svagt' :
  Math.abs(sleepCorrelation) < 0.3 ? 'ett svagt' :
  Math.abs(sleepCorrelation) < 0.5 ? 'ett måttligt' : 'ett starkt'
} samband. ${sleepCorrelation < 0 ? 'Negativt tecken innebär att mer sömn är kopplat till lägre depressionsfrekvens.' : ''}
`);

dbQuery.use('student_depression');

// Hjälpfunktion
function sleepToNumber(sleepStr) {
  if (!sleepStr) return null;
  const s = sleepStr.replace(/'/g, '').trim().toLowerCase();
  if (s.includes('less than 5')) return 4;
  if (s.includes('5-6')) return 5.5;
  if (s.includes('7-8')) return 7.5;
  if (s.includes('more than 8')) return 9;
  return null;
}

addMdToPage(`
## Samband mellan olika faktorer och depression
`);

// ── Akademisk press ─────────────────────────────────────────────

let pressureComparison = await dbQuery(`
  SELECT
    CASE WHEN Depression = '1' THEN 'Deprimerad' ELSE 'Ej deprimerad' END AS status,
    ROUND(AVG(CAST([Academic Pressure] AS REAL)), 2)  AS akademisk,
    ROUND(AVG(CAST([Work Pressure] AS REAL)), 2)       AS arbete,
    ROUND(AVG(CAST([Financial Stress] AS REAL)), 2)    AS ekonomi,
    ROUND(AVG(CAST([Work/Study Hours] AS REAL)), 2)    AS timmar,
    ROUND(AVG(CAST(CGPA AS REAL)), 2)                  AS cgpa
  FROM students
  GROUP BY Depression
`);

addMdToPage(`### Stress och prestation`);

// AUTOMATISK ANALYS
let dep = pressureComparison.find(r => r.status === 'Deprimerad');
let non = pressureComparison.find(r => r.status === 'Ej deprimerad');

let insights = [];

if (dep.akademisk > non.akademisk)
  insights.push(`deprimerade upplever högre akademisk press (+${(dep.akademisk - non.akademisk).toFixed(2)})`);

if (dep.ekonomi > non.ekonomi)
  insights.push(`ekonomisk stress är högre bland deprimerade`);

if (dep.timmar > non.timmar)
  insights.push(`deprimerade studerar/arbetar fler timmar`);

if (dep.cgpa < non.cgpa)
  insights.push(`deprimerade har något lägre genomsnittsbetyg`);

addMdToPage(`
**Slutsats:**  
${insights.length ? insights.join(', ') + '.' : 'Inga tydliga skillnader mellan grupperna.'}
`);

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(pressureComparison),
  options: {
    height: 400,
    title: 'Medelvärden: deprimerade vs ej deprimerade',
    backgroundColor: 'transparent',
    fontName: 'Inter',
    chartArea: { left: 140, right: 20, top: 50, bottom: 50 },
    colors: ['#8E3A8C', '#E06C9F', '#2EC4B6', '#0E103D', '#F4A261']
  }
});

// ── Sömn ───────────────────────────────────────────────────────

let sleepData = await dbQuery(`
  SELECT
    [Sleep Duration] AS kategori,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY [Sleep Duration]
`);

sleepData = sleepData.map(r => ({
  ...r,
  timmar: sleepToNumber(r.kategori)
}));

// ANALYS
let sortedSleep = [...sleepData].sort((a, b) => b.procent - a.procent);
let worst = sortedSleep[0];
let best = sortedSleep[sortedSleep.length - 1];

addMdToPage(`
**Slutsats:**  
Högst andel depression ses vid **${worst.kategori} (${worst.procent}%)**, 
medan lägst nivå finns vid **${best.kategori} (${best.procent}%)**.  
Det tyder på ett samband mellan sömn och psykisk hälsa.
`);

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(sleepData.map(r => ({
    kategori: r.kategori,
    procent: r.procent
  }))),
  options: {
    height: 400,
    title: 'Depression (%) per sömnkategori',
    backgroundColor: 'transparent',
    fontName: 'Inter',
    colors: ['#E06C9F']
  }
});

// ── CGPA ───────────────────────────────────────────────────────

let cgpaData = await dbQuery(`
  SELECT
    ROUND(CAST(CGPA AS REAL), 1) AS cgpa,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY cgpa
  HAVING COUNT(*) > 10
  ORDER BY cgpa
`);

// TREND-ANALYS
let first = cgpaData[0];
let last = cgpaData[cgpaData.length - 1];

let trend = last.procent < first.procent
  ? 'minskar'
  : 'ökar';

addMdToPage(`
**Slutsats:**  
Andelen depression **${trend}** med högre CGPA.  
Lägst CGPA (${first.cgpa}) har ${first.procent}% medan högst (${last.cgpa}) har ${last.procent}%.
`);

drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(cgpaData.map(r => ({
    cgpa: r.cgpa,
    procent: r.procent
  }))),
  options: {
    height: 400,
    title: 'Depression (%) vs CGPA',
    backgroundColor: 'transparent',
    fontName: 'Inter',
    colors: ['#8E3A8C'],
    lineWidth: 3,
    pointSize: 6
  }
});

/* ── Ålder vs Depression ───────────────────────────── */

addMdToPage(`### Ålder vs depression`);

let ageDepression = await dbQuery(`
  SELECT
    CASE
      WHEN CAST(Age AS INTEGER) BETWEEN 15 AND 21 THEN '15–21'
      WHEN CAST(Age AS INTEGER) BETWEEN 22 AND 25 THEN '22–25'
      WHEN CAST(Age AS INTEGER) BETWEEN 26 AND 30 THEN '26–30'
      WHEN CAST(Age AS INTEGER) > 30 THEN '30+'
      ELSE 'Okänd'
    END AS åldersgrupp,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS dep_procent
  FROM students
  WHERE CAST(Age AS INTEGER) BETWEEN 15 AND 60
  GROUP BY åldersgrupp
  ORDER BY MIN(CAST(Age AS INTEGER))
`);

let ageChartData = [
  ['Åldersgrupp', 'Andel deprimerade (%)', { role: 'annotation' }],
  ...ageDepression.map(r => [r.åldersgrupp, r.dep_procent, r.dep_procent + '%'])
];

drawGoogleChart({
  type: 'ColumnChart',
  data: ageChartData,
  options: {
    height: 400,
    backgroundColor: 'transparent',
    title: 'Andel deprimerade (%) per åldersgrupp',
    titleTextStyle: { color: '#0E103D', fontName: 'Inter', fontSize: 16, bold: true },
    legend: { position: 'none' },
    bar: { groupWidth: '55%' },
    hAxis: {
      title: 'Åldersgrupp',
      titleTextStyle: { color: '#7A6570', fontName: 'Inter', fontSize: 12 },
      textStyle: { color: '#5F5E5A', fontName: 'Inter', fontSize: 13 },
      gridlines: { color: 'transparent' },
      baselineColor: '#D3D1C7'
    },
    vAxis: {
      title: 'Andel deprimerade (%)',
      titleTextStyle: { color: '#7A6570', fontName: 'Inter', fontSize: 12 },
      textStyle: { color: '#888780', fontName: 'Inter', fontSize: 12 },
      minValue: 0,
      maxValue: 100,
      gridlines: { color: '#E8E6DF', count: 6 },
      baselineColor: '#D3D1C7'
    },
    colors: ['#7F77DD'],
    chartArea: { left: 70, right: 20, top: 60, bottom: 60 },
    annotations: {
      alwaysOutside: true,
      textStyle: { fontSize: 13, bold: true, color: '#3C3489', fontName: 'Inter' },
      stem: { color: 'transparent', length: 4 }
    }
  }
});

addMdToPage(`*Filtrerade bort åldrar utanför intervallet 15–60 för att undvika orimliga värden.*`);
/* ── Kön vs Depression ─────────────────────────────── */

addMdToPage(`### Könsfördelning bland deprimerade`);

let genderDepressed = await dbQuery(`
  SELECT 
    Gender AS kön, 
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS procent
  FROM students
  WHERE CAST(Depression AS INTEGER) = 1
  GROUP BY Gender
  ORDER BY procent DESC
`);

let genderDepressedData = [
  ['Kön', 'Andel (%)', { role: 'annotation' }],
  ...genderDepressed.map(r => [r.kön, r.procent, r.procent + '%'])
];

drawGoogleChart({
  type: 'ColumnChart',
  data: genderDepressedData,
  options: {
    height: 400,
    backgroundColor: 'transparent',

    title: 'Män vs kvinnor bland deprimerade',
    fontName: 'Inter',

    titleTextStyle: {
      color: '#0E103D',
      fontSize: 16,
      bold: true
    },

    legend: { position: 'none' },
    bar: { groupWidth: '35%' },

    hAxis: {
      title: 'Kön',
      titleTextStyle: { color: '#7A6570', fontName: 'Inter', fontSize: 12 },
      textStyle: { color: '#5F5E5A', fontName: 'Inter', fontSize: 14 },
      gridlines: { color: 'transparent' },
      baselineColor: '#D3D1C7'
    },

    vAxis: {
      title: 'Andel (%)',
      titleTextStyle: { color: '#7A6570', fontName: 'Inter', fontSize: 12 },
      textStyle: { color: '#888780', fontName: 'Inter', fontSize: 12 },
      minValue: 0,
      maxValue: 100,
      gridlines: { color: '#E8E6DF', count: 6 },
      baselineColor: '#D3D1C7'
    },

    colors: ['#8E3A8C'],

    chartArea: { left: 70, right: 20, top: 60, bottom: 60 },

    annotations: {
      alwaysOutside: true,
      textStyle: { fontSize: 14, bold: true, color: '#8E3A8C', fontName: 'Inter' },
      stem: { color: 'transparent', length: 4 }
    }
  }
});
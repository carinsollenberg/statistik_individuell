dbQuery.use('student_depression');

// ─────────────────────────────────────────────
// Hjälpfunktioner
// ─────────────────────────────────────────────

function sleepToNumber(sleepStr) {
  if (!sleepStr) return null;
  const s = sleepStr.replace(/'/g, '').trim().toLowerCase();
  if (s.includes('less than 5')) return 4;
  if (s.includes('5-6')) return 5.5;
  if (s.includes('7-8')) return 7.5;
  if (s.includes('more than 8')) return 9;
  return null;
}

function formatDiff(val) {
  return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

// ─────────────────────────────────────────────
// Titel
// ─────────────────────────────────────────────

addMdToPage(`
## Samband mellan livsstil, prestation och depression

Denna analys undersöker hur olika faktorer såsom stress, sömn, prestation och demografi 
samvarierar med depression bland studenter. Analysen visar korrelationer, inte nödvändigtvis orsakssamband.
`);

// ─────────────────────────────────────────────
// Stress & prestation
// ─────────────────────────────────────────────

let pressureComparison = await dbQuery(`
  SELECT
    CASE WHEN Depression = '1' THEN 'Deprimerad' ELSE 'Ej deprimerad' END AS status,
    ROUND(AVG(CAST([Academic Pressure] AS REAL)), 2)  AS akademisk_press,
    ROUND(AVG(CAST([Financial Stress] AS REAL)), 2)    AS ekonomisk_stress,
    ROUND(AVG(CAST([Work/Study Hours] AS REAL)), 2)    AS studietimmar,
    ROUND(AVG(CAST(CGPA AS REAL)), 2)                  AS snittbetyg
  FROM students
  GROUP BY Depression
`);

let dep = pressureComparison.find(r => r.status === 'Deprimerad');
let non = pressureComparison.find(r => r.status === 'Ej deprimerad');

let insights = [];

if (dep.akademisk > non.akademisk) {
  insights.push(`- **Akademisk press är högre** bland deprimerade (${formatDiff(dep.akademisk - non.akademisk)})`);
}

if (dep.ekonomi > non.ekonomi) {
  insights.push(`- **Ekonomisk stress är högre** bland deprimerade (${formatDiff(dep.ekonomi - non.ekonomi)})`);
}

if (dep.timmar > non.timmar) {
  insights.push(`- Deprimerade **arbetar/studerar fler timmar** (${formatDiff(dep.timmar - non.timmar)})`);
}

if (dep.cgpa < non.cgpa) {
  insights.push(`- Deprimerade har **lägre genomsnittligt betyg** (${formatDiff(dep.cgpa - non.cgpa)})`);
}

addMdToPage(`
## Stress och prestation

Jämförelse mellan deprimerade och icke-deprimerade studenter.

${insights.length ? insights.join('\n') : 'Inga tydliga skillnader mellan grupperna.'}

### Tolkning
Resultaten tyder på att flera typer av stress samvarierar med depression, 
särskilt akademisk och ekonomisk press.

Det är möjligt att hög belastning bidrar till psykisk ohälsa – 
men också att personer med depression upplever stress starkare.
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
    colors: [
      '#8E3A8C', // accent-strong
      '#E06C9F', // accent
      '#2EC4B6', // teal
      '#0E103D'  // primary
    ]
  }
});

// ─────────────────────────────────────────────
// Sömn
// ─────────────────────────────────────────────

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

let sortedSleep = [...sleepData].sort((a, b) => b.procent - a.procent);
let worst = sortedSleep[0];
let best = sortedSleep[sortedSleep.length - 1];

addMdToPage(`
## Sömn och depression

- Högst andel depression: **${worst.kategori} (${worst.procent}%)**
- Lägst andel depression: **${best.kategori} (${best.procent}%)**

### Tolkning
Resultaten visar ett tydligt samband mellan sömn och psykisk hälsa.

Både mycket lite och mycket mycket sömn tenderar att vara kopplade till högre depression, 
medan mer balanserad sömn (t.ex. 7–8 timmar) ofta visar lägre nivåer.

Sömn kan fungera både som en riskfaktor och som en konsekvens av depression.
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
    chartArea: { left: 100, right: 20, top: 50, bottom: 40 },
    colors: ['#E06C9F']
  }
});

// ─────────────────────────────────────────────
// CGPA
// ─────────────────────────────────────────────

let cgpaData = await dbQuery(`
  SELECT
    ROUND(CAST(CGPA AS REAL), 1) AS cgpa,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY cgpa
  HAVING COUNT(*) > 10
  ORDER BY cgpa
`);

let first = cgpaData[0];
let last = cgpaData[cgpaData.length - 1];

const diff = last.procent - first.procent;

let trend;

if (diff < -10) trend = 'minskar mycket';
else if (diff < -5) trend = 'minskar';
else if (diff < 0) trend = 'minskar lite';
else if (diff > 10) trend = 'ökar mycket';
else if (diff > 2) trend = 'ökar';
else if (diff > 0) trend = 'ökar lite';
else trend = 'oförändrad';

addMdToPage(`
## Akademisk prestation (CGPA)

- Lägsta CGPA (${first.cgpa}): ${first.procent}%
- Högsta CGPA (${last.cgpa}): ${last.procent}%
- Trend: depression **${trend}** med högre betyg

### Tolkning
${trend.includes('minskar')
    ? 'Resultaten tyder på att högre prestation kan vara kopplad till lägre nivåer av depression.'
    : 'Resultaten tyder på att högre prestation kan vara kopplad till ökad stress och därmed högre depression.'
  }
`);

// ─────────────────────────────────────────────
// Ålder
// ─────────────────────────────────────────────

let ageDepression = await dbQuery(`
  SELECT
    CASE
      WHEN CAST(Age AS INTEGER) BETWEEN 15 AND 21 THEN '15–21'
      WHEN CAST(Age AS INTEGER) BETWEEN 22 AND 25 THEN '22–25'
      WHEN CAST(Age AS INTEGER) BETWEEN 26 AND 30 THEN '26–30'
      WHEN CAST(Age AS INTEGER) > 30 THEN '30+'
    END AS åldersgrupp,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS dep_procent
  FROM students
  WHERE CAST(Age AS INTEGER) BETWEEN 15 AND 60
  GROUP BY åldersgrupp
`);

let highest = ageDepression.sort((a, b) => b.dep_procent - a.dep_procent)[0];
let lowest = ageDepression.sort((a, b) => a.dep_procent - b.dep_procent)[0];

addMdToPage(`
## Ålder och depression

- Högst nivå: **${highest.åldersgrupp} (${highest.dep_procent}%)**
- Lägst nivå: **${lowest.åldersgrupp} (${lowest.dep_procent}%)**

### Tolkning
Olika åldersgrupper kan påverkas av olika typer av stress, såsom studier, karriärval eller livsförändringar.
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
    fontName: 'Inter',
    legend: { position: 'none' },
    bar: { groupWidth: '55%' },
    hAxis: {
      title: 'Åldersgrupp'
    },
    vAxis: {
      title: 'Andel (%)',
      minValue: 0,
      maxValue: 100
    },
    colors: ['#8E3A8C'],
    chartArea: { left: 70, right: 20, top: 60, bottom: 60 },
    annotations: {
      alwaysOutside: true
    }
  }
});

// ─────────────────────────────────────────────
// Kön
// ─────────────────────────────────────────────

let genderDepressed = await dbQuery(`
  SELECT 
    Gender AS kön, 
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS procent
  FROM students
  WHERE CAST(Depression AS INTEGER) = 1
  GROUP BY Gender
`);

let topGender = genderDepressed.sort((a, b) => b.procent - a.procent)[0];

addMdToPage(`
## Könsfördelning bland deprimerade

- Störst andel: **${topGender.kön} (${topGender.procent}%)**

### Tolkning
Det är en övervägande del män som är deprimerade. Men det är förvisso en övervägande andel män som svarat på enkäten också. Kanske är könsfördelningen av depression rättvis.
`);

let genderDepressedData = [
  ['Kön', 'Andel (%)', { role: 'annotation' }],
  ...genderDepressed.map(r => [r.kön, r.procent, r.procent + '%'])
];

drawGoogleChart({
  type: 'PieChart',
  data: genderDepressedData,
  options: {
    height: 400,
    backgroundColor: 'transparent',
    title: 'Män vs kvinnor bland deprimerade',
    fontName: 'Inter',
    legend: { position: 'none' },
    bar: { groupWidth: '35%' },
    hAxis: {
      title: 'Kön'
    },
    vAxis: {
      title: 'Andel (%)',
      minValue: 0,
      maxValue: 100
    },
    colors: [
      '#2EC4B6', // teal
      '#8E3A8C' // accent-strong

    ],
    chartArea: { left: 70, right: 20, top: 60, bottom: 60 },
    annotations: {
      alwaysOutside: true
    }
  }
});


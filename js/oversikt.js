dbQuery.use('student_depression');

/* ── Intro ───────────────────────────────────────── */

addMdToPage(`
## Studenters psykiska hälsa – en dataanalys

Det här datasetet innehåller information om **27 901 studenter** och mäter faktorer
som akademisk press, sömnvanor, kost och ekonomisk stress – och om studenterna
lider av depression.
`);

/* ── Nyckeltal ───────────────────────────────────── */

let stats = await dbQuery(`
  SELECT
    COUNT(*) AS antal,
    ROUND(AVG(CAST(Age AS REAL)), 1) AS medelalder,
    ROUND(AVG(CAST(CGPA AS REAL)), 2) AS medel_cgpa,
    ROUND(AVG(CAST([Academic Pressure] AS REAL)), 2) AS medel_press,
    ROUND(AVG(CAST([Financial Stress] AS REAL)), 2) AS medel_stress,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS dep_procent
  FROM students
`);

let r = stats[0];

/* ── Stat cards ─────────────────────────────────── */

addToPage(`
  <div class="stat-grid">
    <div class="stat-card">
      <p class="stat-label">Studenter</p>
      <p class="stat-value">${r.antal.toLocaleString('sv-SE')}</p>
      <p class="stat-sub">i datasetet</p>
    </div>

    <div class="stat-card accent">
      <p class="stat-label">Depression</p>
      <p class="stat-value">${r.dep_procent}%</p>
      <p class="stat-sub">${r.deprimerade.toLocaleString('sv-SE')} studenter</p>
    </div>

    <div class="stat-card">
      <p class="stat-label">Medelålder</p>
      <p class="stat-value">${r.medelalder}</p>
      <p class="stat-sub">år</p>
    </div>

    <div class="stat-card">
      <p class="stat-label">Medel-CGPA</p>
      <p class="stat-value">${r.medel_cgpa}</p>
      <p class="stat-sub">av 10.0</p>
    </div>

    <div class="stat-card">
      <p class="stat-label">Akademisk press</p>
      <p class="stat-value">${r.medel_press}</p>
      <p class="stat-sub">skala 1–5</p>
    </div>

    <div class="stat-card">
      <p class="stat-label">Ekonomisk stress</p>
      <p class="stat-value">${r.medel_stress}</p>
      <p class="stat-sub">skala 1–5</p>
    </div>
  </div>
`);

/* ── Depressionsfördelning ───────────────────────── */

addMdToPage(`### Andel deprimerade studenter`);

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
    height: 320,
    backgroundColor: 'transparent',
    legend: { textStyle: { color: '#7A6570', fontName: 'Inter' } },
    titleTextStyle: { color: '#0E103D', fontName: 'Inter', fontSize: 16 },
    title: 'Procent deppiga vs glada',
    chartArea: { left: 20, right: 20, top: 40, bottom: 20 },
    colors: ['#E06C9F', '#2EC4B6'],
    pieHole: 0.4, // donut-chart
  }
});

addMdToPage(`

Det var en väldigt hög andel studenter som var deprimerade. Det vill jag verkligen rekommendera att de gör något åt på skolan. Eller så är det bara samtiden. Men den är svårare att ändra på.
`);

/* ── Könsfördelning ───────────────────────────── */

addMdToPage(`### Könsfördelning`);

let genderSplit = await dbQuery(`
  SELECT Gender AS kön, COUNT(*) AS antal
  FROM students
  GROUP BY Gender
  ORDER BY antal DESC
`);

drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(genderSplit),
  options: {
    height: 320,
    backgroundColor: 'transparent',

    title: 'Män vs kvinnor i datasetet',
    fontName: 'Inter',

    titleTextStyle: {
      color: '#0E103D',
      fontSize: 16,
      bold: true
    },

    legend: {
      position: 'right',
      textStyle: {
        color: '#7A6570',
        fontSize: 12
      }
    },

    chartArea: {
      left: 20,
      right: 20,
      top: 50,
      bottom: 20,
      width: '85%',
      height: '75%'
    },

    colors: [
      '#8E3A8C',  // accent-strong
      '#E06C9F'   // accent
    ],

    pieHole: 0.4, // donut-chart

    pieSliceTextStyle: {
      color: '#ffffff',
      fontSize: 12
    },

    tooltip: {
      textStyle: {
        fontName: 'Inter'
      }
    }
  }
});
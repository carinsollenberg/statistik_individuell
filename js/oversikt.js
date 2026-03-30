dbQuery.use('student_depression');

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

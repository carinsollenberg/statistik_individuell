dbQuery.use('student_depression');

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

addMdToPage(`
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

// ── CGPA och depression ────────────────────────────────────────────────────

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
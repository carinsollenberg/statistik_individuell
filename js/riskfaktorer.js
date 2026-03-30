dbQuery.use('student_depression');

// Hjälpfunktion: omvandla Ja/Nej till 0/1
function yesNoToNumber(val) {
  if (!val) return null;
  return val.trim().toLowerCase() === 'yes' ? 1 : 0;
}

addMdToPage(`
## Riskfaktorer för depression

Vilka faktorer har störst påverkan? Vi tittar nu på familjehistorik,
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

addMdToPage(`### Familjehistorik av psykfall`);
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

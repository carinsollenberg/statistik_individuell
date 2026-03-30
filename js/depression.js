// Berätta vilken databas vi vill använda
dbQuery.use('student_depression');

// ── Alla studenter ─────────────────────────────────────────────────────────

let students = await dbQuery('SELECT * FROM students');

addMdToPage(`### Alla studenter`);
tableFromData({ data: students });

// ── Depressionsstatistik ───────────────────────────────────────────────────

let depressionCount = await dbQuery(`
  SELECT 
    CASE WHEN Depression = '1' THEN 'Deprimerad' ELSE 'Ej deprimerad' END AS status,
    COUNT(*) AS count
  FROM students
  GROUP BY Depression
`);

addMdToPage(`### Andel deprimerade studenter`);

drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(depressionCount),
  options: {
    height: 500,
    chartArea: { left: 50, right: 0 },
    title: 'Andel deprimerade studenter'
  }
});

// ── Depression per kön ─────────────────────────────────────────────────────

let depressionByGender = await dbQuery(`
  SELECT
    Gender AS kön,
    COUNT(*) AS total,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade
  FROM students
  GROUP BY Gender
`);

addMdToPage(`### Depression per kön`);
tableFromData({ data: depressionByGender });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(depressionByGender),
  options: {
    height: 400,
    chartArea: { left: 100, right: 50 },
    title: 'Depression per kön'
  }
});

// ── Depression per sömnlängd ───────────────────────────────────────────────

let depressionBySleep = await dbQuery(`
  SELECT
    [Sleep Duration] AS sömn,
    COUNT(*) AS total,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY [Sleep Duration]
  ORDER BY procent DESC
`);

addMdToPage(`### Depression per sömnlängd`);
tableFromData({ data: depressionBySleep });

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(depressionBySleep),
  options: {
    height: 400,
    chartArea: { left: 150, right: 50 },
    title: 'Depression per sömnlängd'
  }
});

// ── Akademisk press för deprimerade vs ej deprimerade ─────────────────────

let pressureByDepression = await dbQuery(`
  SELECT
    CASE WHEN Depression = '1' THEN 'Deprimerad' ELSE 'Ej deprimerad' END AS status,
    ROUND(AVG(CAST([Academic Pressure] AS REAL)), 2) AS snitt_akademisk_press,
    ROUND(AVG(CAST([Financial Stress] AS REAL)), 2)  AS snitt_ekonomisk_stress,
    ROUND(AVG(CAST(CGPA AS REAL)), 2)                AS snitt_betyg
  FROM students
  GROUP BY Depression
`);

addMdToPage(`### Akademisk press & stress: deprimerade vs ej deprimerade`);
tableFromData({ data: pressureByDepression });

// ── Självmordstankar & depression ─────────────────────────────────────────

let suicidalThoughts = await dbQuery(`
  SELECT
    [Have you ever had suicidal thoughts ?] AS självmordstankar,
    COUNT(*) AS total,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY självmordstankar
`);

addMdToPage(`### Självmordstankar och depression`);
tableFromData({ data: suicidalThoughts });

// ── Familjehistorik av psykisk ohälsa ─────────────────────────────────────

let familyHistory = await dbQuery(`
  SELECT
    [Family History of Mental Illness] AS familjehistorik,
    COUNT(*) AS total,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY familjehistorik
`);

addMdToPage(`### Familjehistorik av psykisk ohälsa`);
tableFromData({ data: familyHistory });

drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(familyHistory),
  options: {
    height: 500,
    chartArea: { left: 50, right: 0 },
    title: 'Familjehistorik av psykisk ohälsa'
  }
});

// ── Depression per kostvanor ───────────────────────────────────────────────

let depressionByDiet = await dbQuery(`
  SELECT
    [Dietary Habits] AS kostvanor,
    COUNT(*) AS total,
    SUM(CAST(Depression AS INTEGER)) AS deprimerade,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY kostvanor
  ORDER BY procent DESC
`);

addMdToPage(`### Depression per kostvanor`);
tableFromData({ data: depressionByDiet });
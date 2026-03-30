dbQuery.use('student_depression');

// Hjälpfunktion
function yesNoToNumber(val) {
  if (!val) return null;
  return val.trim().toLowerCase() === 'yes' ? 1 : 0;
}

addMdToPage(`
## Riskfaktorer för depression

Vilka faktorer har störst påverkan? Vi tittar nu på familjehistorik,
kostvanor och självmordstankar.
`);

// ── Familjehistorik ─────────────────────────────────────────────

let familyHistory = await dbQuery(`
  SELECT
    [Family History of Mental Illness] AS familjehistorik,
    COUNT(*) AS antal,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY familjehistorik
`);

addMdToPage(`### Familjehistorik av psykfall`);

// 🔥 ANALYS
let sortedFamily = [...familyHistory].sort((a, b) => b.procent - a.procent);
let highestF = sortedFamily[0];
let lowestF = sortedFamily[sortedFamily.length - 1];

addMdToPage(`
**Slutsats:**  
Studenter med **${highestF.familjehistorik}** har högst andel depression (${highestF.procent}%),  
jämfört med **${lowestF.familjehistorik}** (${lowestF.procent}%).  
Detta tyder på att familjehistorik kan vara en viktig riskfaktor.
`);

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(familyHistory.map(r => ({
    familjehistorik: r.familjehistorik,
    procent: r.procent
  }))),
  options: {
    height: 350,
    title: 'Depression (%) utifrån familjehistorik',
    backgroundColor: 'transparent',
    fontName: 'Inter',
    chartArea: { left: 80, right: 20, top: 50, bottom: 40 },
    colors: ['#8E3A8C'],
    legend: { position: 'none' }
  }
});

// ── Kostvanor ───────────────────────────────────────────────────

let dietData = await dbQuery(`
  SELECT
    [Dietary Habits] AS kostvanor,
    COUNT(*) AS antal,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY kostvanor
`);

addMdToPage(`### Kostvanor och depression`);

// 🔥 ANALYS
let sortedDiet = [...dietData].sort((a, b) => b.procent - a.procent);
let worstDiet = sortedDiet[0];
let bestDiet = sortedDiet[sortedDiet.length - 1];

addMdToPage(`
**Slutsats:**  
Högst andel depression finns bland studenter med **${worstDiet.kostvanor} (${worstDiet.procent}%)**,  
medan lägst nivå finns hos **${bestDiet.kostvanor} (${bestDiet.procent}%)**.  
Detta indikerar att kostvanor kan ha ett samband med psykisk hälsa.
`);

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(dietData.map(r => ({
    kostvanor: r.kostvanor,
    procent: r.procent
  }))),
  options: {
    height: 350,
    title: 'Depression (%) per kostvanor',
    backgroundColor: 'transparent',
    fontName: 'Inter',
    chartArea: { left: 100, right: 20, top: 50, bottom: 40 },
    colors: ['#E06C9F'],
    legend: { position: 'none' }
  }
});

// ── Självmordstankar ────────────────────────────────────────────

let suicidalData = await dbQuery(`
  SELECT
    [Have you ever had suicidal thoughts ?] AS självmordstankar,
    COUNT(*) AS antal,
    ROUND(100.0 * SUM(CAST(Depression AS INTEGER)) / COUNT(*), 1) AS procent
  FROM students
  GROUP BY självmordstankar
`);

suicidalData = suicidalData.map(row => ({
  ...row,
  kod: yesNoToNumber(row.självmordstankar)
}));

addMdToPage(`### Självmordstankar och depression`);

// 🔥 ANALYS
let yesGroup = suicidalData.find(r => r.kod === 1);
let noGroup = suicidalData.find(r => r.kod === 0);

let diff = (yesGroup && noGroup)
  ? (yesGroup.procent - noGroup.procent).toFixed(1)
  : null;

addMdToPage(`
**Slutsats:**  
Studenter som har haft självmordstankar har en betydligt högre andel depression  
(${yesGroup?.procent}% jämfört med ${noGroup?.procent}%).  
Skillnaden är cirka **${diff} procentenheter**, vilket tyder på ett starkt samband.
`);

drawGoogleChart({
  type: 'BarChart',
  data: makeChartFriendly(suicidalData.map(r => ({
    självmordstankar: r.självmordstankar,
    procent: r.procent
  }))),
  options: {
    height: 350,
    title: 'Depression (%) utifrån självmordstankar',
    backgroundColor: 'transparent',
    fontName: 'Inter',
    chartArea: { left: 80, right: 20, top: 50, bottom: 40 },
    colors: ['#2EC4B6'],
    legend: { position: 'none' }
  }
});
dbQuery.use('student_depression');

addMdToPage(`## Datarensning`);

// ── Kolla om rensning redan är gjord ────────────────────────────────────────

let dirtyAP = await dbQuery(`SELECT COUNT(*) AS antal FROM students WHERE CAST([Academic Pressure] AS REAL) = 0`);
let dirtySS = await dbQuery(`SELECT COUNT(*) AS antal FROM students WHERE CAST([Study Satisfaction] AS REAL) = 0`);
let dirtyFS = await dbQuery(`SELECT COUNT(*) AS antal FROM students WHERE [Financial Stress] = '?'`);

let needsCleaning = dirtyAP[0].antal > 0 || dirtySS[0].antal > 0 || dirtyFS[0].antal > 0;

if (!needsCleaning) {
  addMdToPage(`
> Datan är redan rensad. Inga åtgärder behövdes.
  `);
} else {

  // ── Räkna ut medianer ──────────────────────────────────────────────────────

  async function getMedian(column) {
    let rows = await dbQuery(`
      SELECT CAST([${column}] AS REAL) AS val
      FROM students
      WHERE CAST([${column}] AS REAL) > 0
      ORDER BY val
    `);
    let vals = rows.map(r => r.val).filter(v => v !== null && !isNaN(v));
    let mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0
      ? (vals[mid - 1] + vals[mid]) / 2
      : vals[mid];
  }

  let medianAP = await getMedian('Academic Pressure');
  let medianSS = await getMedian('Study Satisfaction');

  let fsRows = await dbQuery(`
    SELECT CAST([Financial Stress] AS REAL) AS val
    FROM students
    WHERE [Financial Stress] != '?' AND CAST([Financial Stress] AS REAL) > 0
    ORDER BY val
  `);
  let fsVals = fsRows.map(r => r.val).filter(v => v !== null && !isNaN(v));
  let fsMid = Math.floor(fsVals.length / 2);
  let medianFS = fsVals.length % 2 === 0
    ? (fsVals[fsMid - 1] + fsVals[fsMid]) / 2
    : fsVals[fsMid];

  addMdToPage(`
| Kolumn | Ogiltiga värden | Ersätts med (median) |
|---|---|---|
| Academic Pressure | ${dirtyAP[0].antal} rader med 0 | ${medianAP} |
| Study Satisfaction | ${dirtySS[0].antal} rader med 0 | ${medianSS} |
| Financial Stress | ${dirtyFS[0].antal} rader med "?" | ${medianFS} |
  `);

  // ── Tillämpa rensning ──────────────────────────────────────────────────────

  await dbQuery(`UPDATE students SET [Academic Pressure] = ${medianAP} WHERE CAST([Academic Pressure] AS REAL) = 0`);
  await dbQuery(`UPDATE students SET [Study Satisfaction] = ${medianSS} WHERE CAST([Study Satisfaction] AS REAL) = 0`);
  await dbQuery(`UPDATE students SET [Financial Stress] = ${medianFS} WHERE [Financial Stress] = '?'`);

  addMdToPage(`> Datarensningen är klar. Alla övriga sidor kan nu köras med tillförlitliga värden.`);
}

addMdToPage(`
### Förklaring till datarensning

I kolumnerna **Work Pressure** och **Job Satisfaction** hade nästan samtliga respondenter (99,9%) värdet 0. Detta är inte ett
datakvalitetsproblem utan en strukturell egenskap i datasetet — respondenterna är
övervägande studenter utan anställning, vilket gör frågorna om arbetets press och
jobbtillfredsställelse ej tillämpbara för dem. Dessa kolumner har därför lämnats
orörda och exkluderas helt från min analys.

Bortsett från ovan nämnda kolumner, påverkades totalt 22 rader i datasetet, vilket är mindre än 0,05% av alla 27 901 observationer.  
Därför bedöms den övergripande påverkan på analysen som försumbar, och de rensade värdena ger en mer korrekt bild av studenternas upplevelser.

Tre kolumner i datasetet innehåller ogiltiga värden på den annars giltiga 1–5-skalan:
**Academic Pressure** och **Study Satisfaction** har ett litet antal rader med värdet 0,
och **Financial Stress** har tre rader med strängen "?".

Dessa värden bedöms inte vara avsiktliga svar utan felregistreringar, eftersom 0 inte
ingår i skalans definition och "?" inte är ett numeriskt värde.

För att hantera dem utan att förlora data har de ersatts med respektive kolumns **median**.
Medianen valdes framför medelvärdet eftersom den är mer robust mot extremvärden och
bevarar skalans heltalsnatur. Eftersom antalet påverkade rader är mycket litet —
färre än 0,05% av totalt 27 901 observationer — bedöms påverkan på analysen som försumbar.
`);
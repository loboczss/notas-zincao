---
type: community
cohesion: 0.22
members: 15
---

# CSV Export Scoring

**Cohesion:** 0.22 - loosely connected
**Members:** 15 nodes

## Members
- [[buildCsv()]] - code - server/api/notas/export.get.ts
- [[buildPdf()]] - code - server/api/notas/export.get.ts
- [[enrichNota()]] - code - server/api/notas/export.get.ts
- [[escapeCsv()]] - code - server/api/notas/export.get.ts
- [[export.get.ts]] - code - server/api/notas/export.get.ts
- [[fmtCurrency()]] - code - server/api/notas/export.get.ts
- [[fmtDate()]] - code - server/api/notas/export.get.ts
- [[isISODate()]] - code - server/api/notas/export.get.ts
- [[levenshtein()]] - code - server/api/notas/export.get.ts
- [[normalizeForSearch()]] - code - server/api/notas/export.get.ts
- [[normalizeSearch()]] - code - server/api/notas/export.get.ts
- [[round2()]] - code - server/api/notas/export.get.ts
- [[scoreNota()]] - code - server/api/notas/export.get.ts
- [[scoreTexto()]] - code - server/api/notas/export.get.ts
- [[statusLabel()]] - code - server/api/notas/export.get.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/CSV_Export_Scoring
SORT file.name ASC
```

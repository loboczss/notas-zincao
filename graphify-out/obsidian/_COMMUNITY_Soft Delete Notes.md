---
type: community
cohesion: 0.27
members: 11
---

# Soft Delete Notes

**Cohesion:** 0.27 - loosely connected
**Members:** 11 nodes

## Members
- [[History Timeline UI]] - rationale - novafuc.md
- [[NotaHistoricoTimeline.vue Component]] - code - novafuc.md
- [[Profile deleted_at and deleted_by Fields]] - rationale - tabelaprofile.md
- [[Soft Delete Pattern]] - rationale - novafuc.md
- [[buildChanges Function]] - code - novafuc.md
- [[deleteNota Method]] - code - novafuc.md
- [[deleted_at and deleted_by Columns]] - document - novafuc.md
- [[fetchNotas Method]] - code - novafuc.md
- [[notas_retirada Table]] - document - novafuc.md
- [[status_retirada Field]] - document - novafuc.md
- [[useNotas Composable]] - code - novafuc.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Soft_Delete_Notes
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Profile Audit Tables]]

## Top bridge nodes
- [[Profile deleted_at and deleted_by Fields]] - degree 3, connects to 1 community
- [[History Timeline UI]] - degree 2, connects to 1 community
---
type: community
cohesion: 0.27
members: 11
---

# OCR Nota Extraction

**Cohesion:** 0.27 - loosely connected
**Members:** 11 nodes

## Members
- [[OpenAIModels.ts]] - code - shared/constants/OpenAIModels.ts
- [[chat.post.ts]] - code - server/api/openai/chat.post.ts
- [[chat.ts]] - code - server/services/openai/chat.ts
- [[client.ts]] - code - server/services/openai/client.ts
- [[createOpenAIChat()]] - code - server/services/openai/chat.ts
- [[extract-nota.ts]] - code - server/services/openai/extract-nota.ts
- [[extractNotaFromImage()]] - code - server/services/openai/extract-nota.ts
- [[getOpenAIClient()]] - code - server/services/openai/client.ts
- [[isOpenAIModelSupported()]] - code - shared/constants/OpenAIModels.ts
- [[normalizeProdutos()_2]] - code - server/services/openai/extract-nota.ts
- [[toNumber()_6]] - code - server/services/openai/extract-nota.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/OCR_Nota_Extraction
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Stock Product Matching]]

## Top bridge nodes
- [[extract-nota.ts]] - degree 5, connects to 1 community
- [[extractNotaFromImage()]] - degree 5, connects to 1 community
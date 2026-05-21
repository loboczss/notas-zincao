---
type: community
cohesion: 0.12
members: 20
---

# Profile Audit Tables

**Cohesion:** 0.12 - loosely connected
**Members:** 20 nodes

## Members
- [[Automatic Profile Creation]] - rationale - tabelaprofile.md
- [[Invisible Supabase Audit]] - rationale - novafuc.md
- [[Profile Audit Consistency]] - rationale - tabelaprofile.md
- [[Profile Workspaces]] - document - tabelaprofile.md
- [[Profile updated_at and updated_by Fields]] - rationale - tabelaprofile.md
- [[Profiles Table and Associated Triggers Document]] - document - tabelaprofile.md
- [[Supabase Authentication]] - document - tabelaprofile.md
- [[admin operador visualizador Roles]] - document - tabelaprofile.md
- [[auth.users Table]] - document - tabelaprofile.md
- [[auth_uid Foreign Key]] - document - tabelaprofile.md
- [[fetchHistoricoNota Method]] - code - novafuc.md
- [[foto_perfil Field]] - document - tabelaprofile.md
- [[handle_new_user Function]] - document - tabelaprofile.md
- [[handle_updated_at Function]] - document - tabelaprofile.md
- [[log_nota_edicao Trigger Function]] - document - novafuc.md
- [[notas_historico_edicao Table]] - document - novafuc.md
- [[on_auth_user_created Trigger]] - document - tabelaprofile.md
- [[profiles(nome) History Join]] - document - novafuc.md
- [[profiles_updated_at Trigger]] - document - tabelaprofile.md
- [[public.profiles Table]] - document - tabelaprofile.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Profile_Audit_Tables
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Soft Delete Notes]]
- 1 edge to [[_COMMUNITY_Project Setup Docs]]

## Top bridge nodes
- [[public.profiles Table]] - degree 10, connects to 1 community
- [[fetchHistoricoNota Method]] - degree 3, connects to 1 community
- [[Supabase Authentication]] - degree 2, connects to 1 community
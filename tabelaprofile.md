# Tabela `profiles` e Triggers Associados

Este documento explica detalhadamente a estrutura da tabela `public.profiles` e seus respectivos gatilhos (triggers) automatizados no banco de dados.

## 1. Estrutura da Tabela `public.profiles`

A tabela `profiles` armazena as informações de perfil e preferências dos usuários que acessam o sistema.

### Colunas da Tabela

| Coluna | Tipo de Dado | Descrição | Valor Padrão |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Identificador único do perfil. | `gen_random_uuid()` |
| `updated_at` | `timestamptz` | Data e hora da última atualização dos dados. | `now()` |
| `auth_uid` | `uuid` | Chave estrangeira conectada ao `id` de `auth.users`. | - |
| `nome` | `text` | Nome completo do colaborador. | - |
| `email` | `text` | Endereço de e-mail vinculado. | - |
| `role` | `text` | Nível de acesso (`admin`, `operador`, `visualizador`). | - |
| `workspaces` | `uuid[]` | Lista de workspaces vinculados ao perfil. | - |
| `ultimo_login` | `timestamptz` | Registro do último login efetuado pelo usuário. | - |
| `deleted_at` | `timestamptz` | Data de exclusão lógica (soft delete). | - |
| `deleted_by` | `uuid` | Identificador do usuário que efetuou a exclusão. | - |
| `updated_by` | `uuid` | Identificador do usuário que atualizou o perfil por último. | - |
| `foto_perfil` | `text` | URL ou caminho da foto do perfil. | - |

---

## 2. Gatilhos (Triggers) Relacionados

Foram identificados **dois gatilhos principais** que interagem com o ciclo de vida dos dados da tabela `profiles`:

### A. `on_auth_user_created`
- **Tabela de Origem:** `auth.users`
- **Evento:** `AFTER INSERT` (Executado após um novo cadastro de usuário).
- **Função Executada:** `handle_new_user()`
- **Finalidade:** Esse trigger é ativado no instante em que uma nova conta é criada pelo Supabase Authentication. Ele insere automaticamente uma nova linha correspondente na tabela `public.profiles` mapeando o `auth_uid`, populando o e-mail inicial e preparando o ambiente de permissões do usuário.

### B. `profiles_updated_at`
- **Tabela de Origem:** `public.profiles`
- **Evento:** `BEFORE UPDATE` (Executado imediatamente antes de gravar edições).
- **Função Executada:** `handle_updated_at()`
- **Finalidade:** Garante a consistência de auditoria, injetando a data atual (`now()`) na coluna `updated_at` sempre que houver qualquer alteração realizada no registro do perfil.

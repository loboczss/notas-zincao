---
type: community
cohesion: 0.21
members: 22
---

# Admin Invite Helpers

**Cohesion:** 0.21 - loosely connected
**Members:** 22 nodes

## Members
- [[AdminUsers.ts]] - code - shared/types/AdminUsers.ts
- [[_helpers.ts]] - code - server/api/admin/users/_helpers.ts
- [[assertAdminAccess()]] - code - server/api/admin/users/_helpers.ts
- [[buildInviteEmailHtml()]] - code - server/api/admin/users/invite.post.ts
- [[getAdminUserStatus()]] - code - shared/types/AdminUsers.ts
- [[getAdminUsersClient()]] - code - server/api/admin/users/_helpers.ts
- [[getCurrentAuthUid()]] - code - server/api/admin/users/_helpers.ts
- [[getSupabaseAdminConfigOrThrow()]] - code - server/api/admin/users/_helpers.ts
- [[health.get.ts]] - code - server/api/admin/users/health.get.ts
- [[index.delete.ts]] - code - server/api/admin/users/[authUid]/index.delete.ts
- [[index.get.ts]] - code - server/api/admin/users/index.get.ts
- [[invite.post.ts]] - code - server/api/admin/users/invite.post.ts
- [[isAdminUserRoleInput()]] - code - shared/types/AdminUsers.ts
- [[isResendConfigured()]] - code - server/services/email/resend.ts
- [[isValidEmail()]] - code - server/api/admin/users/invite.post.ts
- [[normalizeAdminRole()]] - code - shared/types/AdminUsers.ts
- [[normalizeRoleInputOrThrow()]] - code - server/api/admin/users/_helpers.ts
- [[resend.ts]] - code - server/services/email/resend.ts
- [[role.patch.ts]] - code - server/api/admin/users/[authUid]/role.patch.ts
- [[sendEmailWithResend()]] - code - server/services/email/resend.ts
- [[status.patch.ts]] - code - server/api/admin/users/[authUid]/status.patch.ts
- [[toAdminUserRecord()]] - code - server/api/admin/users/_helpers.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Admin_Invite_Helpers
SORT file.name ASC
```

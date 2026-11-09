# Database design

All 84 tables of the PostgreSQL database (`arweqah_platform`), generated from the live schema after the last migration (`NodeHeadRoles`, 2026-11-02). Part 1 is the ER diagrams (one per area; a box with no columns is a table that lives in another area); part 2 describes what each table does.

> **Rule (CLAUDE.md):** every new table (or column that changes a relation) is added to this file in the same change as its migration: its columns in the diagram of its area, and one row in the description tables. `README.md` §6 keeps the short overview; this file is the full reference.

Conventions: `PK` primary key · `FK` foreign key · `UK` unique. Every `*_translations` table holds the names of its parent in `ar` and `en` (`lang`). Most tables have `id uuid`, `created_at`, `updated_at`; business entities also carry `revision` for optimistic concurrency.

## Part 1 — ER diagrams

### 1. Identity and sign-in

```mermaid
erDiagram
  users {
    uuid id PK
    character_varying name
    character_varying email UK
    character_varying locale
    character_varying phone
    boolean is_active
    boolean email_verified
    text image
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying theme
  }
  auth_accounts {
    uuid id PK
    text account_id
    text provider_id
    uuid user_id FK
    text access_token
    text refresh_token
    text id_token
    timestamp_with_time_zone access_token_expires_at
    timestamp_with_time_zone refresh_token_expires_at
    text scope
    text password
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
  }
  auth_sessions {
    uuid id PK
    timestamp_with_time_zone expires_at
    text token UK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    text ip_address
    text user_agent
    uuid user_id FK
    timestamp_with_time_zone mfa_verified_at
    timestamp_with_time_zone admin_mode_enabled_at
    timestamp_with_time_zone admin_mode_last_activity_at
    uuid impersonated_by_user_id FK
    uuid impersonator_session_id FK
    timestamp_with_time_zone impersonation_last_activity_at
  }
  auth_verifications {
    uuid id PK
    text identifier
    text value
    timestamp_with_time_zone expires_at
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
  }
  authenticators {
    uuid user_id PK,FK
    text secret_enc
    timestamp_with_time_zone enabled_at
    bigint last_used_step
    integer failed_count
    timestamp_with_time_zone locked_until
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
  }
  authenticator_backup_codes {
    uuid id PK
    uuid user_id FK
    character_varying code_hash
    timestamp_with_time_zone used_at
    timestamp_with_time_zone created_at
  }
  enrollment_invites {
    uuid id PK
    uuid user_id FK
    character_varying token_hash
    timestamp_with_time_zone expires_at
    timestamp_with_time_zone used_at
    timestamp_with_time_zone created_at
  }
  trusted_devices {
    uuid id PK
    uuid user_id FK
    character_varying token_hash
    character_varying label
    timestamp_with_time_zone created_at
    timestamp_with_time_zone last_used_at
    timestamp_with_time_zone expires_at
  }
  security_settings {
    character_varying key PK
    integer value
    uuid updated_by
    timestamp_with_time_zone updated_at
  }
  allowed_email_domains {
    character_varying domain PK
    uuid created_by
    timestamp_with_time_zone created_at
  }
  users ||--o{ auth_sessions : "user_id"
  users ||--o{ auth_sessions : "impersonated_by_user_id"
  auth_sessions ||--o{ auth_sessions : "impersonator_session_id"
  users ||--o{ auth_accounts : "user_id"
  users ||--o{ authenticators : "user_id"
  users ||--o{ authenticator_backup_codes : "user_id"
  users ||--o{ enrollment_invites : "user_id"
  users ||--o{ trusted_devices : "user_id"
```

### 2. Access (roles, groups, permissions)

```mermaid
erDiagram
  roles {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying name_ar
    character_varying name_en
    character_varying description
    boolean is_system
    character_varying assignment
    character_varying auto_rule
    uuid job_title_id FK
    uuid org_node_id FK
  }
  role_permissions {
    uuid role_id PK,FK
    character_varying permission_key PK
    character_varying scope
    text_array fields
  }
  user_roles {
    uuid user_id PK,FK
    uuid role_id PK,FK
    date expires_at
    uuid granted_by FK
    timestamp_with_time_zone granted_at
  }
  role_groups {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying name_ar
    character_varying name_en
    character_varying description
  }
  role_group_roles {
    uuid group_id PK,FK
    uuid role_id PK,FK
  }
  role_group_permissions {
    uuid group_id PK,FK
    character_varying permission_key PK
    character_varying scope
    text_array fields
  }
  user_groups {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying name_ar
    character_varying name_en
    character_varying description
  }
  user_group_members {
    uuid group_id PK,FK
    uuid user_id PK,FK
  }
  user_group_permissions {
    uuid group_id PK,FK
    character_varying permission_key PK
    character_varying scope
    text_array fields
  }
  user_role_groups {
    uuid user_id PK,FK
    uuid group_id PK,FK
    date expires_at
    uuid granted_by FK
    timestamp_with_time_zone granted_at
  }
  user_permissions {
    uuid user_id PK,FK
    character_varying permission_key PK
    character_varying scope
    text_array fields
    date expires_at
    uuid granted_by FK
    timestamp_with_time_zone granted_at
  }
  page_visibility_rules {
    uuid role_id PK,FK
    character_varying page_key PK
  }
  list_settings {
    character_varying list_key PK
    jsonb hidden_columns
    jsonb hidden_filters
    timestamp_with_time_zone updated_at
  }
  roles ||--o{ role_permissions : "role_id"
  job_titles ||--o{ roles : "job_title_id"
  org_nodes ||--o{ roles : "org_node_id"
  users ||--o{ user_roles : "granted_by"
  roles ||--o{ user_roles : "role_id"
  users ||--o{ user_roles : "user_id"
  roles ||--o{ page_visibility_rules : "role_id"
  role_groups ||--o{ role_group_roles : "group_id"
  roles ||--o{ role_group_roles : "role_id"
  users ||--o{ user_permissions : "granted_by"
  users ||--o{ user_permissions : "user_id"
  users ||--o{ user_role_groups : "granted_by"
  role_groups ||--o{ user_role_groups : "group_id"
  users ||--o{ user_role_groups : "user_id"
  role_groups ||--o{ role_group_permissions : "group_id"
  user_groups ||--o{ user_group_members : "group_id"
  users ||--o{ user_group_members : "user_id"
  user_groups ||--o{ user_group_permissions : "group_id"
```

### 3. Organization

```mermaid
erDiagram
  companies {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    timestamp_with_time_zone deleted_at
    character_varying code
    boolean is_active
  }
  company_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid company_id FK
  }
  org_levels {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    timestamp_with_time_zone deleted_at
    integer sort_order
    boolean is_assignable
    boolean is_active
    character_varying template_code UK
    boolean is_built_in
    character_varying tone
    integer code_slot
  }
  org_level_parents {
    uuid id PK
    uuid parent_level_id FK
    uuid child_level_id FK
  }
  org_level_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid org_level_id FK
  }
  org_level_templates {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    boolean is_assignable
  }
  org_level_template_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid org_level_template_id FK
  }
  org_nodes {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    timestamp_with_time_zone deleted_at
    uuid company_id FK
    uuid org_level_id FK
    uuid parent_id FK
    uuid manager_id FK
    integer sort_order
    boolean is_active
    date start_date
    character_varying code UK
    character_varying management_mode
    jsonb charter
  }
  org_node_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid org_node_id FK
  }
  org_node_closure {
    uuid ancestor_id PK,FK
    uuid descendant_id PK,FK
    integer depth
  }
  job_titles {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    timestamp_with_time_zone deleted_at
    uuid org_node_id FK
    boolean is_active
    character_varying code UK
    smallint grade
    character_varying track
    uuid reports_to_title_id FK
    jsonb responsibilities
    jsonb qualifications
    jsonb kpis
    integer content_version
  }
  job_title_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid job_title_id FK
  }
  development_stage_rules {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    smallint grade
    character_varying track
    character_varying stage
  }
  org_node_versions {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid node_id FK
    date valid_from
    date valid_to
    character_varying name_ar
    character_varying name_en
    character_varying code
    boolean is_active
    jsonb charter
    text reason
    uuid created_by
    timestamp_with_time_zone applied_at
  }
  org_node_leaders {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid node_id FK
    uuid company_id FK
    uuid employee_id FK
    character_varying kind
    date valid_from
    date valid_to
    text reason
    uuid created_by
  }
  companies ||--o{ company_translations : "company_id"
  org_level_templates ||--o{ org_level_template_translations : "org_level_template_id"
  org_levels ||--o{ org_level_translations : "org_level_id"
  org_levels ||--o{ org_level_parents : "parent_level_id"
  org_levels ||--o{ org_level_parents : "child_level_id"
  companies ||--o{ org_nodes : "company_id"
  employees ||--o{ org_nodes : "manager_id"
  org_levels ||--o{ org_nodes : "org_level_id"
  org_nodes ||--o{ org_nodes : "parent_id"
  org_nodes ||--o{ org_node_translations : "org_node_id"
  org_nodes ||--o{ org_node_closure : "ancestor_id"
  org_nodes ||--o{ org_node_closure : "descendant_id"
  org_nodes ||--o{ job_titles : "org_node_id"
  job_titles ||--o{ job_title_translations : "job_title_id"
  job_titles ||--o{ job_titles : "reports_to_title_id"
  org_nodes ||--o{ org_node_versions : "node_id"
  org_nodes ||--o{ org_node_leaders : "node_id"
  companies ||--o{ org_node_leaders : "company_id"
  employees ||--o{ org_node_leaders : "employee_id"
```

### 4. Lookups

```mermaid
erDiagram
  countries {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying iso_code
    character_varying currency_code
  }
  country_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid country_id FK
    character_varying currency_name
  }
  marital_statuses {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
  }
  marital_status_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid marital_status_id FK
  }
  residency_statuses {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
  }
  residency_status_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid residency_status_id FK
  }
  id_types {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    boolean requires_country
  }
  id_type_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid id_type_id FK
  }
  id_type_rules {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid id_type_id FK
    uuid country_id FK
    character_varying regex
    integer min_length
    integer max_length
    character_varying checksum
  }
  id_type_rule_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid id_type_rule_id FK
  }
  contract_types {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    boolean requires_end_date
    boolean is_other
  }
  contract_type_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid contract_type_id FK
  }
  gosi_systems {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    jsonb conditions
  }
  gosi_system_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid gosi_system_id FK
  }
  termination_reasons {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    boolean is_other
  }
  termination_reason_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid termination_reason_id FK
  }
  relation_types {
    uuid id PK
    character_varying code
    integer sort_order
    boolean is_active
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    boolean limited_access
  }
  relation_type_translations {
    uuid id PK
    character_varying lang
    character_varying name
    uuid relation_type_id FK
  }
  relation_types ||--o{ relation_type_translations : "relation_type_id"
  countries ||--o{ country_translations : "country_id"
  marital_statuses ||--o{ marital_status_translations : "marital_status_id"
  residency_statuses ||--o{ residency_status_translations : "residency_status_id"
  id_types ||--o{ id_type_translations : "id_type_id"
  countries ||--o{ id_type_rules : "country_id"
  id_types ||--o{ id_type_rules : "id_type_id"
  id_type_rules ||--o{ id_type_rule_translations : "id_type_rule_id"
  contract_types ||--o{ contract_type_translations : "contract_type_id"
  gosi_systems ||--o{ gosi_system_translations : "gosi_system_id"
  termination_reasons ||--o{ termination_reason_translations : "termination_reason_id"
```

### 5. Employees

```mermaid
erDiagram
  employees {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    timestamp_with_time_zone deleted_at
    uuid user_id FK
    boolean is_system_account
    uuid company_id FK
    uuid relation_type_id FK
    uuid org_node_id FK
    uuid job_title_id FK
    uuid manager_id FK
    character_varying work_location
    uuid work_country_id FK
    smallint work_mode
    character_varying work_email
    character_varying personal_email
    character_varying work_phone
    character_varying personal_phone
    character_varying employee_number
    character_varying full_name
    character_varying full_name_en
    smallint gender
    date birth_date
    uuid nationality_id FK
    uuid marital_status_id FK
    uuid residency_status_id FK
    uuid id_type_id FK
    text id_number_enc
    character_varying id_number_hash
    date id_expiry_date
    date start_date
    date end_date
    uuid contract_type_id FK
    character_varying contract_type_other
    uuid contract_company_id FK
    uuid gosi_company_id FK
    uuid health_insurance_company_id FK
    boolean is_gosi_registered
    date gosi_registration_date
    uuid gosi_system_id FK
    character_varying profession
    boolean is_qiwa_contract
    boolean has_medical_insurance
    uuid termination_reason_id FK
    character_varying termination_reason_other
    text monthly_gross_salary_enc
    uuid salary_currency_country_id FK
    text iban_enc
    text notes
    uuid photo_file_id FK
    uuid created_by
    timestamp_with_time_zone access_ended_at
  }
  employee_assignments {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid employee_id FK
    character_varying field
    uuid org_node_id FK
    uuid job_title_id FK
    uuid manager_employee_id FK
    date valid_from
    date valid_to
    character_varying manager_source
    text reason
    uuid created_by
    timestamp_with_time_zone applied_at
  }
  companies ||--o{ employees : "company_id"
  companies ||--o{ employees : "contract_company_id"
  contract_types ||--o{ employees : "contract_type_id"
  companies ||--o{ employees : "gosi_company_id"
  gosi_systems ||--o{ employees : "gosi_system_id"
  companies ||--o{ employees : "health_insurance_company_id"
  id_types ||--o{ employees : "id_type_id"
  job_titles ||--o{ employees : "job_title_id"
  employees ||--o{ employees : "manager_id"
  marital_statuses ||--o{ employees : "marital_status_id"
  countries ||--o{ employees : "nationality_id"
  org_nodes ||--o{ employees : "org_node_id"
  relation_types ||--o{ employees : "relation_type_id"
  residency_statuses ||--o{ employees : "residency_status_id"
  countries ||--o{ employees : "salary_currency_country_id"
  termination_reasons ||--o{ employees : "termination_reason_id"
  users ||--o{ employees : "user_id"
  files ||--o{ employees : "photo_file_id"
  employees ||--o{ employee_assignments : "employee_id"
  employees ||--o{ employee_assignments : "manager_employee_id"
  org_nodes ||--o{ employee_assignments : "org_node_id"
  job_titles ||--o{ employee_assignments : "job_title_id"
  countries ||--o{ employees : "work_country_id"
```

### 6. Tickets

```mermaid
erDiagram
  ticket_desks {
    uuid org_node_id PK,FK
    character_varying reception_status
    text description_ar
    text description_en
    boolean accepts_personal
    integer default_due_days
    integer min_lead_days
    integer auto_close_days
    integer reopen_window_days
    integer stale_after_days
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
  }
  ticket_types {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid desk_id FK
    character_varying name_ar
    character_varying name_en
    text description_ar
    text description_en
    uuid default_assignee_user_id FK
    integer due_days
    boolean is_personal
    boolean is_active
    integer sort_order
  }
  tickets {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    bigint number
    uuid sender_user_id FK
    uuid desk_id FK
    uuid type_id FK
    character_varying title
    text details
    smallint priority
    date needed_by
    uuid assignee_user_id FK
    boolean is_personal
    character_varying status
    character_varying close_reason
    timestamp_with_time_zone first_response_at
    timestamp_with_time_zone close_requested_at
    timestamp_with_time_zone closed_at
    timestamp_with_time_zone last_activity_at
    integer reopen_count
    timestamp_with_time_zone stale_notified_at
    integer revision
  }
  ticket_events {
    uuid id PK
    uuid ticket_id FK
    character_varying type
    uuid actor_user_id FK
    text body
    timestamp_with_time_zone created_at
  }
  ticket_attachments {
    uuid event_id PK,FK
    uuid file_id PK,FK
  }
  org_nodes ||--o{ ticket_desks : "org_node_id"
  users ||--o{ ticket_types : "default_assignee_user_id"
  ticket_desks ||--o{ ticket_types : "desk_id"
  users ||--o{ tickets : "assignee_user_id"
  ticket_desks ||--o{ tickets : "desk_id"
  users ||--o{ tickets : "sender_user_id"
  ticket_types ||--o{ tickets : "type_id"
  users ||--o{ ticket_events : "actor_user_id"
  tickets ||--o{ ticket_events : "ticket_id"
  ticket_events ||--o{ ticket_attachments : "event_id"
  files ||--o{ ticket_attachments : "file_id"
```

### 7. Tasks

```mermaid
erDiagram
  tasks {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    bigint number
    uuid company_id FK
    character_varying title
    text description
    uuid assignee_user_id FK
    uuid creator_user_id FK
    uuid reviewer_user_id FK
    uuid approver_user_id FK
    character_varying status
    character_varying priority
    date due_date
    integer estimate_minutes
    uuid tag_id FK
    boolean urgent_manual
    boolean needs_review
    character_varying recurrence
    date recurrence_end
    uuid recurrence_parent_id FK
    character_varying source
    uuid project_id
    uuid ticket_id FK
    timestamp_with_time_zone completed_at
    date completed_on
    timestamp_with_time_zone last_activity_at
    timestamp_with_time_zone archived_at
    timestamp_with_time_zone reminded_at
    timestamp_with_time_zone overdue_notified_at
    timestamp_with_time_zone estimate_notified_at
    integer revision
  }
  task_events {
    uuid id PK
    uuid task_id FK
    character_varying type
    uuid actor_user_id FK
    character_varying from_status
    character_varying to_status
    text note
    timestamp_with_time_zone created_at
  }
  task_followers {
    uuid task_id PK,FK
    uuid user_id PK,FK
    timestamp_with_time_zone created_at
  }
  task_objections {
    uuid id PK
    uuid task_id FK
    uuid raised_by_user_id FK
    character_varying reason_code
    text note
    timestamp_with_time_zone expires_at
    character_varying status
    uuid answered_by_user_id
    timestamp_with_time_zone created_at
  }
  task_policies {
    uuid company_id PK,FK
    integer objection_working_days
    integer stale_days
    integer backdate_days
    integer urgent_days
    integer reminder_days_before
    integer digest_weekday
    integer standalone_retention_days
    timestamp_with_time_zone updated_at
    integer comment_max_files
    integer comment_edit_minutes
    integer comment_lock_days
  }
  task_tags {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid org_node_id FK
    character_varying name_ar
    character_varying name_en
    boolean is_active
  }
  task_time_entries {
    uuid id PK
    uuid task_id FK
    uuid user_id FK
    integer minutes
    date worked_on
    timestamp_with_time_zone created_at
  }
  org_nodes ||--o{ task_tags : "org_node_id"
  companies ||--o{ task_policies : "company_id"
  users ||--o{ tasks : "approver_user_id"
  users ||--o{ tasks : "assignee_user_id"
  companies ||--o{ tasks : "company_id"
  users ||--o{ tasks : "creator_user_id"
  tasks ||--o{ tasks : "recurrence_parent_id"
  users ||--o{ tasks : "reviewer_user_id"
  task_tags ||--o{ tasks : "tag_id"
  tickets ||--o{ tasks : "ticket_id"
  users ||--o{ task_events : "actor_user_id"
  tasks ||--o{ task_events : "task_id"
  tasks ||--o{ task_followers : "task_id"
  users ||--o{ task_followers : "user_id"
  users ||--o{ task_objections : "raised_by_user_id"
  tasks ||--o{ task_objections : "task_id"
  tasks ||--o{ task_time_entries : "task_id"
  users ||--o{ task_time_entries : "user_id"
```

### 8. Task conversations

```mermaid
erDiagram
  task_comments {
    uuid id PK
    uuid task_id FK
    uuid author_user_id FK
    uuid parent_id FK
    uuid reply_to_user_id
    text body
    timestamp_with_time_zone edited_at
    timestamp_with_time_zone deleted_at
    uuid deleted_by_user_id
    timestamp_with_time_zone created_at
  }
  task_comment_files {
    uuid comment_id PK,FK
    uuid file_id PK,FK
  }
  task_comment_mentions {
    uuid comment_id PK,FK
    uuid user_id PK,FK
  }
  task_comment_rules {
    uuid company_id PK,FK
    character_varying relation PK
    character_varying action PK
    boolean allowed
  }
  users ||--o{ task_comments : "author_user_id"
  task_comments ||--o{ task_comments : "parent_id"
  tasks ||--o{ task_comments : "task_id"
  task_comments ||--o{ task_comment_files : "comment_id"
  files ||--o{ task_comment_files : "file_id"
  task_comments ||--o{ task_comment_mentions : "comment_id"
  users ||--o{ task_comment_mentions : "user_id"
  companies ||--o{ task_comment_rules : "company_id"
```

### 9. Platform services

```mermaid
erDiagram
  audit_logs {
    uuid id PK
    uuid actor_id
    character_varying action
    character_varying entity_type
    character_varying entity_id
    jsonb changes
    character_varying ip
    timestamp_with_time_zone created_at
    bigint seq
    character_varying prev_hash
    character_varying hash
  }
  files {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid owner_id FK
    character_varying storage_key UK
    character_varying original_name
    character_varying content_type
    integer size
  }
  outbox_messages {
    uuid id PK
    character_varying topic
    jsonb payload
    timestamp_with_time_zone created_at
    timestamp_with_time_zone published_at
    integer attempts
    text last_error
  }
  processed_messages {
    character_varying consumer PK
    character_varying message_id PK
    timestamp_with_time_zone processed_at
  }
  scheduled_jobs {
    uuid id PK
    character_varying topic
    jsonb payload
    timestamp_with_time_zone run_at
    character_varying status
    character_varying dedupe_key
    integer attempts
    text last_error
    timestamp_with_time_zone created_at
  }
  notifications {
    uuid id PK
    uuid user_id FK
    character_varying title_ar
    character_varying title_en
    text body_ar
    text body_en
    character_varying link
    timestamp_with_time_zone read_at
    timestamp_with_time_zone created_at
  }
  email_logs {
    uuid id PK
    character_varying to_email
    character_varying subject
    character_varying purpose
    character_varying status
    text error
    character_varying message_id
    text provider_response
    timestamp_with_time_zone created_at
    timestamp_with_time_zone sent_at
  }
  integration_providers {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying kind
    character_varying provider_key
    jsonb config
    character_varying verified_hash
    timestamp_with_time_zone verified_at
    boolean is_active
    uuid updated_by
  }
  message_templates {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying kind
    character_varying key
    jsonb content
    jsonb pending
    uuid pending_by
    timestamp_with_time_zone pending_at
    uuid updated_by
  }
  template_settings {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying kind
    boolean require_approval
    uuid updated_by
  }
  workflow_instances {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying definition_key
    integer definition_version
    character_varying entity_type
    uuid entity_id
    character_varying state
    boolean is_done
    jsonb snapshot
    uuid started_by
    integer revision
  }
  workflow_transitions {
    uuid id PK
    uuid instance_id FK
    character_varying event
    character_varying from_state
    character_varying to_state
    uuid actor_id
    character_varying comment
    timestamp_with_time_zone created_at
  }
  tour_step_settings {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    character_varying step_key
    boolean enabled
    integer sort_order
    character_varying title_ar
    character_varying title_en
    character_varying body_ar
    character_varying body_en
    uuid updated_by
  }
  user_tour_progress {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid user_id
    character_varying tour
    character_varying status
    ARRAY seen_steps
  }
  migrations {
    integer id PK
    bigint timestamp
    character_varying name
  }
  users ||--o{ files : "owner_id"
  users ||--o{ notifications : "user_id"
  workflow_instances ||--o{ workflow_transitions : "instance_id"
```

### 10. Career path (content of each job title)

```mermaid
erDiagram
  career_title_content {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid title_id FK,UK
    integer version
    character_varying status
    jsonb content
    uuid updated_by
  }
  career_title_content_versions {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid title_id FK,UK
    integer version UK
    jsonb content
    uuid saved_by
  }
  career_acknowledgements {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid employee_id FK,UK
    uuid title_id FK,UK
    integer content_version UK
    timestamp_with_time_zone acknowledged_at
  }
  career_ack_reopenings {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid title_id FK
    character_varying reason
    uuid reopened_by
  }
  career_learning_records {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid employee_id FK,UK
    uuid title_id FK
    uuid unit_id UK
    character_varying status
    character_varying proof_kind
    uuid file_id FK
    character_varying note
    integer minutes
    timestamp_with_time_zone submitted_at
    uuid decided_by
    timestamp_with_time_zone decided_at
    character_varying rejection_reason
    integer rejection_count
  }
  career_required_progress {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid employee_id FK,UK
    uuid title_id FK,UK
    integer item_index UK
    timestamp_with_time_zone done_at
  }
  career_development_requests {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid employee_id FK
    character_varying course_name
    integer cost
    character_varying plan
    character_varying status
    character_varying level
    uuid approver_user_id
    uuid agreement_file_id FK
    integer budget_cap
    character_varying rejection_reason
    uuid decided_by
    timestamp_with_time_zone decided_at
    timestamp_with_time_zone submitted_at
  }
  career_employee_competency_levels {
    uuid id PK
    timestamp_with_time_zone created_at
    timestamp_with_time_zone updated_at
    uuid employee_id FK,UK
    character_varying competency UK
    character_varying level
    timestamp_with_time_zone reached_at
    uuid recorded_by
  }
  employees ||--o{ career_development_requests : "employee_id"
  files |o--o{ career_development_requests : "agreement_file_id"
  employees ||--o{ career_employee_competency_levels : "employee_id"
  employees ||--o{ career_learning_records : "employee_id"
  job_titles ||--o{ career_learning_records : "title_id"
  files ||--o{ career_learning_records : "file_id"
  employees ||--o{ career_required_progress : "employee_id"
  job_titles ||--o{ career_required_progress : "title_id"
  job_titles ||--o| career_title_content : "title_id"
  job_titles ||--o{ career_title_content_versions : "title_id"
  job_titles ||--o{ career_acknowledgements : "title_id"
  job_titles ||--o{ career_ack_reopenings : "title_id"
  employees ||--o{ career_acknowledgements : "employee_id"
```

## Part 2 — What each table does

### 1. Identity and sign-in

| Table | What it does |
|---|---|
| `users` | One row per person who can sign in: name, e-mail, language, theme, active flag. The root of almost every relation. |
| `auth_accounts` | Better Auth link between a user and a sign-in provider (Microsoft Entra or work e-mail). |
| `auth_sessions` | Active login sessions: token, expiry, when the authenticator code was verified, platform-admin-mode timestamps, and (for «sign in as») the administrator working as the user, the administrator's own session to go back to, and the last activity. |
| `auth_verifications` | Short-lived Better Auth tokens (e-mail verification, sign-in links). |
| `authenticators` | The user's authenticator-app secret (encrypted), replay guard (`last_used_step`), failed-attempt counter and lock time. |
| `authenticator_backup_codes` | One-time backup codes for a user who lost the authenticator app. |
| `enrollment_invites` | E-mailed QR link that lets a new user enroll the authenticator app the first time. |
| `trusted_devices` | Devices a person chose to «remember», so the code is skipped there until expiry. |
| `security_settings` | Single-row platform security settings (session length, request limit per minute, device trust…). |
| `allowed_email_domains` | E-mail domains allowed to sign in with a work e-mail. |

### 2. Access

| Table | What it does |
|---|---|
| `roles` | Roles (manual, automatic by rule, per-unit «head of unit» roles via `org_node_id`, collaborator base). |
| `role_permissions` | Permission keys a role holds, each with its scope (own / unit / company / all) and, for «edit employees», the list of fields (`fields`, FR-94; empty = the basic data). |
| `user_roles` | Roles assigned to a person (stored choices, with the grant stamp). |
| `role_groups` | A named bundle of roles (e.g. «HR team»). |
| `role_group_roles` | Which roles are inside a role group. |
| `role_group_permissions` | Extra permission keys given to everyone holding a role group (with `fields` for «edit employees»). |
| `user_groups` | A named group of people. |
| `user_group_members` | Members of a user group. |
| `user_group_permissions` | Permission keys given to every member of a user group (with `fields` for «edit employees»). |
| `user_role_groups` | Role groups assigned to a person. |
| `user_permissions` | Exceptions: a single permission key given to one person, with scope, expiry, who granted it and (for «edit employees») its `fields`. |
| `page_visibility_rules` | Which pages (`page_key`) a role may see in the menu. |
| `list_settings` | Per list: hidden columns and hidden filters (list management). |

### 3. Organization

| Table | What it does |
|---|---|
| `companies` | The group's companies (branches): code and active flag; names in `company_translations`. |
| `company_translations` | Company names in ar / en. |
| `org_levels` | The unit types of the whole group (sector, department, section, unit, office, and types an administrator adds): `template_code` is the stable key, `is_assignable` = accepts job titles and employees, `is_built_in` = cannot be removed, `tone` = colour family, `code_slot` = slot in a unit code (null for the office). No `company_id`: the structure is one for the group. |
| `org_level_parents` | «Who may be created under whom»: one row per allowed (parent type, child type); a null `parent_level_id` is the group root. Edited from the Organization levels window; it only stops new units. |
| `org_level_translations` | Level names in ar / en. |
| `org_level_templates` | The built-in unit types and their defaults (sector, department, section, unit, office), seeded; the group's `org_levels` start from them. |
| `org_level_template_translations` | Template level names in ar / en. |
| `org_nodes` | The group's one organization tree: each sector / department / section / unit / office, with its parent and head. `charter` is the charter in force (jsonb: purpose, outputs, in / out of scope, limits in ar and en). `company_id` is the group company (every unit belongs to it). `code` is the unit code built by type (`OPS.03.03.01`; null until set for units created before codes), `management_mode` is `shared`, `per_company` or null (inherit from the closest ancestor with a value). |
| `org_node_translations` | Node names in ar / en. |
| `org_node_closure` | Ancestor → descendant pairs with depth, so «everything under this unit» is one query (scope checks). |
| `job_titles` | Job titles of a unit (never on a sector). `code` (`OPS.03.03.01-L7P-01`: unit code, grade, track, sequence per unit, grade and track) is built once and never changes or reused (null for titles made before codes, until HR gives a grade and track); `grade` 1–9 and `track` M / P / J / C / S come together and are set once; `reports_to_title_id` is the reporting line (no loops) that finds an employee's manager; `responsibilities`, `qualifications` and `kpis` are ordered lists in ar and en (jsonb) and `content_version` grows with every edit of them. |
| `job_title_translations` | Job title names in ar / en. |
| `development_stage_rules` | Which development stage a grade (and a track, or any track when null) gives: foundation, specialization, mastery, operational or institutional leadership. Seeded from the defaults; read only for now, HR edits later. A rule with a track wins over one for the grade alone. |
| `org_node_versions` | The dated versions of a unit (FR-99): name (ar, en), code, on/off switch and charter (jsonb) from `valid_from` to `valid_to` (open while null), with the reason and who made it. Versions of a unit never overlap (exclusion constraint), a past one is never rewritten; `org_nodes` keeps the one in force as its current values, and a version that starts later waits (`applied_at` empty) until the nightly job copies it. |
| `org_node_leaders` | Who leads a unit for a company and who acts for them (FR-100): `kind` leader or acting, with `valid_from` / `valid_to` and the reason. A shared unit has one leader from the group company; a unit managed per company has one per company. Rows of the same kind for one unit and company never overlap, an acting leader always has an end date. `org_nodes.manager_id` keeps the primary leader in force as a copy; the unit's head role goes to every leader and acting leader in force. |

### 4. Lookups (drop-down lists, each with its `*_translations`)

| Table | What it does |
|---|---|
| `countries` / `country_translations` | Countries and nationalities. |
| `marital_statuses` / `marital_status_translations` | Marital status values. |
| `residency_statuses` / `residency_status_translations` | Residency status values. |
| `id_types` / `id_type_translations` | Kinds of ID (national ID, iqama, passport…). |
| `id_type_rules` / `id_type_rule_translations` | Format rule per ID type and country: regex, min / max length, checksum. |
| `contract_types` / `contract_type_translations` | Employment contract types. |
| `gosi_systems` / `gosi_system_translations` | GOSI (social insurance) systems. |
| `termination_reasons` / `termination_reason_translations` | Reasons an employment ends. |
| `relation_types` / `relation_type_translations` | Relation of a person to the company (employee, collaborator…); `limited_access` marks the collaborator kind with a required end date. |

### 5. Employees

| Table | What it does |
|---|---|
| `employees` | The employee file: company, unit, job title, manager, relation, work location / mode, contact data, ID, contract, GOSI, medical insurance, dates, termination, salary. National ID, salary and IBAN are encrypted (`*_enc`, ID also hashed for lookup). Soft-deleted (`deleted_at`); linked to `users`. |
| `employee_assignments` | The dated placement of an employee (FR-89): one row per period of the unit, the job title or the direct manager (`field`), with `valid_from` / `valid_to`, the reason and who made it. A change closes the open period the day before the new one starts. `applied_at` is empty while a later period waits for its day; `employees` keeps the value in force today. One open period per employee and field. A manager period has a `manager_source`: `manual` (HR chose the person; it stays) or `auto_chain` (the system found the nearest occupied title above the employee's and follows it as people come and go; reason «chain»). |

### 6. Tickets (internal, between departments)

| Table | What it does |
|---|---|
| `ticket_desks` | One per receiving unit (`org_node_id`): reception status, accepts-personal flag, default / minimum due days, auto-close, reopen window and stale-after days. |
| `ticket_types` | Kinds of ticket per desk (names ar / en, default assignee, due days, personal flag). |
| `tickets` | The ticket: sender, desk, type, title, details, priority, needed-by date, assignee, status, close reason, response and activity timestamps, reopen count. |
| `ticket_events` | Timeline of a ticket: answers, status changes, assignment, close and reopen. |
| `ticket_attachments` | Files attached to a ticket (links to `files`). |

### 7. Tasks

| Table | What it does |
|---|---|
| `tasks` | The task: company, creator, assignee, reviewer, approver, status, priority, due date, estimate, tag, recurrence, source (manual / ticket / project), completion and archive dates, reminder markers. |
| `task_events` | Timeline of a task: type, actor, from / to status and note. |
| `task_followers` | People who follow a task and are notified. |
| `task_objections` | An objection raised on a task: reason code, note, expiry, status and who answered. |
| `task_policies` | Per-company task settings: objection working days, stale days, back-date days, reminder days, digest weekday, retention, comment limits. |
| `task_tags` | Tags per unit (`org_node_id`) that a task can carry. |
| `task_time_entries` | Time logged against a task. |

### 8. Task conversations

| Table | What it does |
|---|---|
| `task_comments` | Comments and replies on a task. |
| `task_comment_files` | Files attached to a comment (links to `files`). |
| `task_comment_mentions` | `@` mentions in a comment, used for notifications. |
| `task_comment_rules` | Per-company matrix: which relation (owner, assignee, follower…) may do which comment action. |

### 9. Platform services

| Table | What it does |
|---|---|
| `audit_logs` | Tamper-evident audit trail: a hash chain (`seq`, `prev_hash`, `hash`); a trigger refuses update and delete. |
| `files` | Metadata of every stored file (original name, content type, size, owner, storage key). |
| `outbox_messages` | Transactional outbox: messages to publish to RabbitMQ, written in the same transaction as the change. |
| `processed_messages` | Idempotency record: consumers skip a message already handled. |
| `scheduled_jobs` | Durable timers (reminders, timeouts) run by the scheduler. |
| `notifications` | In-app notifications per user: bilingual title and body, link, read time. |
| `email_logs` | Every e-mail sent or failed, for support. |
| `integration_providers` | External services (e-mail, translation, Turnstile…): provider key, encrypted config, last verified test, active flag. |
| `message_templates` | Editable e-mail / message templates. |
| `template_settings` | Per template kind: whether changes need approval. |
| `workflow_instances` | Running XState approval workflows: definition, state, entity, snapshot. |
| `workflow_transitions` | History of each workflow instance's transitions. |
| `tour_step_settings` | Welcome-tour steps the admin edited: enabled flag, order, texts in ar / en. |
| `user_tour_progress` | Which tour steps each user has seen or dismissed. |
| `migrations` | TypeORM bookkeeping: which migrations already ran. |

### 10. Career path

| Table | What it does |
|---|---|
| `career_title_content` | The career-path content of one job title (one row per title): `content` (jsonb: summary, indicators, responsibilities, ladder, level path, competencies, required actions, acknowledgement sentence), `version` (grows by one per save), `status` (`draft` or `ready`: only a ready path is shown to the title's holders). |
| `career_title_content_versions` | A snapshot of the content at each version (`title_id` + `version` unique), kept so what an employee acknowledged can be shown again. |
| `career_acknowledgements` | An employee's acknowledgement of the career path of a title at a content version (`employee_id` + `title_id` + `content_version` unique; acknowledging the same version again only refreshes the time). The platform is held back until the latest one of the employee's title is later than the latest reopening. |
| `career_learning_records` | The state of one learning unit for one employee (`employee_id` + `unit_id` unique; `unit_id` is the id of the unit inside the title's content document): the proof they sent (`proof_kind`, `file_id`, `note`), the unit's minutes at that time, and the decision (`status` wait / referred / done / rej, `decided_by`, `decided_at`, `rejection_reason`, `rejection_count`). A rejected proof is replaced by the next one; no row means «not started». |
| `career_required_progress` | An employee ticked an item of «required» (`employee_id` + `title_id` + `item_index` unique; unticking deletes the row). |
| `career_development_requests` | A development request (FR-116): the course, its cost in whole riyals, `plan` (`in` the learning plan or `out` of it), the `level` that decides it now (`direct`, `sector`, `ceo`) and `approver_user_id` (the person who holds that post for the employee; changes when the request goes up), `status` (`pending`, `approved`, `rejected`), the retention agreement (`agreement_file_id`), the yearly cap of the employee's stage on the day it was sent (`budget_cap`), the decision (who, when, the reason of a rejection). The workflow `career.development_request` carries its state and the seven-day deadline of the direct manager. |
| `career_employee_competency_levels` | The level (`أساسي` or `خبير`) of one technical competency of the employee's title that their manager recorded (`employee_id` + `competency` unique; the competency is the one of the title's content, by name; taking the record back deletes the row). |
| `career_ack_reopenings` | HR asked the holders of a title to acknowledge again, with the reason: whoever acknowledged before it is asked once more. |

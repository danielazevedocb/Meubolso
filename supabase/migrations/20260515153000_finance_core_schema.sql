-- FinançasPessoal — core schema per PRD §7 + Supabase Auth
-- Uses public.profiles (id = auth.users.id). Do not duplicate auth.users rows.
--
-- Solo (PRD onboarding): nullable group_id on months/bills with partial UNIQUE indexes.
-- Invite preview for non-members: use Edge Function/service role ou RPC SECURITY DEFINER;
-- políticas SELECT em groups apenas para membros (defesa por isolamento tenant).

begin;

create extension if not exists pgcrypto;

-- ── Roles (creator vs member — regenerar convite: PRD §10 item 6) ─────────────
create type public.group_member_role as enum ('owner', 'member');

-- ── Profiles (1:1 com auth.users) ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index profiles_created_at_idx on public.profiles (created_at);

-- ── Groups ───────────────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  invite_code text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  max_members integer not null default 6 check (
    max_members >= 1
    and max_members <= 6
  ),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint groups_invite_code_trimmed_chk check (
    invite_code = trim (invite_code)
    and invite_code <> ''
  )
);

create unique index groups_invite_code_uidx on public.groups (invite_code);

create index groups_created_by_idx on public.groups (created_by);

-- ── Members ─────────────────────────────────────────────────────────────────────
create table public.group_members (
  id uuid primary key default gen_random_uuid (),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_member_role not null default 'member',
  joined_at timestamptz not null default now (),
  constraint group_members_unique_member unique (group_id, user_id)
);

create unique index group_members_one_owner_uidx on public.group_members (
  group_id
)
where
  role = 'owner';

create index group_members_user_id_idx on public.group_members (user_id);

create index group_members_group_id_idx on public.group_members (group_id);

create or replace function public.enforce_group_member_limit ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  lim integer;

  cnt integer;

begin
  select
    g.max_members into lim
    from
      public.groups g
      where g.id = new.group_id;
  select
    count(*) into cnt
    from
      public.group_members gm
      where gm.group_id = new.group_id;
  if cnt >= lim then
    raise exception 'Group reached max member limit (%)',
      lim;
  end if;
  return new;
end;

$$;

create trigger enforce_group_member_limit_trg
  before insert on public.group_members
  for each row
  execute function public.enforce_group_member_limit ();

-- ── Months ───────────────────────────────────────────────────────────────────────
create table public.months (
  id uuid primary key default gen_random_uuid (),
  group_id uuid references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  month_label text not null,
  salary numeric (12,
    2) not null default 0 check (salary >= 0),
    note text,
    created_at timestamptz not null default now (),
    updated_at timestamptz not null default now (),
    constraint months_month_label_chk check (month_label ~ '^\d{4}-\d{2}$'::text)
);

comment on column public.months.month_label is
  'Canonical month key aligned with bills, e.g. 2026-05 (same meaning as PRD column "month").';

comment on column public.months.note is
  '"Nota do mês" by member by month — not copied when duplicating bills (PRD §6.9).';

create unique index months_solo_uidx on public.months (
  user_id,
  month_label
)
where
  group_id is null;

create unique index months_group_uidx on public.months (
  group_id,
  user_id,
  month_label
)
where
  group_id is not null;

create index months_group_month_idx on public.months (
  group_id,
  month_label
)
where
  group_id is not null;

create index months_user_month_idx on public.months (
  user_id,
  month_label
);

-- ── Bills (contas; soft delete opcional via deleted_at) ─────────────────────────
create table public.bills (
  id uuid primary key default gen_random_uuid (),
  group_id uuid references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  month_label text not null,
  company text not null,
  amount numeric (12,
    2) not null default 0 check (amount >= 0),
    due_date text,
    paid boolean not null default false,
    note text,
    copied_from text,
    deleted_at timestamptz,
    created_at timestamptz not null default now (),
    updated_at timestamptz not null default now (),
    updated_by uuid references public.profiles (id),
    constraint bills_month_label_chk check (month_label ~ '^\d{4}-\d{2}$'::text),
    constraint bills_company_nonempty_chk check (trim(BOTH FROM company) <> ''),
    constraint bills_copied_month_chk check (
      copied_from is null
      or copied_from ~ '^\d{4}-\d{2}$'::text
    )
);

comment on column public.bills.company is 'Empresa / descrição (PRD §6.4)';
comment on column public.bills.copied_from is
  'Canonical month source for traceability ("2026-04") when rows are duplicated (PRD §6.9).';
comment on column public.bills.due_date is
  'Formato livre exibido na UI, ex. 10/mai (espelho do PRD).';

create index bills_group_month_active_idx on public.bills (
  group_id,
  month_label
)
where
  group_id is not null
  and deleted_at is null;

create index bills_user_month_active_idx on public.bills (
  user_id,
  month_label
)
where
  deleted_at is null;

create index bills_updated_by_idx on public.bills (updated_by);

-- Anti-duplicidade na importação (PRD §6.9 fluxo alternativo — mesmo nome)
create unique index bills_solo_company_uidx on public.bills (
  user_id,
  month_label,
  lower(
    trim(BOTH FROM company)
  )
)
where
  group_id is null
  and deleted_at is null;

create unique index bills_group_company_uidx on public.bills (
  group_id,
  user_id,
  month_label,
  lower(
    trim(BOTH FROM company)
  )
)
where
  group_id is not null
  and deleted_at is null;

-- ── updated_at ─────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at ()
  returns trigger
  language plpgsql
  set search_path = public
  as $$
begin
  new.updated_at = now ();

  return new;
end;

$$;

create trigger profiles_set_updated_at_trg before update on public.profiles for each row
execute function public.set_updated_at ();

create trigger groups_set_updated_at_trg before update on public.groups for each row
execute function public.set_updated_at ();

create trigger months_set_updated_at_trg before update on public.months for each row
execute function public.set_updated_at ();

create trigger bills_set_updated_at_trg before update on public.bills for each row
execute function public.set_updated_at ();

-- Preview / resolve invite before join — RLS em groups só libera membros (security.md).
create or replace function public.lookup_group_by_invite (p_invite_code text)
  returns table (
    group_id uuid,
    title text,
    current_member_count bigint
  )
  language sql
  stable
  security definer
  set search_path = public
  as $$
  select g.id, g.name, count(gm.id)::bigint
    from public.groups g
      left join public.group_members gm on gm.group_id = g.id
  where upper(trim(g.invite_code)) = upper(trim(coalesce(p_invite_code, '')))
  group by g.id, g.name;

$$;

revoke execute on function public.lookup_group_by_invite (text)
from public;

grant execute on function public.lookup_group_by_invite (text)
to authenticated;

-- regenerar código: apenas owner (PRD §10 item 6)
create or replace function public.groups_invite_guard ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  if new.invite_code is distinct from old.invite_code then
    if not exists (
      select
        1
      from public.group_members gm
      where gm.group_id = new.id
        and gm.user_id = auth.uid ()
        and gm.role = 'owner'
    ) then
      raise exception 'Only the group owner can change invite_code';

    end if;
  end if;
  return new;
end;

$$;

create trigger groups_invite_guard_trg before update on public.groups for each row when (old.invite_code is distinct from new.invite_code)
execute function public.groups_invite_guard ();

-- ── Profile row on signup ────────────────────────────────────────────────────────
create or replace function public.handle_new_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce (nullif (trim(new.raw_user_meta_data ->> 'name'), ''),
        ''))
  on conflict (id) do nothing;
  return new;
end;

$$;

create trigger on_auth_user_created_trg after insert on auth.users for each row
execute function public.handle_new_user ();

-- ── RLS helpers ─────────────────────────────────────────────────────────────────────
create or replace function public.is_group_member (p_group_id uuid)
  returns boolean
  language sql
  stable security definer
  set search_path = public
  as $$
  select exists (
    select
      1
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = auth.uid ()
  );

$$;

revoke all on function public.is_group_member (uuid)
from public;

grant execute on function public.is_group_member (uuid)
to authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

alter table public.groups enable row level security;

alter table public.group_members enable row level security;

alter table public.months enable row level security;

alter table public.bills enable row level security;

create policy profiles_select_self on public.profiles for select using (id = auth.uid ()
);

create policy profiles_select_peers on public.profiles for select using (
    exists (
      select
        1 from public.group_members gs join public.group_members gp on gp.group_id =
          gs.group_id
          and gp.user_id = profiles.id
        where
          gs.user_id = auth.uid ()
    ));

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid ()) with check (id = auth.uid ());

create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid ()
);

create policy groups_select_members on public.groups for select using (
  public.is_group_member (groups.id)
);

create policy groups_insert_creator on public.groups for insert with check (
  auth.uid ()
  is not null
    and created_by = auth.uid ()
);

create policy groups_update_members on public.groups
  for update using (public.is_group_member (groups.id));

create policy groups_delete_creator on public.groups for delete using (
  created_by = auth.uid ()
);

create policy gm_select on public.group_members for select using (
    public.is_group_member (group_members.group_id));

create policy gm_insert_self on public.group_members for insert with check (
  user_id = auth.uid ()
  and exists (
    select 1 from public.groups g where g.id = group_members.group_id
  ));

create policy gm_delete_self on public.group_members for delete using (
  user_id = auth.uid ()
);

create policy months_select on public.months for select using (
  (
    group_id is null
    and user_id = auth.uid ()
  )
  or (
    group_id is not null
      and public.is_group_member (group_id)
    )
);

create policy months_insert on public.months for insert with check (
  (
    group_id is null
    and user_id = auth.uid ()
  )
  or (
    group_id is not null
      and public.is_group_member (group_id)
    )
);

create policy months_update on public.months
  for update using (
    (
      group_id is null
      and user_id = auth.uid ()
    )
    or (
      group_id is not null
        and public.is_group_member (group_id)
      )
  );

create policy months_delete on public.months for delete using (
  (
    group_id is null
    and user_id = auth.uid ()
  )
  or (
    group_id is not null
      and public.is_group_member (group_id)
    )
);

create policy bills_select_active on public.bills for select using (
    deleted_at is null
      and (
        (
          group_id is null
          and user_id = auth.uid ()
        )
        or (
          group_id is not null
            and public.is_group_member (group_id)
          )
      ));

create policy bills_insert on public.bills for insert with check (
    (
      group_id is null
      and user_id = auth.uid ()
    )
    or (
      group_id is not null
        and public.is_group_member (group_id)
      )
);

create policy bills_update_active on public.bills for update using (
      deleted_at is null
      and (
        (
          group_id is null
          and user_id = auth.uid ()
        )
        or (
          group_id is not null
            and public.is_group_member (group_id)
          )
      ));

create policy bills_delete on public.bills for delete using (
      (
        group_id is null
        and user_id = auth.uid ()
      )
      or (
        group_id is not null
          and public.is_group_member (group_id)
      ));

-- ── Realtime (habilitação separada também em docs/task.md) ─────────────────────────
alter publication supabase_realtime add table public.bills;

alter publication supabase_realtime add table public.months;

alter publication supabase_realtime add table public.group_members;

commit;

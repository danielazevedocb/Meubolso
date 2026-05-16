-- RLS patches: gated group join via invite code, attributable rows only for
-- actual group members, soft-delete on bills via UPDATE, idempotent realtime.
--
-- Motivation: gm_insert_self allowed inserting (group_id, auth.uid()) for any
-- existing group UUID without proving invite membership (security.md / backend rules).

begin;

-- ── Auto-own: creator becomes owner (client must not INSERT duplicate membership) ─
create or replace function public.groups_after_insert_add_owner ()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  insert into public.group_members (group_id, user_id, role)
    values (new.id, new.created_by, 'owner');

  return new;
end;

$$;

drop trigger if exists groups_after_insert_add_owner_trg on public.groups;

create trigger groups_after_insert_add_owner_trg
  after insert on public.groups
  for each row
  execute function public.groups_after_insert_add_owner ();

-- ── Join with invite validation (SECURITY DEFINER bypasses membership RLS insert) ─
create or replace function public.join_group_by_invite (p_invite_code text)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
  as $$
declare
  v_group_id uuid;
begin
  if auth.uid () is null then
    raise exception 'Authentication required';

  end if;

  select
    g.id into v_group_id
  from
    public.groups g
  where
    upper(trim(g.invite_code)) = upper(trim(coalesce(p_invite_code, '')));

  if v_group_id is null then
    raise exception 'Invalid or unknown invite code';

  end if;

  if exists (
    select
      1
    from
      public.group_members gm
    where
      gm.group_id = v_group_id
      and gm.user_id = auth.uid ()) then
    return v_group_id;

  end if;

  insert into public.group_members (group_id, user_id, role)
    values (v_group_id, auth.uid (), 'member');

  return v_group_id;
end;

$$;

revoke all on function public.join_group_by_invite (text)
  from public;

grant execute on function public.join_group_by_invite (text)
  to authenticated;

comment on function public.join_group_by_invite (text) is
  'Joins auth user to a group when invite_code matches (replaces unrestricted INSERT policies). Returns group id.';

-- ── Restrict direct INSERT on group_members ──────────────────────────────────────
drop policy if exists gm_insert_self on public.group_members;

revoke insert on table public.group_members
  from
    anon,
    authenticated;

-- ── Months: attributable user must belong to same group ────────────────────────────
drop policy if exists months_insert on public.months;

drop policy if exists months_update on public.months;

drop policy if exists months_delete on public.months;

create policy months_insert on public.months for insert
  with check ((
      group_id is null
      and user_id = auth.uid ()
)
    or (
      group_id is not null
        and public.is_group_member (group_id)
          and exists (
            select
              1
            from
              public.group_members gm
            where
              gm.group_id = months.group_id
              and gm.user_id = months.user_id)));

create policy months_update on public.months
  for update using ((
      group_id is null
      and user_id = auth.uid ()
)
    or (
      group_id is not null
        and public.is_group_member (group_id)
          and exists (
            select
              1
            from
              public.group_members gm
            where
              gm.group_id = months.group_id
              and gm.user_id = months.user_id)))
      with check ((
          group_id is null
          and user_id = auth.uid ()
)
        or (
          group_id is not null
            and public.is_group_member (group_id)
              and exists (
                select
                  1
                from
                  public.group_members gm
                where
                  gm.group_id = months.group_id
                  and gm.user_id = months.user_id)));

create policy months_delete on public.months for delete using ((
      group_id is null
      and user_id = auth.uid ()
)
    or (
      group_id is not null
        and public.is_group_member (group_id)
          and exists (
            select
              1
            from
              public.group_members gm
            where
              gm.group_id = months.group_id
              and gm.user_id = months.user_id)));

-- ── Bills: same attribution rule; allow soft-delete (WITH CHECK sans deleted_at) ────
drop policy if exists bills_insert on public.bills;

drop policy if exists bills_update_active on public.bills;

drop policy if exists bills_delete on public.bills;

create policy bills_insert on public.bills for insert
  with check ((
      group_id is null
      and user_id = auth.uid ()
)
    or (
      group_id is not null
        and public.is_group_member (group_id)
          and exists (
            select
              1
            from
              public.group_members gm
            where
              gm.group_id = bills.group_id
              and gm.user_id = bills.user_id)));

create policy bills_update_active on public.bills
  for update using (deleted_at is null
    and (
      (
        group_id is null
        and user_id = auth.uid ()
      )
      or (
        group_id is not null
          and public.is_group_member (group_id)
            and exists (
              select
                1
              from
                public.group_members gm
              where
                gm.group_id = bills.group_id
                and gm.user_id = bills.user_id))))
        with check ((
            group_id is null
            and user_id = auth.uid ()
          )
          or (
            group_id is not null
              and public.is_group_member (group_id)
                and exists (
                  select
                    1
                  from
                    public.group_members gm
                  where
                    gm.group_id = bills.group_id
                    and gm.user_id = bills.user_id)));

create policy bills_delete on public.bills for delete using ((
      group_id is null
      and user_id = auth.uid ()
)
    or (
      group_id is not null
        and public.is_group_member (group_id)
          and exists (
            select
              1
            from
              public.group_members gm
            where
              gm.group_id = bills.group_id
              and gm.user_id = bills.user_id)));

-- ── Realtime: idempotent add to publication ────────────────────────────────────────
do $$
begin
  if not exists (
    select
      1
    from
      pg_publication_tables
    where
      pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bills') then
    alter publication supabase_realtime add table public.bills;

  end if;

end;
$$;

do $$
begin
  if not exists (
    select
      1
    from
      pg_publication_tables
    where
      pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'months') then
    alter publication supabase_realtime add table public.months;

  end if;

end;
$$;

do $$
begin
  if not exists (
    select
      1
    from
      pg_publication_tables
    where
      pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_members') then
    alter publication supabase_realtime add table public.group_members;

  end if;

end;
$$;

commit;

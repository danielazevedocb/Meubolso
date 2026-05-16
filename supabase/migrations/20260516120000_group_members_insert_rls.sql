-- group_members: RLS policies for inserts that must work after tightening join security.
--
-- Context: 20260515174500 revoked INSERT on group_members from authenticated and dropped
-- gm_insert_self. The AFTER INSERT trigger groups_after_insert_add_owner still inserts the
-- owner row, but RLS evaluates policies for the session user (not the definer), so without a
-- matching policy the insert is denied and group creation fails.
--
-- Direct INSERT remains revoked for role `authenticated`; only SECURITY DEFINER paths and
-- policies below allow rows. Join stays validated inside join_group_by_invite().

begin;

-- Owner row created by trigger after groups insert (same user as groups.created_by).
create policy gm_insert_owner_row_for_creator on public.group_members
  for insert
  with check (
    role = 'owner'::public.group_member_role
    and user_id = auth.uid()
    and exists (
      select
        1
      from
        public.groups g
      where
        g.id = group_members.group_id
        and g.created_by = auth.uid ()
    )
  );

-- join_group_by_invite() inserts (group_id, auth.uid(), 'member'); validate invite in RPC.
create policy gm_insert_member_self on public.group_members
  for insert
  with check (
    role = 'member'::public.group_member_role
    and user_id = auth.uid()
  );

commit;

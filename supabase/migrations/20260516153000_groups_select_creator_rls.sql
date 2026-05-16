-- Allow creators to SELECT their group row even before they appear in group_members.
--
-- PostgREST `Prefer: return=representation` (used when chaining `.insert().select()`)
-- runs SELECT/RETURNING checks in a window where the AFTER INSERT trigger that adds
-- the owner to `group_members` may not yet satisfy `is_group_member`, causing 42501.
-- This policy also supports any client that legitimately needs the row right after insert.

begin;

create policy groups_select_creator on public.groups for select using (created_by = auth.uid ());

commit;

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type InviteLookupRow = {
  group_id: string;
  title: string;
  current_member_count: number;
};

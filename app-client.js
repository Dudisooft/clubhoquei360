// Public project identifier only. Authorization is enforced by PostgreSQL RLS
// and authenticated command functions; no service key belongs in this module.
export const db=window.supabase.createClient('https://oevprbchlhyglhvopnvy.supabase.co','sb_publishable_ZUDvghEdg8XzhfvscOMCfw_FH3GFvh5');

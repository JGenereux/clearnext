export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  slack_user_id: string | null;
  providers: ('google' | 'slack')[];
}

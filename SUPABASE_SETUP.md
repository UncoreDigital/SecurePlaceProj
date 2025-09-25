# Supabase Database Setup Guide

## Prerequisites
- Supabase account (free tier available)
- Node.js and npm/pnpm installed
- Your project dependencies already installed

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in with your GitHub, Google, or email account
3. Click "New Project"
4. Choose your organization or create one
5. Fill in project details:
   - **Name**: `secure-place-app` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
6. Click "Create new project"
7. Wait for the project to be created (usually 1-2 minutes)

## Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)
   - **Service Role Key** (optional, for server-side operations)

## Step 3: Configure Environment Variables

Create a `.env.local` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Replace the placeholder values with your actual credentials.

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-schema.sql` into the editor
3. Click "Run" to execute the schema creation
4. Verify that all tables were created successfully

## Step 5: Configure Row Level Security

1. In the **SQL Editor**, copy and paste the contents of `supabase-rls-policies.sql`
2. Click "Run" to execute the RLS policies
3. Verify that RLS is enabled on all tables

## Step 6: Test Your Connection

1. Add the test component to any page:
   ```tsx
   import SupabaseTest from "@/components/SupabaseTest";
   
   // In your component
   <SupabaseTest />
   ```

2. Run your development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. Check if the connection test shows "✅ Connected Successfully"

## Step 7: Set Up Authentication (Optional)

If you want to use Supabase Auth:

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Configure your site URL (e.g., `http://localhost:3000` for development)
3. Set up email templates if needed
4. Configure OAuth providers if desired

## Database Schema Overview

Your database includes the following tables:

- **firms**: Company/organization information
- **user_profiles**: User information linked to Supabase auth
- **locations**: Physical locations for each firm
- **safety_classes**: Safety training classes
- **scheduled_classes**: Scheduled instances of safety classes
- **class_participants**: Users enrolled in scheduled classes
- **emergencies**: Emergency reports and incidents
- **drills**: Safety drills and exercises
- **drill_participants**: Users participating in drills

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Role-based access control**:
  - Super Admin: Full access to all data
  - Firm Admin: Access to their firm's data only
  - Employee: Limited access to their firm's data
- **Automatic timestamps** with triggers
- **Data validation** with constraints

## Next Steps

1. Create your first firm in the database
2. Set up user registration and authentication
3. Start building your application features
4. Test the RLS policies with different user roles

## Troubleshooting

### Connection Issues
- Verify your environment variables are correct
- Check that your Supabase project is active
- Ensure your site URL is configured in Supabase settings

### Permission Issues
- Verify RLS policies are applied correctly
- Check user roles in the user_profiles table
- Ensure users are properly authenticated

### Schema Issues
- Check the SQL Editor for any error messages
- Verify all tables were created successfully
- Check that foreign key relationships are correct

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)

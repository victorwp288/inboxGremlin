# Supabase Authentication Setup

This guide will help you set up Supabase authentication with Google OAuth for your InboxGremlin application.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new account or sign in
2. Create a new project
3. Wait for the project to be set up (this usually takes 2-3 minutes)

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIs...`)

## 3. Set Up Environment Variables

Create a `.env.local` file in your project root and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the placeholder values with your actual Supabase credentials.

## 4. Configure Google OAuth

1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** in the list and click **Configure**
3. Enable the Google provider
4. You'll need to set up Google OAuth credentials:

### Setting up Google OAuth:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - Google+ API (for basic OAuth)
   - Gmail API (for reading emails)
4. Go to **Credentials** > **Create Credentials** > **OAuth client ID**
5. Choose **Web application** as the application type
6. Add authorized redirect URIs:

   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://your-domain.com/auth/callback`
   - **Important**: Also add your Supabase auth callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`


## 5. Configure Site URL and Redirect URLs

1. In Supabase dashboard, go to **Authentication** > **URL Configuration**
2. Set your **Site URL**:
   - For development: `http://localhost:3000`
   - For production: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://your-domain.com/auth/callback` (for production)

## 6. Test the Authentication

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Try signing up with Google OAuth
4. Check the Supabase dashboard under **Authentication** > **Users** to see if users are being created

## 7. Gmail API Setup

The app automatically requests Gmail read-only permissions during Google OAuth. When users sign in with Google, they'll be asked to grant permission to:

- View your email messages and settings
- View your Gmail labels

The app uses these permissions to:

- Fetch recent emails for display
- Get email count statistics (total and unread)
- Display email subjects, senders, and previews

**Important**: The app only requests **read-only** access and never modifies or deletes emails.

## 8. Additional Configuration (Optional)

### Email Templates

You can customize the email templates in **Authentication** > **Email Templates**

### User Metadata

The app stores additional user information in the `user_metadata` field:

- `first_name`
- `last_name`
- `full_name`
- `avatar_url` (from Google)

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URL"**: Make sure your redirect URLs match exactly in both Google Console and Supabase
2. **"Site URL not configured"**: Ensure your site URL is set in Supabase settings
3. **Google OAuth not working**: Verify that the Google+ API is enabled and your OAuth credentials are correct

### Development vs Production:

- Remember to update environment variables for production
- Add production URLs to both Google Console and Supabase
- Test authentication in production environment

## Security Notes

- Never commit your `.env.local` file to version control
- Use different Supabase projects for development and production
- Regularly rotate your API keys
- Monitor authentication logs in the Supabase dashboard

## Features Implemented

✅ Email/Password authentication  
✅ Google OAuth integration  
✅ Gmail API integration  
✅ Real email fetching and display  
✅ Protected routes (middleware)  
✅ User session management  
✅ Automatic redirects  
✅ Sign out functionality  
✅ User profile display  
✅ Email count statistics  
✅ Read/unread status detection

## Next Steps

After setting up authentication, you can:

1. Add more OAuth providers (GitHub, Discord, etc.)
2. Implement password reset functionality
3. Add email verification requirements
4. Set up user roles and permissions
5. Implement user profile management

# Email Service Setup Guide

## Overview
The email service automatically sends welcome emails with login credentials to newly created employees.

## Configuration

### 1. Environment Variables
Add these to your `.env.local` file:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Gmail Setup (Recommended)

**IMPORTANT**: You must use an App Password, not your regular Gmail password.

#### Step-by-step Gmail setup:

1. **Enable 2-Factor Authentication** (required for App Passwords):
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click "2-Step Verification" and follow the setup

2. **Generate App Password**:
   - Still in [Google Account Security](https://myaccount.google.com/security)
   - Click "2-Step Verification"
   - Scroll down and click "App passwords"
   - Select "Mail" or "Other (Custom name)"
   - Copy the 16-character password (format: `abcd efgh ijkl mnop`)

3. **Update `.env.local`**:
   ```env
   SMTP_USER=your-actual-gmail@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop
   ```

#### Common Gmail Issues:
- **"Application-specific password required"** → Use App Password, not regular password
- **"Invalid login"** → Double-check the App Password is correct
- **"Less secure app access"** → Not needed when using App Passwords

### 3. Other Email Providers
Update `SMTP_HOST` and `SMTP_PORT` for other providers:
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's settings

## Features

### Automatic Password Generation
- 12-character secure passwords
- Includes uppercase, lowercase, numbers, and special characters
- Randomly shuffled for security

### Welcome Email Template
- Professional HTML email design
- Includes login credentials
- Security reminders
- Branded with firm name
- Direct login link

### Error Handling
- Graceful fallback if email fails
- Employee creation still succeeds
- Detailed logging for debugging
- Configuration validation

## Usage

When creating a new employee through the admin panel:
1. Employee account is created in Supabase
2. Secure password is generated
3. Welcome email is sent automatically
4. Employee receives credentials via email

## Testing

To test email functionality:
1. Configure SMTP settings in `.env.local`
2. Create a test employee
3. Check console logs for email status
4. Verify email delivery

## Troubleshooting

### Email Not Sending
- Check SMTP credentials
- Verify environment variables
- Check console logs for errors
- Ensure firewall allows SMTP traffic

### Gmail Issues
- Use App Password, not regular password
- Enable "Less secure app access" if needed
- Check Gmail security settings

### Email in Spam
- Configure SPF/DKIM records
- Use professional email address
- Avoid spam trigger words

## Security Notes

- Passwords are logged to console (remove in production)
- Use environment variables for credentials
- Consider using email service providers (SendGrid, etc.)
- Implement rate limiting for production use
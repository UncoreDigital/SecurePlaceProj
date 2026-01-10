# Production Email Service Setup

## Issues with Deployed Code

The email service works locally but fails in production due to environment variable and configuration issues.

## Common Deployment Problems

### 1. Environment Variables Not Set
- **Problem**: Deployment platforms don't automatically read `.env` files
- **Solution**: Set environment variables in your deployment platform's dashboard

### 2. Wrong App URL
- **Problem**: `NEXT_PUBLIC_APP_URL=http://localhost:3000` doesn't work in production
- **Solution**: Set to your actual domain

### 3. Missing SMTP Configuration
- **Problem**: SMTP variables not available in production environment
- **Solution**: Configure all SMTP variables in deployment platform

## Platform-Specific Setup

### Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=neha.uncoredigital@gmail.com
SMTP_PASSWORD=ytgl ognd hgxo iufp
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Netlify Deployment
1. Go to Site settings → Environment variables
2. Add the same variables as above

### Railway/Render/Other Platforms
1. Find Environment Variables or Config Vars section
2. Add the same SMTP configuration

## Security Best Practices

### 1. Use Different Credentials for Production
```env
# Production environment
SMTP_USER=production-email@yourdomain.com
SMTP_PASSWORD=production-app-password
```

### 2. Environment-Specific URLs
```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Separate Email Accounts
- Use a dedicated email account for production
- Different from development/testing email

## Debugging Production Issues

### 1. Check Environment Variables
Add this to your email service to debug:

```typescript
console.log('Environment check:', {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD_SET: !!process.env.SMTP_PASSWORD,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL
});
```

### 2. Check Deployment Logs
- Look for email-related errors in deployment logs
- Check if environment variables are loaded

### 3. Test Email Configuration
- Use a simple test endpoint to verify SMTP connection
- Test with a minimal email send

## Alternative Solutions

### 1. Use Email Service Providers
Instead of SMTP, consider:
- **SendGrid**: More reliable for production
- **Mailgun**: Good for transactional emails
- **AWS SES**: Cost-effective for high volume
- **Resend**: Developer-friendly API

### 2. SendGrid Example Configuration
```env
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### 3. Resend Example Configuration
```env
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
```

## Quick Fix for Current Setup

1. **Update your deployment platform** with these environment variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=neha.uncoredigital@gmail.com
   SMTP_PASSWORD=ytgl ognd hgxo iufp
   NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
   ```

2. **Redeploy** your application after setting environment variables

3. **Test** by creating a new employee and checking logs

## Verification Steps

1. Check deployment platform environment variables are set
2. Verify the app URL is correct for your domain
3. Test email functionality after deployment
4. Monitor logs for any SMTP connection errors
5. Confirm emails are being delivered (check spam folder)

## Troubleshooting

### "Environment variables not found"
- Ensure variables are set in deployment platform, not just `.env` files
- Redeploy after setting environment variables

### "SMTP connection failed"
- Verify Gmail App Password is correct
- Check if deployment platform allows SMTP connections
- Some platforms block port 587 - try port 465 with SSL

### "Emails not delivered"
- Check spam/junk folders
- Verify sender email reputation
- Consider using a dedicated email service provider
// Email service for sending employee credentials
import nodemailer from 'nodemailer';

// Email configuration - you'll need to set these environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email
    pass: process.env.SMTP_PASSWORD, // Your email password or app password
  },
};

// Debug environment variables (remove in production)
if (process.env.NODE_ENV !== 'production') {
  console.log('📧 Email service configuration:', {
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    user: process.env.SMTP_USER,
    passwordSet: !!process.env.SMTP_PASSWORD,
    appUrl: process.env.NEXT_PUBLIC_APP_URL
  });
}

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport(EMAIL_CONFIG);
};

/**
 * Generate a secure random password
 */
export function generateSecurePassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special char
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Send welcome email with login credentials to new employee
 */
export async function sendEmployeeWelcomeEmail({
  employeeName,
  employeeEmail,
  password,
  firmName = "Your Organization",
  loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.com"
}: {
  employeeName: string;
  employeeEmail: string;
  password: string;
  firmName?: string;
  loginUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  
  try {
    // Environment validation
    const isProduction = process.env.NODE_ENV === 'production';
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
      console.error('❌ Email configuration error:', errorMsg);
      
      if (isProduction) {
        console.error('🚨 Production deployment missing email configuration!');
        console.error('💡 Set these environment variables in your deployment platform:');
        missingVars.forEach(varName => {
          console.error(`   ${varName}=your-value`);
        });
      } else {
        console.error('💡 Add these to your .env.local file:');
        console.error('   SMTP_HOST=smtp.gmail.com');
        console.error('   SMTP_PORT=587');
        console.error('   SMTP_USER=your-email@gmail.com');
        console.error('   SMTP_PASSWORD=your-app-password');
      }
      
      return { 
        success: false, 
        error: `Email configuration incomplete. ${errorMsg}` 
      };
    }

    // Validate app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || appUrl.includes('localhost')) {
      if (isProduction) {
        console.warn('⚠️ Production app URL not set or still using localhost');
        console.warn('💡 Set NEXT_PUBLIC_APP_URL to your actual domain in deployment platform');
      }
    }

    console.log(`📧 Attempting to send email in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    console.log('📧 Email config:', {
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      user: process.env.SMTP_USER,
      passwordSet: !!process.env.SMTP_PASSWORD,
      appUrl: appUrl
    });

    const transporter = createTransporter();

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError: any) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      
      // Provide specific guidance for common errors
      if (verifyError.code === 'EAUTH') {
        return {
          success: false,
          error: 'Gmail authentication failed. Please use an App Password instead of your regular password. See: https://support.google.com/accounts/answer/185833'
        };
      }
      
      return {
        success: false,
        error: `SMTP connection failed: ${verifyError.message}`
      };
    }

    // Email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${firmName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${firmName}!</h1>
          </div>
          <div class="content">
            <h2>Hello ${employeeName},</h2>
            <p>Welcome to our team! Your employee account has been created successfully.</p>
            
            <div class="credentials">
              <h3>🔐 Your Login Credentials</h3>
              <p><strong>Email:</strong> ${employeeEmail}</p>
              <p><strong>Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <ul>
                <li>Please change your password after your first login</li>
                <li>Keep your credentials secure and don't share them</li>
                <li>Contact IT support if you have any login issues</li>
              </ul>
            </div>

            <p>Click the button below to access your account:</p>
            <a href="${loginUrl}" class="button">Login to Your Account</a>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

            <p>Best regards,<br>
            The ${firmName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you didn't expect this email, please contact our support team immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Welcome to ${firmName}!

Hello ${employeeName},

Welcome to our team! Your employee account has been created successfully.

Your Login Credentials:
Email: ${employeeEmail}
Password: ${password}

Important Security Notice:
- Please change your password after your first login
- Keep your credentials secure and don't share them
- Contact IT support if you have any login issues

Login URL: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The ${firmName} Team

---
This is an automated message. Please do not reply to this email.
If you didn't expect this email, please contact our support team immediately.
    `;

    // Send email
    const mailOptions = {
      from: `"${firmName}" <${process.env.SMTP_USER}>`,
      to: employeeEmail,
      subject: `Welcome to ${firmName} - Your Account Details`,
      text: textContent,
      html: htmlContent,
    };

    console.log('📤 Sending email to:', employeeEmail);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Welcome email sent successfully:', {
      messageId: info.messageId,
      to: employeeEmail,
      accepted: info.accepted
    });

    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to send welcome email:', error);
    
    // Provide helpful error messages
    let errorMessage = error.message || 'Failed to send email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please use an App Password instead of your regular Gmail password.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'SMTP server not found. Please check your SMTP_HOST setting.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Please check your SMTP_HOST and SMTP_PORT settings.';
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Send password reset email to employee
 */
export async function sendPasswordResetEmail({
  employeeName,
  employeeEmail,
  newPassword,
  firmName = "Your Organization"
}: {
  employeeName: string;
  employeeEmail: string;
  newPassword: string;
  firmName?: string;
}): Promise<{ success: boolean; error?: string }> {
  
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return { 
        success: false, 
        error: 'Email configuration not set up' 
      };
    }

    const transporter = createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - ${firmName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${employeeName},</h2>
            <p>Your password has been reset by an administrator.</p>
            
            <div class="credentials">
              <h3>🔐 Your New Login Credentials</h3>
              <p><strong>Email:</strong> ${employeeEmail}</p>
              <p><strong>New Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${newPassword}</code></p>
            </div>

            <p><strong>⚠️ Please change this password immediately after logging in for security purposes.</strong></p>

            <p>Best regards,<br>
            The ${firmName} Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${firmName}" <${process.env.SMTP_USER}>`,
      to: employeeEmail,
      subject: `Password Reset - ${firmName}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
}
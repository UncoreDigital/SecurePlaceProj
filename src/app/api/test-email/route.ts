import { NextRequest, NextResponse } from 'next/server';
import { sendEmployeeWelcomeEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with special header
    const isDev = process.env.NODE_ENV !== 'production';
    const testHeader = request.headers.get('x-test-email');
    
    if (!isDev && testHeader !== 'allow-test') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'testEmail is required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing email service...');
    
    // Test email configuration
    const result = await sendEmployeeWelcomeEmail({
      employeeName: 'Test Employee',
      employeeEmail: testEmail,
      password: 'TestPassword123!',
      firmName: 'Test Company',
      loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    });

    return NextResponse.json({
      success: result.success,
      error: result.error,
      environment: process.env.NODE_ENV,
      config: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER,
        smtpPasswordSet: !!process.env.SMTP_PASSWORD,
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      }
    });

  } catch (error: any) {
    console.error('❌ Test email error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint',
    usage: 'POST with { "testEmail": "your-email@example.com" }',
    environment: process.env.NODE_ENV,
    configStatus: {
      smtpHost: !!process.env.SMTP_HOST,
      smtpPort: !!process.env.SMTP_PORT,
      smtpUser: !!process.env.SMTP_USER,
      smtpPassword: !!process.env.SMTP_PASSWORD,
      appUrl: !!process.env.NEXT_PUBLIC_APP_URL
    }
  });
}
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_js_1 = require("../../config/env.js");
class EmailService {
    static transporter = null;
    static getTransporter() {
        if (this.transporter)
            return this.transporter;
        if (env_js_1.env.SMTP_HOST && env_js_1.env.SMTP_USER && env_js_1.env.SMTP_PASS) {
            try {
                this.transporter = nodemailer_1.default.createTransport({
                    host: env_js_1.env.SMTP_HOST,
                    port: env_js_1.env.SMTP_PORT,
                    secure: env_js_1.env.SMTP_SECURE,
                    auth: {
                        user: env_js_1.env.SMTP_USER,
                        pass: env_js_1.env.SMTP_PASS,
                    },
                });
                return this.transporter;
            }
            catch (err) {
                console.error('Failed to initialize SMTP transporter:', err);
            }
        }
        return null;
    }
    /**
     * Send a verification email with secure single-use time-limited token
     */
    static async sendVerificationEmail(paramsOrEmail, optionalFullName, optionalToken) {
        const email = typeof paramsOrEmail === 'object' ? paramsOrEmail.to : paramsOrEmail;
        const fullName = typeof paramsOrEmail === 'object' ? paramsOrEmail.name : (optionalFullName || 'Student');
        const token = typeof paramsOrEmail === 'object' ? paramsOrEmail.token : (optionalToken || '');
        const verificationUrl = `${env_js_1.env.APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
        const transporter = this.getTransporter();
        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from: env_js_1.env.EMAIL_FROM,
                    to: email,
                    subject: `${token} is your ConceptTrace AI verification code`,
                    text: `Hello ${fullName},\n\nThank you for registering on ConceptTrace AI.\n\nYour 6-digit verification code is:\n\n${token}\n\nEnter this code on the verification screen to activate your account.\n\nAlternatively, you can verify your account by clicking:\n${verificationUrl}\n\nThis verification code expires in 24 hours.\n\nLearn • Improve • Succeed\nConceptTrace AI Team`,
                    html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #6366f1); color: #ffffff; font-size: 24px;">
                  ✨
                </div>
                <h2 style="color: #0f172a; margin: 12px 0 4px; font-size: 22px;">Verify Your Email Address</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0;">ConceptTrace AI • Learn • Improve • Succeed</p>
              </div>

              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                Hello <strong>${fullName}</strong>,<br/>
                Thank you for creating an account on ConceptTrace AI. Please use the following 6-digit verification code to complete your registration:
              </p>

              <div style="margin: 28px 0; text-align: center;">
                <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #93c5fd; border-radius: 14px; padding: 16px 36px;">
                  <span style="font-family: ui-monospace, Menlo, Monaco, 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1d4ed8;">
                    ${token}
                  </span>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-top: 8px;">
                  This single-use code is valid for 24 hours.
                </p>
              </div>

              <div style="margin: 24px 0; text-align: center;">
                <p style="color: #64748b; font-size: 13px; margin-bottom: 12px;">You can also verify automatically by clicking below:</p>
                <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
                If you did not create a ConceptTrace AI account, you can safely ignore this email.
              </p>
            </div>
          `,
                });
                console.log(`[EmailService] Verification email sent via SMTP to ${email} (MessageID: ${info.messageId})`);
                return {
                    success: true,
                    messageId: info.messageId,
                    mode: 'smtp',
                    verificationLink: verificationUrl,
                    token,
                };
            }
            catch (err) {
                console.error(`[EmailService] SMTP send failed for ${email}:`, err.message);
            }
        }
        // Development fallback logger (when SMTP is not configured)
        console.log('\n===============================================================');
        console.log('📧 [EMAIL DISPATCH — 6-DIGIT VERIFICATION CODE]');
        console.log(`To: ${fullName} <${email}>`);
        console.log(`Verification Code (OTP): ${token}`);
        console.log(`Direct Link: ${verificationUrl}`);
        console.log('===============================================================\n');
        return {
            success: true,
            mode: 'development_log',
            verificationLink: verificationUrl,
            token,
        };
    }
    /**
     * Send a password reset email with secure time-limited token
     */
    static async sendPasswordResetEmail(paramsOrEmail, optionalFullName, optionalToken) {
        const email = typeof paramsOrEmail === 'object' ? paramsOrEmail.to : paramsOrEmail;
        const fullName = typeof paramsOrEmail === 'object' ? paramsOrEmail.name : (optionalFullName || 'Student');
        const token = typeof paramsOrEmail === 'object' ? paramsOrEmail.token : (optionalToken || '');
        const resetUrl = `${env_js_1.env.APP_URL}/forgot-password?token=${token}&email=${encodeURIComponent(email)}`;
        const transporter = this.getTransporter();
        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from: env_js_1.env.EMAIL_FROM,
                    to: email,
                    subject: 'Reset your password — ConceptTrace AI',
                    text: `Hello ${fullName},\n\nWe received a request to reset your password on ConceptTrace AI.\n\nPlease reset your password by opening the following link:\n${resetUrl}\n\nThis reset link expires in 1 hour.\n\nConceptTrace AI Team`,
                    html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #0f172a; margin-bottom: 8px;">Reset Your Password 🔒</h2>
              <p style="color: #334155; font-size: 15px; margin-top: 16px;">
                Hello <strong>${fullName}</strong>, we received a request to reset your password for ConceptTrace AI.
              </p>
              <div style="margin: 24px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
                  Set New Password
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                Or copy and paste this URL into your browser:<br/>
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                This link expires in 1 hour and can only be used once. If you did not request a password reset, you can safely ignore this email.
              </p>
            </div>
          `,
                });
                console.log(`[EmailService] Password reset email sent via SMTP to ${email} (MessageID: ${info.messageId})`);
                return {
                    success: true,
                    messageId: info.messageId,
                    mode: 'smtp',
                    verificationLink: resetUrl,
                    token,
                };
            }
            catch (err) {
                console.error(`[EmailService] SMTP send failed for ${email}:`, err.message);
            }
        }
        // Development fallback logger (when SMTP is not configured)
        console.log('\n===============================================================');
        console.log('🔑 [DEVELOPMENT PASSWORD RESET DISPATCH]');
        console.log(`To: ${fullName} <${email}>`);
        console.log('Subject: Reset your password — ConceptTrace AI');
        console.log(`Reset Token: ${token}`);
        console.log(`Reset Link: ${resetUrl}`);
        console.log('===============================================================\n');
        return {
            success: true,
            mode: 'development_log',
            verificationLink: resetUrl,
            token,
        };
    }
}
exports.EmailService = EmailService;
exports.emailService = EmailService;

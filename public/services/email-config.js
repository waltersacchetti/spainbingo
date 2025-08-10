// Configuración de servicios de email
module.exports = {
    // SendGrid Configuration (Principal)
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@info.bingoroyal.es',
        fromName: process.env.SENDGRID_FROM_NAME || 'BingoRoyal',
        templateId: process.env.SENDGRID_TEMPLATE_ID || 'd-verification-template-id'
    },

    // Mailgun Configuration (Alternativa)
    mailgun: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN || 'mg.bingoroyal.es',
        fromEmail: process.env.MAILGUN_FROM_EMAIL || 'noreply@mg.bingoroyal.es',
        fromName: process.env.MAILGUN_FROM_NAME || 'BingoRoyal'
    },

    // Gmail Configuration (Nodemailer - Alternativa)
    gmail: {
        user: process.env.GMAIL_USER,
        password: process.env.GMAIL_APP_PASSWORD, // App Password, no contraseña normal
        fromEmail: process.env.GMAIL_FROM_EMAIL || 'noreply@gmail.com',
        fromName: process.env.GMAIL_FROM_NAME || 'BingoRoyal'
    },

    // Resend Configuration (Alternativa moderna)
    resend: {
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@info.bingoroyal.es',
        fromName: process.env.RESEND_FROM_NAME || 'BingoRoyal'
    },

    // Configuración general
    general: {
        service: 'sendgrid', // Servicio principal
        fallbackEnabled: process.env.EMAIL_FALLBACK_ENABLED === 'true',
        maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES) || 3,
        retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY) || 1000
    },

    // Templates de email
    templates: {
        verification: {
            subject: 'Verifica tu cuenta de BingoRoyal',
            html: 'verification-email.html',
            text: 'verification-email.txt'
        },
        welcome: {
            subject: '¡Bienvenido a BingoRoyal!',
            html: 'welcome-email.html',
            text: 'welcome-email.txt'
        },
        passwordReset: {
            subject: 'Restablece tu contraseña de BingoRoyal',
            html: 'password-reset-email.html',
            text: 'password-reset-email.txt'
        }
    }
}; 
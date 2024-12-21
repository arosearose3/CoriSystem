import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Email service routine
const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host: 'email7412.luxsci.com',
        port: 587,
        secure: false,
        auth: {
            user: 'andrewroselpc@elig.pro',
            pass: process.env.LUXSCIPW
        }
    });

    const mailOptions = {
        from: 'andrewroselpc@elig.pro',
        to,
        subject,
        html,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    };

    return transporter.sendMail(mailOptions);
};

// Endpoint for consent requests
router.post('/consent-request', async (req, res) => {
    try {
        const { to, subject, body, taskId } = req.body;
        const { approveUrl, rejectUrl } = req.body.responseUrls;

        const emailContent = `
            ${body}

            Please respond to this request:

            Approve: ${approveUrl}
            Reject: ${rejectUrl}
        `;

        await sendEmail({
            to,
            subject,
            html: emailContent
        });

        res.status(200).json({
            message: 'Consent request email sent successfully',
            taskId
        });
    } catch (error) {
        console.error('Failed to send consent request:', error);
        res.status(500).json({
            error: 'Failed to send consent request email',
            details: error.message
        });
    }
});

// General email sending endpoint
router.post('/create', async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        await sendEmail({ to, subject, html });
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        await sendEmail({ to, subject, html });
        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import nodemailer from 'nodemailer';
import xlsx from 'xlsx';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const router = express.Router();
const metadataFilePath = path.join(__dirname, './exclusionUploadFileData.json');


// Email endpoint
router.post('/create', async (req, res) => {
  const { to, subject, html } = req.body;
  
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
  
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});
  
// Email endpoint
router.post('/', async (req, res) => {
  const { to, subject, html } = req.body;

 
  
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
  
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});


  export default router;

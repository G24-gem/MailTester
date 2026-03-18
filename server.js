require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require("path")

const app = express();
app.use(cors());
app.use(express.json());

// Configure transporter (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Health route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
//   res.send('Email API is running 🚀');
});

// Send email route
app.post('/send-email', async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const info = await transporter.sendMail({
      from: `"My App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    res.status(200).json({ message: 'Email sent successfully', info });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending email', error });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

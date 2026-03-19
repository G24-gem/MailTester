require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const session = require('express-session');

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'mailtester-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // e.g. https://your-app.onrender.com/auth/callback
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'email', 'profile'];

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Redirect user to Google login
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.redirect(url);
});

// Step 2: Google redirects back here with a code
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;

    // Get user email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    req.session.userEmail = data.email;

    res.redirect('/');
  } catch (error) {
    res.status(500).json({ message: 'Auth failed', error });
  }
});

// Check if user is logged in
app.get('/auth/status', (req, res) => {
  if (req.session.tokens) {
    res.json({ loggedIn: true, email: req.session.userEmail || '' });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Send email route
app.post('/send-email', async (req, res) => {
  if (!req.session.tokens) {
    return res.status(401).json({ message: 'Not authenticated. Please login with Google first.' });
  }

  const { to, subject, html } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    oauth2Client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build the raw email
    const emailLines = [
  `To: ${to}`,
  `Subject: ${subject}`,
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=utf-8',
  '',
  html,
];
    const email = emailLines.join('\n');
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedEmail },
    });

    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending email', error });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
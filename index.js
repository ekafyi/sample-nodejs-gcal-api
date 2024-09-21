import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const app = express();
const port = process.env.PORT;

// ===== GCal data ===== //
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CAL_TZ = "Asia/Jakarta";

const SAMPLE_EVENT = {
  summary: "Sample Event",
  description: `Eiusmod nulla eiusmod occaecat consequat sit eu exercitation nisi.`,
  start: { dateTime: "2024-09-22T19:30:00+07:00", timeZone: CAL_TZ },
  end: { dateTime: "2024-09-22T20:30:00+07:00", timeZone: CAL_TZ },
  colorId: 4,
};
const GCAL_LIST_PARAMS = {
  calendarId: process.env.GCAL_CALENDAR_ID,
  timeMin: new Date().toISOString(),
  maxResults: 10,
  singleEvents: true,
  orderBy: "startTime",
};
// /end GCal data //

// ===== Credentials ===== //
// Use with Oauth2
const oauth2Client = new google.auth.OAuth2(
  process.env.OAUTH2_CREDS_CLIENT_ID,
  process.env.OAUTH2_CREDS_CLIENT_SECRET,
  process.env.OAUTH2_CREDS_REDIRECT_URI
);
// Use with Service Account
const jwtAuth = new google.auth.JWT({
  email: process.env.SERVICE_CREDS_CLIENT_EMAIL,
  key: process.env.SERVICE_CREDS_PRIVATE_KEY,
  scopes: SCOPES,
});
// /end Credentials //

// ===== Middlewares ===== //
const initGcalOauth2 = (req, res, next) => {
  req.calendar = google.calendar({ version: "v3", auth: oauth2Client });
  next();
};
const initGcalSvcAcc = (req, res, next) => {
  req.calendar = google.calendar({ version: "v3", auth: jwtAuth });
  next();
};
// /end Middlewares //

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <p>Go to <a href="http://localhost:${port}/oauth2">Oauth2</a> or <a href="http://localhost:${port}/with-service/events">Service Account</a></p>
      </body>
    </html>
  `);
});

app.get("/oauth2", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  console.log(`http://localhost:${port}/with-oauth2/events`);
  res.send("Authentication successful! Please return to the console.");
});

app.get("/with-oauth2/events", initGcalOauth2, async (req, res) => {
  try {
    const response = await req.calendar.events.list(GCAL_LIST_PARAMS);
    res.json(response.data.items);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.get("/with-oauth2/create-event", initGcalOauth2, async (req, res) => {
  try {
    const response = await req.calendar.events.insert({
      calendarId: process.env.GCAL_CALENDAR_ID,
      auth: oauth2Client,
      resource: SAMPLE_EVENT,
    });
    res.json(response);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.get("/with-service/events", initGcalSvcAcc, async (req, res) => {
  try {
    const response = await req.calendar.events.list(GCAL_LIST_PARAMS);
    res.json(response.data.items);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.get("/with-service/create-event", initGcalSvcAcc, async (req, res) => {
  try {
    const response = await req.calendar.events.insert({
      calendarId: process.env.GCAL_CALENDAR_ID,
      auth: jwtAuth,
      resource: SAMPLE_EVENT,
    });
    res.json(response);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const REVIEWS_FILE = path.join(__dirname, 'reviews.json');
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let reviews = [];
let schedule = {};
let bookings = [];

// Load reviews from file on startup
fs.readFile(REVIEWS_FILE, (err, data) => {
  if (err) {
    if (err.code === 'ENOENT') {
      console.log('reviews.json not found, creating empty array.');
      reviews = [];
    } else {
      console.error('Error reading reviews file:', err);
    }
  } else {
    try {
      reviews = JSON.parse(data);
      console.log('Reviews loaded successfully.');
    } catch (parseErr) {
      console.error('Error parsing reviews JSON:', parseErr);
      reviews = [];
    }
  }
});

// Load schedule from file on startup
fs.readFile(SCHEDULE_FILE, (err, data) => {
  if (err) {
    if (err.code === 'ENOENT') {
      console.log('schedule.json not found, creating default schedule.');
      schedule = {
        maxAdvanceBookingDays: 30,
        weeklySchedule: {
          domingo: [],
          lunes: ["17:00", "17:15", "17:30", "17:45", "18:00"],
          martes: ["17:00", "17:15", "17:30", "17:45", "18:00"],
          miércoles: [],
          jueves: ["17:00", "17:15", "17:30", "17:45", "18:00"],
          viernes: ["17:00", "17:15", "17:30", "17:45", "18:00"],
          sábado: ["10:00", "10:15", "10:30", "10:45", "11:00"]
        },
        closedDates: [],
        closedDaysOfWeek: [],
        annualClosedDates: []
      };
      saveSchedule(); // Save default schedule
      console.log('Default schedule created and saved:', schedule); // Log default schedule
    } else {
      console.error('Error reading schedule file:', err);
    }
  } else {
    try {
      const parsedSchedule = JSON.parse(data);
      schedule = {
        ...parsedSchedule,
        closedDaysOfWeek: parsedSchedule.closedDaysOfWeek || [], // Ensure closedDaysOfWeek is always an array
        annualClosedDates: parsedSchedule.annualClosedDates || [] // Ensure annualClosedDates is always an array
      };
      console.log('Schedule loaded successfully on startup:', schedule); // Log loaded schedule
    } catch (parseErr) {
      console.error('Error parsing schedule JSON:', parseErr);
      schedule = { closedDaysOfWeek: [], annualClosedDates: [] }; // Initialize with empty arrays on parse error
    }
  }
});

// Load bookings from file on startup
fs.readFile(BOOKINGS_FILE, (err, data) => {
  if (err) {
    if (err.code === 'ENOENT') {
      console.log('bookings.json not found, creating empty array.');
      bookings = [];
    } else {
      console.error('Error reading bookings file:', err);
    }
  } else {
    try {
      bookings = JSON.parse(data);
      console.log('Bookings loaded successfully.');
    } catch (parseErr) {
      console.error('Error parsing bookings JSON:', parseErr);
      bookings = [];
    }
  }
});

// Save reviews to file
function saveReviews() {
  fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2), (err) => {
    if (err) {
      console.error('Error writing reviews file:', err);
    } else {
      console.log('Reviews saved successfully.');
    }
  });
}

// Save schedule to file
function saveSchedule() {
  fs.writeFile(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), (err) => {
    if (err) {
      console.error('Error writing schedule file:', err);
    }
  });
}

// Save bookings to file
function saveBookings() {
  fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), (err) => {
    if (err) {
      console.error('Error writing bookings file:', err);
    } else {
      console.log('Bookings saved successfully.');
    }
  });
}

// Function to send booking confirmation email
async function sendBookingConfirmationEmail(bookingDetails) {
    const { name, email, service, date, time } = bookingDetails;

    const mailOptions = {
        from: `"ZM Barbería" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Confirmación de tu reserva en ZM Barbería',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>¡Hola, ${name}!</h2>
                <p>Tu reserva ha sido confirmada con éxito.</p>
                <h3>Detalles de la reserva:</h3>
                <ul>
                    <li><strong>Servicio:</strong> ${service}</li>
                    <li><strong>Día:</strong> ${date}</li>
                    <li><strong>Hora:</strong> ${time}</li>
                </ul>
                <p>Te esperamos en <strong>ZM Barbería</strong>.</p>
                <p><em>Calle Falsa 123, Springfield</em></p>
                <br>
                <p>Si necesitas cancelar o modificar tu cita, por favor, contáctanos.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
}

app.get('/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/reviews', (req, res) => {
  const { name, rating, comment } = req.body;
  reviews.push({ name, rating: parseInt(rating), comment });
  saveReviews(); // Save reviews after adding a new one
  res.status(201).send('Review added');
});

// New endpoint to get schedule
app.get('/schedule', (req, res) => {
  fs.readFile(SCHEDULE_FILE, (err, data) => {
    if (err) {
      console.error('Error reading schedule file:', err);
      return res.status(500).send('Error loading schedule.');
    }
    try {
      const parsedSchedule = JSON.parse(data);
      schedule = {
        ...parsedSchedule,
        closedDaysOfWeek: parsedSchedule.closedDaysOfWeek || [], // Ensure closedDaysOfWeek is always an array
        annualClosedDates: parsedSchedule.annualClosedDates || [] // Ensure annualClosedDates is always an array
      };
      res.json(schedule);
    } catch (parseErr) {
      console.error('Error parsing schedule JSON:', parseErr);
      res.status(500).send('Error parsing schedule.');
    }
  });
});

app.post('/schedule', (req, res) => {
  schedule = req.body;
  saveSchedule();
  res.status(200).send('Schedule updated');
});

// New endpoint to handle bookings
app.post('/book', (req, res) => {
  const { name, email, service, date, time, sendConfirmationEmail } = req.body;

  // Basic validation
  if (!name || !email || !service || !date || !time) {
    return res.status(400).send('Missing required booking information.');
  }

  console.log('Received booking request:', { name, email, service, date, time, sendConfirmationEmail });

  const newBooking = { name, email, service, date, time, bookingDate: new Date().toISOString() };
  bookings.push(newBooking);
  saveBookings();

  // Send confirmation email if requested
  if (sendConfirmationEmail) {
    sendBookingConfirmationEmail(newBooking);
  }

  res.status(201).send('Booking successful!');
});

// New endpoint to get available time slots for a specific date
app.get('/api/available-slots', (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).send('Date parameter is required.');
  }

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
  const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  const formattedMonthDay = `${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  // Check if the day of the week is explicitly closed
  if (schedule.closedDaysOfWeek && schedule.closedDaysOfWeek.includes(dayOfWeek)) {
    return res.json([]); // Return empty array if the day is closed
  }

  // Check if the date is an annual closed date
  if (schedule.annualClosedDates && schedule.annualClosedDates.includes(formattedMonthDay)) {
    return res.json([]); // Return empty array if the date is annually closed
  }

  // Get base schedule for the day
  const baseTimes = schedule.weeklySchedule[dayOfWeek] || [];

  // Filter out already booked times for this specific date
  const bookedTimesForDate = bookings
    .filter(booking => booking.date === formattedDate)
    .map(booking => booking.time);

  const availableTimes = baseTimes.filter(time => !bookedTimesForDate.includes(time));

  res.json(availableTimes);
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const REVIEWS_FILE = path.join(__dirname, 'reviews.json');
const SCHEDULE_FILE = path.join(__dirname, 'schedule.json');
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

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
        closedDates: []
      };
      saveSchedule(); // Save default schedule
    } else {
      console.error('Error reading schedule file:', err);
    }
  } else {
    try {
      schedule = JSON.parse(data);
      console.log('Schedule loaded successfully.');
    } catch (parseErr) {
      console.error('Error parsing schedule JSON:', parseErr);
      schedule = {};
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
    } else {
      console.log('Schedule saved successfully.');
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
  res.json(schedule);
});

app.post('/schedule', (req, res) => {
  schedule = req.body;
  saveSchedule();
  res.status(200).send('Schedule updated');
});

// New endpoint to handle bookings
app.post('/book', (req, res) => {
  const { name, email, service, date, time } = req.body;

  // Basic validation
  if (!name || !email || !service || !date || !time) {
    return res.status(400).send('Missing required booking information.');
  }

  // Check if the time slot is actually available for the given date
  const dayOfWeek = new Date(date).toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
  if (!schedule.weeklySchedule[dayOfWeek] || !schedule.weeklySchedule[dayOfWeek].includes(time)) {
    return res.status(400).send('Selected time slot is not available.');
  }

  // Remove the booked time from the schedule for that specific day
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  // Find the day in weeklySchedule and remove the time
  if (schedule.weeklySchedule[dayOfWeek]) {
    const index = schedule.weeklySchedule[dayOfWeek].indexOf(time);
    if (index > -1) {
      schedule.weeklySchedule[dayOfWeek].splice(index, 1);
    }
  }

  // Also, if it's a specific closed date, we might need to handle that too
  // For simplicity, we're just removing from weeklySchedule for now.

  saveSchedule(); // Save updated schedule

  const newBooking = { name, email, service, date, time, bookingDate: new Date().toISOString() };
  bookings.push(newBooking);
  saveBookings(); // Save new booking

  res.status(201).send('Booking successful!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
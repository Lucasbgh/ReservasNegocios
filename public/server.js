const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let reviews = [];

app.get('/reviews', (req, res) => {
  res.json(reviews);
});

app.post('/reviews', (req, res) => {
  const { name, rating, comment } = req.body;
  reviews.push({ name, rating, comment });
  res.status(201).send('Review added');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
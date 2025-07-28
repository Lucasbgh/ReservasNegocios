const days = [
  new Date('2025-07-27'), // Sunday
  new Date('2025-07-28'), // Monday
  new Date('2025-07-29'), // Tuesday
  new Date('2025-07-30'), // Wednesday
  new Date('2025-07-31'), // Thursday
  new Date('2025-08-01'), // Friday
  new Date('2025-08-02')  // Saturday
];

days.forEach(date => {
  console.log(date.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase());
});
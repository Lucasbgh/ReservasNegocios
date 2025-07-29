document.addEventListener('DOMContentLoaded', function() {
    const reviewForm = document.getElementById('review-form');
    const reviewsContainer = document.getElementById('reviews-container');
    const fadeElems = document.querySelectorAll('.fade-in');

    // Observer para animaciones de fade-in
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElems.forEach(elem => {
        observer.observe(elem);
    });

    // --- Lógica de Reseñas ---

    // Función para cargar las reseñas existentes y calcular la media
    function loadReviews(showAll = false) {
        fetch('/reviews')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                reviewsContainer.innerHTML = ''; // Limpiar contenedor
                let totalRating = 0;
                
                // Calcular totalRating basado en todas las reseñas
                data.forEach(review => {
                    totalRating += parseInt(review.rating);
                });

                // Sort reviews by a hypothetical timestamp or just reverse for recency
                // Assuming reviews are added in chronological order, so reverse to get most recent first
                const sortedReviews = data.slice().reverse(); 

                const reviewsToDisplay = showAll ? sortedReviews : sortedReviews.slice(0, 6);

                reviewsToDisplay.forEach(review => {
                    const reviewElement = document.createElement('div');
                    reviewElement.classList.add('review-card');
                    
                    const stars = Array.from({ length: 5 }, (_, i) => {
                        return `<span>${i < review.rating ? '★' : '☆'}</span>`;
                    }).join('');

                    reviewElement.innerHTML = `
                        <div class="review-header">
                            <h4>${review.name}</h4>
                        </div>
                        <p>"${review.comment}"</p>
                        <div class="star-rating">${stars}</div>
                    `;
                    reviewsContainer.appendChild(reviewElement);
                });

                // Mostrar u ocultar el botón "Mostrar todas las reseñas"
                const showAllReviewsBtn = document.getElementById('show-all-reviews-btn');
                if (sortedReviews.length > 6 && !showAll) {
                    showAllReviewsBtn.style.display = 'block';
                } else {
                    showAllReviewsBtn.style.display = 'none';
                }

                // Calcular y mostrar la media de las estrellas
                const averageRatingElement = document.getElementById('average-rating');
                if (data.length > 0) {
                    const average = (totalRating / data.length).toFixed(1);
                    averageRatingElement.innerHTML = `<p>Valoración media: <strong>${average}</strong> estrellas</p>`;
                } else {
                    averageRatingElement.innerHTML = '<p>Aún no hay reseñas.</p>';
                }
            })
            .catch(error => {
                console.error('Error al cargar las reseñas:', error);
                reviewsContainer.innerHTML = '<p>No se pudieron cargar las reseñas. Inténtalo de nuevo más tarde.</p>';
                document.getElementById('average-rating').innerHTML = '<p>No se pudo calcular la media de las reseñas.</p>';
            });
    }

    // Cargar las reseñas al iniciar la página
    loadReviews();

    // Event listener para el botón "Mostrar todas las reseñas"
    const showAllReviewsBtn = document.getElementById('show-all-reviews-btn');
    if (showAllReviewsBtn) {
        showAllReviewsBtn.addEventListener('click', () => {
            loadReviews(true);
        });
    }

    // Enviar una nueva reseña
    if (reviewForm) {
        const commentInput = document.getElementById('comment');
        const charCountDisplay = document.getElementById('char-count');

        // Update character count on input
        commentInput.addEventListener('input', () => {
            const currentLength = commentInput.value.length;
            charCountDisplay.textContent = `${currentLength}/500`;
        });

        reviewForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const nameInput = document.getElementById('name');
            const ratingInput = document.getElementById('rating');

            const name = nameInput.value;
            const rating = ratingInput.value;
            const comment = commentInput.value;

            fetch('/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, rating, comment })
            })
            .then(response => {
                if (response.ok) {
                    loadReviews();
                    reviewForm.reset();
                    charCountDisplay.textContent = '0/500'; // Reset counter on successful submission
                } else {
                    alert('Hubo un error al enviar tu reseña.');
                }
            })
            .catch(error => {
                console.error('Error al enviar la reseña:', error);
                alert('Hubo un error de conexión al enviar tu reseña.');
            });
        });
    }

    // --- Lógica de Reservas ---
    const bookingForm = document.querySelector('.booking-form');
    const timeSlotsContainer = document.getElementById('time-slots');
    const selectedDateInput = document.getElementById('selected-date-input');
    const selectedTimeInput = document.getElementById('selected-time-input');
    const currentDateSpan = document.getElementById('current-date');
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');

    const bookingModal = document.getElementById('booking-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');

    const modalDate = document.getElementById('modal-date');
    const modalTime = document.getElementById('modal-time');
    const modalService = document.getElementById('modal-service');

    const bookingConfirmationContent = document.getElementById('booking-details-content');
    const bookingSuccessMessage = document.getElementById('booking-success-message');
    const successDate = document.getElementById('success-date');
    const successTime = document.getElementById('success-time');
    const successService = document.getElementById('success-service');

    let currentDisplayedDate = new Date();
    let scheduleConfig = {};

    // Fetch schedule configuration
    fetch('/schedule')
        .then(response => response.json())
        .then(data => {
            scheduleConfig = data;
            console.log('scheduleConfig after fetch:', scheduleConfig); // Log fetched schedule
            updateDateDisplay(); // Initial render after fetching schedule
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            // Fallback to default times if schedule cannot be loaded
            scheduleConfig = {
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
            updateDateDisplay();
        });

    function formatDateForDisplay(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    }

    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function renderTimeSlots() {
        timeSlotsContainer.innerHTML = '';
        selectedTimeInput.value = ''; // Clear selected time

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDisplayedDateOnly = new Date(currentDisplayedDate);
        currentDisplayedDateOnly.setHours(0, 0, 0, 0);

        const formattedDate = formatDateForInput(currentDisplayedDate);
        const dayOfWeek = currentDisplayedDate.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
        const formattedMonthDay = `${String(currentDisplayedDate.getMonth() + 1).padStart(2, '0')}-${String(currentDisplayedDate.getDate()).padStart(2, '0')}`;

        // Check if the day of the week is explicitly closed
        if (scheduleConfig.closedDaysOfWeek && scheduleConfig.closedDaysOfWeek.includes(dayOfWeek)) {
            const message = document.createElement('p');
            message.classList.add('closed-message');
            message.textContent = 'Cerrado este día.'; // Message for explicitly closed days of week
            timeSlotsContainer.appendChild(message);
            return;
        }

        // Check if the specific date is explicitly closed
        const isClosedDate = scheduleConfig.closedDates && scheduleConfig.closedDates.includes(formattedDate);
        if (isClosedDate) {
            const message = document.createElement('p');
            message.classList.add('closed-message');
            message.textContent = 'Cerrado por fecha especial.'; // Message for explicitly closed dates
            timeSlotsContainer.appendChild(message);
            return;
        }

        // Check if the date is an annual closed date
        const isAnnualClosedDate = scheduleConfig.annualClosedDates && scheduleConfig.annualClosedDates.includes(formattedMonthDay);
        if (isAnnualClosedDate) {
            const message = document.createElement('p');
            message.classList.add('closed-message');
            message.textContent = 'Cerrado por fecha especial.'; // Message for annually closed dates
            timeSlotsContainer.appendChild(message);
            return;
        }

        // Fetch available slots from the new API endpoint
        fetch(`/api/available-slots?date=${formattedDate}`)
            .then(response => response.json())
            .then(availableTimesForDay => {
                if (!availableTimesForDay || availableTimesForDay.length === 0) {
                    const message = document.createElement('p');
                    message.classList.add('closed-message');
                    message.textContent = 'No hay horas disponibles para este día.'; // Message for fully booked days
                    timeSlotsContainer.appendChild(message);
                    return;
                }

                availableTimesForDay.forEach(time => {
                    const timeSlot = document.createElement('div');
                    timeSlot.classList.add('time-slot');
                    timeSlot.textContent = time;

                    // Disable past times for today
                    if (currentDisplayedDateOnly.getTime() === today.getTime()) {
                        const [hour, minute] = time.split(':').map(Number);
                        const slotDateTime = new Date(currentDisplayedDate);
                        slotDateTime.setHours(hour, minute, 0, 0);
                        if (slotDateTime.getTime() < new Date().getTime()) {
                            timeSlot.classList.add('disabled');
                        }
                    }

                    timeSlot.addEventListener('click', () => {
                        if (timeSlot.classList.contains('disabled')) return; // Do nothing if disabled

                        document.querySelectorAll('.time-slot').forEach(slot => {
                            slot.classList.remove('active');
                        });
                        timeSlot.classList.add('active');
                        selectedTimeInput.value = time;
                        selectedDateInput.value = formattedDate;
                    });
                    timeSlotsContainer.appendChild(timeSlot);
                });
            })
            .catch(error => {
                console.error('Error fetching available slots:', error);
                const message = document.createElement('p');
                message.classList.add('error-message');
                message.textContent = 'No se pudieron cargar las horas disponibles. Inténtalo de nuevo más tarde.';
                timeSlotsContainer.appendChild(message);
            });
    }

    function updateDateDisplay() {
        currentDateSpan.textContent = formatDateForDisplay(currentDisplayedDate);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + (scheduleConfig.maxAdvanceBookingDays || 30));
        maxDate.setHours(0, 0, 0, 0);

        const currentDisplayedDateOnly = new Date(currentDisplayedDate);
        currentDisplayedDateOnly.setHours(0, 0, 0, 0);

        // Handle prevDayBtn state
        if (currentDisplayedDateOnly.getTime() <= today.getTime()) {
            prevDayBtn.classList.add('disabled');
        } else {
            prevDayBtn.classList.remove('disabled');
        }

        // Handle nextDayBtn state
        if (currentDisplayedDateOnly.getTime() >= maxDate.getTime()) {
            nextDayBtn.classList.add('disabled');
        } else {
            nextDayBtn.classList.remove('disabled');
        }

        renderTimeSlots();
    }

    prevDayBtn.addEventListener('click', () => {
        if (prevDayBtn.classList.contains('disabled')) return;
        currentDisplayedDate.setDate(currentDisplayedDate.getDate() - 1);
        updateDateDisplay();
    });

    nextDayBtn.addEventListener('click', () => {
        if (nextDayBtn.classList.contains('disabled')) return;
        currentDisplayedDate.setDate(currentDisplayedDate.getDate() + 1);
        updateDateDisplay();
    });

    // Function to open the modal
    function openBookingModal(date, time, service) {
        // Reset modal to initial confirmation state
        const confirmationSection = document.getElementById('booking-details-content');
        const successSection = document.getElementById('booking-success-message');

        confirmationSection.style.display = 'block';
        successSection.style.display = 'none';
        confirmBookingBtn.textContent = 'Confirmar Reserva';
        confirmBookingBtn.removeEventListener('click', closeBookingModal); // Ensure old handler is removed
        confirmBookingBtn.addEventListener('click', handleConfirmBooking); // Add the correct handler

        modalDate.textContent = date;
        modalTime.textContent = time;
        modalService.textContent = service;
        bookingModal.style.display = 'flex';
    }

    // Function to close the modal
    function closeBookingModal() {
        bookingModal.style.display = 'none';
    }

    // Event listener for closing the modal
    closeModalBtn.addEventListener('click', closeBookingModal);
    window.addEventListener('click', (event) => {
        if (event.target === bookingModal) {
            closeBookingModal();
        }
    });

    // Handle booking form submission (now opens modal)
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const name = bookingForm.name.value;
            const email = bookingForm.email.value;
            const phonePrefix = bookingForm.phone_prefix.value;
            const phoneNumber = bookingForm.phone.value;
            const service = bookingForm.service.value;
            const date = selectedDateInput.value;
            const time = selectedTimeInput.value;
            const sendConfirmationEmail = bookingForm.querySelector('#confirm-email').checked;

            if (!date || !time) {
                alert('Por favor, selecciona una fecha y hora para tu reserva.');
                return;
            }

            openBookingModal(formatDateForDisplay(new Date(date)), time, service);
        });
    }

    // New function to handle the actual booking confirmation
    function handleConfirmBooking() {
        const name = bookingForm.name.value;
        const email = bookingForm.email.value;
        const phonePrefix = bookingForm.phone_prefix.value;
        const phoneNumber = bookingForm.phone.value;
        const phone = phoneNumber ? `${phonePrefix} ${phoneNumber}` : '';
        const service = bookingForm.service.value;
        const date = selectedDateInput.value;
        const time = selectedTimeInput.value;
        const sendConfirmationEmail = bookingForm.querySelector('#confirm-email').checked;

        fetch('/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, service, date, time, sendConfirmationEmail })
        })
        .then(response => {
            if (response.ok) {
                // Show success message
                const confirmationSection = document.getElementById('booking-details-content');
                const successSection = document.getElementById('booking-success-message');

                confirmationSection.style.display = 'none';
                successSection.style.display = 'block';
                successDate.textContent = formatDateForDisplay(new Date(date));
                successTime.textContent = time;
                successService.textContent = service;

                // Change button to close modal
                confirmBookingBtn.textContent = 'Cerrar';
                confirmBookingBtn.removeEventListener('click', handleConfirmBooking); // Remove old handler
                confirmBookingBtn.addEventListener('click', closeBookingModal); // Add new handler

                bookingForm.reset();
                // Re-fetch schedule and update display to reflect new availability
                fetch(`/api/available-slots?date=${formatDateForInput(currentDisplayedDate)}`)
                    .then(res => res.json())
                    .then(data => {
                        // scheduleConfig is no longer directly used for available times
                        // We just need to trigger a re-render of time slots
                        renderTimeSlots();
                    })
                    .catch(err => console.error('Error re-fetching available slots:', err));
            } else {
                response.text().then(text => alert(`Error al confirmar la reserva: ${text}`));
                closeBookingModal(); // Close modal on error
            }
        })
        .catch(error => {
            console.error('Error al enviar la reserva:', error);
            alert('Hubo un error de conexión al enviar tu reserva.');
            closeBookingModal(); // Close modal on error
        });
    }

    // Initial attachment of the confirmation handler
    confirmBookingBtn.addEventListener('click', handleConfirmBooking);

    // Initial render is called after schedule is fetched
    const emailInput = document.querySelector('input[name="email"]');

    emailInput.addEventListener('input', () => {
      emailInput.setCustomValidity(""); // Limpia el mensaje anterior si todo va bien
    });

    emailInput.addEventListener('invalid', () => {
      if (emailInput.value !== "") {
        emailInput.setCustomValidity("El correo electrónico no es válido. Por favor, introduce uno correcto (ej: ejemplo@dominio.com) o déjalo en blanco");
      }
    });
});
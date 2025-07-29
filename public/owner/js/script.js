document.addEventListener('DOMContentLoaded', function() {
    const bookingsList = document.getElementById('bookings-list');
    const cancelledBookingsList = document.getElementById('cancelled-bookings-list');
    const scheduleForm = document.getElementById('schedule-form');
    const maxAdvanceBookingDaysInput = document.getElementById('maxAdvanceBookingDays');
    const closedDaysOfWeekCheckboxes = document.querySelectorAll('input[name="closedDaysOfWeek"]');
    const annualClosedDatesTextarea = document.getElementById('annualClosedDates');
    const weeklyScheduleTextareas = {
        domingo: document.getElementById('times-domingo'),
        lunes: document.getElementById('times-lunes'),
        martes: document.getElementById('times-martes'),
        miércoles: document.getElementById('times-miercoles'),
        jueves: document.getElementById('times-jueves'),
        viernes: document.getElementById('times-viernes'),
        sábado: document.getElementById('times-sabado'),
    };

    const modal = document.getElementById('confirmation-modal');
    const confirmationContent = document.getElementById('confirmation-content');
    const successMessage = document.getElementById('success-message');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const successTitle = document.getElementById('success-title');
    const successText = document.getElementById('success-text');
    const messageIcon = document.getElementById('message-icon');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const cancelActionBtn = document.getElementById('cancel-action-btn');
    const closeButton = document.querySelector('.close-button');
    const closeSuccessBtn = document.getElementById('close-success-btn');
    const confirmCheckbox = document.getElementById('confirm-checkbox');
    const timerDisplay = document.getElementById('timer-display');
    let currentAction = null;
    let timerInterval = null;
    let activeBookings = [];
    let allCancelledBookings = [];

    function openModal(title, message, onConfirm) {
        confirmationContent.style.display = 'block';
        successMessage.style.display = 'none';
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';
        currentAction = onConfirm;

        confirmActionBtn.disabled = true;
        confirmCheckbox.checked = false;

        let seconds = 10;
        timerDisplay.textContent = seconds;

        timerInterval = setInterval(() => {
            seconds--;
            timerDisplay.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = 'Listo';
                if (confirmCheckbox.checked) {
                    confirmActionBtn.disabled = false;
                }
            }
        }, 1000);

        confirmCheckbox.onchange = () => {
            if (confirmCheckbox.checked && seconds <= 0) {
                confirmActionBtn.disabled = false;
            } else {
                confirmActionBtn.disabled = true;
            }
        };
    }

    function showMessage(title, message, type) {
        confirmationContent.style.display = 'none';
        successMessage.style.display = 'block';
        successTitle.textContent = title;
        successText.textContent = message;
        modal.style.display = 'flex';

        if (type === 'success') {
            messageIcon.innerHTML = '&#10004;';
            messageIcon.className = 'success-icon';
            successTitle.style.color = '#4CAF50';
        } else if (type === 'error') {
            messageIcon.innerHTML = '&#10006;';
            messageIcon.className = 'error-icon';
            successTitle.style.color = '#ff4d4d';
        }
    }

    function closeModal() {
        modal.style.display = 'none';
        currentAction = null;
        clearInterval(timerInterval);
    }

    confirmActionBtn.addEventListener('click', () => {
        if (currentAction) {
            currentAction();
        }
    });

    cancelActionBtn.addEventListener('click', closeModal);
    closeButton.addEventListener('click', closeModal);
    closeSuccessBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Function to fetch and display bookings
    function fetchBookings() {
        fetch('/api/bookings')
            .then(response => response.json())
            .then(data => {
                activeBookings = data;
                renderBookings(data, bookingsList, 'cancel');
            })
            .catch(error => {
                console.error('Error fetching bookings:', error);
                bookingsList.innerHTML = '<p>Error al cargar las reservas.</p>';
            });
    }

    // Function to fetch and display cancelled bookings
    function fetchCancelledBookings() {
        console.log('Fetching cancelled bookings...');
        fetch('/api/cancelled-bookings')
            .then(response => response.json())
            .then(data => {
                allCancelledBookings = data;
                renderBookings(data, cancelledBookingsList, 'restore');
            })
            .catch(error => {
                console.error('Error fetching cancelled bookings:', error);
                cancelledBookingsList.innerHTML = '<p>Error al cargar las reservas canceladas.</p>';
            });
    }

    // Function to render bookings in a table
    function renderBookings(bookings, container, actionType) {
        bookings.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
        
        if (bookings.length === 0) {
            container.innerHTML = '<p>No hay reservas actualmente.</p>';
            return;
        }

        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Servicio</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        bookings.forEach(booking => {
            const email = booking.email ? booking.email : '<span class="unspecified">No especificado</span>';
            const phone = booking.phone ? booking.phone : '<span class="unspecified">No especificado</span>';

            tableHTML += `
                <tr>
                    <td>${booking.name || 'No especificado'}</td>
                    <td>${email}</td>
                    <td>${phone}</td>
                    <td>${booking.service}</td>
                    <td>${booking.date}</td>
                    <td>${booking.time}</td>
                    <td><button class="${actionType}-btn" data-id="${booking.id}">${actionType === 'cancel' ? 'Cancelar' : 'Restaurar'}</button></td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        container.innerHTML = tableHTML;

        // Add event listeners to buttons
        document.querySelectorAll(`.${actionType}-btn`).forEach(button => {
            button.addEventListener('click', function() {
                const bookingId = this.dataset.id;
                if (actionType === 'cancel') {
                    openModal('Confirmar Cancelación', 'Estás a punto de cancelar una reserva. Esta acción no se puede deshacer. Por favor, confirma que quieres continuar.', () => cancelBooking(bookingId));
                } else if (actionType === 'restore') {
                    const bookingToRestore = allCancelledBookings.find(b => b.id === bookingId);
                    if (!bookingToRestore) return;

                    const conflict = activeBookings.find(b => b.date === bookingToRestore.date && b.time === bookingToRestore.time);

                    if (conflict) {
                        showMessage('Error de Conflicto', 'No se puede restaurar la reserva porque ya existe una en la misma fecha y hora. Por favor, cancele la reserva activa para poder restaurar esta.', 'error');
                    } else {
                        openModal('Confirmar Restauración', 'Estás a punto de restaurar una reserva. Por favor, confirma que quieres continuar.', () => restoreBooking(bookingId));
                    }
                }
            });
        });
    }

    // Function to cancel a booking
    function cancelBooking(id) {
        fetch(`/api/bookings/${id}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (response.ok) {
                showMessage('¡Reserva Cancelada!', 'La reserva ha sido cancelada con éxito.', 'success');
                fetchBookings(); // Refresh the list
                fetchCancelledBookings(); // Refresh cancelled bookings list
            } else {
                alert('Error al cancelar la reserva.');
                closeModal();
            }
        })
        .catch(error => {
            console.error('Error cancelling booking:', error);
            alert('Error de conexión al cancelar la reserva.');
            closeModal();
        });
    }

    // Function to restore a cancelled booking
    function restoreBooking(id) {
        fetch(`/api/cancelled-bookings/${id}/restore`, {
            method: 'POST',
        })
        .then(response => {
            if (response.ok) {
                showMessage('¡Reserva Restaurada!', 'La reserva ha sido restaurada con éxito.', 'success');
                fetchCancelledBookings(); // Refresh cancelled bookings list
                fetchBookings(); // Refresh active bookings list
            } else if (response.status === 409) {
                response.text().then(text => {
                    showMessage('Error de Conflicto', 'No se puede restaurar la reserva porque ya existe una en la misma fecha y hora. Por favor, cancele la reserva activa para poder restaurar esta.', 'error');
                });
            } else {
                alert('Error al restaurar la reserva.');
                closeModal();
            }
        })
        .catch(error => {
            console.error('Error restoring booking:', error);
            alert('Error de conexión al restaurar la reserva.');
            closeModal();
        });
    }

    // Function to fetch and populate schedule
    function fetchSchedule() {
        fetch('/schedule')
            .then(response => response.json())
            .then(data => {
                maxAdvanceBookingDaysInput.value = data.maxAdvanceBookingDays || 30;

                closedDaysOfWeekCheckboxes.forEach(checkbox => {
                    checkbox.checked = data.closedDaysOfWeek.includes(checkbox.value);
                });

                annualClosedDatesTextarea.value = (data.annualClosedDates || []).join(', ');

                for (const day in weeklyScheduleTextareas) {
                    weeklyScheduleTextareas[day].value = (data.weeklySchedule[day] || []).join(', ');
                }
            })
            .catch(error => {
                console.error('Error fetching schedule:', error);
                alert('Error al cargar el horario.');
            });
    }

    // Function to save schedule
    function saveSchedule(scheduleData) {
        fetch('/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData),
        })
        .then(response => {
            if (response.ok) {
                alert('Horario guardado con éxito.');
            } else {
                alert('Error al guardar el horario.');
            }
        })
        .catch(error => {
            console.error('Error saving schedule:', error);
            alert('Error de conexión al guardar el horario.');
        });
    }

    // Initial fetch of bookings and schedule when the page loads
    fetchBookings();
    fetchSchedule();
    fetchCancelledBookings();

    // --- Schedule Form Logic ---
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const newSchedule = {
                maxAdvanceBookingDays: parseInt(maxAdvanceBookingDaysInput.value),
                closedDaysOfWeek: Array.from(closedDaysOfWeekCheckboxes)
                                    .filter(checkbox => checkbox.checked)
                                    .map(checkbox => checkbox.value),
                annualClosedDates: annualClosedDatesTextarea.value.split(',').map(date => date.trim()).filter(date => date !== ''),
                weeklySchedule: {},
            };

            for (const day in weeklyScheduleTextareas) {
                newSchedule.weeklySchedule[day] = weeklyScheduleTextareas[day].value.split(',').map(time => time.trim()).filter(time => time !== '');
            }

            saveSchedule(newSchedule);
        });
    }
});
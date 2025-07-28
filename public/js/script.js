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

    // Función para cargar las reseñas existentes
    function loadReviews() {
        fetch('/reviews')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                reviewsContainer.innerHTML = ''; // Limpiar contenedor
                data.forEach(review => {
                    const reviewElement = document.createElement('div');
                    reviewElement.classList.add('review-card');
                    reviewElement.innerHTML = `
                        <div class="review-header">
                            <h4>${review.name}</h4>
                            <div class="star-rating">${'&#9733;'.repeat(review.rating)}${'&#9734;'.repeat(5 - review.rating)}</div>
                        </div>
                        <p>"${review.comment}"</p>
                    `;
                    reviewsContainer.appendChild(reviewElement);
                });
            })
            .catch(error => {
                console.error('Error al cargar las reseñas:', error);
                reviewsContainer.innerHTML = '<p>No se pudieron cargar las reseñas. Inténtalo de nuevo más tarde.</p>';
            });
    }

    // Cargar las reseñas al iniciar la página
    loadReviews();

    // Enviar una nueva reseña
    if (reviewForm) {
        reviewForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const nameInput = document.getElementById('name');
            const ratingInput = document.getElementById('rating');
            const commentInput = document.getElementById('comment');

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
});
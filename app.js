// frontend/js/app.js

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Utility Functions
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

const api = {
    async request(endpoint, options = {}) {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'API request failed');
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};


// Authentication Functions
// const auth = {
//     async login(credentials) {
//         try {
//             const data = await api.request('/auth/login', {
//                 method: 'POST',
//                 body: JSON.stringify(credentials)
//             });
//             setToken(data.token);
//             window.location.href = '/frontend/dashboard.html';
//         } catch (error) {
//             alert(error.message || 'Login failed');
//             throw error;
//         }
//     },

//     async signup(userData) {
//         try {
//             await api.request('/auth/signup', {
//                 method: 'POST',
//                 body: JSON.stringify(userData)
//             });
//             alert('Signup successful! Please login.');
//             window.location.href = '/frontend/login.html';
//         } catch (error) {
//             alert(error.message || 'Signup failed');
//             throw error;
//         }
//     },

//     logout() {
//         removeToken();
//         window.location.href = '/frontend/login.html';
//     }
// };

// Ride Functions
const rides = {
    async search(filters) {
        const queryString = new URLSearchParams(filters).toString();
        return await api.request(`/rides?${queryString}`);
    },

    async create(rideData) {
        return await api.request('/rides', {
            method: 'POST',
            body: JSON.stringify(rideData)
        });
    },

    async book(rideId) {
        return await api.request('/bookings', {
            method: 'POST',
            body: JSON.stringify({ ride_id: rideId })
        });
    },

    async getUserRides() {
        const booked = await api.request('/bookings/user');
        const offered = await api.request('/rides/user');
        return { booked, offered };
    }
};

// UI Functions
function createRideCard(ride, type = 'search') {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-6 mb-4';
    card.innerHTML = `
        <h3 class="text-xl font-semibold text-blue-600 mb-2">${ride.source} → ${ride.destination}</h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <p class="text-gray-600">Date</p>
                <p class="font-medium">${new Date(ride.date_time).toLocaleDateString()}</p>
            </div>
            <div>
                <p class="text-gray-600">Time</p>
                <p class="font-medium">${new Date(ride.date_time).toLocaleTimeString()}</p>
            </div>
            <div>
                <p class="text-gray-600">Available Seats</p>
                <p class="font-medium">${ride.available_seats}</p>
            </div>
            <div>
                <p class="text-gray-600">Fare</p>
                <p class="font-medium">₹${ride.fare}</p>
            </div>
        </div>
        ${type === 'search' ? `
            <button onclick="rides.book(${ride.id})" 
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
                Book Now
            </button>
        ` : ''}
    `;
    return card;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await auth.login({ email, password });
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            await auth.signup({ fullName, email, password });
        });
    }

    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                const searchResults = await rides.search(Object.fromEntries(formData));
                const resultsDiv = document.getElementById('searchResults');
                resultsDiv.innerHTML = '';
                searchResults.forEach(ride => resultsDiv.appendChild(createRideCard(ride)));
            } catch (error) {
                alert('Failed to search rides: ' + error.message);
            }
        });
    }

    const offerForm = document.getElementById('offer-form');
    if (offerForm) {
        offerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await rides.create(Object.fromEntries(formData));
                alert('Ride created successfully!');
                e.target.reset();
            } catch (error) {
                alert('Failed to create ride: ' + error.message);
            }
        });
    }

    // Navigation and logout handlers
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => auth.logout());
    }

    // Check authentication status on page load
if (!getToken() && 
    window.location.pathname !== '/' && 
    window.location.pathname !== '/frontend/index.html' && 
    window.location.pathname !== '/frontend/login.html' && 
    window.location.pathname !== '/frontend/signup.html') {
    window.location.href = '/frontend/login.html';
}
});
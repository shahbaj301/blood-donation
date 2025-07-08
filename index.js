function updateAuthSection() {
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userEmailSpan = document.getElementById('user-email');

    if (!authButtons || !userProfile || !userEmailSpan) {
        console.error("Auth section elements not found.");
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.email) {
        authButtons.style.display = 'none';
        userEmailSpan.textContent = user.email;
        userProfile.style.display = 'flex';
    } else {
        authButtons.style.display = 'flex';
        userEmailSpan.textContent = '';
        userProfile.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('user');
    updateAuthSection();
    alert("You have been logged out.");
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.addEventListener('transitionend', function handler() {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
            modal.removeEventListener('transitionend', handler);
        });
    }
}

function switchModal(currentModalId, targetModalId) {
    closeModal(currentModalId);
    setTimeout(() => {
        openModal(targetModalId);
    }, 200);
}

window.onclick = function (event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
        event.target.addEventListener('transitionend', function handler() {
            if (!event.target.classList.contains('show')) {
                event.target.style.display = 'none';
            }
            event.target.removeEventListener('transitionend', handler);
        });
    }
};

document.querySelector("#registerModal form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const bloodType = document.getElementById("register-blood").value;

    if (!name || !email || !password || !bloodType) {
        alert("Please fill in all registration fields.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, bloodType })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            event.target.reset();
            closeModal('registerModal');

            if (data.donors && Array.isArray(data.donors) && data.donors.length > 0) {
                localStorage.setItem("matchedDonors", JSON.stringify(data.donors));
                window.location.href = "donor.html";
            }
        }
    } catch (error) {
        console.error("Error during registration:", error);
        alert("Registration failed. Please try again.");
    }
});

document.querySelector("#loginModal form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
        alert("Please fill in both fields.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            if (data.user && data.user.email) {
                localStorage.setItem("user", JSON.stringify(data.user));
                updateAuthSection();
            } else {
                console.error("Login successful but user data or email is missing in the response:", data);
                alert("Login successful, but couldn't retrieve user information.");
            }

            event.target.reset();
            closeModal('loginModal');

            setTimeout(() => {
            }, 300);
        } else {
            alert(data.message || "Login failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert("An error occurred during login. Please try again.");
    }
});

document.querySelector("#donateModal form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("donate-name").value.trim();
    const bloodType = document.getElementById("donate-blood").value;
    const location = document.getElementById("donate-location").value.trim();
    const date = document.getElementById("donate-date").value;
    const number = document.getElementById("donate-number").value.trim();

    if (!name || !bloodType || !location || !date || !number) {
        alert("Please fill all donation fields.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/donate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, bloodType, location, date, number })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            event.target.reset();
            closeModal('donateModal');
        }
    } catch (error) {
        console.error("Error submitting donation:", error);
        alert("Donation submission failed. Try again.");
    }
});

document.querySelector("#requestModal form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("request-name").value.trim();
    const bloodType = document.getElementById("request-blood").value;
    const location = document.getElementById("request-location").value.trim();
    const units = document.getElementById("request-units").value;
    const urgency = document.getElementById("request-urgency").value;

    const user = JSON.parse(localStorage.getItem('user'));
    const userEmail = user ? user.email : null;

    if (!name || !bloodType || !location || !units || !urgency) {
        alert("Please fill all request fields.");
        return;
    }

    if (!userEmail) {
        alert("Please log in to request blood.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/request-blood", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                bloodType,
                location,
                units,
                urgency,
                email: userEmail
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);

            if (data.donors && Array.isArray(data.donors) && data.donors.length > 0) {
                localStorage.setItem("matchedDonors", JSON.stringify(data.donors));
                window.location.href = "donor.html";
            } else {
                alert("No matching donors available at the moment.");
            }

            event.target.reset();
            closeModal("requestModal");

        } else {
            alert(data.message || "Blood request failed. Please try again.");
        }

    } catch (error) {
        console.error("Fetch failed:", error);
        alert("Something went wrong with the blood request. Please check your network or server.");
    }
});

let selectedBloodGroup = null;
const bloodTypeElements = document.querySelectorAll(".blood-type");

bloodTypeElements.forEach(el => {
    el.addEventListener("click", () => {
        bloodTypeElements.forEach(item => item.classList.remove("selected"));
        el.classList.add("selected");
        selectedBloodGroup = el.textContent.trim();
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const donateButton = document.getElementById("donateBtn");
    const requestButton = document.getElementById("requestBtn");
    const emergencyRequestButton = document.querySelector(".emergency-card .blood-actions .btn-primary");
    const logoutButton = document.getElementById('logout-button');

    updateAuthSection();

    if (donateButton) {
        donateButton.addEventListener("click", function () {
            openModal("donateModal");
        });
    }

    function handleRequestClick() {
        openModal("requestModal");
    }

    if (requestButton) {
        requestButton.addEventListener("click", handleRequestClick);
    }

    if (emergencyRequestButton) {
        emergencyRequestButton.addEventListener("click", function() {
            if (!selectedBloodGroup) {
                alert("Please select a blood type from the grid first!");
                return;
            }
            openModal("requestModal");

            const requestBloodSelect = document.getElementById('request-blood');
            if (requestBloodSelect && selectedBloodGroup) {
                requestBloodSelect.value = selectedBloodGroup;
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    let map;
    let markers = [];

    try {
        const mapElement = document.getElementById('map');
        if (mapElement) {
            if (typeof L !== 'undefined') {
                map = L.map('map').setView([20.5937, 78.9629], 5);
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);
            } else {
                console.error("Leaflet library not loaded.");
                if (mapElement.parentNode) {
                    mapElement.parentNode.innerHTML = "<p>Error loading map library. Please try refreshing the page.</p>";
                }
            }
        } else {
            console.warn("Map element with ID 'map' not found.");
        }
    } catch (e) {
        console.error("Error initializing map:", e);
        const mapElement = document.getElementById('map');
        if (mapElement && mapElement.parentNode) {
            mapElement.parentNode.innerHTML = `<p>Error initializing map: ${e.message}. Please try refreshing.</p>`;
        }
    }

    const searchButton = document.querySelector(".location-search button");
    if (searchButton) {
        searchButton.addEventListener("click", searchNearby);
    }

    function searchNearby() {
        const locationInput = document.getElementById("locationInput");
        const location = locationInput ? locationInput.value.trim() : '';

        if (!location) {
            alert("Please enter a location");
            return;
        }

        const resultsDiv = document.getElementById("searchResults");
        if (resultsDiv) {
            resultsDiv.innerHTML = "<p>Searching...</p>";
        }

        if (!map) {
            console.error("Map not initialized, cannot perform search with map display.");
            if (resultsDiv) {
                resultsDiv.innerHTML = "<p>Map is not available. Search results may be limited.</p>";
            }
            fetchSearchData(location, resultsDiv);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            await fetchSearchData(location, resultsDiv, lat, lng);
        }, async (error) => {
            console.warn("Could not get user location:", error.message);
            await fetchSearchData(location, resultsDiv);
        });
    }

    async function fetchSearchData(location, resultsDiv, userLat = null, userLng = null) {
        try {
            const response = await fetch("http://localhost:8080/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location, lat: userLat, lng: userLng })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            const locationInput = document.getElementById("locationInput");
            if(locationInput) locationInput.value = "";

            if (map && markers && markers.length) {
                markers.forEach(marker => map.removeLayer(marker));
            }
            markers = [];
            const validMarkers = [];

            if (!data || data.length === 0) {
                if (resultsDiv) resultsDiv.innerHTML = "<p>No nearby locations found.</p>";
                if (map) map.setView([20.5937, 78.9629], 5);
                return;
            }

            if (resultsDiv) {
                const html = data.map(item => `
                        <div class="result-card">
                            <h3>${item.name}</h3>
                            <p>${item.address}</p>
                            ${item.city ? `<p>City: ${item.city}</p>` : ''}
                        </div>
                    `).join("");
                resultsDiv.innerHTML = html;
            }

            if (map) {
                data.forEach(item => {
                    if (item.lat && item.lng) {
                        try {
                            const marker = L.marker([item.lat, item.lng])
                                .addTo(map)
                                .bindPopup(`<b>${item.name}</b><br>${item.address || item.city || ''}`);
                            markers.push(marker);
                            validMarkers.push([item.lat, item.lng]);
                        } catch (e) {
                            console.error("Error adding marker:", e);
                        }
                    } else {
                        console.warn("Location item has missing lat/lng:", item);
                    }
                });

                if (validMarkers.length > 0) {
                    try {
                        map.fitBounds(validMarkers, { padding: [50, 50] });
                    } catch (e) {
                        console.error("Error fitting bounds:", e);
                        if (validMarkers[0]) {
                            map.setView(validMarkers[0], 10);
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Search error:", error);
            if (resultsDiv) {
                resultsDiv.innerHTML = `<p>Error fetching data: ${error.message}</p>`;
            }
        }
    }

    document.getElementById("viewBloodBankBtn").addEventListener("click", function () {
        const bloodBanks = [
            { name: "Apollo Blood Bank", address: "Delhi" },
            { name: "Red Cross Society", address: "Mumbai" },
            { name: "Lifeline Blood Bank", address: "Bangalore" },
            { name: "Rotary Blood Bank", address: "Chennai" }
        ];

        const container = document.getElementById("bloodBanksList");
        if (!container) {
            console.error("#bloodBanksList element not found");
            return;
        }

        if (bloodBanks.length === 0) {
            container.innerHTML = "<p>No blood banks found.</p>";
            return;
        }

        const html = bloodBanks.map(bank => `
            <div class="result-card">
                <h3>${bank.name}</h3>
                <p>${bank.address}</p>
            </div>
        `).join("");

        container.innerHTML = html;
    });

});

function toggleChat() {
    const chatbot = document.getElementById("chatbotContainer");
    if (chatbot) {
        chatbot.style.display = chatbot.style.display === "none" || chatbot.style.display === "" ? "flex" : "none";
        if (chatbot.style.display === "flex") {
            const chatBody = document.getElementById('chatBody');
            if (chatBody) {
                chatBody.scrollTop = chatBody.scrollHeight;
            }
        }
    }
}

async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input ? input.value.trim() : '';
    if (message === "") return;

    const chatBody = document.getElementById("chatBody");
    if (!chatBody) {
        console.error("Chat body element not found.");
        return;
    }

    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('chat-message', 'user');
    userMessageElement.innerHTML = `<strong>You:</strong> ${message}`;
    chatBody.appendChild(userMessageElement);

    const loadingId = showLoading(chatBody);

    try {
        const response = await getBotResponse(message);
        removeLoading(loadingId);
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('chat-message', 'bot');
        botMessageElement.innerHTML = `<strong>LifeLink Assistant:</strong> ${response}`;
        chatBody.appendChild(botMessageElement);

    } catch (error) {
        removeLoading(loadingId);
        const errorMessageElement = document.createElement('div');
        errorMessageElement.classList.add('chat-message', 'bot', 'error');
        errorMessageElement.innerHTML = `<strong>LifeLink Assistant:</strong> ${error.message}`;
        chatBody.appendChild(errorMessageElement);
    }

    if (input) input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showLoading(chatBody) {
    const loadingId = 'loading-' + Date.now();
    const loadingElement = document.createElement('div');
    loadingElement.id = loadingId;
    loadingElement.classList.add('chat-message', 'bot', 'loading');
    loadingElement.innerHTML = `<strong>LifeLink Assistant:</strong> <em>Thinking...</em>`;
    chatBody.appendChild(loadingElement);
    chatBody.scrollTop = chatBody.scrollHeight;
    return loadingId;
}

function removeLoading(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

async function getBotResponse(message) {
    try {
        const serverUrl = 'http://localhost:8080/chat';

        const response = await fetch(serverUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `Failed to get response. Status: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.reply) errorMessage = errorJson.reply;
                else if (errorJson.error) errorMessage = errorJson.error;
                else errorMessage = errorBody;
            } catch (e) {
                errorMessage = `Failed to get response. Status: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data && data.reply) {
            return data.reply;
        } else {
            console.error("Unexpected response format from /chat:", data);
            throw new Error("Received unexpected response from assistant.");
        }

    } catch (error) {
        console.error("Error fetching from /chat endpoint:", error);
        return `Sorry, I'm having trouble communicating with my service right now. Please try again later. (${error.message})`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById('userInput');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
                e.preventDefault();
            }
        });
    }

    const sendButton = document.querySelector('.chat-footer button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
});
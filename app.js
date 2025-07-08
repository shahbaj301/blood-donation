require("dotenv").config();
const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const axios = require("axios");

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Shahbaj@12",
    database: process.env.DB_NAME || "blood_donation"
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err.stack);
        process.exit(1);
    }
    console.log("Connected to MySQL Database as id " + db.threadId);
});

const Maps_API_KEY = process.env.Maps_API_KEY || "YOUR_Maps_API_KEY";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";


app.post("/register", (req, res) => {
    const { name, email, password, bloodType } = req.body;

    if (!name || !email || !password || !bloodType) {
        return res.status(400).json({ message: "All registration fields are required." });
    }

    const checkEmailSql = "SELECT id FROM users WHERE email = ?";
    db.query(checkEmailSql, [email], (err, results) => {
        if (err) {
            console.error("Error checking email:", err);
            return res.status(500).json({ message: "Database error during registration." });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: "Email already registered!" });
        }

        const insertUserSql = "INSERT INTO users (name, email, password, bloodType) VALUES (?, ?, ?, ?)";
        db.query(insertUserSql, [name, email, password, bloodType], (err, result) => {
            if (err) {
                console.error("Error inserting user:", err);
                return res.status(500).json({ message: "Error creating user account." });
            }

            let compatibleTypes = getCompatibleBloodTypes(bloodType);
            const fetchDonorsSql = "SELECT name, location, number, bloodType FROM donors WHERE bloodType IN (?) LIMIT 10";
            db.query(fetchDonorsSql, [compatibleTypes], (err, donors) => {
                if (err) {
                    console.warn("Error fetching compatible donors after registration:", err);
                }

                res.status(201).json({
                    message: "User registered successfully!",
                    user: { id: result.insertId, name, email, bloodType },
                    donors: (donors && donors.length > 0) ? donors : []
                });
            });
        });
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    const sql = "SELECT id, name, email, bloodType FROM users WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error("Error fetching user for login:", err);
            return res.status(500).json({ message: "Database error during login." });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];
        res.json({
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bloodType: user.bloodType
            }
        });
    });
});

app.post('/donate', (req, res) => {
    const { name, bloodType, location, date, number } = req.body;

    if (!name || !bloodType || !location || !date || !number) {
        return res.status(400).json({ message: "All donation fields are required!" });
    }

    const sql = "INSERT INTO donors (name, bloodType, location, `date`, `number`) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [name, bloodType, location, date, number], (err, result) => {
        if (err) {
            console.error("Error inserting donation:", err);
            return res.status(500).json({ message: "Error saving donation data." });
        }
        console.log(`Donation recorded from ${name} (${bloodType}) at ${location}`);
        res.status(201).json({ message: "Donation submitted successfully! Thank you." });
    });
});

app.post('/request-blood', async (req, res) => {
    const { name, email, bloodType, location, units, urgency } = req.body;

    if (!name || !bloodType || !location || !units || !urgency) {
        return res.status(400).json({ message: "All blood request fields are required!" });
    }

    let compatibleTypes = getCompatibleBloodTypes(bloodType);

    const fetchDonorsSql = `SELECT name, location, number, bloodType FROM donors WHERE bloodType IN (?) ORDER BY FIELD(bloodType, ?) DESC LIMIT 20`;

    db.query(fetchDonorsSql, [compatibleTypes, bloodType], (err, donors) => {
        if (err) {
            console.error("Error fetching donors for blood request:", err);
            return res.status(500).json({ message: "Error processing blood request." });
        }

        res.status(200).json({
            message: "Blood request submitted successfully. Searching for donors...",
            donors: (donors && donors.length > 0) ? donors : []
        });
    });
});

function getCompatibleBloodTypes(bloodType) {
    const compatibility = {
        'O-': ['O-'],
        'O+': ['O-', 'O+'],
        'A-': ['O-', 'A-'],
        'A+': ['O-', 'O+', 'A-', 'A+'],
        'B-': ['O-', 'B-'],
        'B+': ['O-', 'O+', 'B-', 'B+'],
        'AB-': ['O-', 'A-', 'B-', 'AB-'],
        'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
    };

    return compatibility[bloodType] || [bloodType];
}

function sortDonorsByPriority(donors, bloodType, location) {
    console.log("Sorting donors (Placeholder logic)");
    return donors.sort((a, b) => {
        const aExact = (a.bloodType === bloodType);
        const bExact = (b.bloodType === bloodType);

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        return 0;
    });
}


app.post("/search", async (req, res) => {
    console.log("Search request received:", req.body);
    const { location, lat, lng } = req.body;

    if (!location) {
        return res.status(400).json({ error: "Location is required for search." });
    }

    try {
        const fetchBloodBanksSql = "SELECT name, address, city, lat, lng FROM blood_banks WHERE city LIKE ? OR address LIKE ? LIMIT 50";
        const searchTerm = `%${location}%`;

        db.query(fetchBloodBanksSql, [searchTerm, searchTerm], async (err, localResults) => {
            if (err) {
                console.error("Error fetching blood banks from DB:", err);
            }

            let allResults = [...(localResults || [])];

            const predefinedBloodBanks = [
                {
                    name: "Red Cross Blood Bank",
                    city: "Delhi",
                    lat: 28.6139,
                    lng: 77.2090,
                    address: "Connaught Place, Delhi",
                },
                {
                    name: "Apollo Hospital Blood Bank",
                    city: "Chennai",
                    lat: 13.0827,
                    lng: 80.2707,
                    address: "Greams Road, Chennai",
                },
                {
                    name: "Lifeline Blood Bank",
                    city: "Mumbai",
                    lat: 19.0760,
                    lng: 72.8777,
                    address: "Andheri West, Mumbai",
                },
                {
                    name: "Max Healthcare Blood Bank",
                    city: "Delhi",
                    lat: 28.5355,
                    lng: 77.2100,
                    address: "Saket, Delhi",
                },
                {
                    name: "Columbia Asia Blood Bank",
                    city: "Bangalore",
                    lat: 12.9716,
                    lng: 77.5946,
                    address: "Whitefield, Bangalore",
                }
            ];

            const matchingPredefined = predefinedBloodBanks.filter(bank =>
                (bank.city && bank.city.toLowerCase().includes(location.toLowerCase())) ||
                (bank.address && bank.address.toLowerCase().includes(location.toLowerCase()))
            );

            matchingPredefined.forEach(predef => {
                const exists = allResults.some(result =>
                    result.name === predef.name && result.address === predef.address
                );
                if (!exists) {
                    allResults.push(predef);
                }
            });

            if (lat && lng) {
                allResults = allResults.sort((a, b) => {
                    const hasCoordsA = a.lat && a.lng;
                    const hasCoordsB = b.lat && b.lng;

                    if (hasCoordsA && hasCoordsB) {
                        const distA = calculateDistance(lat, lng, a.lat, a.lng);
                        const distB = calculateDistance(lat, lng, b.lat, b.lng);
                        return distA - distB;
                    } else if (hasCoordsA) {
                        return -1;
                    } else if (hasCoordsB) {
                        return 1;
                    }
                    return 0;
                });
            }

            const limitedResults = allResults.slice(0, 20);

            res.json(limitedResults);

        });

    } catch (error) {
        console.error("Top-level error in /search:", error);
        res.status(500).json({ error: "An internal error occurred during search." });
    }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number' || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        console.warn("calculateDistance received invalid coordinates:", lat1, lon1, lat2, lon2);
        return Infinity;
    }

    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

app.get("/donors", (req, res) => {
    const bloodType = req.query.bloodType;

    if (!bloodType) {
        return res.status(400).json({ error: "Blood type query parameter is required." });
    }

    const compatibleTypes = getCompatibleBloodTypes(bloodType);
    const fetchDonorsSql = `SELECT name, location, number, bloodType FROM donors WHERE bloodType IN (?) ORDER BY FIELD(bloodType, ?) DESC LIMIT 50`;

    db.query(fetchDonorsSql, [compatibleTypes, bloodType], (err, donors) => {
        if (err) {
            console.error("Error fetching donors for /donors endpoint:", err);
            return res.status(500).json({ error: "Error fetching donors." });
        }

        res.json(donors || []);
    });
});

app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ reply: "Please provide a message." });
    }

    if (!GEMINI_API_KEY) {
        console.error('Gemini API key is not configured');
        return res.status(500).json({
            reply: "Oops! The assistant service is not configured properly. Please contact support."
        });
    }

    try {
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: [
                {
                    parts: [{ text: message }]
                }
            ],
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
            params: {
                key: GEMINI_API_KEY,
            },
        });

        const responseData = geminiResponse.data;
        if (responseData && responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].content && responseData.candidates[0].content.parts && responseData.candidates[0].content.parts.length > 0) {
            const textResponse = responseData.candidates[0].content.parts[0].text;
            res.json({ reply: textResponse });
        } else {
            console.warn("Gemini API returned no text content:", responseData);
            if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
                const blockReason = responseData.promptFeedback.blockReason;
                return res.status(400).json({ reply: `Your request was blocked by the safety filters (${blockReason}).` });
            }
            res.status(500).json({ reply: "The assistant could not generate a response." });
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error.message);
        if (error.response) {
            console.error('Gemini API Response Data:', error.response.data);
            console.error('Gemini API Response Status:', error.response.status);
            console.error('Gemini API Response Headers:', error.response.headers);
            if (error.response.data && error.response.data.error && error.response.data.error.message) {
                return res.status(error.response.status).json({ reply: `Assistant Error: ${error.response.data.error.message}` });
            }
        } else if (error.request) {
            console.error('Gemini API Request Data:', error.request);
        } else {
            console.error('Error message:', error.message);
        }

        res.status(500).json({
            reply: "Sorry, the assistant encountered an error. Please try again later."
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
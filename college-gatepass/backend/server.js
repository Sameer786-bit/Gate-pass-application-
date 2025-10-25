// backend/server.js
// Import required modules
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Helper function to read database
function readDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: [], requests: [] };
    }
}

// Helper function to write to database
function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing to database:', error);
        return false;
    }
}

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// Helper function to parse request body
function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            callback(null, body ? JSON.parse(body) : {});
        } catch (error) {
            callback(error, null);
        }
    });
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`${method} ${pathname}`);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // ==================== API ROUTES ====================

    // Route: POST /api/login
    if (pathname === '/api/login' && method === 'POST') {
        parseBody(req, (err, body) => {
            if (err) {
                return sendJSON(res, 400, { success: false, message: 'Invalid request body' });
            }

            const { userId, password, role } = body;
            const db = readDatabase();

            const user = db.users.find(u => 
                u.id === userId && 
                u.password === password && 
                u.role === role
            );

            if (user) {
                sendJSON(res, 200, {
                    success: true,
                    message: 'Login successful',
                    user: { id: user.id, name: user.name, role: user.role }
                });
            } else {
                sendJSON(res, 401, {
                    success: false,
                    message: 'Invalid credentials or role mismatch'
                });
            }
        });
    }
    else if (pathname === '/api/requests' && method === 'POST') {
    console.log('🎯 STEP 1: Received CREATE GATE PASS request');
    
    parseBody(req, (err, body) => {
        if (err) {
            console.log('❌ STEP 2: ERROR parsing JSON:', err.message);
            return sendJSON(res, 400, { success: false, message: 'Invalid request body' });
        }
        
        console.log('✅ STEP 3: Successfully parsed the data');
        console.log('📦 Data received:', body);
        
        const { studentId, studentName, reason, returnTime } = body;
        
        console.log('🔍 STEP 4: Checking fields:');
        console.log('   - Student ID:', studentId);
        console.log('   - Student Name:', studentName);
        console.log('   - Reason:', reason);
        console.log('   - Return Time:', returnTime);
            
        if (!studentId || !studentName || !reason || !returnTime) {
            console.log('❌ STEP 5: Missing required fields');
            return sendJSON(res, 400, { success: false, message: 'Missing required fields' });
        }

        const db = readDatabase();

        const newRequest = {
            id: 'REQ' + Date.now(),
            studentId,
            studentName,
            reason,
            returnTime,
            status: 'Pending',
            timestamp: new Date().toISOString(),
            moderatorId: null,
            moderatorName: null,
            moderatorRemarks: null,
            reviewedAt: null,
            used: false,
            usedAt: null
        };

        db.requests.push(newRequest);
        
        if (writeDatabase(db)) {
            console.log('✅ STEP 6: Request saved successfully!');
            sendJSON(res, 201, {
                success: true,
                message: 'Request created successfully',
                request: newRequest
            });
        } else {
            console.log('❌ STEP 6: Failed to save request');
            sendJSON(res, 500, { success: false, message: 'Failed to save request' });
        }
    });
}
    
    // Route: GET /api/requests - Get all requests
    else if (pathname === '/api/requests' && method === 'GET') {
        const db = readDatabase();
        sendJSON(res, 200, {
            success: true,
            requests: db.requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        });
    }

    // Route: GET /api/requests/student/:studentId - Get requests by student
    else if (pathname.startsWith('/api/requests/student/') && method === 'GET') {
        const studentId = pathname.split('/').pop();
        const db = readDatabase();
        
        const studentRequests = db.requests
            .filter(r => r.studentId === studentId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        sendJSON(res, 200, {
            success: true,
            requests: studentRequests
        });
    }

    // Route: PUT /api/requests/:id/review - Moderator reviews a request
    else if (pathname.match(/^\/api\/requests\/REQ\d+\/review$/) && method === 'PUT') {
        const requestId = pathname.split('/')[3];
        
        parseBody(req, (err, body) => {
            if (err) {
                return sendJSON(res, 400, { success: false, message: 'Invalid request body' });
            }

            const { status, moderatorId, moderatorName, remarks } = body;
            
            if (!status || !moderatorId || !moderatorName) {
                return sendJSON(res, 400, { success: false, message: 'Missing required fields' });
            }

            if (status !== 'Approved' && status !== 'Rejected') {
                return sendJSON(res, 400, { success: false, message: 'Invalid status' });
            }

            const db = readDatabase();
            const requestIndex = db.requests.findIndex(r => r.id === requestId);

            if (requestIndex === -1) {
                return sendJSON(res, 404, { success: false, message: 'Request not found' });
            }

            if (db.requests[requestIndex].status !== 'Pending') {
                return sendJSON(res, 400, { success: false, message: 'Request already reviewed' });
            }

            // Update the request
            db.requests[requestIndex].status = status;
            db.requests[requestIndex].moderatorId = moderatorId;
            db.requests[requestIndex].moderatorName = moderatorName;
            db.requests[requestIndex].moderatorRemarks = remarks || '';
            db.requests[requestIndex].reviewedAt = new Date().toISOString();

            if (writeDatabase(db)) {
                sendJSON(res, 200, {
                    success: true,
                    message: `Request ${status.toLowerCase()} successfully`,
                    request: db.requests[requestIndex]
                });
            } else {
                sendJSON(res, 500, { success: false, message: 'Failed to update request' });
            }
        });
    }

    // Route: GET /api/verify/:studentId - Gatekeeper verifies student pass
    else if (pathname.startsWith('/api/verify/') && method === 'GET') {
        const studentId = pathname.split('/').pop();
        const db = readDatabase();

        // Find the most recent approved and unused pass
        const approvedPass = db.requests
            .filter(r => 
                r.studentId === studentId && 
                r.status === 'Approved' && 
                !r.used
            )
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        if (approvedPass) {
            sendJSON(res, 200, {
                success: true,
                hasPass: true,
                pass: approvedPass
            });
        } else {
            sendJSON(res, 200, {
                success: true,
                hasPass: false,
                message: 'No valid approved pass found for this student'
            });
        }
    }

    // Route: PUT /api/requests/:id/use - Mark pass as used
    else if (pathname.match(/^\/api\/requests\/REQ\d+\/use$/) && method === 'PUT') {
        const requestId = pathname.split('/')[3];
        const db = readDatabase();

        const requestIndex = db.requests.findIndex(r => r.id === requestId);

        if (requestIndex === -1) {
            return sendJSON(res, 404, { success: false, message: 'Request not found' });
        }

        if (db.requests[requestIndex].used) {
            return sendJSON(res, 400, { success: false, message: 'Pass already used' });
        }

        db.requests[requestIndex].used = true;
        db.requests[requestIndex].usedAt = new Date().toISOString();

        if (writeDatabase(db)) {
            sendJSON(res, 200, {
                success: true,
                message: 'Pass marked as used successfully'
            });
        } else {
            sendJSON(res, 500, { success: false, message: 'Failed to update pass' });
        }
    }

    // Route: GET /api/stats - Get overall statistics
    else if (pathname === '/api/stats' && method === 'GET') {
        const db = readDatabase();
        const today = new Date().toDateString();
        
        const todayRequests = db.requests.filter(r => 
            new Date(r.timestamp).toDateString() === today
        );

        const stats = {
            total: db.requests.length,
            pending: db.requests.filter(r => r.status === 'Pending').length,
            approved: db.requests.filter(r => r.status === 'Approved').length,
            rejected: db.requests.filter(r => r.status === 'Rejected').length,
            today: todayRequests.length,
            used: db.requests.filter(r => r.used).length
        };

        sendJSON(res, 200, { success: true, stats });
    }

    // 404 - Route not found
    else {
        sendJSON(res, 404, { 
            success: false, 
            message: 'API endpoint not found',
            availableRoutes: [
                'POST /api/login',
                'POST /api/requests',
                'GET /api/requests',
                'GET /api/requests/student/:studentId',
                'PUT /api/requests/:id/review',
                'GET /api/verify/:studentId',
                'PUT /api/requests/:id/use',
                'GET /api/stats'
            ]
        });
    }
});

// Start the server
server.listen(PORT, () => {
    console.log('\n===========================================');
    console.log('🎓  COLLEGE GATE PASS SYSTEM - BACKEND  🎓');
    console.log('===========================================');
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`✅ Database file: ${DB_FILE}`);
    console.log('===========================================');
    console.log('📍 Available API Endpoints:');
    console.log('   POST   /api/login');
    console.log('   POST   /api/requests');
    console.log('   GET    /api/requests');
    console.log('   GET    /api/requests/student/:id');
    console.log('   PUT    /api/requests/:id/review');
    console.log('   GET    /api/verify/:studentId');
    console.log('   PUT    /api/requests/:id/use');
    console.log('   GET    /api/stats');
    console.log('===========================================');
    console.log('Press CTRL + C to stop the server\n');
});
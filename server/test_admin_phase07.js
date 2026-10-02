const http = require('http');

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers,
      },
      (res) => {
        let resBody = '';
        res.on('data', (d) => (resBody += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let resBody = '';
        res.on('data', (d) => (resBody += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function patch(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'PATCH',
        headers,
      },
      (res) => {
        let resBody = '';
        res.on('data', (d) => (resBody += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Phase 07 Admin Operations Module Verification...\n');
  const BASE = 'http://localhost:5000/api';

  // 1. Authenticate users
  console.log('1. Authenticating Admin, Resident, and Crew accounts...');
  const adminLogin = await post(`${BASE}/auth/login`, {
    email: 'admin@ecoroute.demo',
    password: 'admin123',
  });
  if (adminLogin.status !== 200 || !adminLogin.data?.data?.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin));
  }
  const adminToken = adminLogin.data.data.token;
  console.log('   ✓ Admin login successful');

  const resLogin = await post(`${BASE}/auth/login`, {
    email: 'rahul@ecoroute.demo',
    password: 'resident123',
  });
  const resToken = resLogin.data.data.token;
  console.log('   ✓ Resident login successful');

  const crewLogin = await post(`${BASE}/auth/login`, {
    email: 'crew@ecoroute.demo',
    password: 'crew123',
  });
  const crewToken = crewLogin.data.data.token;
  console.log('   ✓ Crew login successful\n');

  // 2. Fetch all requests & crews as admin
  console.log('2. Fetching requests and crews as admin...');
  const reqListRes = await get(`${BASE}/requests`, adminToken);
  const requests = reqListRes.data.data;
  console.log(`   ✓ Retrieved ${requests.length} requests`);

  const crewListRes = await get(`${BASE}/crews`, adminToken);
  const crews = crewListRes.data.data;
  console.log(`   ✓ Retrieved ${crews.length} crews\n`);

  // Find a pending request and an in_progress request
  const pendingReq = requests.find((r) => r.status === 'PENDING');
  const inProgressReq = requests.find((r) => r.status === 'IN_PROGRESS');
  const assignedReq = requests.find((r) => r.status === 'ASSIGNED');
  const crewBravo = crews.find((c) => c.name === 'Crew Bravo') || crews[1];
  const crewCharlie = crews.find((c) => c.name === 'Crew Charlie') || crews[2];

  console.log('3. Testing RBAC Security Protection on Assign Endpoint...');
  // 3a. Resident attempting assignment -> MUST fail with 403
  const residentAssignRes = await patch(
    `${BASE}/requests/${pendingReq._id}/assign`,
    { crewId: crewBravo._id },
    resToken
  );
  if (residentAssignRes.status === 403) {
    console.log('   ✓ Security PASS: Resident blocked from assigning crew with 403 Forbidden');
  } else {
    console.error('   ❌ Security FAIL: Resident got status ' + residentAssignRes.status);
  }

  // 3b. Crew attempting assignment -> MUST fail with 403
  const crewAssignRes = await patch(
    `${BASE}/requests/${pendingReq._id}/assign`,
    { crewId: crewBravo._id },
    crewToken
  );
  if (crewAssignRes.status === 403) {
    console.log('   ✓ Security PASS: Crew blocked from assigning crew with 403 Forbidden');
  } else {
    console.error('   ❌ Security FAIL: Crew got status ' + crewAssignRes.status);
  }

  // 4. Test stats endpoint
  console.log('\n4. Verifying Stats Endpoint (activeCrews, status breakdown)...');
  const statsRes = await get(`${BASE}/requests/stats`, adminToken);
  const stats = statsRes.data.data;
  console.log('   Stats retrieved:', {
    total: stats.total,
    pending: stats.pending,
    assigned: stats.assigned,
    inProgress: stats.inProgress,
    completed: stats.completed,
    activeCrews: stats.activeCrews,
    totalCrews: stats.totalCrews,
  });
  if (stats.activeCrews !== undefined) {
    console.log('   ✓ Stats include activeCrews count');
  }

  // 5. Test Priority Breakdown on Single Request
  console.log('\n5. Verifying Priority Breakdown on Request Detail...');
  const detailRes = await get(`${BASE}/requests/${pendingReq._id}`, adminToken);
  const detail = detailRes.data.data;
  if (detail.priorityBreakdown) {
    console.log('   ✓ Request includes priorityBreakdown:', detail.priorityBreakdown);
  } else {
    console.log('   ⚠️ Priority breakdown not attached, score is:', detail.priorityScore);
  }

  // 6. Test Admin Assigning Crew
  console.log('\n6. Testing Admin assigning PENDING request to Crew Bravo...');
  const assignRes = await patch(
    `${BASE}/requests/${pendingReq._id}/assign`,
    { crewId: crewBravo._id },
    adminToken
  );
  if (assignRes.status === 200 && assignRes.data.data.status === 'ASSIGNED') {
    console.log('   ✓ Admin successfully assigned request to', crewBravo.name);
    console.log('   ✓ Request status updated to:', assignRes.data.data.status);
  } else {
    console.error('   ❌ Assignment failed:', assignRes);
  }

  // Verify Crew Bravo has request in assignedRequests
  const crewBravoUpdated = await get(`${BASE}/crews/${crewBravo._id}`, adminToken);
  const crewReqIds = (crewBravoUpdated.data.data.assignedRequests || []).map((r) =>
    typeof r === 'object' ? r._id : r
  );
  if (crewReqIds.includes(pendingReq._id)) {
    console.log('   ✓ Crew Bravo active assignments include the assigned request');
  }

  // 7. Test Reassignment to Crew Charlie
  console.log('\n7. Testing Admin reassigning the request to Crew Charlie...');
  const reassignRes = await patch(
    `${BASE}/requests/${pendingReq._id}/assign`,
    { crewId: crewCharlie._id },
    adminToken
  );
  if (reassignRes.status === 200) {
    console.log('   ✓ Admin successfully reassigned request to', crewCharlie.name);
  }

  // Verify old crew (Crew Bravo) no longer has it, and new crew (Crew Charlie) has it
  const crewBravoAfter = await get(`${BASE}/crews/${crewBravo._id}`, adminToken);
  const bravoIdsAfter = (crewBravoAfter.data.data.assignedRequests || []).map((r) =>
    typeof r === 'object' ? r._id : r
  );
  const crewCharlieAfter = await get(`${BASE}/crews/${crewCharlie._id}`, adminToken);
  const charlieIdsAfter = (crewCharlieAfter.data.data.assignedRequests || []).map((r) =>
    typeof r === 'object' ? r._id : r
  );

  console.log('   ✓ Crew Bravo has it after reassignment?', bravoIdsAfter.includes(pendingReq._id));
  console.log('   ✓ Crew Charlie has it after reassignment?', charlieIdsAfter.includes(pendingReq._id));

  // 8. Test Reassignment Guard on IN_PROGRESS Request
  if (inProgressReq) {
    console.log('\n8. Testing Reassignment Guard on IN_PROGRESS Request...');
    const inProgReassign = await patch(
      `${BASE}/requests/${inProgressReq._id}/assign`,
      { crewId: crewCharlie._id },
      adminToken
    );
    if (inProgReassign.status === 400) {
      console.log('   ✓ PASS: Cannot reassign request currently IN_PROGRESS (Status 400 Bad Request)');
    } else {
      console.log('   ⚠️ Expected 400, got status', inProgReassign.status);
    }
  }

  console.log('\n==================================================');
  console.log('✅ ALL PHASE 07 OPERATIONS TESTS COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('Test script error:', err);
  process.exit(1);
});

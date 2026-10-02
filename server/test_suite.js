// Comprehensive End-to-End Verification Test Suite
const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🚀 Starting EcoSaathi End-to-End Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('--- 1. Health Check ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health returned 200');
    assert(healthJson.status === 'OK', 'Health status is OK');

    // 2. Admin Login
    console.log('\n--- 2. Admin Authentication ---');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ecoroute.demo', password: 'admin123' })
    });
    const adminLoginJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login succeeded');
    const adminToken = adminLoginJson.data?.token;
    assert(adminLoginJson.data?.user?.role === 'admin', 'Admin role confirmed');

    // 3. Resident Registration & Pickup Request with Real GPS Coordinates
    console.log('\n--- 3. Resident Geolocation & Pickup Request ---');
    const resTimestamp = Date.now();
    const residentEmail = `resident_${resTimestamp}@ecosaathi.demo`;
    const resRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aarav Mehta',
        email: residentEmail,
        password: 'password123',
        phone: '9820112233',
        role: 'resident'
      })
    });
    const resRegJson = await resRegRes.json();
    assert(resRegRes.status === 201, 'Resident registration succeeded');
    const residentToken = resRegJson.data?.token;

    // Create pickup with real GPS coords (Bandra West)
    const realLat = 19.0596;
    const realLng = 72.8295;
    const createReqRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`
      },
      body: JSON.stringify({
        wasteType: 'plastic',
        quantity: 'medium',
        location: {
          latitude: realLat,
          longitude: realLng,
          address: 'Hill Road, Bandra West, Mumbai, Maharashtra 400050'
        },
        description: 'Clean plastic bottles and cardboard packaging'
      })
    });
    const createReqJson = await createReqRes.json();
    assert(createReqRes.status === 201, 'Resident created pickup request with GPS coordinates');
    const newRequest = createReqJson.data;
    assert(Math.abs(newRequest.location.latitude - realLat) < 0.0001, 'Request saved exact latitude');
    assert(Math.abs(newRequest.location.longitude - realLng) < 0.0001, 'Request saved exact longitude');
    assert(newRequest.location.address.includes('Bandra'), 'Request saved address correctly');

    // 4. Crew Registration -> PENDING_VERIFICATION
    console.log('\n--- 4. Crew Registration & Verification Lifecycle ---');
    const crewTimestamp = Date.now();
    const crewEmail = `newcrew_${crewTimestamp}@ecosaathi.demo`;
    const crewRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunil Gavaskar',
        email: crewEmail,
        password: 'password123',
        phone: '9876543210',
        vehicleNumber: 'MH02TEST99',
        role: 'crew'
      })
    });
    const crewRegJson = await crewRegRes.json();
    assert(crewRegRes.status === 201, 'Crew registration succeeded');
    const crewToken = crewRegJson.data?.token;
    assert(crewRegJson.data?.user?.role === 'crew', 'User role is crew');
    assert(crewRegJson.data?.user?.crewProfile != null, 'Linked CollectionCrew document created');
    assert(
      crewRegJson.data?.user?.crewProfile?.verificationStatus === 'PENDING_VERIFICATION',
      'Crew verificationStatus initialized to PENDING_VERIFICATION'
    );
    const newCrewId = crewRegJson.data?.user?.crewProfile?._id;

    // 5. Unapproved Crew Operational Blockade
    console.log('\n--- 5. Unapproved Crew Security Checks ---');
    // a) Attempt to access my-route
    const unapprovedRouteRes = await fetch(`${BASE_URL}/api/routes/my-route`, {
      headers: { Authorization: `Bearer ${crewToken}` }
    });
    assert(unapprovedRouteRes.status === 403, 'Unapproved crew blocked from Smart Route API (403)');

    // b) Attempt to access my assigned requests
    const unapprovedPickupsRes = await fetch(`${BASE_URL}/api/crew/requests`, {
      headers: { Authorization: `Bearer ${crewToken}` }
    });
    const unapprovedPickupsJson = await unapprovedPickupsRes.json();
    assert(unapprovedPickupsRes.status === 200, 'Crew requests endpoint responded');
    assert(unapprovedPickupsJson.data.length === 0, 'Unapproved crew receives 0 assigned requests');
    assert(
      unapprovedPickupsJson.crew?.verificationStatus === 'PENDING_VERIFICATION',
      'Crew profile returned indicates PENDING_VERIFICATION'
    );

    // c) Admin tries to assign request to pending crew -> MUST FAIL with 400
    const assignPendingRes = await fetch(`${BASE_URL}/api/requests/${newRequest._id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ crewId: newCrewId })
    });
    const assignPendingJson = await assignPendingRes.json();
    assert(assignPendingRes.status === 400, 'Assignment to pending crew blocked (400)');
    assert(
      assignPendingJson.message.includes('not been approved'),
      'Returned clear error message: ' + assignPendingJson.message
    );

    // 6. Admin Verification Queue & Approval
    console.log('\n--- 6. Admin Verification & Approval ---');
    // Query pending crews
    const pendingListRes = await fetch(`${BASE_URL}/api/crews?verificationStatus=PENDING_VERIFICATION`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const pendingListJson = await pendingListRes.json();
    const foundPending = pendingListJson.data.some((c) => c._id === newCrewId);
    assert(foundPending, 'Newly registered crew appears in Admin Verification Queue');

    // Admin approves crew
    const approveRes = await fetch(`${BASE_URL}/api/crews/${newCrewId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    const approveJson = await approveRes.json();
    assert(approveRes.status === 200, 'Admin approval endpoint returned 200');
    assert(approveJson.data.verificationStatus === 'APPROVED', 'Crew verificationStatus is now APPROVED');
    assert(approveJson.data.status === 'AVAILABLE', 'Crew operational status set to AVAILABLE');
    assert(approveJson.data.verifiedBy != null, 'verifiedBy field recorded');

    // 7. Assignment to newly approved crew
    console.log('\n--- 7. Assignment & Operations for Approved Crew ---');
    const assignApprovedRes = await fetch(`${BASE_URL}/api/requests/${newRequest._id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ crewId: newCrewId })
    });
    assert(assignApprovedRes.status === 200, 'Assignment to approved crew succeeded');

    // Verify crew can now see assigned task
    const approvedPickupsRes = await fetch(`${BASE_URL}/api/crew/requests`, {
      headers: { Authorization: `Bearer ${crewToken}` }
    });
    const approvedPickupsJson = await approvedPickupsRes.json();
    assert(approvedPickupsJson.data.length >= 1, 'Approved crew now sees assigned pickup');

    // Verify crew can now generate Smart Route
    const approvedRouteRes = await fetch(`${BASE_URL}/api/routes/my-route`, {
      headers: { Authorization: `Bearer ${crewToken}` }
    });
    const approvedRouteJson = await approvedRouteRes.json();
    assert(approvedRouteRes.status === 200, 'Approved crew can now generate Smart Route');
    assert(approvedRouteJson.data?.orderedStops?.length >= 1, 'Smart route contains ordered collection stops');

    // 8. Rejection Lifecycle Test
    console.log('\n--- 8. Rejection Lifecycle Test ---');
    const rejCrewEmail = `rejcrew_${Date.now()}@ecosaathi.demo`;
    const rejRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rejected Candidate',
        email: rejCrewEmail,
        password: 'password123',
        phone: '9988776655',
        vehicleNumber: 'MH03REJECT',
        role: 'crew'
      })
    });
    const rejRegJson = await rejRegRes.json();
    const rejCrewId = rejRegJson.data?.user?.crewProfile?._id;
    const rejToken = rejRegJson.data?.token;

    // Admin rejects candidate
    const rejectRes = await fetch(`${BASE_URL}/api/crews/${rejCrewId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'REJECTED',
        rejectionReason: 'Invalid driving license and registration certificate.'
      })
    });
    const rejectJson = await rejectRes.json();
    assert(rejectRes.status === 200, 'Admin rejection succeeded');
    assert(rejectJson.data.verificationStatus === 'REJECTED', 'Status marked REJECTED');
    assert(
      rejectJson.data.rejectionReason.includes('Invalid driving license'),
      'Rejection reason recorded'
    );

    // Rejected crew blocked from operations
    const rejRouteRes = await fetch(`${BASE_URL}/api/routes/my-route`, {
      headers: { Authorization: `Bearer ${rejToken}` }
    });
    assert(rejRouteRes.status === 403, 'Rejected crew blocked from route generation (403)');

    // 9. RBAC Verification
    console.log('\n--- 9. RBAC Security Protections ---');
    // Resident attempting to call verification API
    const residentVerifyRes = await fetch(`${BASE_URL}/api/crews/${newCrewId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${residentToken}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert(residentVerifyRes.status === 403, 'Resident forbidden from verifying crew (403)');

    // Crew attempting to approve another or themselves
    const crewVerifyRes = await fetch(`${BASE_URL}/api/crews/${rejCrewId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${crewToken}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert(crewVerifyRes.status === 403, 'Crew forbidden from verifying crew (403)');

    console.log(`\n========================================`);
    console.log(`Test Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite encountered unhandled exception:', err);
    process.exit(1);
  }
}

runTests();

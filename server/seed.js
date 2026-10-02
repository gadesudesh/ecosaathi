/**
 * seed.js — EcoSaathi Demo Data Seeder
 *
 * ⚠️  WARNING: This script CLEARS existing Users, PickupRequests,
 *     and CollectionCrews before inserting fresh demo data.
 *     DO NOT run against a production database.
 *
 * Usage:  npm run seed
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");
const bcrypt = require("bcryptjs");

// Windows ISP DNS resolvers often fail SRV record lookups for mongodb+srv
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Fallback gracefully
}

dotenv.config();

// Safety guard: Protect production databases from accidental wipe
if (process.env.NODE_ENV === "production" && !process.env.FORCE_SEED) {
  console.error("❌ Refusing to run demo seed script in production environment without FORCE_SEED=true.");
  process.exit(1);
}

const User = require("./models/User");
const PickupRequest = require("./models/PickupRequest");
const CollectionCrew = require("./models/CollectionCrew");
const { calculatePriorityScore } = require("./utils/priorityCalculator");

// ── Demo Users ────────────────────────────────────────────────────────────────
const USERS = [
  {
    name: "Admin Ecoroute",
    email: "admin@ecoroute.demo",
    password: "admin123",
    phone: "9000000001",
    role: "admin",
  },
  {
    name: "Rahul Sharma",
    email: "rahul@ecoroute.demo",
    password: "resident123",
    phone: "9111111101",
    role: "resident",
  },
  {
    name: "Priya Mehta",
    email: "priya@ecoroute.demo",
    password: "resident123",
    phone: "9111111102",
    role: "resident",
  },
  {
    name: "Anil Desai",
    email: "anil@ecoroute.demo",
    password: "resident123",
    phone: "9111111103",
    role: "resident",
  },
  {
    name: "Crew Alpha Lead",
    email: "crew@ecoroute.demo",
    password: "crew123",
    phone: "9222000001",
    role: "crew",
  },
  {
    name: "Crew Bravo Lead",
    email: "crew.bravo@ecoroute.demo",
    password: "crew123",
    phone: "9222000002",
    role: "crew",
  },
];

// ── Demo Crews ────────────────────────────────────────────────────────────────
const CREWS = [
  {
    name: "Crew Alpha",
    phone: "9222000001",
    vehicleNumber: "MH01AB1001",
    status: "AVAILABLE",
    currentLocation: { latitude: 19.1136, longitude: 72.8697 }, // Andheri
  },
  {
    name: "Crew Bravo",
    phone: "9222000002",
    vehicleNumber: "MH01AB1002",
    status: "AVAILABLE",
    currentLocation: { latitude: 19.0544, longitude: 72.8405 }, // Bandra
  },
  {
    name: "Crew Charlie",
    phone: "9222000003",
    vehicleNumber: "MH01AB1003",
    status: "AVAILABLE",
    currentLocation: { latitude: 19.0176, longitude: 72.8562 }, // Dadar
  },
];

// ── Mumbai area coordinates (spread across zones) ─────────────────────────────
const LOCATIONS = [
  { latitude: 19.1136, longitude: 72.8697, address: "Andheri West, Mumbai" },
  { latitude: 19.1197, longitude: 72.8462, address: "Andheri East, Mumbai" },
  { latitude: 19.0544, longitude: 72.8405, address: "Bandra West, Mumbai" },
  { latitude: 19.0607, longitude: 72.8362, address: "Bandra Kurla Complex, Mumbai" },
  { latitude: 19.0176, longitude: 72.8562, address: "Dadar, Mumbai" },
  { latitude: 19.0728, longitude: 72.8826, address: "Kurla, Mumbai" },
  { latitude: 19.1215, longitude: 72.9068, address: "Powai, Mumbai" },
  { latitude: 19.2307, longitude: 72.8567, address: "Borivali West, Mumbai" },
  { latitude: 19.0759, longitude: 72.8776, address: "Dharavi, Mumbai" },
  { latitude: 18.9647, longitude: 72.8258, address: "Colaba, Mumbai" },
];

// ── Pickup request templates ──────────────────────────────────────────────────
const REQUEST_TEMPLATES = [
  { wasteType: "plastic",      quantity: "large",  urgency: "high",   description: "Large pile of plastic waste near the main gate"        },
  { wasteType: "organic",      quantity: "medium", urgency: "high",   description: "Rotting organic waste causing foul smell"               },
  { wasteType: "e-waste",      quantity: "small",  urgency: "high",   description: "Old electronics dumped outside apartment complex"       },
  { wasteType: "construction", quantity: "large",  urgency: "medium", description: "Renovation debris blocking footpath"                   },
  { wasteType: "mixed",        quantity: "large",  urgency: "high",   description: "Mixed garbage not collected for 3 days"                 },
  { wasteType: "paper",        quantity: "medium", urgency: "low",    description: "Cardboard boxes from recent deliveries"                 },
  { wasteType: "plastic",      quantity: "small",  urgency: "low",    description: "Plastic bags near community garden"                     },
  { wasteType: "organic",      quantity: "large",  urgency: "medium", description: "Market vegetable waste — needs urgent pickup"           },
  { wasteType: "e-waste",      quantity: "medium", urgency: "medium", description: "CRT monitors and old printers at junction"              },
  { wasteType: "construction", quantity: "medium", urgency: "low",    description: "Old tiles and broken cement blocks"                     },
  { wasteType: "mixed",        quantity: "small",  urgency: "medium", description: "Household garbage bag left on roadside"                 },
  { wasteType: "plastic",      quantity: "large",  urgency: "high",   description: "Water bottles and packaging from event — very urgent"   },
];

// ── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // ── Clear existing demo data ──────────────────────────────────────────
    console.log("🗑️  Clearing existing collections and indexes...");
    await PickupRequest.collection.drop().catch(() => {});
    await CollectionCrew.collection.drop().catch(() => {});
    await User.collection.drop().catch(() => {});
    console.log("   Users, PickupRequests, CollectionCrews cleared\n");

    // ── Insert users with hashed passwords ───────────────────────────────
    console.log("👤 Inserting demo users with hashed passwords...");
    const hashedUsers = await Promise.all(
      USERS.map(async (u) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(u.password, salt);
        return { ...u, password: hashedPassword };
      })
    );
    const createdUsers = await User.insertMany(hashedUsers);
    createdUsers.forEach((u) => console.log(`   ${u.role.padEnd(10)} → ${u.name} (${u.email})`));

    // Separate residents from admins/crew for pickup request creation
    const residents = createdUsers.filter((u) => u.role === "resident");
    const crewAlphaUser = createdUsers.find((u) => u.email === "crew@ecoroute.demo");
    const crewBravoUser = createdUsers.find((u) => u.email === "crew.bravo@ecoroute.demo");

    // ── Insert crews linked to user accounts ──────────────────────────────
    console.log("\n🚛 Inserting demo collection crews...");
    const crewsToInsert = CREWS.map((c, idx) => {
      if (idx === 0 && crewAlphaUser) return { ...c, user: crewAlphaUser._id };
      if (idx === 1 && crewBravoUser) return { ...c, user: crewBravoUser._id };
      return c;
    });
    const createdCrews = await CollectionCrew.insertMany(crewsToInsert);
    createdCrews.forEach((c) => console.log(`   ${c.name} — ${c.vehicleNumber} (${c.status})`));

    // ── Insert pickup requests ────────────────────────────────────────────
    console.log("\n📦 Inserting demo pickup requests...");

    const requestsToInsert = REQUEST_TEMPLATES.map((template, index) => {
      const resident = residents[index % residents.length];
      const location = LOCATIONS[index % LOCATIONS.length];

      // Simulate some requests being older (for waiting-time priority scoring)
      const hoursAgo = [0, 1, 3, 6, 12, 24, 36, 48, 2, 8, 18, 5][index] || 0;
      const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      return {
        requestId: `REQ-2024-${String(index + 1).padStart(3, "0")}`,
        resident: resident._id,
        ...template,
        location,
        status: "PENDING",
        createdAt,
        updatedAt: createdAt,
      };
    });

    // Insert without priority scores first
    const createdRequests = await PickupRequest.insertMany(requestsToInsert);

    // Calculate and save priority scores for each
    for (const request of createdRequests) {
      const { priorityScore, priorityLevel } = calculatePriorityScore(request);
      await PickupRequest.findByIdAndUpdate(request._id, { priorityScore, priorityLevel });
    }

    // ── Assign requests to Crew Alpha to simulate real crew workflow ─────────
    console.log("\n🔗 Assigning 6 requests to Crew Alpha for demo workflow...");
    const alphaId = createdCrews[0]._id;

    // Fetch freshly scored requests
    const scoredRequests = await PickupRequest.find();

    const highOrCritical = scoredRequests.filter(r => ["CRITICAL", "HIGH"].includes(r.priorityLevel));
    const mediumList     = scoredRequests.filter(r => r.priorityLevel === "MEDIUM");
    const lowList        = scoredRequests.filter(r => r.priorityLevel === "LOW");

    // 1 IN_PROGRESS (High/Critical)
    const inProgressReq = highOrCritical[0] || scoredRequests[0];
    // 2 HIGH priority ASSIGNED
    const highAssigned1 = highOrCritical[1] || scoredRequests[1];
    const highAssigned2 = highOrCritical[2] || scoredRequests[2];
    // 2 MEDIUM priority ASSIGNED
    const medAssigned1  = mediumList[0] || scoredRequests[3];
    const medAssigned2  = mediumList[1] || scoredRequests[4];
    // 1 LOW priority ASSIGNED
    const lowAssigned   = lowList[0] || scoredRequests[5];

    const alphaActive = [inProgressReq, highAssigned1, highAssigned2, medAssigned1, medAssigned2, lowAssigned];

    // Set IN_PROGRESS
    await PickupRequest.findByIdAndUpdate(inProgressReq._id, {
      status: "IN_PROGRESS",
      assignedCrew: alphaId,
    });

    // Set ASSIGNED for the other 5
    for (const req of [highAssigned1, highAssigned2, medAssigned1, medAssigned2, lowAssigned]) {
      await PickupRequest.findByIdAndUpdate(req._id, {
        status: "ASSIGNED",
        assignedCrew: alphaId,
      });
    }

    // Give Crew Alpha 2 past completed requests for stats
    const pastCompleted1 = scoredRequests.find(r => !alphaActive.some(a => a._id.toString() === r._id.toString()));
    const pastCompleted2 = scoredRequests.find(r => !alphaActive.some(a => a._id.toString() === r._id.toString()) && r._id.toString() !== pastCompleted1?._id.toString());

    if (pastCompleted1) {
      await PickupRequest.findByIdAndUpdate(pastCompleted1._id, {
        status: "COMPLETED",
        assignedCrew: alphaId,
      });
    }
    if (pastCompleted2) {
      await PickupRequest.findByIdAndUpdate(pastCompleted2._id, {
        status: "COMPLETED",
        assignedCrew: alphaId,
      });
    }

    await CollectionCrew.findByIdAndUpdate(alphaId, {
      status: "BUSY",
      assignedRequests: alphaActive.map(r => r._id),
      completedRequests: (pastCompleted1 ? 1 : 0) + (pastCompleted2 ? 1 : 0),
    });

    // Mark one request as COMPLETED for Crew Bravo
    const bravoId = createdCrews[1]._id;
    const remainingForBravo = scoredRequests.find(r => 
      !alphaActive.some(a => a._id.toString() === r._id.toString()) &&
      r._id.toString() !== pastCompleted1?._id.toString() &&
      r._id.toString() !== pastCompleted2?._id.toString()
    );
    if (remainingForBravo) {
      await PickupRequest.findByIdAndUpdate(remainingForBravo._id, {
        status: "COMPLETED",
        assignedCrew: bravoId,
      });
      await CollectionCrew.findByIdAndUpdate(bravoId, {
        completedRequests: 1,
      });
    }

    console.log("   Crew Alpha: 6 requests assigned (1 IN_PROGRESS, 2 HIGH, 2 MEDIUM, 1 LOW)");
    console.log("   Crew Alpha: 2 past requests marked COMPLETED");

    // ── Summary ───────────────────────────────────────────────────────────
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Seed complete!\n");
    console.log(`   Users inserted:    ${createdUsers.length}`);
    console.log(`   Crews inserted:    ${createdCrews.length}`);
    console.log(`   Requests inserted: ${createdRequests.length}`);
    console.log("\n📧 Demo login credentials (no auth yet — just for reference):");
    USERS.forEach((u) => console.log(`   ${u.role.padEnd(10)} ${u.email}  /  ${u.password}`));
    console.log("\n🚀 Start the server:  npm run dev");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
}

seed();

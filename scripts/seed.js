const { pool } = require("../lib/db");
const { generateOtp, hashPassword } = require("../lib/auth");

const DEFAULT_USERS = [
  { email: "admin@example.com", password: "1234", name: "Admin", role: "admin", cardId: "7A3B21" },
  { email: "kevin@example.com", password: "1234", name: "Kevin", role: "gjest", cardId: "9F8C11" },
  { email: "dawid@example.com", password: "1234", name: "Dawid", role: "gjest", cardId: "AB19F2" },
  { email: "philip@example.com", password: "1234", name: "Philip", role: "gjest", cardId: "4DA221" },
  { email: "andreas@example.com", password: "1234", name: "Andreas", role: "gjest", cardId: "6BC452" },
  { email: "ludvig@example.com", password: "1234", name: "Ludvig", role: "gjest", cardId: "2ED783" },
  { email: "bedrihan@example.com", password: "1234", name: "Bedrihan", role: "gjest", cardId: "5FA904" }
];

async function insertUsers() {
  for (const user of DEFAULT_USERS) {
    const passwordHash = await hashPassword(user.password);
    const otpCode = generateOtp();

    await pool.execute(
      `
        INSERT INTO users (name, email, password_hash, role, card_id, otp_code)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          password_hash = VALUES(password_hash),
          role = VALUES(role),
          otp_code = VALUES(otp_code)
      `,
      [user.name, user.email, passwordHash, user.role, user.cardId, otpCode]
    );
  }
}

async function insertEvents() {
  const [users] = await pool.execute("SELECT id, name, card_id FROM users");
  const usersByCardId = new Map(users.map((user) => [user.card_id, user]));

  const events = [
    { cardId: "AB19F2", action: "deactivate_alarm", room: "Gang B", hoursAgo: 1.5 },
    { cardId: "9F8C11", action: "unlock_door", room: "Inngang A", hoursAgo: 0.7 },
    { cardId: "4DA221", action: "activate_alarm", room: "Lab 2", hoursAgo: 4 },
    { cardId: "7A3B21", action: "unlock_door", room: "Resepsjon", hoursAgo: 18 },
    { cardId: "2ED783", action: "unlock_door", room: "Inngang A", hoursAgo: 27 }
  ];

  await pool.execute("DELETE FROM events");

  for (const event of events) {
    const matchedUser = usersByCardId.get(event.cardId);
    const createdAt = new Date(Date.now() - event.hoursAgo * 60 * 60 * 1000);

    await pool.execute(
      `
        INSERT INTO events (user_id, name_snapshot, card_id, action, room, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        matchedUser ? matchedUser.id : null,
        matchedUser ? matchedUser.name : "Ukjent kort",
        event.cardId,
        event.action,
        event.room,
        createdAt
      ]
    );
  }
}

async function main() {
  await insertUsers();
  await insertEvents();
  console.log("Database seeded with demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

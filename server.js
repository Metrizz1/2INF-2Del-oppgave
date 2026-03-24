const path = require("node:path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const { query, pool, withTransaction } = require("./lib/db");
const { generateCardId, generateOtp, generateSessionToken, hashPassword, verifyPassword } = require("./lib/auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map();
const ACTIONS = new Set(["unlock_door", "lock_door", "deactivate_alarm", "activate_alarm", "deny_access"]);

app.use(express.json());

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCardId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeUsername(value) {
  const sanitized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

  return sanitized || "bruker";
}

function serializeTimestamp(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function roleFromRow(row) {
  if (row?.rolle === "owner") {
    return "owner";
  }

  if (row?.rolle === "admin") {
    return "admin";
  }

  if (Number(row?.er_admin) === 1) {
    return "admin";
  }

  return "gjest";
}

function flagFromRole(role) {
  return role === "admin" || role === "owner" ? 1 : 0;
}

function serializeUser(row) {
  return {
    id: row.id,
    name: row.fullt_navn,
    email: row.e_post,
    role: roleFromRow(row),
    cardId: row.kort_id || ""
  };
}

function getTokenFromRequest(request) {
  const header = request.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

async function verifyStoredPassword(inputPassword, storedPassword) {
  if (!storedPassword) {
    return false;
  }

  if (storedPassword.includes(":")) {
    return verifyPassword(inputPassword, storedPassword);
  }

  return storedPassword === inputPassword;
}

async function loadUserById(userId) {
  const rows = await query(
    `
      SELECT b.id, b.fullt_navn, b.brukernavn, b.passord, b.e_post, b.pinkode, b.er_admin, k.kort_id
      , b.rolle
      FROM brukere b
      LEFT JOIN kort k ON k.bruker_id = b.id
      WHERE b.id = ?
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

async function requireAuth(request, response, next) {
  try {
    const token = getTokenFromRequest(request);

    if (!token || !sessions.has(token)) {
      response.status(401).json({ error: "Ikke logget inn." });
      return;
    }

    const userId = sessions.get(token);
    const user = await loadUserById(userId);

    if (!user) {
      sessions.delete(token);
      response.status(401).json({ error: "Sesjonen er ikke lenger gyldig." });
      return;
    }

    request.authToken = token;
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(request, response, next) {
  if (!["admin", "owner"].includes(roleFromRow(request.user))) {
    response.status(403).json({ error: "Bare administratorer har tilgang." });
    return;
  }

  next();
}

async function generateAvailableCardId(connection = pool) {
  let cardId = generateCardId();

  while (true) {
    const [rows] = await connection.execute("SELECT kort_id FROM kort WHERE kort_id = ?", [cardId]);
    if (!rows.length) {
      return cardId;
    }

    cardId = generateCardId();
  }
}

async function generateAvailableUsername(connection, name, email) {
  const preferred = normalizeUsername(email.split("@")[0] || name);
  let candidate = preferred;
  let suffix = 1;

  while (true) {
    const [rows] = await connection.execute("SELECT id FROM brukere WHERE brukernavn = ?", [candidate]);
    if (!rows.length) {
      return candidate;
    }

    candidate = `${preferred}${suffix}`;
    suffix += 1;
  }
}

async function fetchUsers() {
  return query(
    `
      SELECT b.id, b.fullt_navn, b.brukernavn, b.passord, b.e_post, b.pinkode, b.er_admin, k.kort_id
      , b.rolle
      FROM brukere b
      LEFT JOIN kort k ON k.bruker_id = b.id
      ORDER BY b.fullt_navn ASC
    `
  );
}

function buildUserMapByCardId(users) {
  const map = new Map();

  for (const user of users) {
    if (user.kort_id) {
      map.set(normalizeCardId(user.kort_id), user);
    }
  }

  return map;
}

async function fetchEvents(users) {
  const usersByCardId = buildUserMapByCardId(users);

  const [scanRows, signalRows] = await Promise.all([
    query(
      `
        SELECT id, kort_id, skannet_tid, tastet_pin, er_admin
        FROM skannelogg
        ORDER BY skannet_tid DESC
      `
    ),
    query(
      `
        SELECT id, sensor_navn, verdi, suffiks, mottatt_tid
        FROM nodered_signaler
        WHERE sensor_navn LIKE 'webapp:%'
        ORDER BY mottatt_tid DESC
      `
    )
  ]);

  const signalEvents = signalRows
    .map((row) => {
      const cardId = normalizeCardId(row.sensor_navn.replace(/^webapp:/, ""));
      const user = usersByCardId.get(cardId);
      const action = ACTIONS.has(row.verdi) ? row.verdi : "unlock_door";

      return {
        id: `signal-${row.id}`,
        name: user ? user.fullt_navn : "Ukjent kort",
        cardId,
        action,
        room: row.suffiks || "Ukjent",
        timestamp: serializeTimestamp(row.mottatt_tid)
      };
    });

  const appSignalIndex = new Set(
    signalEvents.map((event) => `${event.cardId}|${new Date(event.timestamp).getTime()}`)
  );

  const scanEvents = scanRows
    .map((row) => {
      const cardId = normalizeCardId(row.kort_id);
      const user = usersByCardId.get(cardId);
      const timestamp = serializeTimestamp(row.skannet_tid);

      return {
        id: `scan-${row.id}`,
        name: user ? user.fullt_navn : "Ukjent kort",
        cardId,
        action: "unlock_door",
        room: "Kortleser",
        timestamp
      };
    })
    .filter((event) => !appSignalIndex.has(`${event.cardId}|${new Date(event.timestamp).getTime()}`));

  return [...signalEvents, ...scanEvents].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

async function fetchBootstrapPayload(currentUser) {
  const users = await fetchUsers();
  const events = await fetchEvents(users);

  return {
    currentUser: serializeUser(currentUser),
    users: users.map(serializeUser),
    events
  };
}

app.get("/api/health", async (request, response, next) => {
  try {
    await query("SELECT 1");
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || "");

    if (!email || !password) {
      response.status(400).json({ error: "E-post og passord er påkrevd." });
      return;
    }

    const rows = await query(
      `
      SELECT b.id, b.fullt_navn, b.brukernavn, b.passord, b.e_post, b.pinkode, b.er_admin, k.kort_id
      , b.rolle
      FROM brukere b
        LEFT JOIN kort k ON k.bruker_id = b.id
        WHERE b.e_post = ?
        LIMIT 1
      `,
      [email]
    );

    const user = rows[0];
    if (!user || !(await verifyStoredPassword(password, user.passord))) {
      response.status(401).json({ error: "Feil e-postadresse eller passord." });
      return;
    }

    response.json({
      message: "Bekreftelseskode sendt til e-post.",
      email: user.e_post,
      otpPreview: user.pinkode
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (request, response) => {
  response.json(serializeUser(request.user));
});

app.post("/api/auth/signup", async (request, response, next) => {
  try {
    const name = normalizeName(request.body.name);
    const email = normalizeEmail(request.body.email);
    const password = String(request.body.password || "");
    const requestedCardId = normalizeCardId(request.body.cardId);

    if (name.length < 2) {
      response.status(400).json({ error: "Skriv inn et gyldig navn." });
      return;
    }

    if (password.length < 4) {
      response.status(400).json({ error: "Passordet må være minst 4 tegn." });
      return;
    }

    const result = await withTransaction(async (connection) => {
      const [existingUsers] = await connection.execute("SELECT id FROM brukere WHERE e_post = ? FOR UPDATE", [email]);
      if (existingUsers.length) {
        return { status: 409, payload: { error: "E-postadressen finnes allerede." } };
      }

      if (requestedCardId) {
        const [cardMatches] = await connection.execute("SELECT kort_id FROM kort WHERE kort_id = ? FOR UPDATE", [requestedCardId]);
        if (cardMatches.length) {
          return { status: 409, payload: { error: "Kort-ID finnes allerede." } };
        }
      }

      const [userCountRows] = await connection.execute("SELECT COUNT(*) AS count FROM brukere");
      const roleValue = Number(userCountRows[0].count) === 0 ? "owner" : "gjest";
      const passwordHash = await hashPassword(password);
      const pinCode = generateOtp();
      const username = await generateAvailableUsername(connection, name, email);
      const cardId = requestedCardId || (await generateAvailableCardId(connection));

      const [insertResult] = await connection.execute(
        `
          INSERT INTO brukere (fullt_navn, brukernavn, passord, e_post, pinkode, er_admin, rolle)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [name, username, passwordHash, email, pinCode, flagFromRole(roleValue), roleValue]
      );

      await connection.execute("INSERT INTO kort (kort_id, bruker_id) VALUES (?, ?)", [cardId, insertResult.insertId]);

      return {
        status: 201,
        payload: {
          message: "Konto opprettet.",
          email,
          otpPreview: pinCode
        }
      };
    });

    response.status(result.status).json(result.payload);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-otp", async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email);
    const otp = String(request.body.otp || "").trim();

    if (!email || !otp) {
      response.status(400).json({ error: "E-post og bekreftelseskode er påkrevd." });
      return;
    }

    const rows = await query(
      `
        SELECT b.id, b.fullt_navn, b.brukernavn, b.passord, b.e_post, b.pinkode, b.er_admin, k.kort_id
        , b.rolle
        FROM brukere b
        LEFT JOIN kort k ON k.bruker_id = b.id
        WHERE b.e_post = ?
        LIMIT 1
      `,
      [email]
    );

    const user = rows[0];
    if (!user || String(user.pinkode) !== otp) {
      response.status(401).json({ error: "Ugyldig bekreftelseskode." });
      return;
    }

    const token = generateSessionToken();
    sessions.set(token, user.id);

    response.json({
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", requireAuth, async (request, response) => {
  sessions.delete(request.authToken);
  response.json({ ok: true });
});

app.get("/api/bootstrap", requireAuth, async (request, response, next) => {
  try {
    const payload = await fetchBootstrapPayload(request.user);
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post("/api/events", requireAuth, async (request, response, next) => {
  try {
    const cardId = normalizeCardId(request.body.cardId);
    const action = String(request.body.action || "");
    const room = String(request.body.room || "").trim() || "Ukjent";

    if (!cardId || !ACTIONS.has(action)) {
      response.status(400).json({ error: "Kort-ID og handling er påkrevd." });
      return;
    }

    await withTransaction(async (connection) => {
      const [userRows] = await connection.execute(
        `
          SELECT b.id, b.pinkode, b.er_admin
          FROM kort k
          INNER JOIN brukere b ON b.id = k.bruker_id
          WHERE k.kort_id = ?
          LIMIT 1
        `,
        [cardId]
      );

      const user = userRows[0] || null;
      const now = new Date();

      await connection.execute(
        `
          INSERT INTO skannelogg (kort_id, skannet_tid, tastet_pin, er_admin)
          VALUES (?, ?, ?, ?)
        `,
        [cardId, now, user ? user.pinkode : "000000", user ? Number(user.er_admin) : 0]
      );

      await connection.execute(
        `
          INSERT INTO nodered_signaler (sensor_navn, verdi, suffiks, mottatt_tid)
          VALUES (?, ?, ?, ?)
        `,
        [`webapp:${cardId}`, action, room, now]
      );
    });

    response.status(201).json({ message: "Hendelsen ble registrert." });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/events", requireAuth, requireAdmin, async (request, response, next) => {
  try {
    await withTransaction(async (connection) => {
      await connection.execute("DELETE FROM nodered_signaler");
      await connection.execute("DELETE FROM skannelogg");
    });

    response.json({ message: "Alle hendelser ble slettet." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users", requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const name = normalizeName(request.body.name);
    const requestedCardId = normalizeCardId(request.body.cardId);
    const role = request.body.role === "owner" ? "owner" : request.body.role === "admin" ? "admin" : "gjest";
    const email = normalizeEmail(request.body.email);

    if (!name || !email) {
      response.status(400).json({ error: "Navn og e-postadresse er påkrevd." });
      return;
    }

    const result = await withTransaction(async (connection) => {
      const [emailMatches] = await connection.execute("SELECT id FROM brukere WHERE e_post = ? FOR UPDATE", [email]);
      if (emailMatches.length) {
        return { status: 409, payload: { error: "E-post finnes allerede." } };
      }

      const cardId = requestedCardId || (await generateAvailableCardId(connection));
      const [cardMatches] = await connection.execute("SELECT kort_id FROM kort WHERE kort_id = ? FOR UPDATE", [cardId]);
      if (cardMatches.length) {
        return { status: 409, payload: { error: "Kort-ID finnes allerede." } };
      }

      const defaultPassword = "1234";
      const pinCode = generateOtp();
      const passwordHash = await hashPassword(defaultPassword);
      const username = await generateAvailableUsername(connection, name, email);

      const [insertResult] = await connection.execute(
        `
          INSERT INTO brukere (fullt_navn, brukernavn, passord, e_post, pinkode, er_admin, rolle)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [name, username, passwordHash, email, pinCode, flagFromRole(role), role]
      );

      await connection.execute("INSERT INTO kort (kort_id, bruker_id) VALUES (?, ?)", [cardId, insertResult.insertId]);

      return {
        status: 201,
        payload: {
          message: `${name} ble lagt til.`,
          defaultPassword,
          otpPreview: pinCode
        }
      };
    });

    response.status(result.status).json(result.payload);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:cardId", requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const cardId = normalizeCardId(request.params.cardId);
    const name = normalizeName(request.body.name);
    const role = request.body.role === "owner" ? "owner" : request.body.role === "admin" ? "admin" : "gjest";

    if (!name) {
      response.status(400).json({ error: "Navn kan ikke være tomt." });
      return;
    }

    const result = await withTransaction(async (connection) => {
      const [matches] = await connection.execute(
        `
          SELECT b.id, b.er_admin, b.rolle
          FROM kort k
          INNER JOIN brukere b ON b.id = k.bruker_id
          WHERE k.kort_id = ?
          FOR UPDATE
        `,
        [cardId]
      );

      const user = matches[0];
      if (!user) {
        return { status: 404, payload: { error: "Fant ikke brukeren." } };
      }

      if (roleFromRow(user) === "owner" && role !== "owner") {
        return { status: 400, payload: { error: "Eierkontoen kan ikke nedgraderes." } };
      }

      if (Number(user.er_admin) === 1 && role !== "admin") {
        const [adminRows] = await connection.execute("SELECT COUNT(*) AS count FROM brukere WHERE er_admin = 1");
        if (Number(adminRows[0].count) <= 1) {
          return { status: 400, payload: { error: "Du kan ikke fjerne administratorrettigheter fra den siste administratoren." } };
        }
      }

      await connection.execute("UPDATE brukere SET fullt_navn = ?, er_admin = ?, rolle = ? WHERE id = ?", [name, flagFromRole(role), role, user.id]);
      return { status: 200, payload: { message: `${name} ble oppdatert.` } };
    });

    response.status(result.status).json(result.payload);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/users/:cardId", requireAuth, requireAdmin, async (request, response, next) => {
  try {
    const cardId = normalizeCardId(request.params.cardId);

    const result = await withTransaction(async (connection) => {
      const [matches] = await connection.execute(
        `
          SELECT b.id, b.fullt_navn, b.er_admin, b.rolle
          FROM kort k
          INNER JOIN brukere b ON b.id = k.bruker_id
          WHERE k.kort_id = ?
          FOR UPDATE
        `,
        [cardId]
      );

      const user = matches[0];
      if (!user) {
        return { status: 404, payload: { error: "Fant ikke brukeren." } };
      }

      if (roleFromRow(user) === "owner") {
        return { status: 400, payload: { error: "Eierkontoen kan ikke slettes." } };
      }

      if (Number(user.er_admin) === 1) {
        const [adminRows] = await connection.execute("SELECT COUNT(*) AS count FROM brukere WHERE er_admin = 1");
        if (Number(adminRows[0].count) <= 1) {
          return { status: 400, payload: { error: "Du kan ikke slette den siste administratoren." } };
        }
      }

      await connection.execute("DELETE FROM kort WHERE bruker_id = ?", [user.id]);
      await connection.execute("DELETE FROM brukere WHERE id = ?", [user.id]);

      return { status: 200, payload: { message: `${user.fullt_navn} ble fjernet.` } };
    });

    if (result.status === 200 && normalizeCardId(request.user.kort_id) === cardId) {
      sessions.delete(request.authToken);
    }

    response.status(result.status).json(result.payload);
  } catch (error) {
    next(error);
  }
});

app.use(express.static(__dirname));

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ error: "Intern serverfeil." });
});

app.listen(PORT, () => {
  console.log(`SecureAccess server listening on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

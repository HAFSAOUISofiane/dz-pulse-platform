import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { signToken, authMiddleware } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const APP_BASE_URL = process.env.APP_URL ?? "http://localhost:80";
const GOOGLE_REDIRECT_URI = `${process.env.API_ORIGIN ?? "http://localhost:8080"}/auth/google/callback`;

function getGoogleClient() {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  const body = RegisterUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body", details: body.error.flatten() });
    return;
  }
  const { name, username, email, password, wilaya, ageRange } = body.data;

  try {
    const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existingEmail.length > 0) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (existingUsername.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        name,
        username,
        email,
        passwordHash,
        wilaya: wilaya ?? null,
        ageRange: ageRange ?? null,
      })
      .returning();

    const token = signToken({ userId: newUser.id, role: newUser.role });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl ?? null,
        bio: newUser.bio ?? null,
        wilaya: newUser.wilaya ?? null,
        ageRange: newUser.ageRange ?? null,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const body = LoginUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password } = body.data;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({ error: "Account suspended" });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio ?? null,
        wilaya: user.wilaya ?? null,
        ageRange: user.ageRange ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      wilaya: user.wilaya ?? null,
      ageRange: user.ageRange ?? null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/config", (_req, res) => {
  res.json({
    googleOAuthEnabled: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
  });
});

router.get("/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }
  const client = getGoogleClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "select_account",
  });
  res.redirect(url);
});

router.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.redirect(`${APP_BASE_URL}/login?error=google_no_code`);
    return;
  }
  try {
    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token!, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.redirect(`${APP_BASE_URL}/login?error=google_no_email`);
      return;
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name ?? email.split("@")[0];
    const avatarUrl = payload.picture ?? null;

    let [user] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.googleId, googleId), eq(usersTable.email, email)))
      .limit(1);

    if (!user) {
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
      let username = baseUsername;
      let attempt = 0;
      while (true) {
        const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
        if (existing.length === 0) break;
        attempt++;
        username = `${baseUsername}_${attempt}`;
      }

      [user] = await db
        .insert(usersTable)
        .values({ name, username, email, passwordHash: null, googleId, provider: "google", avatarUrl })
        .returning();
    } else if (!user.googleId) {
      [user] = await db.update(usersTable).set({ googleId, provider: "google", avatarUrl: user.avatarUrl ?? avatarUrl }).where(eq(usersTable.id, user.id)).returning();
    }

    if (user.status !== "active") {
      res.redirect(`${APP_BASE_URL}/login?error=suspended`);
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });
    res.redirect(`${APP_BASE_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    req.log.error(err);
    res.redirect(`${APP_BASE_URL}/login?error=google_failed`);
  }
});

export default router;

import { Hono } from "hono";
import type { Context, Next } from "hono";
import { join, dirname, fromFileUrl } from "@std/path";
import mongoose from "mongoose";

interface UserDoc extends mongoose.Document {
  email: string;
  passwordHash: string;
  verified: boolean;
  verificationToken?: string;
}

interface DomainDoc extends mongoose.Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  verified: boolean;
  verificationToken?: string;
}

interface PackageDoc extends mongoose.Document {
  identifier: string;
  name: string;
  version: string;
  description?: string;
  downloadUrl: string;
  sha256?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SessionInfo {
  expires: number;
  userId?: string;
}

const sessions = new Map<string, SessionInfo>();

function getCookie(req: Request, name: string): string | undefined {
  const cookie = req.headers.get("Cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v ?? "");
  }
}

async function auth(
  c: Context<{ Variables: { userId?: string } }>,
  next: Next,
) {
  if (
    ["/login", "/register"].includes(c.req.path) ||
    c.req.path.startsWith("/verify")
  ) {
    return await next();
  }
  const id = getCookie(c.req.raw, "session");
  if (!id) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = sessions.get(id);
  if (!session || session.expires < Date.now()) {
    sessions.delete(id);
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", session.userId);
  return await next();
}

const app = new Hono<{ Variables: { userId?: string } }>();
app.use("*", auth);

const rootDir = Deno.env.get("REGISTRY_DIR") ?? "./registry";
const adminPath = join(
  dirname(fromFileUrl(import.meta.url)),
  "public",
  "admin.html",
);
const mongoUri = Deno.env.get("MONGO_URI") ??
  "mongodb://localhost:27017/takoregistry";

await mongoose.connect(mongoUri);

const Package = mongoose.model(
  "Package",
  new mongoose.Schema({
    identifier: { type: String, required: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    description: String,
    downloadUrl: { type: String, required: true },
    sha256: String,
  }, { timestamps: true }),
);

const User = mongoose.model<UserDoc>(
  "User",
  new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verificationToken: String,
  }, { timestamps: true }),
);

const Domain = mongoose.model<DomainDoc>(
  "Domain",
  new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    verified: { type: Boolean, default: false },
    verificationToken: String,
  }, { timestamps: true }),
);

function hash(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", data).then((d) =>
    Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function identifierDomain(id: string): string | null {
  const parts = id.split(".");
  if (parts.length < 2) return null;
  return `${parts[1]}.${parts[0]}`;
}

function sendVerificationEmail(email: string, token: string): void {
  const base = Deno.env.get("VERIFY_BASE_URL") ?? "http://localhost:8080";
  const url = `${base}/verify/${token}`;
  console.log(`Verify ${email}: ${url}`);
}

app.post("/register", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "Bad request" }, 400);
    const existing = await User.findOne({ email });
    if (existing) return c.json({ error: "User exists" }, 400);
    const passwordHash = await hash(password);
    const verificationToken = crypto.randomUUID();
    await User.create({ email, passwordHash, verificationToken });
    await sendVerificationEmail(email, verificationToken);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Bad request" }, 400);
  }
});

app.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const envUser = Deno.env.get("REGISTRY_USER");
    const envPass = Deno.env.get("REGISTRY_PASS");
    let userId: string | undefined = undefined;
    if (envUser && envPass && email === envUser && password === envPass) {
      // ok
    } else {
      const user = await User.findOne({ email });
      if (!user || !user.verified) {
        return c.json({ error: "Invalid credentials" }, 401);
      }
      const passwordHash = await hash(password);
      if (passwordHash !== user.passwordHash) {
        return c.json({ error: "Invalid credentials" }, 401);
      }
      userId = user.id;
    }
    const id = crypto.randomUUID();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    sessions.set(id, { expires, userId });
    return c.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": `session=${id}; HttpOnly; Path=/; Max-Age=3600`,
        },
      },
    );
  } catch {
    return c.json({ error: "Bad request" }, 400);
  }
});

app.get("/verify/:token", async (c) => {
  const token = c.req.param("token");
  const user = await User.findOne({ verificationToken: token });
  if (!user) return c.json({ error: "Invalid token" }, 400);
  user.verified = true;
  user.verificationToken = undefined;
  await user.save();
  return c.json({ ok: true });
});

app.post("/domains/request", async (c) => {
  const userId = c.get("userId");
  try {
    const { domain } = await c.req.json();
    if (!domain) return c.json({ error: "Bad request" }, 400);
    const entry = await Domain.findOne({ name: domain });
    if (entry && String(entry.userId) !== String(userId)) {
      return c.json({ error: "Domain already claimed" }, 400);
    }
    const token = crypto.randomUUID();
    if (entry) {
      entry.userId = new mongoose.Types.ObjectId(userId);
      entry.verificationToken = token;
      entry.verified = false;
      await entry.save();
    } else {
      await Domain.create({
        name: domain,
        userId: new mongoose.Types.ObjectId(userId),
        verificationToken: token,
      });
    }
    console.log(
      `Verify domain ${domain} by adding TXT record takopack-verify=${token}`,
    );
    return c.json({ ok: true, token });
  } catch {
    return c.json({ error: "Bad request" }, 400);
  }
});

app.post("/domains/verify", async (c) => {
  const userId = c.get("userId");
  try {
    const { domain } = await c.req.json();
    const entry = await Domain.findOne({
      name: domain,
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!entry || !entry.verificationToken) {
      return c.json({ error: "Not found" }, 404);
    }
    const records = await Deno.resolveDns(domain, "TXT");
    const expect = `takopack-verify=${entry.verificationToken}`;
    if (!records.some((r) => r.includes(expect))) {
      return c.json({ error: "TXT record missing" }, 400);
    }
    entry.verified = true;
    entry.verificationToken = undefined;
    await entry.save();
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Verification failed" }, 400);
  }
});

app.get("/domains", async (c) => {
  const userId = c.get("userId");
  const domains = await Domain.find({
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  return c.json({
    domains: domains.map((d) => ({
      name: d.name,
      verified: d.verified,
    })),
  });
});

app.get("/admin", async (c) => {
  const html = await Deno.readTextFile(adminPath);
  return c.html(html);
});

async function getIndex(): Promise<{
  text: string;
  etag: string;
  mtime?: string;
}> {
  const pkgs = await Package.find().lean();
  const index = {
    packages: pkgs.map((p) => ({
      identifier: p.identifier,
      name: p.name,
      version: p.version,
      description: p.description,
      downloadUrl: p.downloadUrl,
      sha256: p.sha256,
    })),
  };
  const text = JSON.stringify(index);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const etag = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const newest = pkgs.reduce((m: number, p) => {
    const t = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
    return Math.max(m, t);
  }, 0);
  const mtime = newest ? new Date(newest).toUTCString() : undefined;
  return { text, etag, mtime };
}

app.get("/index.json", async (c) => {
  try {
    const { text, etag, mtime } = await getIndex();
    if (c.req.header("if-none-match") === etag) {
      return new Response(null, { status: 304 });
    }
    if (mtime && c.req.header("if-modified-since") === mtime) {
      return new Response(null, { status: 304 });
    }
    return new Response(text, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "ETag": etag,
        ...(mtime ? { "Last-Modified": mtime } : {}),
      },
    });
  } catch {
    return c.json({ error: "Index not found" }, 404);
  }
});

app.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const limit = Number(c.req.query("limit") ?? "20");
  const filter = q
    ? {
      $or: [
        { identifier: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    }
    : {};
  const pkgs = await Package.find(filter).limit(limit).lean();
  const index = {
    packages: pkgs.map((p) => ({
      identifier: p.identifier,
      name: p.name,
      version: p.version,
      description: p.description,
      downloadUrl: p.downloadUrl,
      sha256: p.sha256,
    })),
  };
  const text = JSON.stringify(index);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const etag = Array.from(new Uint8Array(digest)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const newest = pkgs.reduce((m: number, p) => {
    const t = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
    return Math.max(m, t);
  }, 0);
  const mtime = newest ? new Date(newest).toUTCString() : undefined;
  if (c.req.header("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }
  if (mtime && c.req.header("if-modified-since") === mtime) {
    return new Response(null, { status: 304 });
  }
  return c.json(index, {
    headers: {
      "ETag": etag,
      ...(mtime ? { "Last-Modified": mtime } : {}),
    },
  });
});

app.post("/packages", async (c) => {
  const userId = c.get("userId");
  try {
    const body = await c.req.json();
    const { identifier, name, version, description, downloadUrl, sha256 } =
      body;
    if (!identifier || !name || !version || !downloadUrl) {
      return c.json({ error: "Bad request" }, 400);
    }
    const domain = identifierDomain(identifier);
    if (domain) {
      const domainEntry = await Domain.findOne({
        name: domain,
        userId: new mongoose.Types.ObjectId(userId),
        verified: true,
      });
      if (!domainEntry) {
        return c.json({ error: "Domain not verified" }, 400);
      }
    }
    await Package.create({
      identifier,
      name,
      version,
      description,
      downloadUrl,
      sha256,
    });
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Bad request" }, 400);
  }
});

app.get("/packages/:id", async (c) => {
  const id = c.req.param("id");
  const pkg = await Package.findOne({ identifier: id }).lean();
  if (!pkg) {
    return c.json({ error: "Not found" }, 404);
  }
  const text = JSON.stringify(pkg);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const etag = Array.from(new Uint8Array(digest)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const mtime = pkg.updatedAt
    ? new Date(pkg.updatedAt).toUTCString()
    : undefined;
  if (c.req.header("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }
  if (mtime && c.req.header("if-modified-since") === mtime) {
    return new Response(null, { status: 304 });
  }
  return c.json(pkg, {
    headers: {
      "ETag": etag,
      ...(mtime ? { "Last-Modified": mtime } : {}),
    },
  });
});

app.get("/:file", async (c) => {
  const file = c.req.param("file");
  const path = join(rootDir, file);
  try {
    const stat = await Deno.stat(path);
    const mtime = stat.mtime?.toUTCString();
    if (mtime && c.req.header("if-modified-since") === mtime) {
      return new Response(null, { status: 304 });
    }
    const bytes = await Deno.readFile(path);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        ...(mtime ? { "Last-Modified": mtime } : {}),
      },
    });
  } catch {
    return c.notFound();
  }
});

if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? 8080);
  Deno.serve({ port, handler: (req) => app.fetch(req) });
}

import { SignJWT, jwtVerify } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || 'default-secret-change-me';
  return new TextEncoder().encode(secret);
};

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'ADMIN' | 'PHARMACIST';
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req: VercelRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.substring(7));
}

export function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

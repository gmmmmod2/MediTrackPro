export default async function handler(request, response) {
  return response.status(200).json({
    success: true,
    message: 'Health check passed',
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    },
    timestamp: new Date().toISOString()
  });
}

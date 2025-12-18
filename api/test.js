export default function handler(request, response) {
  return response.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
}

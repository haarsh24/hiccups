import { app } from './app';

// Vercel Serverless Function Entrypoint
// Wraps Express instance for robust invocation under Vercel Node runtime
export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('Unhandled Vercel serverless execution error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Serverless invocation error'
      });
    }
  }
}

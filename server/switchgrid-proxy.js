import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Configuration CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'https://abienergie.github.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Configuration du proxy Switchgrid
const switchgridProxy = createProxyMiddleware({
  target: 'https://app.switchgrid.tech/enedis/v2',
  changeOrigin: true,
  secure: true,
  timeout: 30000,
  pathRewrite: {
    '^/api/switchgrid-proxy': ''
  },
  onProxyReq: (proxyReq, req) => {
    // Ajouter les headers requis
    proxyReq.setHeader('Authorization', 'Bearer c85136b872194092cf9d013c6fe6ce5c');
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Accept', 'application/json');
    proxyReq.setHeader('User-Agent', 'ABI-Energie-Simulator/1.0');
    
    console.log('🔄 Proxying Switchgrid request:', {
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ajouter les headers CORS
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    
    console.log('✅ Switchgrid response:', {
      status: proxyRes.statusCode,
      contentType: proxyRes.headers['content-type'],
      path: req.path
    });
  },
  onError: (err, req, res) => {
    console.error('❌ Switchgrid proxy error:', {
      error: err.message,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Switchgrid proxy error',
      message: err.message
    });
  }
});

// Utiliser le proxy pour toutes les routes /api/switchgrid-proxy
app.use('/api/switchgrid-proxy', switchgridProxy);

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Switchgrid Proxy',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Switchgrid proxy running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Proxy endpoint: http://localhost:${PORT}/api/switchgrid-proxy/*`);
});
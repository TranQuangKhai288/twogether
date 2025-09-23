import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from '@/middleware/errorHandler.js';
import { notFoundHandler } from '@/middleware/notFoundHandler.js';
import { requestLogger } from '@/middleware/requestLogger.js';
import apiRoutes from '@/routes/index.js';
import { dbConnection } from '@/database/connection.js';
import { logger } from '@/utils/logger.js';

// Load environment variables
dotenv.config();

class App {
  public app: Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000', 10);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));


    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Custom request logger
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running!',
        data: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
        },
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/api', apiRoutes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  public async listen(): Promise<void> {
    try {
      // Connect to database
      await dbConnection.connect();
      logger.info('Database connection established');

      this.app.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`);
        logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🌐 Health check: http://localhost:${this.port}/health`);
        logger.info(`📋 API docs: http://localhost:${this.port}/api`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start the server
const app = new App();
app.listen();

export default app;
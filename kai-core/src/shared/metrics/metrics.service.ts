import { Injectable } from '@nestjs/common';
import {
  register,
  collectDefaultMetrics,
  Gauge,
  Counter,
  Histogram,
} from 'prom-client';

/**
 * Servicio de Métricas con Prometheus
 *
 * Expone métricas para monitoreo:
 * - HTTP requests (counter, histogram)
 * - Database operations
 * - Business operations
 * - Errors
 * - Performance metrics
 */
@Injectable()
export class MetricsService {
  // HTTP Metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestsActive: Gauge<string>;

  // Database Metrics
  private dbConnectionsActive: Gauge<string>;
  private dbQueryDuration: Histogram<string>;
  private dbQueryErrors: Counter<string>;

  // Business Metrics
  private transactionsCreated: Counter<string>;
  private transactionsProcessed: Counter<string>;
  private businessErrors: Counter<string>;

  // System Metrics
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;

  constructor() {
    // Colectar métricas por defecto del sistema
    collectDefaultMetrics({ prefix: 'flow_backend_' });

    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP Request Counter
    this.httpRequestsTotal = new Counter({
      name: 'flow_backend_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new Histogram({
      name: 'flow_backend_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // Active HTTP Requests
    this.httpRequestsActive = new Gauge({
      name: 'flow_backend_http_requests_active',
      help: 'Number of active HTTP requests',
    });

    // Database Connections
    this.dbConnectionsActive = new Gauge({
      name: 'flow_backend_db_connections_active',
      help: 'Number of active database connections',
    });

    // Database Query Duration
    this.dbQueryDuration = new Histogram({
      name: 'flow_backend_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    // Database Errors
    this.dbQueryErrors = new Counter({
      name: 'flow_backend_db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table'],
    });

    // Business Metrics
    this.transactionsCreated = new Counter({
      name: 'flow_backend_transactions_created_total',
      help: 'Total number of transactions created',
      labelNames: ['type'],
    });

    this.transactionsProcessed = new Counter({
      name: 'flow_backend_transactions_processed_total',
      help: 'Total number of transactions processed',
      labelNames: ['type', 'status'],
    });

    this.businessErrors = new Counter({
      name: 'flow_backend_business_errors_total',
      help: 'Total number of business logic errors',
      labelNames: ['operation', 'error_type'],
    });

    // System Metrics
    this.memoryUsage = new Gauge({
      name: 'flow_backend_memory_usage_bytes',
      help: 'Memory usage in bytes',
    });

    this.cpuUsage = new Gauge({
      name: 'flow_backend_cpu_usage_percent',
      help: 'CPU usage percentage',
    });
  }

  // HTTP Metrics Methods
  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  startHttpRequest() {
    this.httpRequestsActive.inc();
  }

  endHttpRequest() {
    this.httpRequestsActive.dec();
  }

  recordHttpRequestDuration(method: string, route: string, duration: number) {
    this.httpRequestDuration.observe({ method, route }, duration / 1000); // Convert to seconds
  }

  // Database Metrics Methods
  setDbConnectionsActive(count: number) {
    this.dbConnectionsActive.set(count);
  }

  recordDbQueryDuration(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000);
  }

  incrementDbQueryErrors(operation: string, table: string) {
    this.dbQueryErrors.inc({ operation, table });
  }

  // Business Metrics Methods
  incrementTransactionsCreated(type: string) {
    this.transactionsCreated.inc({ type });
  }

  incrementTransactionsProcessed(type: string, status: string) {
    this.transactionsProcessed.inc({ type, status });
  }

  incrementBusinessErrors(operation: string, errorType: string) {
    this.businessErrors.inc({ operation, error_type: errorType });
  }

  // System Metrics Methods
  updateMemoryUsage(bytes: number) {
    this.memoryUsage.set(bytes);
  }

  updateCpuUsage(percentage: number) {
    this.cpuUsage.set(percentage);
  }

  // Prometheus Registry Access
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  getRegistry() {
    return register;
  }

  // Health Check Metrics
  recordHealthCheck(status: 'up' | 'down') {
    // This could be extended with more health metrics
    this.businessErrors.inc({ operation: 'health_check', error_type: status });
  }
}

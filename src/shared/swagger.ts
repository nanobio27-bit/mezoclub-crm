import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MezoClub CRM API',
      version: '0.1.0',
      description: 'MezoClub CRM MVP Backend — auth, clients, products, orders, dashboard',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
      { url: 'https://loura-subfalcial-dilatometrically.ngrok-free.dev', description: 'Remote (ngrok)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            segment: { type: 'string' },
            status: { type: 'string' },
            manager_id: { type: 'integer', nullable: true },
            source: { type: 'string' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            sku: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            cost_price: { type: 'number' },
            stock_quantity: { type: 'integer' },
            min_stock_level: { type: 'integer' },
            brand: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            client_id: { type: 'integer' },
            user_id: { type: 'integer' },
            status: { type: 'string' },
            total_amount: { type: 'number' },
            discount_amount: { type: 'number' },
            payment_status: { type: 'string' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            clients: { type: 'object' },
            orders: { type: 'object' },
            revenue: { type: 'object' },
            products: { type: 'object' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/*/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

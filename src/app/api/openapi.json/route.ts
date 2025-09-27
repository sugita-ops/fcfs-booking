import { NextResponse } from 'next/server';

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'FCFS Booking System API',
    description: '建築現場「早い者勝ち」受注システムのMVP API',
    version: '1.0.0',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token for authentication',
      },
    },
    schemas: {
      UUID: {
        type: 'string',
        format: 'uuid',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      ClaimRequest: {
        type: 'object',
        required: ['slotId', 'companyId', 'requestId'],
        properties: {
          slotId: { $ref: '#/components/schemas/UUID' },
          companyId: { $ref: '#/components/schemas/UUID' },
          requestId: { $ref: '#/components/schemas/UUID' },
        },
        example: {
          slotId: '550e8400-e29b-41d4-a716-446655440601',
          companyId: '550e8400-e29b-41d4-a716-446655440302',
          requestId: '550e8400-e29b-41d4-a716-446655440999',
        },
      },
      ClaimResponse: {
        type: 'object',
        required: ['slot', 'claim'],
        properties: {
          slot: {
            type: 'object',
            required: ['id', 'status', 'work_date'],
            properties: {
              id: { $ref: '#/components/schemas/UUID' },
              status: { type: 'string', example: 'claimed' },
              work_date: { type: 'string', format: 'date', example: '2024-01-15' },
            },
          },
          claim: {
            type: 'object',
            required: ['id', 'company_id', 'user_id', 'claimed_at'],
            properties: {
              id: { $ref: '#/components/schemas/UUID' },
              company_id: { $ref: '#/components/schemas/UUID' },
              user_id: { oneOf: [{ $ref: '#/components/schemas/UUID' }, { type: 'null' }] },
              claimed_at: { type: 'string', format: 'date-time', example: '2024-01-01T12:00:00Z' },
            },
          },
        },
      },
      CancelClaimRequest: {
        type: 'object',
        required: ['slotId', 'reason'],
        properties: {
          slotId: { $ref: '#/components/schemas/UUID' },
          reason: {
            type: 'string',
            enum: ['no_show', 'weather', 'client_change', 'material_delay', 'other'],
            example: 'weather',
          },
        },
      },
      CancelClaimResponse: {
        type: 'object',
        required: ['slot'],
        properties: {
          slot: {
            type: 'object',
            required: ['id', 'status', 'canceled_at', 'cancel_reason'],
            properties: {
              id: { $ref: '#/components/schemas/UUID' },
              status: { type: 'string', const: 'cancelled' },
              canceled_at: { type: 'string', format: 'date-time', example: '2024-01-01T15:30:00Z' },
              cancel_reason: {
                type: 'string',
                enum: ['no_show', 'weather', 'client_change', 'material_delay', 'other'],
              },
            },
          },
        },
      },
      AlternativesResponse: {
        type: 'object',
        required: ['alternatives'],
        properties: {
          alternatives: {
            type: 'array',
            items: {
              type: 'object',
              required: ['slot_id', 'work_date', 'job_post'],
              properties: {
                slot_id: { $ref: '#/components/schemas/UUID' },
                work_date: { type: 'string', format: 'date', example: '2024-01-16' },
                job_post: {
                  type: 'object',
                  required: ['id', 'title', 'trade'],
                  properties: {
                    id: { $ref: '#/components/schemas/UUID' },
                    title: { type: 'string', example: '基礎工事' },
                    trade: { type: 'string', example: '基礎工' },
                  },
                },
              },
            },
          },
        },
      },
      JobPostsResponse: {
        type: 'object',
        required: ['job_posts'],
        properties: {
          job_posts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title', 'trade', 'unit_price', 'currency', 'start_date', 'end_date', 'available_slots'],
              properties: {
                id: { $ref: '#/components/schemas/UUID' },
                title: { type: 'string', example: '基礎工事' },
                trade: { type: 'string', example: '基礎工' },
                description: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                unit_price: { type: 'number', example: 25000 },
                currency: { type: 'string', example: 'JPY' },
                start_date: { type: 'string', format: 'date', example: '2024-01-15' },
                end_date: { type: 'string', format: 'date', example: '2024-01-20' },
                available_slots: { type: 'integer', minimum: 0, example: 3 },
              },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            example: 'Invalid input data',
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              code: 'VALIDATION_ERROR',
              message: 'slotId: Invalid UUID format',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              code: 'NOT_FOUND',
              message: 'Slot not found or access denied',
            },
          },
        },
      },
      ConflictError: {
        description: 'Conflict error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              code: 'ALREADY_CLAIMED',
              message: 'This slot has been claimed by someone else.',
            },
          },
        },
      },
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            example: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/claims': {
      post: {
        summary: '受注確定',
        description: 'FCFS (First Come, First Served) 方式で案件スロットを受注確定します',
        operationId: 'createClaim',
        tags: ['Claims'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClaimRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '受注確定成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ClaimResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
          '409': { $ref: '#/components/responses/ConflictError' },
        },
      },
    },
    '/api/cancel-claim': {
      post: {
        summary: '受注キャンセル',
        description: '既に受注確定したスロットをキャンセルします',
        operationId: 'cancelClaim',
        tags: ['Claims'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CancelClaimRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'キャンセル成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CancelClaimResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': {
            description: 'Authorization error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
                example: {
                  code: 'FORBIDDEN',
                  message: 'You are not authorized to cancel this claim',
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
          '409': { $ref: '#/components/responses/ConflictError' },
        },
      },
    },
    '/api/alternatives': {
      get: {
        summary: '代替候補取得',
        description: '受注競合時の代替候補スロットを取得します',
        operationId: 'getAlternatives',
        tags: ['Alternatives'],
        parameters: [
          {
            name: 'slotId',
            in: 'query',
            required: true,
            schema: { $ref: '#/components/schemas/UUID' },
            description: '競合したスロットのID',
          },
          {
            name: 'days',
            in: 'query',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 30,
              default: 3,
            },
            description: '検索する日数範囲（±days）',
          },
        ],
        responses: {
          '200': {
            description: '代替候補取得成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AlternativesResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/api/job-posts': {
      get: {
        summary: '案件一覧取得',
        description: '利用可能な案件の一覧を取得します',
        operationId: 'getJobPosts',
        tags: ['Job Posts'],
        parameters: [
          {
            name: 'trade',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: '職種フィルター',
          },
          {
            name: 'start_date',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: '開始日フィルター',
          },
          {
            name: 'end_date',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
            description: '終了日フィルター',
          },
        ],
        responses: {
          '200': {
            description: '案件一覧取得成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JobPostsResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
  },
  tags: [
    {
      name: 'Claims',
      description: '受注確定・キャンセル操作',
    },
    {
      name: 'Alternatives',
      description: '代替候補検索',
    },
    {
      name: 'Job Posts',
      description: '案件管理',
    },
  ],
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
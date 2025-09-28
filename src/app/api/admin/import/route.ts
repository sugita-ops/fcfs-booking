import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { requireAuth } from '@/lib/auth';
import { withTransaction, setTenantContext, generateUuid } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  validationError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

interface CsvImportRequest {
  type: 'companies' | 'users' | 'projects';
  data: any[];
}

interface CsvImportResponse {
  import_id: string;
  type: 'companies' | 'users' | 'projects';
  total_records: number;
  successful_records: number;
  failed_records: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

// CSV data validation schemas
const companySchema = {
  name: { required: true, type: 'string' },
  trade: { required: true, type: 'string' },
  contact_email: { required: false, type: 'email' },
  contact_phone: { required: false, type: 'string' },
  is_active: { required: false, type: 'boolean', default: true }
};

const userSchema = {
  name: { required: true, type: 'string' },
  email: { required: true, type: 'email' },
  company_id: { required: true, type: 'uuid' },
  role: { required: false, type: 'string', default: 'worker' },
  is_active: { required: false, type: 'boolean', default: true }
};

const projectSchema = {
  name: { required: true, type: 'string' },
  client_company: { required: true, type: 'string' },
  start_date: { required: true, type: 'date' },
  end_date: { required: false, type: 'date' },
  location_address: { required: false, type: 'string' },
  dw_project_id: { required: false, type: 'string' }
};

function validateCsvData(data: any[], schema: any, type: string): Array<{ row: number; field?: string; message: string }> {
  const errors: Array<{ row: number; field?: string; message: string }> = [];

  data.forEach((row, index) => {
    const rowNumber = index + 1;

    // Check required fields
    Object.entries(schema).forEach(([field, rules]: [string, any]) => {
      if (rules.required && (!row[field] || row[field].toString().trim() === '')) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`
        });
        return;
      }

      const value = row[field];
      if (value !== null && value !== undefined && value !== '') {
        // Type validation
        switch (rules.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push({
                row: rowNumber,
                field,
                message: `${field} must be a valid email address`
              });
            }
            break;

          case 'uuid':
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(value)) {
              errors.push({
                row: rowNumber,
                field,
                message: `${field} must be a valid UUID`
              });
            }
            break;

          case 'date':
            if (isNaN(Date.parse(value))) {
              errors.push({
                row: rowNumber,
                field,
                message: `${field} must be a valid date`
              });
            }
            break;

          case 'boolean':
            const boolValue = value.toString().toLowerCase();
            if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
              errors.push({
                row: rowNumber,
                field,
                message: `${field} must be a boolean value`
              });
            }
            break;
        }
      }
    });

    // Type-specific validations
    if (type === 'projects' && row.start_date && row.end_date) {
      if (new Date(row.start_date) >= new Date(row.end_date)) {
        errors.push({
          row: rowNumber,
          message: 'end_date must be after start_date'
        });
      }
    }
  });

  return errors;
}

async function importCompanies(client: PoolClient, tenantId: string, data: any[]): Promise<{ successful: number; failed: number; errors: any[] }> {
  let successful = 0;
  let failed = 0;
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    try {
      const companyId = generateUuid();
      await client.query(`
        INSERT INTO companies (
          id,
          tenant_id,
          name,
          trade,
          contact_email,
          contact_phone,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      `, [
        companyId,
        tenantId,
        row.name,
        row.trade,
        row.contact_email || null,
        row.contact_phone || null,
        row.is_active !== undefined ? row.is_active : true
      ]);

      successful++;
    } catch (error: any) {
      failed++;
      errors.push({
        row: rowNumber,
        message: error.message
      });
    }
  }

  return { successful, failed, errors };
}

async function importUsers(client: PoolClient, tenantId: string, data: any[]): Promise<{ successful: number; failed: number; errors: any[] }> {
  let successful = 0;
  let failed = 0;
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    try {
      const userId = generateUuid();
      await client.query(`
        INSERT INTO users (
          id,
          tenant_id,
          company_id,
          name,
          email,
          role,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      `, [
        userId,
        tenantId,
        row.company_id,
        row.name,
        row.email,
        row.role || 'worker',
        row.is_active !== undefined ? row.is_active : true
      ]);

      successful++;
    } catch (error: any) {
      failed++;
      errors.push({
        row: rowNumber,
        message: error.message
      });
    }
  }

  return { successful, failed, errors };
}

async function importProjects(client: PoolClient, tenantId: string, data: any[]): Promise<{ successful: number; failed: number; errors: any[] }> {
  let successful = 0;
  let failed = 0;
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1;

    try {
      const projectId = generateUuid();
      await client.query(`
        INSERT INTO projects (
          id,
          tenant_id,
          name,
          client_company,
          start_date,
          end_date,
          location_address,
          dw_project_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
      `, [
        projectId,
        tenantId,
        row.name,
        row.client_company,
        row.start_date,
        row.end_date || null,
        row.location_address || null,
        row.dw_project_id || null
      ]);

      successful++;
    } catch (error: any) {
      failed++;
      errors.push({
        row: rowNumber,
        message: error.message
      });
    }
  }

  return { successful, failed, errors };
}

export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    if (!userId) {
      return forbiddenError('Admin access required');
    }

    // Parse request body
    const body: CsvImportRequest = await request.json();

    if (!body.type || !['companies', 'users', 'projects'].includes(body.type)) {
      return validationError('type must be one of: companies, users, projects');
    }

    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      return validationError('data must be a non-empty array');
    }

    if (body.data.length > 1000) {
      return validationError('Maximum 1000 records per import');
    }

    // Validate data according to schema
    const schema = {
      companies: companySchema,
      users: userSchema,
      projects: projectSchema
    }[body.type];

    const validationErrors = validateCsvData(body.data, schema, body.type);
    if (validationErrors.length > 0) {
      // Return first 5 validation errors
      return NextResponse.json({
        code: 'VALIDATION_FAILED',
        message: 'CSV data validation failed',
        errors: validationErrors.slice(0, 5)
      }, { status: 422 });
    }

    const importId = generateUuid();

    // Process import in transaction
    const result = await withTransaction(async (client: PoolClient) => {
      await setTenantContext(client, tenantId);

      let importResult;
      switch (body.type) {
        case 'companies':
          importResult = await importCompanies(client, tenantId, body.data);
          break;
        case 'users':
          importResult = await importUsers(client, tenantId, body.data);
          break;
        case 'projects':
          importResult = await importProjects(client, tenantId, body.data);
          break;
        default:
          throw new Error('Invalid import type');
      }

      // Create audit log
      await client.query(`
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          actor_role,
          action,
          target_table,
          target_id,
          payload,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      `, [
        tenantId,
        userId,
        'ops_admin',
        'csv_import',
        body.type,
        importId,
        JSON.stringify({
          kind: body.type,
          total_records: body.data.length,
          successful_records: importResult.successful,
          failed_records: importResult.failed,
          error_count: importResult.errors.length
        })
      ]);

      return {
        import_id: importId,
        ...importResult
      };
    });

    const response: CsvImportResponse = {
      import_id: result.import_id,
      type: body.type,
      total_records: body.data.length,
      successful_records: result.successful,
      failed_records: result.failed,
      errors: result.errors.slice(0, 5) // Return first 5 errors
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('CSV import API error:', error);
    return handleApiError(error);
  }
}

// Only POST method is supported
export async function GET() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only POST method is supported', 405);
}
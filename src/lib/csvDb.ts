import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface CustomerUser {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface SellerUser {
  id: string;
  store_name: string;
  owner_name: string;
  email: string;
  mobile_number: string;
  password_hash: string;
  business_category: string;
  gst_number: string;
  store_address: string;
  latitude: string;
  longitude: string;
  store_logo: string;
  created_at: string;
}

export interface ProductInventory {
  product_id: string;
  shop_id: string;
  stock_quantity: string;
  last_updated: string;
}

// In-memory queue to prevent concurrent write conflicts
class WriteLock {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

const dbLock = new WriteLock();

function ensureDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Helper to escape values for CSV
function escapeCsvValue(val: string): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to parse a CSV line, respecting double quotes
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export async function readCsv<T>(filename: string, columns: (keyof T)[]): Promise<T[]> {
  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length <= 1) {
    return []; // Only header or empty
  }

  const records: T[] = [];
  const headers = parseCsvLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: any = {};
    
    headers.forEach((header, index) => {
      const colName = header.trim();
      if (columns.includes(colName as keyof T)) {
        record[colName] = values[index] || '';
      }
    });
    records.push(record as T);
  }

  return records;
}

export async function writeCsv<T>(filename: string, columns: (keyof T)[], records: T[]): Promise<void> {
  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, filename);

  await dbLock.acquire();
  try {
    const headerLine = columns.map(col => escapeCsvValue(String(col))).join(',');
    const bodyLines = records.map(record => {
      return columns.map(col => escapeCsvValue(String(record[col] || ''))).join(',');
    });
    
    const content = [headerLine, ...bodyLines].join('\n') + '\n';
    fs.writeFileSync(filePath, content, 'utf-8');
  } finally {
    dbLock.release();
  }
}

export async function appendCsv<T>(filename: string, columns: (keyof T)[], record: T): Promise<void> {
  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, filename);

  await dbLock.acquire();
  try {
    const exists = fs.existsSync(filePath);
    let content = '';
    
    if (!exists) {
      const headerLine = columns.map(col => escapeCsvValue(String(col))).join(',');
      content += headerLine + '\n';
    }
    
    const recordLine = columns.map(col => escapeCsvValue(String(record[col] || ''))).join(',');
    content += recordLine + '\n';
    
    fs.appendFileSync(filePath, content, 'utf-8');
  } finally {
    dbLock.release();
  }
}

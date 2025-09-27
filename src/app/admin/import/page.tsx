'use client';

import { useState } from 'react';

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportResult {
  import_id: string;
  type: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  errors: ImportError[];
}

type ImportType = 'companies' | 'users' | 'projects';

export default function AdminImportPage() {
  const [selectedType, setSelectedType] = useState<ImportType>('companies');
  const [csvData, setCsvData] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const csvTemplates = {
    companies: `name,trade,contact_email,contact_phone,is_active
サンプル建設,基礎工,contact@sample.co.jp,03-1234-5678,true
テスト工業,左官,info@test.co.jp,03-9876-5432,true`,

    users: `name,email,company_id,role,is_active
田中太郎,tanaka@sample.co.jp,550e8400-e29b-41d4-a716-446655440302,worker,true
佐藤花子,sato@sample.co.jp,550e8400-e29b-41d4-a716-446655440302,supervisor,true`,

    projects: `name,client_company,start_date,end_date,location_address,dw_project_id
新宿オフィスビル建設,新宿建設株式会社,2024-01-15,2024-06-30,東京都新宿区西新宿1-1-1,DW_PROJECT_001
渋谷マンション工事,渋谷開発株式会社,2024-02-01,2024-08-31,東京都渋谷区渋谷1-1-1,DW_PROJECT_002`
  };

  const fieldDescriptions = {
    companies: [
      { field: 'name', description: '会社名（必須）', type: 'string' },
      { field: 'trade', description: '職種（必須）', type: 'string' },
      { field: 'contact_email', description: '連絡先メール（任意）', type: 'email' },
      { field: 'contact_phone', description: '連絡先電話（任意）', type: 'string' },
      { field: 'is_active', description: '有効フラグ（任意、デフォルト：true）', type: 'boolean' }
    ],
    users: [
      { field: 'name', description: 'ユーザー名（必須）', type: 'string' },
      { field: 'email', description: 'メールアドレス（必須）', type: 'email' },
      { field: 'company_id', description: '会社ID（必須、UUID形式）', type: 'uuid' },
      { field: 'role', description: '役割（任意、デフォルト：worker）', type: 'string' },
      { field: 'is_active', description: '有効フラグ（任意、デフォルト：true）', type: 'boolean' }
    ],
    projects: [
      { field: 'name', description: 'プロジェクト名（必須）', type: 'string' },
      { field: 'client_company', description: 'クライアント会社（必須）', type: 'string' },
      { field: 'start_date', description: '開始日（必須、YYYY-MM-DD）', type: 'date' },
      { field: 'end_date', description: '終了日（任意、YYYY-MM-DD）', type: 'date' },
      { field: 'location_address', description: '住所（任意）', type: 'string' },
      { field: 'dw_project_id', description: 'DW連携ID（任意）', type: 'string' }
    ]
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        let value = values[index] || '';

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Convert boolean values
        if (value.toLowerCase() === 'true') {
          value = true;
        } else if (value.toLowerCase() === 'false') {
          value = false;
        }

        row[header] = value === '' ? null : value;
      });

      data.push(row);
    }

    return data;
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      setError('CSVデータを入力してください');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setResult(null);

      const parsedData = parseCSV(csvData);
      if (parsedData.length === 0) {
        throw new Error('有効なCSVデータが見つかりません');
      }

      const token = localStorage.getItem('auth_token') || 'dev-token';

      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: selectedType,
          data: parsedData
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 422 && responseData.errors) {
          // Validation errors
          setResult({
            import_id: '',
            type: selectedType,
            total_records: parsedData.length,
            successful_records: 0,
            failed_records: parsedData.length,
            errors: responseData.errors
          });
        } else {
          throw new Error(responseData.message || 'Import failed');
        }
      } else {
        setResult(responseData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadTemplate = () => {
    setCsvData(csvTemplates[selectedType]);
    setResult(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplates[selectedType]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CSVインポート</h1>
        <p className="mt-1 text-sm text-gray-600">
          会社・ユーザー・プロジェクトデータを一括でインポートします。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Configuration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">インポート設定</h3>

            {/* Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                インポート種別
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ImportType)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="companies">会社</option>
                <option value="users">ユーザー</option>
                <option value="projects">プロジェクト</option>
              </select>
            </div>

            {/* CSV Data Input */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  CSVデータ
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={loadTemplate}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    テンプレート読み込み
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    テンプレートダウンロード
                  </button>
                </div>
              </div>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="CSVデータをここに貼り付けてください..."
                rows={10}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>

            {/* Import Button */}
            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={isProcessing || !csvData.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    処理中...
                  </div>
                ) : (
                  'インポート実行'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Field Descriptions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedType === 'companies' ? '会社' : selectedType === 'users' ? 'ユーザー' : 'プロジェクト'}
              フィールド仕様
            </h3>

            <div className="space-y-3">
              {fieldDescriptions[selectedType].map((field) => (
                <div key={field.field} className="border-l-4 border-blue-200 pl-3">
                  <div className="text-sm font-medium text-gray-900">{field.field}</div>
                  <div className="text-sm text-gray-600">{field.description}</div>
                  <div className="text-xs text-gray-500">型: {field.type}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-yellow-50 rounded-md">
              <div className="text-sm text-yellow-800">
                <strong>注意事項:</strong>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>最大1,000件まで一度にインポート可能です</li>
                  <li>CSVファイルの1行目はヘッダー行として扱われます</li>
                  <li>日付はYYYY-MM-DD形式で入力してください</li>
                  <li>UUIDは正しい形式で入力してください</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">インポート結果</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-blue-600">{result.total_records}</div>
                <div className="text-sm text-blue-600">総レコード数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-green-600">{result.successful_records}</div>
                <div className="text-sm text-green-600">成功</div>
              </div>
              <div className="bg-red-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-red-600">{result.failed_records}</div>
                <div className="text-sm text-red-600">失敗</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-orange-600">{result.errors.length}</div>
                <div className="text-sm text-orange-600">エラー詳細数</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  エラー詳細 (先頭{Math.min(result.errors.length, 5)}件)
                </h4>
                <div className="space-y-2">
                  {result.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="text-sm text-red-800">
                        <strong>行 {error.row}:</strong>
                        {error.field && <span className="ml-1">フィールド "{error.field}" - </span>}
                        {error.message}
                      </div>
                    </div>
                  ))}
                </div>

                {result.errors.length > 5 && (
                  <div className="mt-3 text-sm text-gray-600">
                    他 {result.errors.length - 5} 件のエラーがあります。
                  </div>
                )}
              </div>
            )}

            {result.successful_records > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <div className="text-sm text-green-800">
                  {result.successful_records}件のレコードが正常にインポートされました。
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
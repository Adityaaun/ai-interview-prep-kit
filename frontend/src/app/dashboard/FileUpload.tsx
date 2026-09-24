"use client";

import { useState } from 'react';
import { api } from '@/lib/api';
import { useKitStore } from '@/store/kitStore';

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[] | null>(null);
  const { fetchKits } = useKitStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setRoles([]);
    setUploadResults(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 1024 * 1024) { // 1MB limit
      setError('File is too large. Maximum size is 1MB.');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            setError('JSON must be an array of roles.');
            return;
          }
          validateAndSetRoles(parsed);
        } catch (err) {
          setError('Invalid JSON file.');
        }
      } else if (file.name.endsWith('.csv')) {
        parseCSV(text);
      } else {
        setError('Unsupported file type. Please upload .csv or .json.');
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    // Basic CSV parser to handle quotes somewhat. (For robust parsing, papaparse is better, but this will do).
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) {
      setError('CSV file must have a header row and at least one data row.');
      return;
    }

    // Split headers properly
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const parsedRoles = [];

    // Simple parse assuming no commas inside the cell values (which is a limitation, but acceptable for this basic requirement without adding heavy libs)
    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(',');
      
      const obj: any = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j] ? currentline[j].trim().replace(/^"|"$/g, '') : '';
      }
      parsedRoles.push(obj);
    }
    
    validateAndSetRoles(parsedRoles);
  };

  const validateAndSetRoles = (parsedRoles: any[]) => {
    const validRoles = parsedRoles.map((role, idx) => {
      const jd = role.jd || role.jobDescription || '';
      const company_url = role.company_url || role.companyUrl || role.url || '';
      const days = Number(role.days) || 5;

      const isValid = Boolean(jd && company_url && days > 0);
      const errorMsg = !isValid ? 'Missing required fields (jd, company_url) or invalid days' : '';

      return {
        id: idx,
        jd,
        company_url,
        days,
        isValid,
        errorMsg
      };
    });

    if (validRoles.length > 10) {
      setError('Maximum 10 roles allowed per upload.');
      return;
    }

    setRoles(validRoles);
  };

  const handleUpload = async () => {
    const validPayload = roles.filter(r => r.isValid).map(({ jd, company_url, days }) => ({
      jd, company_url, days
    }));

    if (validPayload.length === 0) {
      setError('No valid roles to upload.');
      return;
    }

    setIsUploading(true);
    setUploadResults(null);
    setError('');

    try {
      const res = await api.post('/kits/batch', validPayload);
      setUploadResults(res.data.results);
      await fetchKits(); // Refresh dashboard
    } catch (err: any) {
      setError(err.response?.data?.error || 'Batch upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="surface-primary p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <h2 className="text-2xl font-bold mb-6 text-text-primary flex items-center gap-2 relative z-10">
        <span className="w-1.5 h-6 bg-emerald-500 rounded-full inline-block"></span>
        Batch Upload Roles
      </h2>
      
      <div className="mb-6 relative z-10">
        <label className="block text-sm font-medium text-text-secondary mb-2">Upload CSV or JSON file</label>
        <div className="surface-secondary p-2 shadow-inner">
          <input 
            type="file" 
            accept=".csv,.json"
            onChange={handleFileChange}
            className="block w-full text-sm text-text-secondary
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-accent-subtle file:text-accent-hover
              hover:file:bg-accent-border file:transition-colors file:cursor-pointer"
          />
        </div>
        <p className="mt-2 text-xs text-text-tertiary font-medium">Max size: 1MB. Max 10 roles. Required CSV Headers: jd, company_url, days.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6 p-3 rounded-lg font-medium relative z-10">{error}</div>}

      {roles.length > 0 && !uploadResults && (
        <div className="mb-4 relative z-10">
          <h3 className="font-semibold text-sm mb-3 text-text-primary">Preview ({roles.length} roles found)</h3>
          <div className="max-h-60 overflow-y-auto surface-secondary divide-y divide-border-active custom-scrollbar bg-surface-3/50">
            {roles.map(r => (
              <div key={r.id} className={`p-4 text-sm transition-colors ${r.isValid ? 'hover:bg-surface-2' : 'bg-red-950/20'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-medium truncate block max-w-[200px] ${r.isValid ? 'text-text-primary' : 'text-red-400'}`}>{r.company_url || 'No URL'}</span>
                  <span className="text-text-secondary font-medium bg-surface-2 px-2 py-0.5 rounded text-xs border border-border-subtle">{r.days} days</span>
                </div>
                <div className="text-text-tertiary truncate mt-1 text-xs">
                  {r.jd ? r.jd.substring(0, 100) + '...' : 'No JD'}
                </div>
                {!r.isValid && <p className="text-xs text-red-400 mt-2 font-medium">{r.errorMsg}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <span className="text-sm font-medium text-emerald-400 flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {roles.filter(r => r.isValid).length} valid roles ready
            </span>
            <button 
              onClick={handleUpload}
              disabled={isUploading || roles.filter(r => r.isValid).length === 0}
              className="btn-primary"
            >
              {isUploading ? 'Generating Kit Batch...' : 'Generate Valid Kits'}
            </button>
          </div>
        </div>
      )}

      {uploadResults && (
        <div className="mb-4 relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <h3 className="font-semibold text-sm mb-3 text-text-primary">Upload Results</h3>
          <div className="max-h-60 overflow-y-auto surface-secondary divide-y divide-border-active custom-scrollbar">
            {uploadResults.map((res, i) => (
              <div key={i} className={`p-4 text-sm ${res.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {res.success ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Successfully generated Kit {res.id}
                  </span>
                ) : (
                  <span className="text-red-400 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Failed: {res.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

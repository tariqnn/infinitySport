'use client';

import { useState, useRef, useEffect } from 'react';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  accept?: string;
  label?: string;
  currentUrl?: string;
  type?: 'image' | 'video' | 'media';
}

export function FileUpload({ 
  onUploadComplete, 
  accept, 
  label = 'Upload file',
  currentUrl,
  type = 'media'
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  useEffect(() => {
    setMounted(true);
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Determine endpoint based on type
      const endpoint = type === 'image' ? '/api/upload/image' : 
                      type === 'video' ? '/api/upload/video' : 
                      '/api/upload/media';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const fullUrl = `${API_BASE_URL}${data.url}`;
      
      setPreview(fullUrl);
      onUploadComplete(fullUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAcceptTypes = () => {
    if (accept) return accept;
    if (type === 'image') return 'image/*';
    if (type === 'video') return 'video/*';
    return 'image/*,video/*';
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-600">{label}</label>
      
      {mounted && preview && (
        <div className="relative rounded-lg border border-slate-200 overflow-hidden">
          {preview.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-48 object-cover"
            />
          ) : preview.match(/\.(mp4|webm|ogg|mov)$/i) ? (
            <video 
              src={preview} 
              controls 
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
              <p className="text-sm text-slate-500">Preview not available</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
            title="Remove"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptTypes()}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <span className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {uploading ? 'Uploading...' : preview ? 'Change file' : 'Choose file'}
          </span>
        </label>
        
        {mounted && preview && (
          <input
            type="hidden"
            name={label.toLowerCase().replace(/\s+/g, '')}
            value={preview}
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {mounted && preview && (
        <p className="text-xs text-slate-500 break-all">{preview}</p>
      )}
    </div>
  );
}


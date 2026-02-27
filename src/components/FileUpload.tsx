"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const ACCEPTED_EXTENSIONS: Record<string, string[]> = {
  // Crystal structures
  "chemical/x-cif": [".cif"],
  "chemical/x-xyz": [".xyz"],
  "chemical/x-vasp": [".vasp", ".poscar"],
  // Data files
  "text/csv": [".csv"],
  "text/plain": [".txt", ".dat", ".xy"],
  // Instrument formats
  "application/octet-stream": [
    ".mpr", ".dm3", ".dm4", ".spc", ".jdx", ".dx",
    ".0", ".1", ".2", ".3", // Bruker OPUS
    ".raw", // Rigaku
  ],
  // Images (TEM, SEM)
  "image/tiff": [".tif", ".tiff"],
  "image/png": [".png"],
  // General
  "application/json": [".json"],
};

export default function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesChange([...files, ...acceptedFiles]);
    },
    [files, onFilesChange]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  if (files.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm"
          >
            <FileText size={14} className="text-gray-500" />
            <span className="text-gray-700 max-w-[150px] truncate">
              {file.name}
            </span>
            <span className="text-gray-400 text-xs">
              {(file.size / 1024).toFixed(0)}KB
            </span>
            <button
              onClick={() => removeFile(i)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div
          {...getRootProps()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm cursor-pointer hover:border-gray-400 hover:text-gray-600"
        >
          <input {...getInputProps()} />
          <Upload size={14} />
          <span>Add</span>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border border-dashed rounded-lg px-4 py-2 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-spinel-500 bg-spinel-500/5"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Upload size={16} />
        <span>
          Drop files here or click to upload
          <span className="text-gray-400 ml-1">
            (.cif, .mpr, .csv, .dm4, .spc, .jdx...)
          </span>
        </span>
      </div>
    </div>
  );
}

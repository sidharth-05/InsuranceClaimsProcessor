"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, AlertCircle } from "lucide-react"

interface DropzoneProps {
  onFilesUploaded: (files: File[]) => void
}

export default function Dropzone({ onFilesUploaded }: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Filter for only allowed file types
      const validFiles = acceptedFiles.filter((file) => {
        const fileType = file.type
        const fileExtension = file.name.split(".").pop()?.toLowerCase()

        return (
          fileType === "application/pdf" ||
          fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fileType === "text/plain" ||
          fileExtension === "pdf" ||
          fileExtension === "docx" ||
          fileExtension === "txt"
        )
      })

      if (validFiles.length > 0) {
        onFilesUploaded(validFiles)
      }
    },
    [onFilesUploaded],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 10485760, // 10MB max file size
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
      } ${isDragReject ? "border-red-500 bg-red-50" : ""}`}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-2">
        {isDragReject ? (
          <>
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-red-500">Only .pdf, .docx, or .txt files are accepted</p>
          </>
        ) : isDragActive ? (
          <>
            <Upload className="h-10 w-10 text-blue-500" />
            <p className="text-blue-500">Drop the files here...</p>
          </>
        ) : (
          <>
            <FileText className="h-10 w-10 text-gray-400" />
            <p className="text-gray-500">Drag & drop claim files here, or click to select files</p>
            <p className="text-sm text-gray-400 mt-2">Accepted file types: .pdf, .docx, .txt (max 10MB)</p>
            <p className="text-sm text-gray-400 mt-1">Note: For best results, copy and paste file content manually</p>
          </>
        )}
      </div>
    </div>
  )
}

"use client"

import { FileText, CheckCircle, Clock, XCircle, Trash2, Info } from "lucide-react"
import type { ProcessedFile, FileStatus } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ResultsTableProps {
  files: ProcessedFile[]
  onRemoveFile: (id: string) => void
  insureds: Array<{ internalId: string; name: string }>
}

export default function ResultsTable({ files, onRemoveFile, insureds }: ResultsTableProps) {
  const [selectedFile, setSelectedFile] = useState<ProcessedFile | null>(null)

  if (files.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <p className="text-gray-500">No files uploaded yet</p>
      </div>
    )
  }

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case "uploaded":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "processing":
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
      case "done":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case "uploaded":
        return "Uploaded"
      case "processing":
        return "Processing"
      case "done":
        return "Completed"
      case "error":
        return "Error"
    }
  }

  const formatConfidence = (confidence?: number) => {
    if (confidence === undefined) return "-"
    return `${Math.round(confidence * 100)}%`
  }

  const getEntityNameById = (id?: string) => {
    if (!id) return "-"
    const entity = insureds.find((e) => e.internalId === id)
    return entity ? entity.name : "-"
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Results</h2>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">File Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Extracted Insured</TableHead>
              <TableHead>Matched Entity</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium">{file.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.status)}
                    <span>{getStatusText(file.status)}</span>
                  </div>
                </TableCell>
                <TableCell>{file.extractedInsured || "-"}</TableCell>
                <TableCell>
                  {file.matchedId ? (
                    <div>
                      <div>{getEntityNameById(file.matchedId)}</div>
                      <div className="text-xs text-gray-500">ID: {file.matchedId}</div>
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{formatConfidence(file.confidence)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {file.rawText && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFile(file)}
                            aria-label="View file details"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>File Analysis: {file.name}</DialogTitle>
                          </DialogHeader>
                          <Tabs defaultValue="extraction" className="mt-4">
                            <TabsList>
                              <TabsTrigger value="extraction">Extraction</TabsTrigger>
                              <TabsTrigger value="matching">Matching</TabsTrigger>
                              <TabsTrigger value="rawtext">Raw Text</TabsTrigger>
                            </TabsList>
                            <TabsContent value="extraction" className="space-y-4">
                              <div className="bg-blue-50 p-4 rounded-md">
                                <h3 className="font-semibold mb-2">Extracted Insured Entity:</h3>
                                <p className="text-lg">{file.extractedInsured || "None detected"}</p>
                              </div>
                              <div>
                                <h3 className="font-semibold mb-2">Extraction Method:</h3>
                                <p>
                                  The system uses pattern matching and LLM analysis to identify the primary insured
                                  entity from the document text. It looks for patterns like "Insured:" or
                                  "Policyholder:" followed by a name.
                                </p>
                              </div>
                            </TabsContent>
                            <TabsContent value="matching" className="space-y-4">
                              <div className="bg-green-50 p-4 rounded-md">
                                <h3 className="font-semibold mb-2">Best Match:</h3>
                                <p className="text-lg">
                                  {file.matchedId
                                    ? `${getEntityNameById(file.matchedId)} (${file.matchedId})`
                                    : "No match found"}
                                </p>
                                <p className="mt-1">Confidence: {formatConfidence(file.confidence)}</p>
                              </div>

                              {file.allMatches && file.allMatches.length > 0 && (
                                <div>
                                  <h3 className="font-semibold mb-2">All Potential Matches (Top 5):</h3>
                                  <div className="border rounded-md overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Entity Name</TableHead>
                                          <TableHead>Internal ID</TableHead>
                                          <TableHead>Similarity Score</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {file.allMatches.slice(0, 5).map((match, index) => (
                                          <TableRow
                                            key={match.entity.internalId}
                                            className={
                                              match.entity.internalId === file.matchedId ? "bg-green-50" : undefined
                                            }
                                          >
                                            <TableCell>{match.entity.name}</TableCell>
                                            <TableCell>{match.entity.internalId}</TableCell>
                                            <TableCell>{formatConfidence(match.similarity)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              <div>
                                <h3 className="font-semibold mb-2">Matching Method:</h3>
                                <p>
                                  The system uses Levenshtein distance to calculate string similarity between the
                                  extracted insured name and each entity in the database. The entity with the highest
                                  similarity score is selected as the match.
                                </p>
                              </div>
                            </TabsContent>
                            <TabsContent value="rawtext">
                              <div>
                                <h3 className="font-semibold mb-2">Raw Document Text:</h3>
                                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-sm">
                                  {file.rawText}
                                </pre>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onRemoveFile(file.id)} aria-label="Remove file">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

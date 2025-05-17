"use client"

import type React from "react"

import { useState, useCallback } from "react"
import Dropzone from "@/components/Dropzone"
import ResultsTable from "@/components/ResultsTable"
import { extractTextFromFile } from "@/lib/parser"
import { extractInsuredName } from "@/lib/llm"
import { findBestMatch } from "@/lib/match"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon as InfoCircle, Clipboard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
// Hard-coded array of insured entities
export const INSUREDS = [
  { internalId: "A1B2", name: "Riley HealthCare LLC" },
  { internalId: "C3D4", name: "Quail Creek RE LLC" },
  { internalId: "E5F6", name: "William James Group LLC" },
  { internalId: "G7H8", name: "Northstar Logistics Inc." },
  { internalId: "I9J0", name: "Evergreen Farms Ltd." },
  { internalId: "K1L2", name: "Beacon Financial Services Corp" },
  { internalId: "M3N4", name: "Hudson Valley Medical Partners" },
  { internalId: "O5P6", name: "Sierra Manufacturing Co." },
  { internalId: "Q7R8", name: "Lakeside Property Holdings, LLC" },
  { internalId: "S9T0", name: "Atlas Retail Group, Inc." },
  { internalId: "U1V2", name: "Pioneer Energy Solutions" },
  { internalId: "W3X4", name: "Blue Ridge Hospitality Partners" },
  { internalId: "Y5Z6", name: "Copper Mountain Mining Corp." },
  { internalId: "B7C8", name: "Silverline Software Ltd." },
  { internalId: "D9E0", name: "Harbor Point Marine Services" },
  { internalId: "F1G2", name: "Metro Transit Authority" },
  { internalId: "H3I4", name: "Golden Gate Ventures LLC" },
  { internalId: "J5K6", name: "Cypress Pharmaceuticals, Inc." },
  { internalId: "L7M8", name: "Redwood Timber Holdings" },
  { internalId: "N9O0", name: "Summit Peak Outdoor Gear" },
  { internalId: "P1Q2", name: "Capital Square Investments" },
  { internalId: "R3S4", name: "Ironclad Security Solutions" },
  { internalId: "T5U6", name: "Frontier Airlines Group" },
  { internalId: "V7W8", name: "Majestic Resorts & Spas Ltd." },
  { internalId: "X9Y0", name: "Orchard Valley Foods" },
  { internalId: "Z1A2", name: "Starlight Entertainment Corp" },
  { internalId: "B3D4", name: "Cascade Water Works" },
  { internalId: "F5H6", name: "Urban Grid Construction" },
  { internalId: "J7L8", name: "Vertex Capital Management" },
]

export type FileStatus = "uploaded" | "processing" | "done" | "error"

export interface ProcessedFile {
  id: string
  name: string
  status: FileStatus
  extractedInsured?: string
  matchedId?: string
  confidence?: number
  error?: string
  rawText?: string // Store raw text for debugging
  allMatches?: Array<{ entity: { internalId: string; name: string }; similarity: number }> // Store all matches for transparency
}

export default function Home() {
  const [files, setFiles] = useState<ProcessedFile[]>([])
  const [debugMode, setDebugMode] = useState(true) // Enable debug mode by default
  const [manualInput, setManualInput] = useState("")
  const [manualResults, setManualResults] = useState<{
    extractedName: string
    matchedEntity: { internalId: string; name: string } | null
    confidence: number
    allMatches: Array<{ entity: { internalId: string; name: string }; similarity: number }>
  } | null>(null)
  const [manualInsuredName, setManualInsuredName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({})
  const { toast } = useToast()
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false)
  const [pdfText, setPdfText] = useState("")
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)
  const [isPdfProcessing, setIsPdfProcessing] = useState(false)

  // Process a single file with timeout and progress tracking
  const processFile = useCallback(
    async (file: File, fileId: string) => {
      const abortController = new AbortController()
      const signal = abortController.signal

      // Set a timeout to abort if it takes too long
      const timeoutId = setTimeout(() => {
        abortController.abort()
        console.log(`[${new Date().toISOString()}] Processing timed out for file: ${file.name}`)
      }, 10000) // 10 second timeout

      try {
        // Update status to processing
        setFiles((prevFiles) =>
          prevFiles.map((f) => (f.id === fileId ? { ...f, status: "processing" as FileStatus } : f)),
        )

        // Update progress
        setFileUploadProgress((prev) => ({ ...prev, [fileId]: 10 }))

        // Extract text from file - with unique timestamp to prevent caching
        console.log(`[${new Date().toISOString()}] Processing file: ${file.name}`)

        // Extract text with timeout protection
        const textPromise = extractTextFromFile(file)
        setFileUploadProgress((prev) => ({ ...prev, [fileId]: 30 }))

        const text = await Promise.race([
          textPromise,
          new Promise<string>((_, reject) => {
            signal.addEventListener("abort", () => reject(new Error("Text extraction timed out")))
          }),
        ])

        setFileUploadProgress((prev) => ({ ...prev, [fileId]: 50 }))

        // Extract insured name using LLM or manual override
        let extractedInsured
        if (manualInsuredName) {
          extractedInsured = manualInsuredName
          console.log(`[${new Date().toISOString()}] Using manual override: "${extractedInsured}"`)
        } else {
          // Extract with timeout protection
          const extractionPromise = extractInsuredName(text)
          setFileUploadProgress((prev) => ({ ...prev, [fileId]: 70 }))

          extractedInsured = await Promise.race([
            extractionPromise,
            new Promise<string>((_, reject) => {
              signal.addEventListener("abort", () => reject(new Error("Name extraction timed out")))
            }),
          ])

          console.log(`[${new Date().toISOString()}] Extracted insured name: "${extractedInsured}"`)
        }

        setFileUploadProgress((prev) => ({ ...prev, [fileId]: 80 }))

        // Find best match
        const { matchedEntity, confidence, allMatches } = findBestMatch(extractedInsured, INSUREDS)

        setFileUploadProgress((prev) => ({ ...prev, [fileId]: 90 }))

        // Update file with results
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "done",
                  extractedInsured,
                  matchedId: matchedEntity?.internalId,
                  confidence,
                  rawText: text,
                  allMatches,
                }
              : f,
          ),
        )

        setFileUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))

        // Clear progress after a delay
        setTimeout(() => {
          setFileUploadProgress((prev) => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }, 1000)

        return true
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing file ${file.name}:`, error)

        // Update file with error
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : f,
          ),
        )

        // Clear progress
        setFileUploadProgress((prev) => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })

        return false
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [manualInsuredName],
  )

  const handleFilesUploaded = useCallback(
    async (newFiles: File[]) => {
      if (newFiles.length === 0) return

      // Create initial file entries with 'uploaded' status
      const initialFileEntries = newFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        status: "uploaded" as FileStatus,
      }))

      setFiles((prevFiles) => [...prevFiles, ...initialFileEntries])

      // Show toast notification
      toast({
        title: `Processing ${newFiles.length} file(s)`,
        description: "This may take a few moments. You can continue using the app.",
      })

      // Process each file
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i]
        const fileId = initialFileEntries[i].id

        await processFile(file, fileId)
      }
    },
    [processFile, toast],
  )

  const handleRemoveFile = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id))

    // Also remove from progress tracking
    setFileUploadProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[id]
      return newProgress
    })
  }

  // Process manual input text
  const processManualInput = async () => {
    if (!manualInput.trim() || isProcessing) return

    setIsProcessing(true)
    try {
      console.log(`[${new Date().toISOString()}] Processing manual input:`)

      // Extract insured name
      let extractedName
      if (manualInsuredName) {
        extractedName = manualInsuredName
        console.log(`[${new Date().toISOString()}] Using manual override: "${extractedName}"`)
      } else {
        extractedName = await extractInsuredName(manualInput)
        console.log(`[${new Date().toISOString()}] Extracted name from manual input: "${extractedName}"`)
      }

      // Find best match
      const { matchedEntity, confidence, allMatches } = findBestMatch(extractedName, INSUREDS)
      console.log(
        `[${new Date().toISOString()}] Matched entity: ${matchedEntity?.name || "None"}, ID: ${
          matchedEntity?.internalId || "None"
        }, Confidence: ${confidence}`,
      )

      // Update results
      setManualResults({
        extractedName,
        matchedEntity,
        confidence,
        allMatches,
      })

      // Show success toast
      toast({
        title: "Processing complete",
        description: `Extracted: ${extractedName}`,
      })
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing manual input:`, error)
      setManualResults({
        extractedName: "Error",
        matchedEntity: null,
        confidence: 0,
        allMatches: [],
      })

      // Show error toast
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Add a sample text for testing
  const addSampleText = () => {
    setManualInput(`Claim Report - Riley HealthCare LLC
Date of Loss: January 15, 2024
Policy Number: RH-12345-2024
Insured: Riley HealthCare LLC
Address: 742 Evergreen Terrace, Springfield, IL
Claim Type: Property Damage
Description: A burst pipe on the third floor resulted in significant water damage to medical equipment
Estimated Loss Amount: $125,000
Adjuster: Jane Smith (smith.adjuster@claimsco.com)`)
  }

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setManualInput(text)
        toast({
          title: "Clipboard content pasted",
          description: `${text.length} characters pasted from clipboard`,
        })
      }
    } catch (error) {
      console.error("Failed to read clipboard:", error)
      toast({
        title: "Clipboard access failed",
        description: "Please paste manually using Ctrl+V or Cmd+V",
        variant: "destructive",
      })
    }
  }

  // Handle PDF file selection
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedPdfFile(file)
      } else {
        alert("Please select a PDF file")
        setSelectedPdfFile(null)
      }
    }
  }

  // Extract text from PDF
  const extractPdfText = async () => {
    if (!selectedPdfFile || isPdfProcessing) return

    setIsPdfProcessing(true)
    setPdfText("")

    try {
      console.log(`[${new Date().toISOString()}] Extracting text from PDF: ${selectedPdfFile.name}`)
      const text = await extractTextFromFile(selectedPdfFile)
      console.log(`[${new Date().toISOString()}] Extracted ${text.length} characters from PDF`)
      setPdfText(text)
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error extracting text from PDF:`, error)
      setPdfText(`Error extracting text: ${error.message}`)
    } finally {
      setIsPdfProcessing(false)
    }
  }

  // Process PDF text
  const processPdfText = async () => {
    if (!pdfText.trim()) return

    // Create a virtual file entry
    const fileId = crypto.randomUUID()
    const fileName = selectedPdfFile ? selectedPdfFile.name : "Manual PDF Entry"

    const newFile: ProcessedFile = {
      id: fileId,
      name: fileName,
      status: "processing",
    }

    // Add to files list
    setFiles((prevFiles) => [...prevFiles, newFile])

    try {
      // Extract insured name using LLM or manual override
      let extractedInsured
      if (manualInsuredName) {
        extractedInsured = manualInsuredName
        console.log(`[${new Date().toISOString()}] Using manual override: "${extractedInsured}"`)
      } else {
        extractedInsured = await extractInsuredName(pdfText)
        console.log(`[${new Date().toISOString()}] Extracted insured name: "${extractedInsured}"`)
      }

      // Find best match
      const { matchedEntity, confidence, allMatches } = findBestMatch(extractedInsured, INSUREDS)

      // Update file with results
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "done",
                extractedInsured,
                matchedId: matchedEntity?.internalId,
                confidence,
                rawText: pdfText,
                allMatches,
              }
            : f,
        ),
      )

      // Close the dialog
      setPdfUploadOpen(false)
      setSelectedPdfFile(null)
      setPdfText("")
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error processing PDF text:`, error)

      // Update file with error
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : f,
        ),
      )
    }
  }

  return (
    <main className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Insurance Claims Processor</h1>

      <Alert className="mb-6">
        <InfoCircle className="h-4 w-4" />
        <AlertTitle>Using Groq API</AlertTitle>
        <AlertDescription>
          This application is now using Groq's LLM API with the Llama 3 70B model for extracting insured entity names.
        </AlertDescription>
      </Alert>

      {/* Manual Input Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Manual Text Input</span>
            <span className="text-sm font-normal text-gray-500">(Recommended for best results)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="manual-input">Enter claim text to process:</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                    <Clipboard className="h-4 w-4 mr-2" />
                    Paste from Clipboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={addSampleText}>
                    Add Sample Text
                  </Button>
                </div>
              </div>
              <Textarea
                id="manual-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste your claim text here..."
                className="min-h-[150px]"
              />
            </div>
            <Button onClick={processManualInput} disabled={isProcessing || !manualInput.trim()}>
              {isProcessing ? "Processing..." : "Process Text"}
            </Button>

            {manualResults && (
              <div className="mt-4 space-y-4 border p-4 rounded-md">
                <div>
                  <h3 className="font-semibold">Extracted Insured Name:</h3>
                  <p className="bg-blue-50 p-2 rounded-md">{manualResults.extractedName}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Best Match:</h3>
                  <p className="bg-green-50 p-2 rounded-md">
                    {manualResults.matchedEntity
                      ? `${manualResults.matchedEntity.name} (${manualResults.matchedEntity.internalId})`
                      : "No match found"}
                  </p>
                  <p>Confidence: {Math.round(manualResults.confidence * 100)}%</p>
                </div>
                {manualResults.allMatches && manualResults.allMatches.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Top 5 Matches:</h3>
                    <ul className="space-y-1">
                      {manualResults.allMatches.slice(0, 5).map((match, index) => (
                        <li key={index} className={index === 0 ? "font-semibold" : ""}>
                          {match.entity.name} ({match.entity.internalId}): {Math.round(match.similarity * 100)}%
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Override Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Manual Override</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-insured">Override extracted insured name:</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-insured"
                  value={manualInsuredName}
                  onChange={(e) => setManualInsuredName(e.target.value)}
                  placeholder="e.g., Riley HealthCare LLC"
                />
                <Button variant="outline" onClick={() => setManualInsuredName("")} disabled={!manualInsuredName}>
                  Clear
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {manualInsuredName
                  ? "Manual override is active. All files will use this insured name instead of extraction."
                  : "No override set. Normal extraction will be used."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <div className="text-sm text-gray-500">
            Note: For best results, copy and paste file content into the Manual Text Input section above.
          </div>
        </div>
        <Dropzone onFilesUploaded={handleFilesUploaded} />
        {Object.keys(fileUploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Upload Progress:</h3>
            {Object.entries(fileUploadProgress).map(([fileId, progress]) => {
              const file = files.find((f) => f.id === fileId)
              return file ? (
                <div key={fileId} className="flex items-center gap-2">
                  <div className="text-sm">{file.name}:</div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="text-sm">{progress}%</div>
                </div>
              ) : null
            })}
          </div>
        )}
        {debugMode && (
          <div className="mt-2 text-sm text-gray-500">
            <p>Debug mode is enabled. Check the browser console for detailed logs.</p>
          </div>
        )}
      </div>

      <div>
        <ResultsTable files={files} onRemoveFile={handleRemoveFile} insureds={INSUREDS} />
      </div>
    </main>
  )
}

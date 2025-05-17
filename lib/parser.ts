/**
 * Extracts text content from various file types
 */

// Simplified parser that focuses on reliability over completeness
export async function extractTextFromFile(file: File): Promise<string> {
  // Add timestamp for debugging
  const timestamp = new Date().toISOString()

  const fileType = file.type
  const fileExtension = file.name.split(".").pop()?.toLowerCase()

  console.log(`[${timestamp}] Extracting text from file: ${file.name} (type: ${fileType}, extension: ${fileExtension})`)

  // For text files, simply read as text
  if (fileType === "text/plain" || fileExtension === "txt") {
    try {
      const text = await file.text()
      console.log(`[${timestamp}] Successfully read text file (${text.length} characters)`)
      return text
    } catch (error) {
      console.error(`[${timestamp}] Error reading text file:`, error)
      throw new Error(`Failed to read text file: ${error.message}`)
    }
  }

  // For PDF files - use a simple approach that works for basic PDFs
  if (fileType === "application/pdf" || fileExtension === "pdf") {
    console.log(`[${timestamp}] PDF detected, using simplified extraction`)

    // For PDFs, we'll use a simplified approach - just return a placeholder
    // This is much faster than trying to parse the PDF
    return `PDF file: ${file.name}
    
    This is a placeholder for PDF content. 
    
    For reliable processing, please use the "Upload PDF" button 
    or paste the content manually in the text input area.
    `
  }

  // For DOCX files
  if (
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileExtension === "docx"
  ) {
    console.log(`[${timestamp}] DOCX detected, using simplified extraction`)

    // For DOCX, we'll use a simplified approach - just return a placeholder
    return `DOCX file: ${file.name}
    
    This is a placeholder for DOCX content.
    
    For reliable processing, please paste the content manually in the text input area.
    `
  }

  // For any other file type, try to read as text
  try {
    const text = await file.text()
    if (text && text.length > 0) {
      console.log(`[${timestamp}] Successfully read file as text (${text.length} characters)`)
      return text
    }
  } catch (error) {
    console.error(`[${timestamp}] Error reading file as text:`, error)
  }

  // If we get here, we couldn't read the file
  return `Unknown file type: ${file.name}
  
  For reliable processing, please paste the content manually in the text input area.
  `
}

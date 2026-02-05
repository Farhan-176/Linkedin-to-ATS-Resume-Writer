import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set the worker source for PDF.js to matching version
// We use a specific URL that points to the worker script
const WORKER_URL = 'https://aistudiocdn.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;

export async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type;
  const name = file.name.toLowerCase();

  try {
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return await extractPdfText(file);
    } 
    else if (
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      name.endsWith('.docx')
    ) {
      return await extractDocxText(file);
    } 
    else {
      // Default to plain text parsing
      return await file.text();
    }
  } catch (error) {
    console.error("File parsing error:", error);
    throw new Error(`Failed to read file: ${(error as Error).message}`);
  }
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  
  // Iterate over all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Extract strings from text items
    const pageText = textContent.items
      // @ts-ignore: pdfjs types can be tricky in this setup
      .map((item) => item.str)
      .join(' ');
      
    fullText += pageText + "\n\n";
  }
  
  return fullText;
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // mammoth.extractRawText extracts the raw text from the document
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
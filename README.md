# LinkedIn to ATS Resume Writer

An AI-powered application that converts your LinkedIn profile PDF into a professional, ATS-optimized resume tailored to specific job descriptions.

## Features

- 📄 **LinkedIn PDF Upload**: Upload your LinkedIn profile as a PDF (or paste text)
- 🎯 **Job-Specific Tailoring**: Input a job description to get a targeted resume
- 🤖 **AI-Powered Writing**: Uses Google Gemini to intelligently rewrite your experience
- ✅ **ATS Optimization**: Ensures your resume passes Applicant Tracking Systems
- 📊 **Match Analysis**: See how well your profile matches the job requirements
- 💌 **Cover Letter**: Automatically generates a tailored cover letter
- ⬇️ **Multiple Formats**: Download as PDF or copy as text

## How It Works

1. **Upload** your LinkedIn profile PDF (or paste your LinkedIn profile text)
2. **Paste** the target job description
3. **Click** "Generate ATS Resume"
4. **Download** your professionally written, ATS-optimized resume

The AI extracts information from your LinkedIn profile and rewrites it into a clean, ATS-friendly format with:
- Quantified achievements
- STAR method bullet points
- Job-specific keywords
- Professional formatting
- No graphics or complex layouts

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your Gemini API key:
   - Copy `.env.local.example` to `.env.local`
   - Get your API key from [Google AI Studio](https://ai.google.dev/)
   - Add your key to `.env.local`:
     ```
     API_KEY=your_gemini_api_key_here
     ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## How to Export Your LinkedIn Profile as PDF

1. Go to your LinkedIn profile
2. Click the **More** button
3. Select **Save to PDF**
4. Upload the downloaded PDF to this app

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **AI**: Google Gemini 2.5 Flash
- **Styling**: Tailwind CSS (via inline styles)
- **PDF Processing**: pdf.js, jsPDF, html2canvas
- **Charts**: Recharts

## License

MIT

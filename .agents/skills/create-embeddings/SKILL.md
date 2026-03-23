---
name: create-embeddings
description: "How to process data and create embeddings for RAG system"
---

# Creating Embeddings for RAG Systems

This skill provides a generic, reusable pattern for processing data and creating embeddings for Retrieval-Augmented Generation (RAG) applications.

## Workflow Overview

The general process involves receiving raw data, extracting text, optionally refining it (e.g., converting to structured Markdown), splitting it into manageable chunks, generating vector embeddings, and storing them in a vector database for efficient semantic search.

## Implementation Steps

### 1. Data Extraction
- **Supported Formats**: Common formats include `PDF`, `DocX`, `XLSX`, `CSV`, and `TXT`.
- **Tools**: Use appropriate libraries for extraction (e.g., `pdf-parse` for PDFs, `xlsx` or `papaparse` for spreadsheets, `mammoth` for Word docs).
- **Goal**: Obtain the cleanest possible raw text from the source.

### 2. Text Content Refinement (Optional but Recommended)
- To improve retrieval accuracy, pass the raw text through a language model (like GPT-4o-mini) to convert it into structured Markdown.
- **Why?**: Markdown provides structural cues (headers, lists, tables) that help the model understand context better than a large block of unstructured text.
- **Prompt Example**: `"Convert the following raw text into clean, structured Markdown. Do not add any extra information. Return ONLY the Markdown."`

### 3. Text Splitting (Chunking)
- Split the refined text into segments that fit within the context window of your embedding model and provide enough local context for retrieval.
- **Strategies**:
  - **Character-based**: Fixed number of characters.
  - **Recursive**: Split by headers, then paragraphs, then sentences (e.g., `RecursiveCharacterTextSplitter`).
- **Recommended Parameters**:
  - `Chunk Size`: ~1000-1500 characters.
  - `Chunk Overlap`: ~10-15% of chunk size (to ensure context isn't lost at the boundaries).

### 4. Embedding Generation
- Call an embedding API (OpenAI, Anthropic, or local models like HuggingFace).
- **Model Recommendation**: `text-embedding-3-small` (OpenAI) or `text-embedding-3-large` for higher precision.
- **Process**: Pass an array of your text chunks to the API to receive a corresponding array of vector embeddings.

### 5. Vector Storage
- Store the chunks and their vectors in a specialized database (Supabase with `pgvector`, Pinecone, Weaviate, etc.).
- **Recommended Schema**:
  - `id`: Unique identifier.
  - `content`: The actual text of the chunk.
  - `embedding`: The vector representation (usually an array of floats).
  - `metadata`: A JSON object for filtering during retrieval (e.g., `source_url`, `author`, `created_at`, `category`, `document_id`).

## Best Practices
- **Metadata is Key**: Store as much relevant metadata as possible to allow for "hybrid search" (combining semantic vector search with keyword/category filtering).
- **Update Strategy**: When a document changes, delete its old chunks and re-index the new content to avoid outdated results.
- **Security**: Ensure that user-specific data is tagged in metadata so users only retrieve documents they have permissions for.

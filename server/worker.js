import { Worker } from "bullmq";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    console.log(`Job:`, job.data);
    const data = JSON.parse(job.data);
    /*
    Path: data.path
    read the pdf from path,
    chunk the pdf,
    call the openai embedding model for every chunk,
    store the chunk in qdrant db
    */

    // Load the PDF
    const loader = new PDFLoader(data.path);
    const docs = await loader.load();

    console.log(`PDF loaded. Number of pages: ${docs.length}`);
    console.log(`Docs:`, docs);
    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    console.log("embeddings created");
    try {
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: "http://localhost:6333",
          collectionName: "langchainjs-testing",
          options: {
            checkCompatibility: false,
          },
        },
      );
      console.log("vector store connected");
      await vectorStore.addDocuments(docs);
      console.log(`All docs are added to vector store`);
    } catch (error) {
      console.error(
        "Error connecting to vector store or adding documents:",
        error,
      );
    }
  },
  {
    concurrency: 100,
    connection: {
      host: "localhost",
      port: "6380",
      enableReadyCheck: false,
    },
  },
);

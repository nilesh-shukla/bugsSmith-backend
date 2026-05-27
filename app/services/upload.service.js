import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { parseCSV } from '../utils/parsers/csvParser.js';
import { parseXLSX } from '../utils/parsers/xlsxParser.js';
import { parsePDF, extractProfileFromText, extractProfilesFromText } from '../utils/parsers/pdfParser.js';
import e from 'express';

const detectFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.csv') return 'csv';
  if (ext === '.xlsx' || ext === '.xls') return 'xlsx';
  if (ext === '.json') return 'json';
  if (ext === '.pdf') return 'pdf';
  return 'unknown';
};

export const parseUploadedFile = async (filePath, originalName) => {
  const type = detectFileType(originalName);
  console.log('Original file:', originalName);
  console.log('Detected type:', type);
  console.log('File path:', filePath);

  if (type === 'csv') {
    return parseCSV(filePath);
  }

  if (type === 'json') {
    const raw = await fs.readFile(filePath, 'utf8');
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
      if (data.profiles && Array.isArray(data.profiles)) return data.profiles;
      return [data];
    } catch (e) {
      throw new Error('Invalid JSON file');
    }
  }

  if (type === 'xlsx') {
    return parseXLSX(filePath);
  }

  if (type === 'pdf') {
    // extract text from PDF and convert to structured profiles using document intelligence
    const text = await parsePDF(filePath);
    console.log('Extracted PDF text length:', text?.length || 0);
    const profiles = extractProfilesFromText(text);
    console.log('Extracted profiles count:', profiles.length, '\n');
    return profiles;
  }

  throw new Error(`Unsupported file type: ${type}`);
};

const chunkArray = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
};

export const processProfilesWithML = async (profiles) => {
  const results = [];

  await Promise.all(profiles.map(async (profile) => {
    try {
      const resp = await axios.post([process.env.ML_SERVICE_URL], profile, { timeout: 60000 });
      const data = resp?.data || {};

      // normalize ML response fields (support a few common keys)
      const confidence = data.confidence ?? data.confidence_score ?? data.confidence_pct ?? data.confidencePercentage ?? null;
      const featureContributions = data.featureContributions ?? data.feature_contributions ?? data.contributions ?? data.explanations ?? null;
      const anomalies = data.anomalies ?? data.anomaly ?? data.anomaly_list ?? data.reasons ?? null;

      results.push({
        input: profile,
        entryId: profile.id || null,
        risk_score: data.risk_score ?? data.risk ?? null,
        confidence: Number.isFinite(+confidence) ? +confidence : confidence,
        featureContributions: featureContributions ?? null,
        anomalies: anomalies ?? null,
        status: data.status ?? (data.risk_score != null || data.risk != null ? 'scored' : 'unknown'),
        reasons: data.reasons ?? data.explanations ?? null,
        raw: data
      });
    } 
    catch (error) {
      results.push({
        input: profile,
        risk_score: null,
        status: 'error',
        reasons: [error?.message || 'request_failed'],
        raw: null
      });
    }
  }));

  return results;
};

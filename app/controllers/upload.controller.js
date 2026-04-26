import { parseUploadedFile, processProfilesWithML } from '../services/upload.service.js';

const uploadProfiles = async (req, res) => {
  try {
    let profiles = [];

    if (req.file) {
      profiles = await parseUploadedFile(req.file.path, req.file.originalname);
    } else if (Array.isArray(req.body)) {
      profiles = req.body;
    } else if (req.body && req.body.profiles) {
      profiles = req.body.profiles;
    } else {
      return res.status(400).json({ success: false, message: 'No file or profile data provided' });
    }

    const results = await processProfilesWithML(profiles);

    return res.status(200).json({ success: true, count: results.length, results });
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process upload' });
  }
};

export { uploadProfiles };

import fs from 'fs/promises';
import pdf from 'pdf-parse';

export const parsePDF = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);
  const parsed = await pdf(dataBuffer);
  return parsed.text || '';
};

export const extractProfileFromText = (text) => {
  if (!text || typeof text !== 'string') return {};

  const getSingle = (re, src = text) => (src.match(re)?.[1] || '').trim();

  const username = getSingle(/Username:\s*(.*)/i) || null;

  const parseNumber = (s) => {
    if (!s) return null;
    const cleaned = s.replace(/[,\s]/g, '');
    const km = cleaned.match(/^([\d\.]+)k$/i);
    if (km) return Math.round(parseFloat(km[1]) * 1000);
    const mm = cleaned.match(/^([\d\.]+)m$/i);
    if (mm) return Math.round(parseFloat(mm[1]) * 1000000);
    const n = parseInt(cleaned, 10);
    return Number.isNaN(n) ? null : n;
  };

  const followers = parseNumber(getSingle(/Followers:\s*([0-9,\.kKmM\s]+)/i));
  const following = parseNumber(getSingle(/Following:\s*([0-9,\.kKmM\s]+)/i));
  const posts = parseNumber(getSingle(/Posts?:\s*([0-9,\.kKmM\s]+)/i));

  let bio = '';
  const bioMatch = text.match(/Bio:\s*([\s\S]*?)(?:\r?\nProfile Picture:|$)/i);
  if (bioMatch) bio = bioMatch[1].trim();

  const profilePictureRaw = getSingle(/Profile Picture:\s*(.*)/i) || '';
  const profilePicture = /no|default|none/i.test(profilePictureRaw) ? 'no' : (/yes|present|has/i.test(profilePictureRaw) ? 'yes' : null);

  return {
    username,
    followers,
    following,
    posts,
    bio: bio || null,
    has_profile_pic: profilePicture,
    raw_text: text
  };
};

export const extractProfilesFromText = (text) => {
  if (!text || typeof text !== 'string') return [];

  // Minimal cleaning: replace newlines with spaces to keep anchors contiguous
  const cleaned = text.replace(/\r?\n/g, ' ');

  // Split by numbered anchor like '1@', '2@', keeping the anchor with each block
  const blocks = cleaned.split(/(?=\d+@)/);
  const profiles = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block || !block.includes('@')) continue;

    // Remove leading index anchor for regex matching (e.g. '1@')
    const cleanedBlock = block.replace(/^\d+@/, '');

    // Strong profile regex: require lowercase-only username, fullname starting with capital letter,
    // then followers (K/M allowed), following, posts, then bio
    const profileRegex = /^([a-z0-9._-]+)([A-Z][A-Za-z\s\.]+?)(\d+(?:\.\d+)?[kKmM])(\d{2,4})(\d{1,4})(.*)$/;
    const match = cleanedBlock.match(profileRegex);

    let username = null;
    let fullname = null;
    let followers = null;
    let following = null;
    let posts = null;
    let bio = null;

    if (match) {
      username = match[1]?.trim() || null;
      fullname = match[2]?.trim() || null;
      followers = parseKNumber(match[3]);
      following = parseInt((match[4] || '').replace(/[,\s]/g, ''), 10);
      posts = parseInt((match[5] || '').replace(/[,\s]/g, ''), 10);
      bio = match[6] ? match[6].trim() : null;
    } else {
      // Fallback: capitalization-aware username + positional parsing
      const { username: exUsername, fullname: exFullname } = extractUsernameAndName(block);
      if (!exUsername) continue;
      username = exUsername;
      if (exFullname) fullname = exFullname;

      // positional parsing after username anchor
      const usernameAnchor = '@' + username;
      const usernameEndIndex = block.indexOf(usernameAnchor) + usernameAnchor.length;
      const remainingText = block.slice(usernameEndIndex).trim();

      const positionalRe = /(.*?)\s+(\d+(?:\.\d+)?[kKmM]?)\s*(\d{2,4})\s*(\d{1,5})(?:\s+(.*))?/i;
      const posMatch = remainingText.match(positionalRe);
      if (posMatch) {
        if (!fullname) fullname = (posMatch[1] || '').trim() || null;
        followers = parseKNumber(posMatch[2]);
        following = parseInt((posMatch[3] || '').replace(/[,\s]/g, ''), 10);
        posts = parseInt((posMatch[4] || '').replace(/[,\s]/g, ''), 10);
        bio = posMatch[5] ? posMatch[5].trim() : null;
      } else {
        // metrics fallback: capture numeric tokens
        const metricsRe = /(\d+(?:\.\d+)?[kKmM]?)\s*(\d{2,4})\s*(\d{1,5})/i;
        const metricsMatch = block.match(metricsRe);
        if (metricsMatch) {
          followers = parseKNumber(metricsMatch[1]);
          following = parseInt(metricsMatch[2].replace(/[,\s]/g, ''), 10);
          posts = parseInt(metricsMatch[3].replace(/[,\s]/g, ''), 10);
        } else {
          const allNums = Array.from(block.matchAll(/(\d+(?:\.\d+)?[kKmM]?)/g)).map(m => m[1]);
          if (allNums.length >= 3) {
            followers = parseKNumber(allNums[0]);
            following = parseKNumber(allNums[1]);
            posts = parseKNumber(allNums[2]);
          } else if (allNums.length === 1) {
            // heuristic split for concatenated numbers: last 3 digits => posts
            const combined = allNums[0].replace(/[,\s]/g, '');
            if (combined.length >= 4) {
              const postsPart = combined.slice(-3);
              const followingPart = combined.slice(0, -3);
              following = parseInt(followingPart, 10);
              posts = parseInt(postsPart, 10);
            }
          }
        }
      }
    }

    const lower = block.toLowerCase();
    const noPicIndicators = [
      'no profile picture',
      'no profile pic',
      'default avatar',
      'generic smiley face',
      'logo-style stock image',
      'default profile'
    ];
    const has_profile_pic = noPicIndicators.some(s => lower.includes(s)) ? 'no' : 'yes';

    profiles.push({
      username,
      fullname,
      followers: followers ?? null,
      following: following ?? null,
      posts: posts ?? null,
      bio: bio || null,
      has_profile_pic,
      raw_block: block
    });
  }

  return profiles;
};

function parseKNumber(s) {
  if (!s) return null;
  const str = s.toString().trim().toLowerCase();
  const kMatch = str.match(/^([\d\.]+)k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mMatch = str.match(/^([\d\.]+)m$/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);
  const cleaned = str.replace(/[ ,\s]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}


function extractUsernameAndName(block) {
  if (!block || typeof block !== 'string') return { username: null, fullname: null };

  const atIndex = block.indexOf('@');
  if (atIndex === -1) return { username: null, fullname: null };

  let i = atIndex + 1;
  const len = block.length;
  let username = '';

  // Collect username chars: lowercase letters, digits, dot, underscore, hyphen
  while (i < len) {
    const ch = block[i];
    if (ch === ' ' || /\d/.test(ch) || /[A-Z]/.test(ch)) break;
    if (/[a-z0-9._\-]/.test(ch)) {
      username += ch;
      i++;
    } else {
      break;
    }
  }

  username = username ? username.trim() : null;
  let fullname = null;

  // If the next char is an uppercase letter, assume fullname starts here
  if (i < len && /[A-Z]/.test(block[i])) {
    let j = i;
    let name = '';
    while (j < len) {
      const ch = block[j];
      if (/[A-Za-z\s.\-']/.test(ch)) {
        name += ch;
        j++;
      } else break;
    }
    fullname = name.trim() || null;
  }

  return { username, fullname };
}

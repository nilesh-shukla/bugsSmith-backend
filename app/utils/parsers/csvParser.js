import fs from 'fs';
import csv from 'csv-parser';

function parseKNumber(s) {
  if (s == null) return null;
  const str = String(s).trim().toLowerCase();
  const kMatch = str.match(/^([\d\.]+)k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mMatch = str.match(/^([\d\.]+)m$/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);
  const cleaned = str.replace(/[ ,\s]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

const keySynonyms = {
  username: ['username', 'user', 'handle', 'user_name', 'user name', 'profile', 'profile_name', 'screenname', 'screen_name'],
  displayName: ['displayname', 'display_name', 'name', 'full name', 'fullname', 'display name'],
  followers: ['followers', 'follower_count', 'followers_count', 'followers count', 'follows'],
  following: ['following', 'following_count', 'following count', 'follows_count'],
  posts: ['posts', 'post_count', 'post count', 'publications'],
  bio: ['bio', 'description', 'about', 'profile_bio'],
  profilePicture: ['profilepicture', 'profile_picture', 'profile_pic', 'avatar', 'photo', 'picture', 'image']
};

function findValueBySynonyms(normalizedRow, synonyms) {
  for (const k of synonyms) {
    if (Object.prototype.hasOwnProperty.call(normalizedRow, k)) return normalizedRow[k];
  }
  return undefined;
}

export const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (raw) => {
        // normalize keys: lowercase, trim, replace spaces with underscore
        const normalized = {};
        for (const k of Object.keys(raw)) {
          const nk = String(k || '').trim().toLowerCase().replace(/\s+/g, '_');
          normalized[nk] = raw[k] != null ? String(raw[k]).trim() : raw[k];
        }

        // attempt to extract canonical fields
        const username = findValueBySynonyms(normalized, keySynonyms.username.map(s => s.replace(/\s+/g, '_')))
          || null;

        const displayName = findValueBySynonyms(normalized, keySynonyms.displayName.map(s => s.replace(/\s+/g, '_')))
          || null;

        const followersRaw = findValueBySynonyms(normalized, keySynonyms.followers.map(s => s.replace(/\s+/g, '_')));
        const followingRaw = findValueBySynonyms(normalized, keySynonyms.following.map(s => s.replace(/\s+/g, '_')));
        const postsRaw = findValueBySynonyms(normalized, keySynonyms.posts.map(s => s.replace(/\s+/g, '_')));

        const followers = parseKNumber(followersRaw);
        const following = parseKNumber(followingRaw);
        const posts = parseKNumber(postsRaw);

        const bioRaw = findValueBySynonyms(normalized, keySynonyms.bio.map(s => s.replace(/\s+/g, '_')));
        const bio = bioRaw ? String(bioRaw).trim() : null;

        const picRaw = findValueBySynonyms(normalized, keySynonyms.profilePicture.map(s => s.replace(/\s+/g, '_')));
        let has_profile_pic = null;
        if (picRaw != null && picRaw !== '') {
          const val = String(picRaw).toLowerCase();
          if (/http|https|\.jpg|\.png|\.gif|cdn\./.test(val)) has_profile_pic = 'yes';
          else if (/no|none|default|n\/a|na|false/.test(val)) has_profile_pic = 'no';
          else if (/yes|true|present|has|1/.test(val)) has_profile_pic = 'yes';
          else has_profile_pic = 'yes';
        }

        // fallback: if only one column per row and it's an email/username, try to use it as username
        let finalUsername = username;
        if (!finalUsername) {
          const candidates = Object.values(normalized).filter(v => v && String(v).trim());
          if (Object.keys(normalized).length === 1 && candidates.length === 1) {
            finalUsername = candidates[0];
          }
        }

        const profile = {
          username: finalUsername || null,
          displayName: displayName || null,
          followers: followers ?? null,
          following: following ?? null,
          posts: posts ?? null,
          bio: bio || null,
          has_profile_pic,
          raw_row: raw
        };

        results.push(profile);
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};
